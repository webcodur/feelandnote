-- Fix a PL/pgSQL RETURNS TABLE output-variable/column ambiguity in the
-- celebrity content-research completion RPC. Preserve the live signature,
-- security posture, execution attributes, owner and ACL exactly.

begin;

create or replace function public.complete_celeb_content_research_run(
  target_run_id uuid
)
returns table(
  celeb_id uuid,
  final_research_status text,
  actual_content_count bigint
)
language plpgsql
security invoker
called on null input
volatile
parallel unsafe
not leakproof
cost 100
rows 1000
set search_path = pg_catalog
as $$
declare
  target_celeb_id uuid;
  target_run_status text;
  measured_content_count bigint;
begin
  select run.celeb_id, run.status
  into target_celeb_id, target_run_status
  from public.celeb_content_research_runs as run
  where run.id = target_run_id
  for update;

  if target_celeb_id is null then
    raise exception '조사 실행을 찾을 수 없습니다. run_id=%', target_run_id;
  end if;
  if target_run_status <> 'in_progress' then
    raise exception
      '진행 중인 조사만 완료할 수 있습니다. run_id=% status=%',
      target_run_id, target_run_status;
  end if;

  -- The existing BEFORE UPDATE trigger performs the formal readiness assertion.
  update public.celeb_content_research_runs as run
  set status = 'completed'
  where run.id = target_run_id;

  select count(*)
  into measured_content_count
  from public.celeb_contents as celeb_content
  where celeb_content.celeb_id = target_celeb_id;

  update public.celebs as celeb
  set content_research_status = case
    when measured_content_count = 0 then 'confirmed_empty'
    else 'open'
  end
  where celeb.id = target_celeb_id;

  if not found then
    raise exception 'CELEB를 찾을 수 없습니다. celeb_id=%', target_celeb_id;
  end if;

  return query
  select
    target_celeb_id,
    case when measured_content_count = 0 then 'confirmed_empty'::text else 'open'::text end,
    measured_content_count;
end;
$$;

-- CREATE OR REPLACE keeps owner/ACL, but restate the intended live surface so
-- any unexpected drift fails this migration.
alter function public.complete_celeb_content_research_run(uuid) owner to postgres;
revoke all on function public.complete_celeb_content_research_run(uuid)
  from public, anon, authenticated;
grant execute on function public.complete_celeb_content_research_run(uuid)
  to service_role;

do $$
declare
  function_oid oid := to_regprocedure(
    'public.complete_celeb_content_research_run(uuid)'
  );
  function_row record;
  function_definition text;
begin
  if function_oid is null then
    raise exception 'completion RPC is missing after replacement';
  end if;

  select
    pg_get_userbyid(proc.proowner) as owner_name,
    pg_get_function_identity_arguments(proc.oid) as identity_arguments,
    pg_get_function_result(proc.oid) as function_result,
    proc.prosecdef,
    proc.provolatile,
    proc.proisstrict,
    proc.proleakproof,
    proc.proparallel,
    proc.procost,
    proc.prorows,
    proc.proconfig
  into strict function_row
  from pg_proc as proc
  where proc.oid = function_oid;

  if function_row.owner_name <> 'postgres'
     or function_row.identity_arguments <> 'target_run_id uuid'
     or function_row.function_result <>
        'TABLE(celeb_id uuid, final_research_status text, actual_content_count bigint)'
     or function_row.prosecdef
     or function_row.provolatile <> 'v'
     or function_row.proisstrict
     or function_row.proleakproof
     or function_row.proparallel <> 'u'
     or function_row.procost <> 100
     or function_row.prorows <> 1000
     or function_row.proconfig is distinct from array['search_path=pg_catalog']::text[] then
    raise exception 'completion RPC attributes drifted: %', row_to_json(function_row);
  end if;

  if not has_function_privilege('service_role', function_oid, 'execute')
     or has_function_privilege('anon', function_oid, 'execute')
     or has_function_privilege('authenticated', function_oid, 'execute') then
    raise exception 'completion RPC execute ACL drifted';
  end if;
  if exists (
    select 1
    from pg_proc as proc
    cross join lateral aclexplode(proc.proacl) as acl
    where proc.oid = function_oid
      and acl.privilege_type = 'EXECUTE'
      and acl.grantee not in (
        (select role.oid from pg_roles as role where role.rolname = 'postgres'),
        (select role.oid from pg_roles as role where role.rolname = 'service_role')
      )
  ) or 2 is distinct from (
    select count(*)
    from pg_proc as proc
    cross join lateral aclexplode(proc.proacl) as acl
    where proc.oid = function_oid
      and acl.privilege_type = 'EXECUTE'
      and acl.grantee in (
        (select role.oid from pg_roles as role where role.rolname = 'postgres'),
        (select role.oid from pg_roles as role where role.rolname = 'service_role')
      )
  ) then
    raise exception 'completion RPC ACL is not exactly postgres + service_role EXECUTE';
  end if;

  select pg_get_functiondef(function_oid)
  into strict function_definition;
  if position(
       'where celeb_content.celeb_id = target_celeb_id'
       in lower(function_definition)
     ) = 0 then
    raise exception 'qualified celeb_contents predicate is missing';
  end if;

  if not (
    select count(*) = 6
       and bool_and(class.relrowsecurity) is true
    from pg_class as class
    join pg_namespace as namespace on namespace.oid = class.relnamespace
    where namespace.nspname = 'public'
      and class.relname in (
        'celebs',
        'celeb_contents',
        'celeb_content_research_runs',
        'celeb_content_research_scopes',
        'celeb_content_research_findings',
        'celeb_content_research_sources'
      )
  ) then
    raise exception 'required RLS setting drifted';
  end if;

  if not (select role.rolbypassrls from pg_roles as role where role.rolname = 'service_role')
     or not has_table_privilege('service_role', 'public.celeb_content_research_runs', 'select,update')
     or not has_table_privilege('service_role', 'public.celeb_contents', 'select')
     or not has_table_privilege('service_role', 'public.celebs', 'select,update') then
    raise exception 'service_role RLS/table privilege surface drifted';
  end if;
end;
$$;

commit;

-- Rollback policy: before COMMIT, roll back the enclosing transaction. After
-- COMMIT, use only a forward corrective migration. Never restore the known-bad
-- ambiguous function body.
