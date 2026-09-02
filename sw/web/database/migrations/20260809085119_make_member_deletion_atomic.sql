begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.delete_member_account(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if not exists (
    select 1
    from public.user_accounts as account
    join public.profiles as profile on profile.id = account.id
    where account.id = target_user_id
      and profile.profile_type = 'USER'
  ) then
    raise exception 'Member account not found' using errcode = 'P0002';
  end if;

  update public.records
  set contributor_id = null
  where contributor_id = target_user_id;

  update public.user_contents
  set contributor_id = null
  where contributor_id = target_user_id;

  update public.reports
  set resolved_by = null
  where resolved_by = target_user_id;

  delete from public.user_titles
  where user_id = target_user_id;

  delete from public.ai_reviews
  where user_id = target_user_id;

  perform public.delete_auth_user(target_user_id);
end;
$$;

revoke all on function private.delete_member_account(uuid)
from public, anon, authenticated, service_role;

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  perform private.delete_member_account(current_user_id);
end;
$$;

revoke all on function public.delete_my_account()
from public, anon, authenticated, service_role;

grant execute on function public.delete_my_account()
to authenticated;

create or replace function public.admin_delete_auth_user(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  current_admin_id uuid := (select auth.uid());
  current_admin_role text;
  target_role text;
  target_status text;
  active_super_admin_count bigint;
begin
  if not public.is_admin() then
    raise exception 'Active administrator required' using errcode = '42501';
  end if;

  if current_admin_id = target_user_id then
    raise exception 'Administrators cannot delete their own account'
      using errcode = '42501';
  end if;

  select account.role
  into current_admin_role
  from public.user_accounts as account
  where account.id = current_admin_id;

  select account.role, account.account_status
  into target_role, target_status
  from public.user_accounts as account
  where account.id = target_user_id;

  if target_role is null then
    raise exception 'Member account not found' using errcode = 'P0002';
  end if;

  if target_role <> 'user' and current_admin_role <> 'super_admin' then
    raise exception 'Only super administrators can delete administrator accounts'
      using errcode = '42501';
  end if;

  if target_role = 'super_admin' and target_status = 'active' then
    select count(*)
    into active_super_admin_count
    from public.user_accounts as account
    where account.role = 'super_admin'
      and account.account_status = 'active';

    if active_super_admin_count <= 1 then
      raise exception 'The last active super administrator cannot be deleted'
        using errcode = '42501';
    end if;
  end if;

  perform private.delete_member_account(target_user_id);
end;
$$;

revoke all on function public.admin_delete_auth_user(uuid)
from public, anon, authenticated, service_role;

grant execute on function public.admin_delete_auth_user(uuid)
to authenticated;

do $$
begin
  if pg_catalog.has_function_privilege(
    'anon',
    'private.delete_member_account(uuid)',
    'EXECUTE'
  ) then
    raise exception 'anon can execute private member deletion';
  end if;

  if not pg_catalog.has_function_privilege(
    'authenticated',
    'public.delete_my_account()',
    'EXECUTE'
  ) then
    raise exception 'authenticated cannot execute self deletion';
  end if;

  if not pg_catalog.has_function_privilege(
    'authenticated',
    'public.admin_delete_auth_user(uuid)',
    'EXECUTE'
  ) then
    raise exception 'authenticated cannot reach guarded admin deletion';
  end if;
end;
$$;

commit;
