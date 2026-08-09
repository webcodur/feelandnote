begin;

create or replace function private.guard_profile_account_domain()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if new.profile_type = 'CELEB'
    and exists (
      select 1
      from public.user_accounts as account
      where account.id = new.id
    )
  then
    raise exception 'Celeb profiles cannot have member accounts'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function private.guard_profile_account_domain()
from public, anon, authenticated, service_role;

create or replace function private.guard_user_account_domain()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if not exists (
    select 1
    from public.profiles as profile
    where profile.id = new.id
      and profile.profile_type = 'USER'
  ) then
    raise exception 'Member accounts require USER profiles'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function private.guard_user_account_domain()
from public, anon, authenticated, service_role;

create trigger trg_guard_profile_account_domain
before insert or update on public.profiles
for each row execute function private.guard_profile_account_domain();

create trigger trg_guard_user_account_domain
before insert or update on public.user_accounts
for each row execute function private.guard_user_account_domain();

create temporary table celeb_auth_cleanup_ids (
  id uuid primary key
) on commit drop;

insert into celeb_auth_cleanup_ids (id)
select account.id
from public.user_accounts as account
join public.profiles as profile on profile.id = account.id
where profile.profile_type = 'CELEB';

delete from public.user_accounts as account
using celeb_auth_cleanup_ids as cleanup
where account.id = cleanup.id;

delete from auth.users as auth_user
using celeb_auth_cleanup_ids as cleanup
where auth_user.id = cleanup.id;

do $$
begin
  if exists (
    select 1
    from public.user_accounts as account
    join public.profiles as profile on profile.id = account.id
    where profile.profile_type <> 'USER'
  ) then
    raise exception 'non-member profile still has a user account';
  end if;

  if exists (
    select 1
    from public.user_accounts as account
    left join auth.users as auth_user on auth_user.id = account.id
    where auth_user.id is null
  ) then
    raise exception 'user account without auth user';
  end if;

  if exists (
    select 1
    from auth.users as auth_user
    left join public.user_accounts as account on account.id = auth_user.id
    where account.id is null
  ) then
    raise exception 'auth user without user account';
  end if;
end;
$$;

commit;
