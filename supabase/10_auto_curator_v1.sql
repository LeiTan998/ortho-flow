-- OrthoFlow Auto Curator V1
-- 一次性安装：建立“AI 待审核草稿队列”和手动发布函数。
-- 前提：已安装 09_procedure_engine_v1.sql。

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.auto_curator_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  disease_id text NOT NULL,
  disease_name text NOT NULL,
  candidate_procedure_id text,
  candidate_procedure_name text,
  action text NOT NULL DEFAULT 'create_procedure',
  reason text,
  payload jsonb,
  review_flags jsonb NOT NULL DEFAULT '[]'::jsonb,
  model text NOT NULL,
  generation_mode text NOT NULL,
  status text NOT NULL DEFAULT 'pending_review',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT auto_curator_drafts_status_check
    CHECK (status IN ('pending_review', 'published', 'rejected', 'superseded')),
  CONSTRAINT auto_curator_drafts_action_check
    CHECK (action IN ('create_procedure', 'no_procedure_recommended', 'needs_human_selection'))
);

CREATE INDEX IF NOT EXISTS auto_curator_drafts_pending_idx
  ON public.auto_curator_drafts (status, disease_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.auto_curator_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mode text NOT NULL,
  disease_id text,
  disease_name text,
  model text NOT NULL,
  outcome text NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.auto_curator_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_curator_runs ENABLE ROW LEVEL SECURITY;

-- 不给 anon/authenticated 任何权限。只有 Supabase Dashboard、数据库 owner、
-- 或 GitHub Actions 中保存的 secret/service_role key 能访问。
REVOKE ALL ON TABLE public.auto_curator_drafts FROM anon, authenticated;
REVOKE ALL ON TABLE public.auto_curator_runs FROM anon, authenticated;

-- 人工审核通过后才调用这个函数发布。
CREATE OR REPLACE FUNCTION public.publish_auto_curator_draft(p_draft_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_draft public.auto_curator_drafts%ROWTYPE;
  v_payload jsonb;
  v_result jsonb;
BEGIN
  SELECT * INTO v_draft
  FROM public.auto_curator_drafts
  WHERE id = p_draft_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Auto Curator draft not found: %', p_draft_id;
  END IF;

  IF v_draft.status <> 'pending_review' THEN
    RAISE EXCEPTION 'Draft status must be pending_review. Current: %', v_draft.status;
  END IF;

  IF v_draft.action <> 'create_procedure' OR v_draft.payload IS NULL THEN
    RAISE EXCEPTION 'This draft does not contain a publishable procedure.';
  END IF;

  v_payload := v_draft.payload
    || jsonb_build_object(
      'publish', true,
      'refStatus', 'published',
      'replaceOverviewPlaceholder', true,
      'contentStatus', 'curated',
      'reviewStatus', 'human_reviewed'
    );

  SELECT public.upsert_orthoflow_procedure(v_payload)
  INTO v_result;

  UPDATE public.auto_curator_drafts
  SET status = 'published',
      updated_at = now()
  WHERE id = p_draft_id;

  RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.reject_auto_curator_draft(p_draft_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
  UPDATE public.auto_curator_drafts
  SET status = 'rejected', updated_at = now()
  WHERE id = p_draft_id
    AND status = 'pending_review';
$function$;

REVOKE ALL ON FUNCTION public.publish_auto_curator_draft(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reject_auto_curator_draft(uuid) FROM PUBLIC, anon, authenticated;

COMMIT;

-- 安装检查
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('auto_curator_drafts', 'auto_curator_runs')
ORDER BY table_name;
