begin;

create or replace function public.is_current_account_active()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select exists (
    select 1
    from public.user_accounts as account
    where account.id = (select auth.uid())
      and account.account_status = 'active'
  );
$$;

revoke all on function public.is_current_account_active()
from public, anon, authenticated, service_role;

grant execute on function public.is_current_account_active()
to authenticated, service_role;

create or replace function public.get_current_account_access_state()
returns text
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select case
    when (select auth.uid()) is null then 'incomplete'
    when not exists (
      select 1
      from public.user_accounts as account
      where account.id = (select auth.uid())
    ) then 'incomplete'
    when not exists (
      select 1
      from public.profiles as profile
      where profile.id = (select auth.uid())
        and profile.profile_type = 'USER'
    ) then 'incomplete'
    when exists (
      select 1
      from public.user_accounts as account
      where account.id = (select auth.uid())
        and account.account_status = 'active'
    ) then 'active'
    else 'blocked'
  end;
$$;

revoke all on function public.get_current_account_access_state()
from public, anon, authenticated, service_role;

grant execute on function public.get_current_account_access_state()
to authenticated;

create or replace function public.check_active_account_request()
returns void
language plpgsql
stable
security definer
set search_path = pg_catalog
as $$
declare
  request_path text := pg_catalog.current_setting('request.path', true);
begin
  if (select auth.role()) is distinct from 'authenticated' then
    return;
  end if;

  if request_path in (
    'rpc/get_current_account_access_state',
    'rpc/is_admin',
    'rpc/delete_my_account'
  ) then
    return;
  end if;

  if not public.is_current_account_active() then
    raise sqlstate 'PGRST' using
      message = pg_catalog.json_build_object(
        'code', 'ACCOUNT_INACTIVE',
        'message', 'Account is not active',
        'details', null,
        'hint', null
      )::text,
      detail = pg_catalog.json_build_object(
        'status', 403,
        'status_text', 'Forbidden'
      )::text;
  end if;
end;
$$;

revoke all on function public.check_active_account_request()
from public, anon, authenticated, service_role;

grant execute on function public.check_active_account_request()
to anon, authenticated, service_role;

alter role authenticator
set pgrst.db_pre_request = 'public.check_active_account_request';

notify pgrst, 'reload config';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  profile_nickname text := coalesce(
    nullif(pg_catalog.btrim(new.raw_user_meta_data ->> 'nickname'), ''),
    nullif(pg_catalog.btrim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(pg_catalog.btrim(new.raw_user_meta_data ->> 'name'), ''),
    nullif(pg_catalog.split_part(coalesce(new.email, ''), '@', 1), ''),
    'User'
  );
begin
  insert into public.profiles (id, nickname)
  values (new.id, profile_nickname);

  insert into public.user_accounts (id, email)
  values (new.id, new.email);

  return new;
end;
$$;

revoke execute on function public.handle_new_user()
from public, anon, authenticated, service_role;

revoke execute on function public.set_celeb_quote(uuid, text, text)
from public, anon, authenticated;

grant execute on function public.set_celeb_quote(uuid, text, text)
to service_role;

revoke execute on function public.update_influence(uuid)
from public, anon, authenticated;

grant execute on function public.update_influence(uuid)
to service_role;

create or replace function public.get_similar_users(
  target_user_id uuid,
  result_limit integer default 10
)
returns table(
  user_id uuid,
  nickname text,
  avatar_url text,
  content_count bigint,
  overlap_count bigint,
  similarity double precision
)
language plpgsql
stable
security definer
set search_path = pg_catalog
as $$
declare
  current_user_id uuid := (select auth.uid());
  own_content_count bigint;
begin
  if current_user_id is null
    or (
      target_user_id is distinct from current_user_id
      and not public.is_admin()
    )
  then
    raise exception 'Not allowed to inspect another member'
      using errcode = '42501';
  end if;

  select count(*)
  into own_content_count
  from public.user_contents as own_content
  where own_content.user_id = target_user_id;

  if own_content_count = 0 then
    return;
  end if;

  return query
  with own_contents as (
    select own_content.content_id
    from public.user_contents as own_content
    where own_content.user_id = target_user_id
  ),
  other_user_stats as (
    select
      other_content.user_id as other_user_id,
      count(*) as other_content_count,
      count(*) filter (
        where other_content.content_id in (select content_id from own_contents)
      ) as overlap
    from public.user_contents as other_content
    where other_content.user_id <> target_user_id
      and other_content.visibility = 'public'::public.visibility_type
      and not exists (
        select 1
        from public.follows as followed
        where followed.follower_id = target_user_id
          and followed.following_id = other_content.user_id
      )
      and not exists (
        select 1
        from public.blocks as blocked
        where blocked.blocker_id = target_user_id
          and blocked.blocked_id = other_content.user_id
      )
      and exists (
        select 1
        from public.profiles as member
        where member.id = other_content.user_id
          and member.profile_type = 'USER'
      )
    group by other_content.user_id
    having count(*) filter (
      where other_content.content_id in (select content_id from own_contents)
    ) > 0
  )
  select
    stats.other_user_id,
    member.nickname::text,
    member.avatar_url::text,
    stats.other_content_count,
    stats.overlap,
    stats.overlap::double precision
      / pg_catalog.sqrt(
          own_content_count::double precision
          * stats.other_content_count::double precision
        )
  from other_user_stats as stats
  join public.profiles as member on member.id = stats.other_user_id
  order by 6 desc, stats.overlap desc
  limit least(greatest(coalesce(result_limit, 10), 1), 50);
end;
$$;

revoke all on function public.get_similar_users(uuid, integer)
from public, anon, authenticated, service_role;

grant execute on function public.get_similar_users(uuid, integer)
to authenticated, service_role;

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

  if not exists (
    select 1
    from public.user_accounts as account
    where account.id = current_user_id
  ) then
    raise exception 'Member account not found' using errcode = 'P0002';
  end if;

  perform public.delete_auth_user(current_user_id);
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
begin
  if not public.is_admin() then
    raise exception 'Active administrator required' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.user_accounts as account
    where account.id = target_user_id
  ) then
    raise exception 'Member account not found' using errcode = 'P0002';
  end if;

  perform public.delete_auth_user(target_user_id);
end;
$$;

revoke all on function public.admin_delete_auth_user(uuid)
from public, anon, authenticated, service_role;

grant execute on function public.admin_delete_auth_user(uuid)
to authenticated;

create or replace function public.guard_member_profile_domain()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if (select auth.uid()) = old.id
    and not public.is_admin()
    and (
      pg_catalog.to_jsonb(new)
        - array[
            'nickname',
            'avatar_url',
            'bio',
            'birth_date',
            'nationality',
            'selected_title',
            'showcase_titles'
          ]::text[]
    ) is distinct from (
      pg_catalog.to_jsonb(old)
        - array[
            'nickname',
            'avatar_url',
            'bio',
            'birth_date',
            'nationality',
            'selected_title',
            'showcase_titles'
          ]::text[]
    )
  then
    raise exception 'Members cannot change celeb or account-owned profile fields'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function public.guard_member_profile_domain()
from public, anon, authenticated, service_role;

drop trigger if exists trg_guard_member_profile_domain on public.profiles;

create trigger trg_guard_member_profile_domain
before update on public.profiles
for each row execute function public.guard_member_profile_domain();

create or replace function public.guard_user_content_identity()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if (select auth.uid()) is not null
    and not public.is_admin()
    and (
      new.id is distinct from old.id
      or new.user_id is distinct from old.user_id
      or new.content_id is distinct from old.content_id
      or new.contributor_id is distinct from old.contributor_id
      or new.created_at is distinct from old.created_at
    )
  then
    raise exception 'Members cannot move archive entries between owners or works'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function public.guard_user_content_identity()
from public, anon, authenticated, service_role;

drop trigger if exists trg_guard_user_content_identity on public.user_contents;

create trigger trg_guard_user_content_identity
before update on public.user_contents
for each row execute function public.guard_user_content_identity();

revoke insert, delete on table public.profiles from anon, authenticated;
revoke update on table public.profiles from anon;
revoke insert, update, delete on table public.user_contents from anon;
revoke insert, update, delete on table public.user_accounts from anon;
revoke insert, update, delete on table public.celeb_influence from anon;

revoke truncate, references, trigger
on table public.profiles, public.user_contents, public.user_accounts, public.celeb_influence
from anon, authenticated;

drop policy if exists "Users can insert their own profile." on public.profiles;
drop policy if exists "Admin can update profiles" on public.profiles;
drop policy if exists "Users can update own profile." on public.profiles;

create policy profiles_update_own_member
on public.profiles
for update
to authenticated
using (
  id = (select auth.uid())
  and profile_type = 'USER'
  and public.is_current_account_active()
)
with check (
  id = (select auth.uid())
  and profile_type = 'USER'
  and public.is_current_account_active()
);

create policy profiles_update_admin
on public.profiles
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Anyone can view user contents." on public.user_contents;
drop policy if exists "Users can insert into own or celeb archives." on public.user_contents;
drop policy if exists "Users can update own archive entries." on public.user_contents;
drop policy if exists "Users can delete own archive entries." on public.user_contents;

create policy user_contents_select_visible
on public.user_contents
for select
to anon, authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.profiles as celeb
    where celeb.id = user_contents.user_id
      and celeb.profile_type = 'CELEB'
      and celeb.status = 'active'
  )
  or (
    visibility = 'public'::public.visibility_type
    and exists (
      select 1
      from public.profiles as member
      where member.id = user_contents.user_id
        and member.profile_type = 'USER'
    )
  )
  or user_id = (select auth.uid())
  or (
    visibility = 'followers'::public.visibility_type
    and exists (
      select 1
      from public.follows as followed
      where followed.follower_id = (select auth.uid())
        and followed.following_id = user_contents.user_id
    )
  )
);

create policy user_contents_insert_member_or_contribution
on public.user_contents
for insert
to authenticated
with check (
  public.is_admin()
  or (
    public.is_current_account_active()
    and (
      (
        user_id = (select auth.uid())
        and exists (
          select 1
          from public.profiles as member
          where member.id = user_contents.user_id
            and member.profile_type = 'USER'
        )
      )
      or (
        contributor_id = (select auth.uid())
        and exists (
          select 1
          from public.profiles as celeb
          where celeb.id = user_contents.user_id
            and celeb.profile_type = 'CELEB'
        )
      )
    )
  )
);

create policy user_contents_update_owner_or_contributor
on public.user_contents
for update
to authenticated
using (
  public.is_admin()
  or (
    public.is_current_account_active()
    and (
      user_id = (select auth.uid())
      or (
        contributor_id = (select auth.uid())
        and exists (
          select 1
          from public.profiles as celeb
          where celeb.id = user_contents.user_id
            and celeb.profile_type = 'CELEB'
        )
      )
    )
  )
)
with check (
  public.is_admin()
  or (
    public.is_current_account_active()
    and (
      user_id = (select auth.uid())
      or (
        contributor_id = (select auth.uid())
        and exists (
          select 1
          from public.profiles as celeb
          where celeb.id = user_contents.user_id
            and celeb.profile_type = 'CELEB'
        )
      )
    )
  )
);

create policy user_contents_delete_owner_or_contributor
on public.user_contents
for delete
to authenticated
using (
  public.is_admin()
  or (
    public.is_current_account_active()
    and (
      user_id = (select auth.uid())
      or (
        contributor_id = (select auth.uid())
        and exists (
          select 1
          from public.profiles as celeb
          where celeb.id = user_contents.user_id
            and celeb.profile_type = 'CELEB'
        )
      )
    )
  )
);

drop policy if exists celeb_influence_insert on public.celeb_influence;
drop policy if exists celeb_influence_update on public.celeb_influence;
drop policy if exists celeb_influence_delete on public.celeb_influence;

create policy celeb_influence_insert
on public.celeb_influence
for insert
to authenticated
with check (public.is_admin());

create policy celeb_influence_update
on public.celeb_influence
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy celeb_influence_delete
on public.celeb_influence
for delete
to authenticated
using (public.is_admin());

do $$
begin
  if pg_catalog.has_function_privilege(
    'anon',
    'public.set_celeb_quote(uuid,text,text)',
    'EXECUTE'
  ) then
    raise exception 'anon still has set_celeb_quote EXECUTE';
  end if;

  if pg_catalog.has_function_privilege(
    'authenticated',
    'public.update_influence(uuid)',
    'EXECUTE'
  ) then
    raise exception 'authenticated still has update_influence EXECUTE';
  end if;

  if pg_catalog.has_function_privilege(
    'anon',
    'public.get_similar_users(uuid,integer)',
    'EXECUTE'
  ) then
    raise exception 'anon still has get_similar_users EXECUTE';
  end if;

  if not pg_catalog.has_function_privilege(
    'authenticated',
    'public.delete_my_account()',
    'EXECUTE'
  ) then
    raise exception 'authenticated lacks delete_my_account EXECUTE';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_trigger
    where tgrelid = 'public.profiles'::pg_catalog.regclass
      and tgname = 'trg_guard_member_profile_domain'
      and not tgisinternal
  ) then
    raise exception 'profile domain guard trigger is missing';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_trigger
    where tgrelid = 'public.user_contents'::pg_catalog.regclass
      and tgname = 'trg_guard_user_content_identity'
      and not tgisinternal
  ) then
    raise exception 'user content identity guard trigger is missing';
  end if;
end;
$$;

commit;
