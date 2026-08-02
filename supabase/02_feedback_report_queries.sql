-- OrthoFlow 反馈系统 V1：每周查看用查询
-- 在 Supabase SQL Editor 中按需运行，不需要一次性全部执行。

-- 1. 尚未处理的高风险问题
select
  id,
  created_at,
  severity,
  feedback_type,
  disease_id,
  disease_name,
  reason,
  comment,
  page_url
from public.feedback
where status in ('new', 'reviewing')
  and severity in ('high', 'critical')
order by
  case severity when 'critical' then 1 else 2 end,
  created_at asc;

-- 2. 最近30天，最常见的未解决原因
select
  coalesce(reason, '未填写') as reason,
  count(*) as feedback_count
from public.feedback
where created_at >= now() - interval '30 days'
  and result_status in ('partially_solved', 'unsolved')
group by coalesce(reason, '未填写')
order by feedback_count desc
limit 20;

-- 3. 最近30天，搜索无结果最多的关键词
select
  normalized_query,
  count(*) as search_count,
  count(*) filter (where submitted_request) as request_count,
  max(created_at) as last_seen_at
from public.search_logs
where created_at >= now() - interval '30 days'
  and result_count = 0
group by normalized_query
order by search_count desc, request_count desc
limit 30;

-- 4. 各疾病页面的“未解决率”
select
  disease_id,
  max(disease_name) as disease_name,
  count(*) as total_feedback,
  count(*) filter (where result_status = 'solved') as solved_count,
  count(*) filter (where result_status = 'partially_solved') as partial_count,
  count(*) filter (where result_status = 'unsolved') as unsolved_count,
  round(
    100.0 * count(*) filter (where result_status = 'unsolved')
    / nullif(count(*) filter (where result_status is not null), 0),
    1
  ) as unsolved_rate_percent
from public.feedback
where created_at >= now() - interval '30 days'
  and disease_id is not null
group by disease_id
having count(*) filter (where result_status is not null) >= 3
order by unsolved_rate_percent desc nulls last, total_feedback desc;

-- 5. 愿意参加访谈的用户
select
  created_at,
  user_role,
  task_type,
  disease_id,
  comment,
  contact
from public.feedback
where contact_permission = true
  and contact is not null
order by created_at desc;

-- 6. 最近30天不同用户角色的主要需求
select
  user_role,
  task_type,
  feedback_type,
  count(*) as feedback_count
from public.feedback
where created_at >= now() - interval '30 days'
group by user_role, task_type, feedback_type
order by feedback_count desc;
