begin;

create or replace function public.delete_auth_user(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  requested_user_id constant uuid := target_user_id;
  has_member_account boolean;
  has_member_profile boolean;
  has_celeb boolean;
  compatibility_type text;
begin
  select exists (
    select 1
    from public.user_accounts as account
    where account.id = requested_user_id
  ) into has_member_account;

  select exists (
    select 1
    from public.member_profiles as member
    where member.id = requested_user_id
  ) into has_member_profile;

  select exists (
    select 1
    from public.celebs as celeb
    where celeb.id = requested_user_id
  ) into has_celeb;

  select profile.profile_type
  into compatibility_type
  from public.profiles as profile
  where profile.id = requested_user_id;

  if has_member_account or has_member_profile then
    if not has_member_account
      or not has_member_profile
      or has_celeb
      or compatibility_type is distinct from 'USER'
    then
      raise exception 'Member account domain mismatch: %', requested_user_id
        using errcode = '23514';
    end if;

    update public.records
    set contributor_id = null
    where contributor_id = requested_user_id;

    update public.user_contents
    set contributor_id = null
    where contributor_id = requested_user_id;

    update public.reports as report
    set resolved_by = null
    where report.resolved_by = requested_user_id;

    delete from public.member_profiles
    where id = requested_user_id;

    delete from public.user_accounts
    where id = requested_user_id;

    delete from public.profiles
    where id = requested_user_id
      and profile_type = 'USER';

    if not found then
      raise exception 'Member compatibility profile not found: %', requested_user_id
        using errcode = 'P0002';
    end if;

    delete from auth.users
    where id = requested_user_id;

    return;
  end if;

  if has_celeb then
    if compatibility_type is distinct from 'CELEB' then
      raise exception 'Celeb profile domain mismatch: %', requested_user_id
        using errcode = '23514';
    end if;

    delete from public.celebs
    where id = requested_user_id;

    delete from public.profiles
    where id = requested_user_id
      and profile_type = 'CELEB';

    if not found then
      raise exception 'Celeb compatibility profile not found: %', requested_user_id
        using errcode = 'P0002';
    end if;

    delete from auth.users
    where id = requested_user_id;

    return;
  end if;

  raise exception 'Profile domain not found: %', requested_user_id
    using errcode = 'P0002';
end;
$$;

create or replace function private.delete_member_account(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  perform public.delete_auth_user(target_user_id);
end;
$$;

revoke all on function private.delete_member_account(uuid)
from public, anon, authenticated, service_role;

do $$
begin
  if pg_catalog.has_function_privilege(
      'anon',
      'private.delete_member_account(uuid)',
      'EXECUTE'
    )
    or pg_catalog.has_function_privilege(
      'authenticated',
      'private.delete_member_account(uuid)',
      'EXECUTE'
    )
    or pg_catalog.has_function_privilege(
      'service_role',
      'private.delete_member_account(uuid)',
      'EXECUTE'
    )
  then
    raise exception 'private member deletion is exposed';
  end if;

  if pg_catalog.has_function_privilege(
      'anon',
      'public.delete_auth_user(uuid)',
      'EXECUTE'
    )
    or pg_catalog.has_function_privilege(
      'authenticated',
      'public.delete_auth_user(uuid)',
      'EXECUTE'
    )
    or not pg_catalog.has_function_privilege(
      'service_role',
      'public.delete_auth_user(uuid)',
      'EXECUTE'
    )
  then
    raise exception 'delete_auth_user EXECUTE privileges differ';
  end if;
end;
$$;

notify pgrst, 'reload schema';

commit;
