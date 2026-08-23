-- OrthoFlow · Procedure Engine V1
-- 一次性安装。
-- 安装后，新增/更新手术不再改前端：只需要在 Supabase SQL Editor 运行一份手术 JSON 模板。
--
-- 未来调用形式：
-- SELECT public.upsert_orthoflow_procedure(
--   $procedure$
--   { ...一整份手术模板 JSON... }
--   $procedure$::jsonb
-- );
--
-- 这个函数会自动：
-- 1) 找到疾病；
-- 2) 新增或覆盖更新 public.procedures；
-- 3) 自动写回 diseases.data.procedureRefs；
-- 4) 移除该疾病旧的统一 overview 占位引用；
-- 5) 如果 Procedure 改挂到别的疾病，自动清理旧疾病上的引用；
-- 6) 可重复执行，不会重复生成同名 ProcedureRef。

BEGIN;

CREATE TABLE IF NOT EXISTS public.procedures (
  id text PRIMARY KEY,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_published boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.procedures ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON TABLE public.procedures TO anon, authenticated;

DROP POLICY IF EXISTS "Public can read published procedures" ON public.procedures;
CREATE POLICY "Public can read published procedures"
ON public.procedures
FOR SELECT
TO anon, authenticated
USING (is_published = true);

CREATE OR REPLACE FUNCTION public.upsert_orthoflow_procedure(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_payload jsonb := COALESCE(p_payload, '{}'::jsonb);
  v_clean_data jsonb;
  v_procedure_id text;
  v_procedure_name text;
  v_english_name text;
  v_summary text;
  v_disease_match text;
  v_disease_ids text[] := ARRAY[]::text[];
  v_old_disease_ids text[] := ARRAY[]::text[];
  v_matches text[] := ARRAY[]::text[];
  v_missing_ids text[] := ARRAY[]::text[];
  v_disease_id text;
  v_disease_name text;
  v_existing_refs jsonb;
  v_filtered_refs jsonb;
  v_new_ref jsonb;
  v_publish boolean := true;
  v_ref_status text := 'published';
  v_replace_placeholder boolean := true;
BEGIN
  IF jsonb_typeof(v_payload) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Procedure template must be a JSON object.';
  END IF;

  v_procedure_id := NULLIF(BTRIM(v_payload->>'id'), '');
  v_procedure_name := NULLIF(BTRIM(v_payload->>'name'), '');
  v_english_name := NULLIF(BTRIM(v_payload->>'englishName'), '');
  v_summary := NULLIF(BTRIM(v_payload->>'summary'), '');
  v_disease_match := NULLIF(BTRIM(v_payload->>'diseaseMatch'), '');

  IF v_procedure_id IS NULL THEN
    RAISE EXCEPTION 'Procedure template missing required field: id';
  END IF;

  IF v_procedure_id !~ '^[a-z0-9][a-z0-9_-]*$' THEN
    RAISE EXCEPTION 'Procedure id must use lowercase letters, numbers, _ or - only. Got: %', v_procedure_id;
  END IF;

  IF v_procedure_name IS NULL THEN
    RAISE EXCEPTION 'Procedure template missing required field: name';
  END IF;

  -- 可选控制字段。默认：立即发布、ProcedureRef=published、替换统一占位。
  IF v_payload ? 'publish' THEN
    v_publish := LOWER(COALESCE(v_payload->>'publish', 'true')) NOT IN ('false', '0', 'no', 'off');
  END IF;

  IF NULLIF(BTRIM(v_payload->>'refStatus'), '') IS NOT NULL THEN
    v_ref_status := v_payload->>'refStatus';
  END IF;

  IF v_ref_status NOT IN ('preview', 'published', 'updating') THEN
    RAISE EXCEPTION 'refStatus must be preview, published or updating. Got: %', v_ref_status;
  END IF;

  IF v_payload ? 'replaceOverviewPlaceholder' THEN
    v_replace_placeholder := LOWER(COALESCE(v_payload->>'replaceOverviewPlaceholder', 'true')) NOT IN ('false', '0', 'no', 'off');
  END IF;

  -- A. 解析疾病归属。
  -- 优先使用 relatedDiseaseIds；否则使用 diseaseMatch 自动匹配疾病 id / 中文名 / 英文名 / 搜索关键词。
  IF jsonb_typeof(v_payload->'relatedDiseaseIds') = 'array'
     AND jsonb_array_length(v_payload->'relatedDiseaseIds') > 0 THEN
    SELECT ARRAY_AGG(DISTINCT value ORDER BY value)
    INTO v_disease_ids
    FROM jsonb_array_elements_text(v_payload->'relatedDiseaseIds') AS x(value)
    WHERE NULLIF(BTRIM(value), '') IS NOT NULL;

    SELECT ARRAY_AGG(x)
    INTO v_missing_ids
    FROM unnest(v_disease_ids) AS x
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.diseases d
      WHERE d.data IS NOT NULL
        AND d.data->>'id' = x
    );

    IF COALESCE(cardinality(v_missing_ids), 0) > 0 THEN
      RAISE EXCEPTION 'Unknown disease id(s): %', array_to_string(v_missing_ids, ', ');
    END IF;
  ELSE
    IF v_disease_match IS NULL THEN
      RAISE EXCEPTION 'Provide diseaseMatch or a non-empty relatedDiseaseIds array.';
    END IF;

    -- 先找精确匹配，避免中文简称误命中多个疾病。
    SELECT ARRAY_AGG(DISTINCT d.data->>'id' ORDER BY d.data->>'id')
    INTO v_matches
    FROM public.diseases d
    WHERE d.data IS NOT NULL
      AND NULLIF(d.data->>'id', '') IS NOT NULL
      AND (
        d.data->>'id' = v_disease_match
        OR d.data->>'name' = v_disease_match
        OR LOWER(COALESCE(d.data->>'englishName', '')) = LOWER(v_disease_match)
      );

    -- 没有精确匹配时，才使用关键词模糊匹配。
    IF COALESCE(cardinality(v_matches), 0) = 0 THEN
      SELECT ARRAY_AGG(DISTINCT d.data->>'id' ORDER BY d.data->>'id')
      INTO v_matches
      FROM public.diseases d
      WHERE d.data IS NOT NULL
        AND NULLIF(d.data->>'id', '') IS NOT NULL
        AND (
          COALESCE(d.data->>'name', '') ILIKE '%' || v_disease_match || '%'
          OR COALESCE(d.data->>'englishName', '') ILIKE '%' || v_disease_match || '%'
          OR COALESCE(d.data->>'searchKeywords', '') ILIKE '%' || v_disease_match || '%'
        );
    END IF;

    IF COALESCE(cardinality(v_matches), 0) = 0 THEN
      RAISE EXCEPTION 'No disease matched diseaseMatch: %', v_disease_match;
    ELSIF cardinality(v_matches) > 1 THEN
      RAISE EXCEPTION 'diseaseMatch is ambiguous (% matches): %. Use exact disease id or name.', cardinality(v_matches), array_to_string(v_matches, ', ');
    END IF;

    v_disease_ids := ARRAY[v_matches[1]];
  END IF;

  -- B. 记录旧归属，以便 Procedure 改挂疾病时清理旧引用。
  SELECT COALESCE(ARRAY_AGG(value), ARRAY[]::text[])
  INTO v_old_disease_ids
  FROM public.procedures p
  CROSS JOIN LATERAL jsonb_array_elements_text(
    CASE
      WHEN jsonb_typeof(p.data->'relatedDiseaseIds') = 'array' THEN p.data->'relatedDiseaseIds'
      ELSE '[]'::jsonb
    END
  ) AS old_ids(value)
  WHERE p.id = v_procedure_id;

  -- C. 清理只给 Engine 使用的控制字段；真正保存的仍是一份纯 Procedure JSON。
  v_clean_data := v_payload
    - 'diseaseMatch'
    - 'publish'
    - 'refStatus'
    - 'replaceOverviewPlaceholder';

  v_clean_data := jsonb_set(v_clean_data, '{relatedDiseaseIds}', to_jsonb(v_disease_ids), true);

  IF NOT (v_clean_data ? 'contentStatus') THEN
    v_clean_data := jsonb_set(v_clean_data, '{contentStatus}', '"curated"'::jsonb, true);
  END IF;

  IF NOT (v_clean_data ? 'reviewStatus') THEN
    v_clean_data := jsonb_set(v_clean_data, '{reviewStatus}', '"draft"'::jsonb, true);
  END IF;

  v_clean_data := jsonb_set(v_clean_data, '{engineVersion}', '"procedure-engine-v1"'::jsonb, true);

  INSERT INTO public.procedures (id, data, is_published, updated_at)
  VALUES (v_procedure_id, v_clean_data, v_publish, now())
  ON CONFLICT (id) DO UPDATE
  SET data = EXCLUDED.data,
      is_published = EXCLUDED.is_published,
      updated_at = now();

  -- D. 如果以前挂在别的疾病上，现在模板已移除该归属，就清理旧引用。
  FOREACH v_disease_id IN ARRAY v_old_disease_ids LOOP
    IF NOT (v_disease_id = ANY(v_disease_ids)) THEN
      UPDATE public.diseases d
      SET data = jsonb_set(
        d.data,
        '{procedureRefs}',
        COALESCE(
          (
            SELECT jsonb_agg(e.ref ORDER BY e.ord)
            FROM jsonb_array_elements(
              CASE
                WHEN jsonb_typeof(d.data->'procedureRefs') = 'array' THEN d.data->'procedureRefs'
                ELSE '[]'::jsonb
              END
            ) WITH ORDINALITY AS e(ref, ord)
            WHERE e.ref->>'id' <> v_procedure_id
          ),
          '[]'::jsonb
        ),
        true
      )
      WHERE d.data IS NOT NULL
        AND d.data->>'id' = v_disease_id;
    END IF;
  END LOOP;

  -- E. 写入/更新新疾病上的 ProcedureRef，并把真实手术放在第一位。
  FOREACH v_disease_id IN ARRAY v_disease_ids LOOP
    SELECT d.data->>'name'
    INTO v_disease_name
    FROM public.diseases d
    WHERE d.data IS NOT NULL
      AND d.data->>'id' = v_disease_id
    LIMIT 1;

    v_new_ref := jsonb_strip_nulls(
      jsonb_build_object(
        'id', v_procedure_id,
        'name', v_procedure_name,
        'englishName', v_english_name,
        'summary', v_summary,
        'pro', true,
        'status', v_ref_status
      )
    );

    SELECT
      CASE
        WHEN jsonb_typeof(d.data->'procedureRefs') = 'array' THEN d.data->'procedureRefs'
        ELSE '[]'::jsonb
      END
    INTO v_existing_refs
    FROM public.diseases d
    WHERE d.data IS NOT NULL
      AND d.data->>'id' = v_disease_id
    LIMIT 1;

    SELECT COALESCE(jsonb_agg(e.ref ORDER BY e.ord), '[]'::jsonb)
    INTO v_filtered_refs
    FROM jsonb_array_elements(COALESCE(v_existing_refs, '[]'::jsonb)) WITH ORDINALITY AS e(ref, ord)
    WHERE e.ref->>'id' <> v_procedure_id
      AND (
        NOT v_replace_placeholder
        OR e.ref->>'id' <> v_disease_id || '_surgery_pro'
      );

    UPDATE public.diseases d
    SET data = jsonb_set(
      d.data,
      '{procedureRefs}',
      jsonb_build_array(v_new_ref) || COALESCE(v_filtered_refs, '[]'::jsonb),
      true
    )
    WHERE d.data IS NOT NULL
      AND d.data->>'id' = v_disease_id;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'engine', 'procedure-engine-v1',
    'procedureId', v_procedure_id,
    'procedureName', v_procedure_name,
    'diseaseIds', to_jsonb(v_disease_ids),
    'published', v_publish,
    'message', 'Procedure saved and disease links updated.'
  );
END;
$function$;

-- 这是数据库写入函数，不能让网页匿名用户直接执行。
REVOKE ALL ON FUNCTION public.upsert_orthoflow_procedure(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.upsert_orthoflow_procedure(jsonb) FROM anon, authenticated;

COMMIT;

-- 安装检查：应该看到函数名 upsert_orthoflow_procedure。
SELECT
  n.nspname AS schema_name,
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS arguments
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'upsert_orthoflow_procedure';
