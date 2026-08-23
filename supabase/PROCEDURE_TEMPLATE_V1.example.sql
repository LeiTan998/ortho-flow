-- OrthoFlow Procedure Engine V1 · 手术模板骨架
-- 这是“格式示例”，不要原样运行。
-- 以后你只需要把我给你的完整 JSON 放进这里，然后在 Supabase SQL Editor 点 Run。

SELECT public.upsert_orthoflow_procedure(
$procedure$
{
  "diseaseMatch": "这里填疾病中文名、英文名或 disease id",
  "id": "procedure_id_lowercase",
  "name": "手术名称",
  "englishName": "English procedure name",
  "summary": "一句话说明这台手术解决什么问题。",
  "scope": "适用范围与边界。",
  "contentStatus": "curated",
  "reviewStatus": "draft",

  "goals": [],
  "indicationScenarios": [],
  "notSuitableScenarios": [],
  "preopImaging": [],
  "positioning": [],

  "approachPrinciple": "入路选择的总原则。",
  "approachGuide": [
    {
      "id": "approach_id",
      "name": "入路名称",
      "englishName": "Approach name",
      "bestFor": [],
      "exposes": [],
      "anatomyLayers": [],
      "dangerStructures": [],
      "limitations": [],
      "keyPoint": "这个入路最需要记住的一句话。",
      "humanReviewRequired": true
    }
  ],
  "dangerStructures": [],

  "procedureSequenceNote": "手术步骤的总原则。",
  "surgicalSteps": [
    {
      "id": "step_01",
      "title": "步骤名称",
      "goal": "这一步要达到什么目的",
      "actions": [],
      "instruments": [],
      "watchFor": [],
      "checkpoint": []
    }
  ],
  "failureModes": [],

  "instrumentPrinciple": "器械与内固定的总原则。",
  "instrumentGroups": [
    {
      "group": "器械分组",
      "items": [
        {
          "name": "器械名称",
          "role": "干什么",
          "when": "什么时候用",
          "commonMistake": "最常见错误"
        }
      ]
    }
  ],

  "imagingPrinciple": "术中和术后看片的总原则。",
  "imagingChecklist": {
    "intraop": [
      {
        "view": "投照位",
        "purpose": "为什么拍",
        "lookFor": [],
        "pitfalls": []
      }
    ],
    "postopBaseline": [],
    "followUp": [],
    "mnemonic": "看片口诀",
    "whenToEscalateImaging": []
  },

  "postopFramework": {
    "monitoring": [],
    "rom": [],
    "weightBearing": [],
    "followUp": []
  },

  "evidenceClaims": [],
  "localPracticeNote": "可选：本院实践与通用证据分开写。"
}
$procedure$::jsonb
);
