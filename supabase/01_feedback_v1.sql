-- OrthoFlow 反馈系统 V1
-- 在 Supabase Dashboard -> SQL Editor 中一次性运行。
-- 设计原则：浏览器不能直接读取或写入表；所有提交通过 Next.js 服务端接口完成。

create extension if not exists pgcrypto;

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  page_url text,
  disease_id text,
  disease_name text,
  feature_name text,

  user_role text not null default 'unknown'
    check (user_role in (
      'unknown', 'medical_student', 'resident', 'orthopedic_doctor',
      'other_clinician', 'teacher', 'patient_family', 'other'
    )),

  task_type text not null default 'other'
    check (task_type in (
      'search', 'disease_learning', 'imaging', 'classification',
      'treatment', 'medical_record', 'rehab', 'case_submission', 'other'
    )),

  result_status text
    check (result_status is null or result_status in (
      'solved', 'partially_solved', 'unsolved'
    )),

  feedback_type text not null default 'content'
    check (feedback_type in (
      'content', 'medical_error', 'privacy', 'copyright',
      'feature', 'usability', 'search_request', 'other'
    )),

  reason text,

  severity text not null default 'low'
    check (severity in ('low', 'medium', 'high', 'critical')),

  comment text check (comment is null or char_length(comment) <= 1000),
  contact_permission boolean not null default false,
  contact text check (contact is null or char_length(contact) <= 200),

  status text not null default 'new'
    check (status in ('new', 'reviewing', 'planned', 'fixed', 'rejected')),

  reviewer_note text,
  source text not null default 'web',
  metadata jsonb not null default '{}'::jsonb,

  constraint feedback_contact_permission_check
    check (contact_permission = true or contact is null)
);

create table if not exists public.search_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  query text not null check (char_length(query) between 1 and 120),
  normalized_query text not null check (char_length(normalized_query) between 1 and 120),
  result_count integer not null default 0 check (result_count >= 0),
  clicked_disease_id text,
  submitted_request boolean not null default false,
  user_role text not null default 'unknown'
    check (user_role in (
      'unknown', 'medical_student', 'resident', 'orthopedic_doctor',
      'other_clinician', 'teacher', 'patient_family', 'other'
    )),
  page_url text,
  session_id text,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists feedback_created_at_idx
  on public.feedback (created_at desc);

create index if not exists feedback_status_severity_idx
  on public.feedback (status, severity, created_at desc);

create index if not exists feedback_disease_idx
  on public.feedback (disease_id, created_at desc);

create index if not exists feedback_type_idx
  on public.feedback (feedback_type, created_at desc);

create index if not exists search_logs_created_at_idx
  on public.search_logs (created_at desc);

create index if not exists search_logs_normalized_query_idx
  on public.search_logs (normalized_query, created_at desc);

create index if not exists search_logs_no_result_idx
  on public.search_logs (result_count, created_at desc)
  where result_count = 0;

-- public schema 中的表必须开启 RLS。
alter table public.feedback enable row level security;
alter table public.search_logs enable row level security;

-- 第一版只允许服务端使用 service_role 写入；浏览器不能直接访问。
revoke all on table public.feedback from anon, authenticated;
revoke all on table public.search_logs from anon, authenticated;

grant select, insert, update, delete on table public.feedback to service_role;
grant select, insert, update, delete on table public.search_logs to service_role;

comment on table public.feedback is
  'OrthoFlow 页面反馈、医学纠错、隐私与版权举报。仅服务端可写入。';

comment on table public.search_logs is
  'OrthoFlow 搜索行为日志，不应写入患者姓名、住院号或其他敏感信息。';
