-- OrthoFlow · 全疾病手术 Pro 统一迁移 V1
-- 目标：
-- 1) 每一个 diseases 记录都拥有 procedureRefs；
-- 2) 每一个引用的 Procedure 在 public.procedures 中至少有一条可读取记录；
-- 3) 已有详细 Procedure（例如 tibial_plateau_orif）绝不覆盖；
-- 4) 对还没人工整理的疾病，只迁移原 disease.surgeryTable 作为“手术概览”，
--    不批量编造入路、解剖、手术步骤、器械或影像细节。
--
-- 可重复执行：使用 ON CONFLICT DO NOTHING，并且只给 procedureRefs 为空的疾病新增 overview Procedure。

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

-- ---------------------------------------------------------------------------
-- A. 如果某个 disease 已经有 procedureRefs，但 procedures 表里缺对应记录：
--    建一个“安全占位数据”，避免点进 Pro 后 404 / 空白。
--    已经存在的详细 Procedure 不会被覆盖。
-- ---------------------------------------------------------------------------
WITH existing_refs AS (
  SELECT
    d.data AS disease_data,
    ref
  FROM public.diseases d
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE
      WHEN jsonb_typeof(d.data->'procedureRefs') = 'array' THEN d.data->'procedureRefs'
      ELSE '[]'::jsonb
    END
  ) AS ref
  WHERE d.data IS NOT NULL
    AND NULLIF(ref->>'id', '') IS NOT NULL
)
INSERT INTO public.procedures (id, data, is_published, updated_at)
SELECT
  ref->>'id' AS id,
  jsonb_strip_nulls(
    jsonb_build_object(
      'id', ref->>'id',
      'name', COALESCE(NULLIF(ref->>'name', ''), (disease_data->>'name') || ' · 手术 Pro'),
      'englishName', NULLIF(ref->>'englishName', ''),
      'relatedDiseaseIds', jsonb_build_array(disease_data->>'id'),
      'summary', COALESCE(
        NULLIF(ref->>'summary', ''),
        '该 Procedure 已在疾病页建立引用，但详细手术内容尚未完成结构化。当前先保留入口，后续逐病种补充。'
      ),
      'scope', '当前为 Procedure Pro 数据占位。只展示已有疾病手术策略，不自动生成高风险手术细节。',
      'contentStatus', 'overview_seeded',
      'legacySurgeryTable', CASE
        WHEN jsonb_typeof(disease_data->'surgeryTable') = 'object' THEN disease_data->'surgeryTable'
        ELSE NULL
      END,
      'sourceDiseaseTemplateVersion', disease_data->>'templateVersion',
      'reviewStatus', 'draft'
    )
  ),
  true,
  now()
FROM existing_refs
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- B. 为还没有 procedureRefs 的每一个疾病建立 1 个 Overview Procedure。
--    这个记录会复制原 surgeryTable（若存在），作为后续人工拆 Procedure 的起点。
-- ---------------------------------------------------------------------------
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
          THEN '已把该疾病原模板中的手术策略迁移到独立 Procedure 数据层。当前先提供手术概览；入路、解剖危险区、具体步骤、器械与术中/术后看片将在人工整理后逐步开放。'
        ELSE '已为该疾病建立手术 Pro 数据入口。当前原疾病模板没有可直接迁移的结构化手术策略，因此不自动编造手术步骤；等待后续人工补充。'
      END,
      'scope', '统一手术 Pro 概览层：先承接疾病页已有手术策略，再逐步拆成独立具体 Procedure。',
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

-- ---------------------------------------------------------------------------
-- C. 把新建 Overview Procedure 引用写回 diseases.data.procedureRefs。
--    只处理原来 procedureRefs 为空的疾病，不动已有 Gold Procedure。
-- ---------------------------------------------------------------------------
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
      'summary', '已建立统一手术 Pro 概览；详细 Procedure 将逐病种人工整理。',
      'pro', true,
      'status', 'preview'
    )
  ),
  true
)
FROM missing_refs m
WHERE d.data->>'id' = m.disease_id;

COMMIT;

-- ---------------------------------------------------------------------------
-- 验证 1：正常应返回 0 行 —— 没有任何疾病缺少 Procedure 引用。
-- ---------------------------------------------------------------------------
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

-- 验证 2：查看每个疾病现在关联了几个 Procedure。
SELECT
  data->>'id' AS disease_id,
  data->>'name' AS disease_name,
  jsonb_array_length(
    CASE
      WHEN jsonb_typeof(data->'procedureRefs') = 'array' THEN data->'procedureRefs'
      ELSE '[]'::jsonb
    END
  ) AS procedure_count,
  data->'procedureRefs' AS procedure_refs
FROM public.diseases
WHERE data IS NOT NULL
ORDER BY disease_name;

-- 验证 3：查看 Procedure 数据总表。
SELECT
  id,
  data->>'name' AS procedure_name,
  data->>'contentStatus' AS content_status,
  data->>'reviewStatus' AS review_status,
  is_published,
  updated_at
FROM public.procedures
ORDER BY id;
