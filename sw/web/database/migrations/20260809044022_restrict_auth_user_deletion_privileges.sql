begin;

revoke execute
on function public.delete_auth_user(uuid)
from public, anon, authenticated;

grant execute
on function public.delete_auth_user(uuid)
to service_role;

alter function public.delete_auth_user(uuid)
set search_path = pg_catalog;

create or replace function public.is_admin()
returns boolean
language plpgsql
stable
security definer
set search_path = pg_catalog
as $function$
begin
  return exists (
    select 1
    from public.user_accounts as ua
    where ua.id = auth.uid()
      and ua.role in ('admin', 'super_admin')
      and ua.account_status = 'active'
  );
end;
$function$;

revoke execute
on function public.is_admin()
from public;

grant execute
on function public.is_admin()
to anon, authenticated, service_role;

do $verify$
declare
  delete_oid oid := pg_catalog.to_regprocedure('public.delete_auth_user(uuid)');
  admin_oid oid := pg_catalog.to_regprocedure('public.is_admin()');
begin
  if delete_oid is null or admin_oid is null then
    raise exception 'required auth function is missing';
  end if;

  if pg_catalog.has_function_privilege('anon', delete_oid, 'EXECUTE') then
    raise exception 'anon still has delete_auth_user EXECUTE';
  end if;

  if pg_catalog.has_function_privilege('authenticated', delete_oid, 'EXECUTE') then
    raise exception 'authenticated still has delete_auth_user EXECUTE';
  end if;

  if not pg_catalog.has_function_privilege('service_role', delete_oid, 'EXECUTE') then
    raise exception 'service_role lost delete_auth_user EXECUTE';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_proc as p
    where p.oid = delete_oid
      and p.prosecdef
      and p.proconfig @> array['search_path=pg_catalog']::text[]
  ) then
    raise exception 'delete_auth_user security settings differ';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_proc as p
    where p.oid = admin_oid
      and p.prosecdef
      and p.provolatile = 's'
      and p.proconfig @> array['search_path=pg_catalog']::text[]
      and p.prosrc like '%account_status%'
      and p.prosrc like '%''active''%'
  ) then
    raise exception 'is_admin active-account check is missing';
  end if;
end;
$verify$;

commit;
