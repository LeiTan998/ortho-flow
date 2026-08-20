-- OrthoFlow Procedure Pro vertical slice v1
-- 作用：只给“胫骨平台骨折”增加一个 Procedure 引用，不改其他疾病，不改现有 workflow。
-- 建议先执行前两个 SELECT 确认，再执行 UPDATE，最后执行验证 SELECT。

-- 1) 先查看目标疾病
SELECT
  data->>'id' AS disease_id,
  data->>'name' AS disease_name,
  data->'procedureRefs' AS current_procedure_refs
FROM diseases
WHERE data->>'id' = 'tibial_plateau';

-- 2) 预览将写入的引用
SELECT jsonb_build_array(
  jsonb_build_object(
    'id', 'tibial_plateau_orif',
    'name', '胫骨平台切开复位内固定术',
    'englishName', 'Tibial Plateau ORIF',
    'summary', '面向术前准备与复盘的 Gold Example：把术前看片、体位、C臂、入路、复位顺序、固定策略、术中检查和失败模式串成一条手术主线。',
    'pro', true,
    'status', 'preview'
  )
) AS procedure_refs_preview;

-- 3) 写入 Disease → Procedure 引用
UPDATE diseases
SET data = jsonb_set(
  data,
  '{procedureRefs}',
  jsonb_build_array(
    jsonb_build_object(
      'id', 'tibial_plateau_orif',
      'name', '胫骨平台切开复位内固定术',
      'englishName', 'Tibial Plateau ORIF',
      'summary', '面向术前准备与复盘的 Gold Example：把术前看片、体位、C臂、入路、复位顺序、固定策略、术中检查和失败模式串成一条手术主线。',
      'pro', true,
      'status', 'preview'
    )
  ),
  true
)
WHERE data->>'id' = 'tibial_plateau';

-- 4) 验证
SELECT
  data->>'id' AS disease_id,
  data->>'name' AS disease_name,
  data->'procedureRefs' AS procedure_refs
FROM diseases
WHERE data->>'id' = 'tibial_plateau';
