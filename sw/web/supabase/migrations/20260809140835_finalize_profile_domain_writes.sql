begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';

do $$
declare
  unexpected_profile_writer_count integer;
begin
  perform private.assert_profile_cutover_sync();

  if (
    select count(*)
    from pg_catalog.pg_trigger as trigger_record
    where trigger_record.tgrelid = 'public.profiles'::pg_catalog.regclass
      and trigger_record.tgname = 'trg_profiles_sync_profile_split'
      and trigger_record.tgfoid =
        'private.sync_profile_split()'::pg_catalog.regprocedure
      and trigger_record.tgenabled = 'O'
      and trigger_record.tgtype = 29
      and trigger_record.tgqual is not null
      and not trigger_record.tgisinternal
  ) <> 1 then
    raise exception 'safe profile forward trigger is missing';
  end if;

  if (
    select count(*)
    from pg_catalog.pg_trigger as trigger_record
    where trigger_record.tgenabled = 'O'
      and trigger_record.tgtype = 21
      and trigger_record.tgqual is not null
      and not trigger_record.tgisinternal
      and (
        (
          trigger_record.tgrelid =
            'public.member_profiles'::pg_catalog.regclass
          and trigger_record.tgname =
            'trg_member_profiles_sync_profile_compat'
          and trigger_record.tgfoid =
            'private.sync_member_profile_to_compat()'::pg_catalog.regprocedure
        )
        or (
          trigger_record.tgrelid = 'public.celebs'::pg_catalog.regclass
          and trigger_record.tgname = 'trg_celebs_sync_profile_compat'
          and trigger_record.tgfoid =
            'private.sync_celeb_to_compat()'::pg_catalog.regprocedure
        )
      )
  ) <> 2 then
    raise exception 'safe profile reverse triggers are missing';
  end if;

  select count(*)
  into unexpected_profile_writer_count
  from pg_catalog.pg_proc as function_record
  join pg_catalog.pg_namespace as function_schema
    on function_schema.oid = function_record.pronamespace
  where function_schema.nspname not in ('pg_catalog', 'information_schema')
    and function_schema.nspname not like 'pg_toast%'
    and function_record.prosrc ~*
      '(insert[[:space:]]+into|update|delete[[:space:]]+from)[[:space:]]+(public[.])?profiles([^a-z0-9_]|$)'
    and not (
      function_schema.nspname = 'private'
      and function_record.proname in (
        'sync_member_profile_to_compat',
        'sync_celeb_to_compat'
      )
    )
    and not (
      function_schema.nspname = 'public'
      and function_record.proname = 'delete_auth_user'
      and pg_catalog.pg_get_function_identity_arguments(function_record.oid) =
        'target_user_id uuid'
    );

  if unexpected_profile_writer_count <> 0 then
    raise exception 'unexpected compatibility profile writers remain: %',
      unexpected_profile_writer_count;
  end if;
end;
$$;

-- profiles is now a read-only compatibility projection for API roles.
revoke all on table public.profiles
from public, anon, authenticated, service_role;

grant select on table public.profiles
to anon, authenticated, service_role;

-- Member deletion must stay inside delete_my_account/admin_delete_auth_user.
revoke delete, truncate on table public.user_accounts
from public, anon, authenticated, service_role;

do $$
declare
  role_name text;
begin
  foreach role_name in array array['anon', 'authenticated', 'service_role']
  loop
    if not pg_catalog.has_table_privilege(
        role_name,
        'public.profiles',
        'SELECT'
      )
      or pg_catalog.has_table_privilege(
        role_name,
        'public.profiles',
        'INSERT'
      )
      or pg_catalog.has_any_column_privilege(
        role_name,
        'public.profiles',
        'UPDATE'
      )
      or pg_catalog.has_table_privilege(
        role_name,
        'public.profiles',
        'DELETE'
      )
      or pg_catalog.has_table_privilege(
        role_name,
        'public.profiles',
        'TRUNCATE'
      )
      or pg_catalog.has_table_privilege(
        role_name,
        'public.profiles',
        'REFERENCES'
      )
      or pg_catalog.has_table_privilege(
        role_name,
        'public.profiles',
        'TRIGGER'
      )
      or pg_catalog.has_table_privilege(
        role_name,
        'public.profiles',
        'MAINTAIN'
      )
    then
      raise exception 'profiles privilege boundary differs for %', role_name;
    end if;

    if pg_catalog.has_table_privilege(
        role_name,
        'public.user_accounts',
        'DELETE'
      )
      or pg_catalog.has_table_privilege(
        role_name,
        'public.user_accounts',
        'TRUNCATE'
      )
    then
      raise exception 'direct account deletion remains for %', role_name;
    end if;
  end loop;

  if not pg_catalog.has_table_privilege(
      'service_role',
      'public.member_profiles',
      'INSERT'
    )
    or not pg_catalog.has_table_privilege(
      'service_role',
      'public.member_profiles',
      'UPDATE'
    )
    or not pg_catalog.has_table_privilege(
      'service_role',
      'public.celebs',
      'INSERT'
    )
    or not pg_catalog.has_table_privilege(
      'service_role',
      'public.celebs',
      'UPDATE'
    )
  then
    raise exception 'service_role canonical DML privileges are missing';
  end if;

  perform private.assert_profile_cutover_sync();
end;
$$;

drop function private.assert_profile_cutover_sync();

notify pgrst, 'reload schema';

commit;
