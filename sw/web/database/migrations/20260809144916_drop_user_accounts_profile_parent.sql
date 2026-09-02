begin;

do $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_constraint as constraint_record
    where constraint_record.conrelid =
        'public.user_accounts'::pg_catalog.regclass
      and constraint_record.conname = 'user_accounts_id_fkey'
      and constraint_record.contype = 'f'
      and constraint_record.confrelid =
        'public.profiles'::pg_catalog.regclass
  ) then
    raise exception 'expected user_accounts profiles FK is missing';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_constraint as constraint_record
    where constraint_record.conrelid =
        'public.user_accounts'::pg_catalog.regclass
      and constraint_record.conname = 'user_accounts_auth_user_id_fkey'
      and constraint_record.contype = 'f'
      and constraint_record.confrelid = 'auth.users'::pg_catalog.regclass
      and constraint_record.convalidated
  ) then
    raise exception 'validated user_accounts Auth FK is missing';
  end if;
end;
$$;

alter table public.user_accounts
drop constraint user_accounts_id_fkey;

do $$
begin
  if exists (
    select 1
    from pg_catalog.pg_constraint as constraint_record
    where constraint_record.conrelid =
        'public.user_accounts'::pg_catalog.regclass
      and constraint_record.contype = 'f'
      and constraint_record.confrelid =
        'public.profiles'::pg_catalog.regclass
  ) then
    raise exception 'user_accounts still references profiles';
  end if;
end;
$$;

notify pgrst, 'reload schema';

commit;
