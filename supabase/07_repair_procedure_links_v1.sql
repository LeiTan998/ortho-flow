-- OrthoFlow · Procedure 关联修复 V1
-- 适用场景：某些非“胫骨平台骨折”疾病误显示 tibial_plateau_orif。
-- 原则：
-- 1) 胫骨平台骨折继续保留 tibial_plateau_orif；
-- 2) 其他疾病一律移除误挂的 tibial_plateau_orif；
-- 3) 如果移除后该疾病没有任何 Procedure，则自动建立自己的 <disease_id>_surgery_pro；
-- 4) 不覆盖已经存在的其他真实 Procedure；
-- 5) overview 记录只承接该疾病原有 surgeryTable，不自动编造高风险手术细节。

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

-- A. 从所有非胫骨平台疾病中移除误挂的 tibial_plateau_orif。
UPDATE public.diseases d
SET data = jsonb_set(
  d.data,
  '{procedureRefs}',
  COALESCE(
    (
      SELECT jsonb_agg(ref)
      FROM jsonb_array_elements(
        CASE
          WHEN jsonb_typeof(d.data->'procedureRefs') = 'array' THEN d.data->'procedureRefs'
          ELSE '[]'::jsonb
        END
      ) AS ref
      WHERE ref->>'id' <> 'tibial_plateau_orif'
    ),
    '[]'::jsonb
  ),
  true
)
WHERE d.data IS NOT NULL
  AND d.data->>'id' <> 'tibial_plateau'
  AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements(
      CASE
        WHEN jsonb_typeof(d.data->'procedureRefs') = 'array' THEN d.data->'procedureRefs'
        ELSE '[]'::jsonb
      END
    ) AS ref
    WHERE ref->>'id' = 'tibial_plateau_orif'
  );

-- B. 对现在没有 ProcedureRefs 的疾病，各自建立一个独立 Overview Procedure。
WITH disease_base AS (
  SELECT
    d.data,
    d.data->>'id' AS disease_id,
    d.data->>'name' AS disease_name,
    d.data->>'englishName' AS english_name,
    CASE
      WHEN jsonb_typeof(d.data->'procedureRefs') = 'array'
        THEN jsonb_array_length(d.data->'procedureRefs')
      ELSE 0
    END AS procedure_ref_count,
    CASE
      WHEN jsonb_typeof(d.data->'surgeryTable'->'rows') = 'array'
        THEN jsonb_array_length(d.data->'surgeryTable'->'rows')
      ELSE 0
    END AS surgery_row_count
  FROM public.diseases d
  WHERE d.data IS NOT NULL
    AND NULLIF(d.data->>'id', '') IS NOT NULL
    AND NULLIF(d.data->>'name', '') IS NOT NULL
),
missing_refs AS (
  SELECT
    *,
    disease_id || '_surgery_pro' AS procedure_id
  FROM disease_base
  WHERE procedure_ref_count = 0
)
INSERT INTO public.procedures (id, data, is_published, updated_at)
SELECT
  procedure_id,
  jsonb_strip_nulls(
    jsonb_build_object(
      'id', procedure_id,
      'name', disease_name || ' · 手术 Pro',
      'englishName', COALESCE(NULLIF(english_name, ''), disease_name) || ' · Procedure Pro',
      'relatedDiseaseIds', jsonb_build_array(disease_id),
      'summary', CASE
        WHEN surgery_row_count > 0
          THEN '该 Procedure 只承接当前疾病原模板中的手术策略。详细入路、解剖危险区、步骤、器械和影像要点将在人工整理后逐步补充。'
        ELSE '已为当前疾病建立独立手术 Pro 数据入口。当前不自动编造手术细节，等待后续人工补充。'
      END,
      'scope', '当前疾病的独立 Procedure Pro 概览层，不借用其他疾病的手术内容。',
      'contentStatus', 'overview_seeded',
      'legacySurgeryTable', CASE
        WHEN jsonb_typeof(data->'surgeryTable') = 'object' THEN data->'surgeryTable'
        ELSE NULL
      END,
      'sourceDiseaseTemplateVersion', data->>'templateVersion',
      'reviewStatus', 'draft'
    )
  ),
  true,
  now()
FROM missing_refs
ON CONFLICT (id) DO NOTHING;

-- C. 把新建的独立 ProcedureRef 写回疾病。
WITH disease_base AS (
  SELECT
    d.data->>'id' AS disease_id,
    d.data->>'name' AS disease_name,
    d.data->>'englishName' AS english_name,
    CASE
      WHEN jsonb_typeof(d.data->'procedureRefs') = 'array'
        THEN jsonb_array_length(d.data->'procedureRefs')
      ELSE 0
    END AS procedure_ref_count
  FROM public.diseases d
  WHERE d.data IS NOT NULL
    AND NULLIF(d.data->>'id', '') IS NOT NULL
    AND NULLIF(d.data->>'name', '') IS NOT NULL
),
missing_refs AS (
  SELECT
    disease_id,
    disease_name,
    english_name,
    disease_id || '_surgery_pro' AS procedure_id
  FROM disease_base
  WHERE procedure_ref_count = 0
)
UPDATE public.diseases d
SET data = jsonb_set(
  d.data,
  '{procedureRefs}',
  jsonb_build_array(
    jsonb_build_object(
      'id', m.procedure_id,
      'name', m.disease_name || ' · 手术 Pro',
      'englishName', COALESCE(NULLIF(m.english_name, ''), m.disease_name) || ' · Procedure Pro',
      'summary', '当前疾病独立的手术 Pro 概览；详细内容将逐病种补充。',
      'pro', true,
      'status', 'preview'
    )
  ),
  true
)
FROM missing_refs m
WHERE d.data->>'id' = m.disease_id;

COMMIT;

-- 验证 1：正常应返回 0 行。
-- 非胫骨平台疾病不应再引用 tibial_plateau_orif。
SELECT
  d.data->>'id' AS disease_id,
  d.data->>'name' AS disease_name,
  ref->>'id' AS wrong_procedure_id
FROM public.diseases d
CROSS JOIN LATERAL jsonb_array_elements(
  CASE
    WHEN jsonb_typeof(d.data->'procedureRefs') = 'array' THEN d.data->'procedureRefs'
    ELSE '[]'::jsonb
  END
) AS ref
WHERE d.data->>'id' <> 'tibial_plateau'
  AND ref->>'id' = 'tibial_plateau_orif';

-- 验证 2：正常应返回 0 行。
-- 每个疾病至少有一个 ProcedureRef。
SELECT
  data->>'id' AS disease_id,
  data->>'name' AS disease_name
FROM public.diseases
WHERE data IS NOT NULL
  AND (
    jsonb_typeof(data->'procedureRefs') IS DISTINCT FROM 'array'
    OR (jsonb_typeof(data->'procedureRefs') = 'array' AND jsonb_array_length(data->'procedureRefs') = 0)
  )
ORDER BY disease_name;

-- 验证 3：查看疾病 → Procedure 的最终关联。
SELECT
  d.data->>'id' AS disease_id,
  d.data->>'name' AS disease_name,
  ref->>'id' AS procedure_id,
  ref->>'name' AS procedure_name
FROM public.diseases d
CROSS JOIN LATERAL jsonb_array_elements(
  CASE
    WHEN jsonb_typeof(d.data->'procedureRefs') = 'array' THEN d.data->'procedureRefs'
    ELSE '[]'::jsonb
  END
) AS ref
ORDER BY disease_name, procedure_name;

-- 验证 4：检查 Procedure 归属。
-- 如果 relatedDiseaseIds 已填写，却不包含当前 disease_id，会被列出来，需人工检查。
SELECT
  d.data->>'id' AS disease_id,
  d.data->>'name' AS disease_name,
  ref->>'id' AS procedure_id,
  p.data->'relatedDiseaseIds' AS related_disease_ids
FROM public.diseases d
CROSS JOIN LATERAL jsonb_array_elements(
  CASE
    WHEN jsonb_typeof(d.data->'procedureRefs') = 'array' THEN d.data->'procedureRefs'
    ELSE '[]'::jsonb
  END
) AS ref
LEFT JOIN public.procedures p ON p.id = ref->>'id'
WHERE p.id IS NULL
   OR (
     jsonb_typeof(p.data->'relatedDiseaseIds') = 'array'
     AND jsonb_array_length(p.data->'relatedDiseaseIds') > 0
     AND NOT (p.data->'relatedDiseaseIds' ? (d.data->>'id'))
   )
ORDER BY disease_name, procedure_id;
