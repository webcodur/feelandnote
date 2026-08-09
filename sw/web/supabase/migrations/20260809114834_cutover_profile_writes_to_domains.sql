begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';

create function private.assert_profile_cutover_sync()
returns void
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  if (
    select count(*)
    from public.profiles as profile
    where profile.profile_type = 'USER'
  ) <> (
    select count(*)
    from public.member_profiles
  ) then
    raise exception 'member profile count mismatch';
  end if;

  if (
    select count(*)
    from public.user_accounts
  ) <> (
    select count(*)
    from public.member_profiles
  ) then
    raise exception 'member account count mismatch';
  end if;

  if (
    select count(*)
    from public.profiles as profile
    where profile.profile_type = 'CELEB'
  ) <> (
    select count(*)
    from public.celebs
  ) then
    raise exception 'celeb count mismatch';
  end if;

  if (
    select count(*)
    from public.profiles
  ) <> (
    (select count(*) from public.member_profiles)
    + (select count(*) from public.celebs)
  ) then
    raise exception 'compatibility profile total mismatch';
  end if;

  if exists (
    select 1
    from public.user_accounts as account
    full join public.member_profiles as member on member.id = account.id
    where account.id is null
      or member.id is null
  ) then
    raise exception 'member account identity mismatch';
  end if;

  if exists (
    select 1
    from auth.users as auth_user
    full join public.user_accounts as account on account.id = auth_user.id
    where auth_user.id is null
      or account.id is null
  ) then
    raise exception 'Auth user and member account identity mismatch';
  end if;

  if exists (
    select 1
    from public.profiles as profile
    full join public.member_profiles as member on member.id = profile.id
    where (
        profile.profile_type = 'USER'
        or member.id is not null
      )
      and (
        profile.id is null
        or member.id is null
        or profile.profile_type is distinct from 'USER'
        or row(
          profile.id,
          profile.nickname,
          profile.avatar_url,
          profile.bio,
          profile.birth_date,
          profile.nationality,
          profile.is_verified,
          profile.selected_title,
          profile.showcase_titles,
          profile.created_at,
          profile.updated_at
        ) is distinct from row(
          member.id,
          member.nickname,
          member.avatar_url,
          member.bio,
          member.birth_date,
          member.nationality,
          member.is_verified,
          member.selected_title,
          member.showcase_titles,
          member.created_at,
          member.updated_at
        )
      )
  ) then
    raise exception 'member profile field mismatch';
  end if;

  if exists (
    select 1
    from public.profiles as profile
    full join public.celebs as celeb on celeb.id = profile.id
    where (
        profile.profile_type = 'CELEB'
        or celeb.id is not null
      )
      and (
        profile.id is null
        or celeb.id is null
        or profile.profile_type is distinct from 'CELEB'
        or row(
          profile.nickname,
          profile.avatar_url,
          profile.created_at,
          profile.status,
          profile.claimed_by,
          profile.is_verified,
          profile.bio,
          profile.profession,
          profile.portrait_url,
          profile.nationality,
          profile.birth_date,
          profile.death_date,
          profile.title,
          profile.consumption_philosophy,
          profile.gender,
          profile.nickname_en,
          profile.slug_suffix,
          profile.slug,
          profile.speech_tone,
          profile.title_en,
          profile.bio_en,
          profile.consumption_philosophy_en,
          profile.celeb_tier,
          profile.has_voice,
          profile.voice_id_ko,
          profile.voice_id_en,
          profile.voice_v,
          profile.wikidata_qid,
          profile.cultural_journey,
          profile.cultural_journey_en,
          profile.voice_speed,
          profile.youtube_videos,
          profile.virtual_monologue,
          profile.virtual_monologue_en,
          profile.view_count,
          profile.content_research_status,
          profile.content_research_updated_at,
          profile.content_research_confirmed_empty_at,
          profile.portrait_caption,
          profile.portrait_caption_en,
          profile.virtual_monologue_locked_at,
          profile.updated_at
        ) is distinct from row(
          celeb.nickname,
          celeb.avatar_url,
          celeb.created_at,
          celeb.publication_status,
          celeb.claimed_by_member_id,
          celeb.is_verified,
          celeb.bio,
          celeb.profession,
          celeb.portrait_url,
          celeb.nationality,
          celeb.birth_date,
          celeb.death_date,
          celeb.title,
          celeb.consumption_philosophy,
          celeb.gender,
          celeb.nickname_en,
          celeb.slug_suffix,
          celeb.slug,
          celeb.speech_tone,
          celeb.title_en,
          celeb.bio_en,
          celeb.consumption_philosophy_en,
          celeb.celeb_tier,
          celeb.has_voice,
          celeb.voice_id_ko,
          celeb.voice_id_en,
          celeb.voice_v,
          celeb.wikidata_qid,
          celeb.cultural_journey,
          celeb.cultural_journey_en,
          celeb.voice_speed,
          celeb.youtube_videos,
          celeb.virtual_monologue,
          celeb.virtual_monologue_en,
          celeb.view_count,
          celeb.content_research_status,
          celeb.content_research_updated_at,
          celeb.content_research_confirmed_empty_at,
          celeb.portrait_caption,
          celeb.portrait_caption_en,
          celeb.virtual_monologue_locked_at,
          celeb.updated_at
        )
      )
  ) then
    raise exception 'celeb field mismatch';
  end if;
end;
$$;

revoke all on function private.assert_profile_cutover_sync()
from public, anon, authenticated, service_role;

do $$
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
      and not trigger_record.tgisinternal
  ) <> 1 then
    raise exception 'expected enabled profile forward trigger is missing';
  end if;

  if (
    select count(*)
    from pg_catalog.pg_trigger as trigger_record
    where trigger_record.tgrelid = 'public.user_accounts'::pg_catalog.regclass
      and trigger_record.tgname = 'trg_user_accounts_sync_member_profile'
      and trigger_record.tgfoid =
        'private.sync_member_profile_from_account()'::pg_catalog.regprocedure
      and trigger_record.tgenabled = 'O'
      and trigger_record.tgtype = 21
      and not trigger_record.tgisinternal
  ) <> 1 then
    raise exception 'expected enabled account shadow trigger is missing';
  end if;

  if (
    select count(*)
    from pg_catalog.pg_trigger as trigger_record
    where trigger_record.tgrelid = 'public.profiles'::pg_catalog.regclass
      and trigger_record.tgname = 'trg_profiles_touch_updated_at'
      and trigger_record.tgfoid =
        'public.touch_profile_updated_at()'::pg_catalog.regprocedure
      and trigger_record.tgenabled = 'O'
      and trigger_record.tgtype = 19
      and not trigger_record.tgisinternal
  ) <> 1 then
    raise exception 'expected enabled profile touch trigger is missing';
  end if;
end;
$$;

-- Both directions coexist during the deployment window. The trigger predicate
-- lets only the outermost write synchronize, so old and new app instances can
-- run together without recursive writes.
drop trigger trg_profiles_sync_profile_split on public.profiles;

create trigger trg_profiles_sync_profile_split
after insert or update or delete on public.profiles
for each row
when (pg_catalog.pg_trigger_depth() = 0)
execute function private.sync_profile_split();

create or replace function private.sync_member_profile_to_compat()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if tg_op = 'INSERT' then
    update public.profiles as profile
    set nickname = new.nickname,
        avatar_url = new.avatar_url,
        bio = new.bio,
        birth_date = new.birth_date,
        nationality = new.nationality,
        is_verified = new.is_verified,
        selected_title = new.selected_title,
        showcase_titles = new.showcase_titles,
        created_at = new.created_at,
        updated_at = new.updated_at
    where profile.id = new.id
      and profile.profile_type = 'USER';

    if found then
      return new;
    end if;

    if exists (
      select 1
      from public.profiles as profile
      where profile.id = new.id
    ) then
      raise exception 'member compatibility profile has wrong type: %', new.id
        using errcode = '23514';
    end if;

    insert into public.profiles (
      id,
      profile_type,
      nickname,
      avatar_url,
      bio,
      birth_date,
      nationality,
      is_verified,
      selected_title,
      showcase_titles,
      created_at,
      updated_at
    )
    values (
      new.id,
      'USER',
      new.nickname,
      new.avatar_url,
      new.bio,
      new.birth_date,
      new.nationality,
      new.is_verified,
      new.selected_title,
      new.showcase_titles,
      new.created_at,
      new.updated_at
    );

    return new;
  end if;

  update public.profiles as profile
  set nickname = new.nickname,
      avatar_url = new.avatar_url,
      bio = new.bio,
      birth_date = new.birth_date,
      nationality = new.nationality,
      is_verified = new.is_verified,
      selected_title = new.selected_title,
      showcase_titles = new.showcase_titles,
      created_at = new.created_at,
      updated_at = new.updated_at
  where profile.id = new.id
    and profile.profile_type = 'USER';

  if not found then
    if exists (
      select 1
      from public.profiles as profile
      where profile.id = new.id
    ) then
      raise exception 'member compatibility profile has wrong type: %', new.id
        using errcode = '23514';
    end if;

    raise exception 'member compatibility profile is missing: %', new.id
      using errcode = 'P0002';
  end if;

  return new;
end;
$$;

revoke all on function private.sync_member_profile_to_compat()
from public, anon, authenticated, service_role;

create or replace function private.sync_celeb_to_compat()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if tg_op = 'INSERT' then
    if exists (
      select 1
      from public.profiles as profile
      where profile.id = new.id
    ) then
      raise exception 'celeb compatibility profile already exists: %', new.id
        using errcode = '23505';
    end if;

    insert into public.profiles (
      id,
      profile_type,
      nickname,
      avatar_url,
      created_at,
      status,
      claimed_by,
      is_verified,
      bio,
      profession,
      portrait_url,
      nationality,
      birth_date,
      death_date,
      title,
      consumption_philosophy,
      gender,
      nickname_en,
      slug_suffix,
      speech_tone,
      title_en,
      bio_en,
      consumption_philosophy_en,
      celeb_tier,
      has_voice,
      voice_id_ko,
      voice_id_en,
      voice_v,
      wikidata_qid,
      voice_speed,
      youtube_videos,
      virtual_monologue,
      virtual_monologue_en,
      view_count,
      content_research_status,
      content_research_updated_at,
      content_research_confirmed_empty_at,
      portrait_caption,
      portrait_caption_en,
      virtual_monologue_locked_at,
      updated_at
    )
    values (
      new.id,
      'CELEB',
      new.nickname,
      new.avatar_url,
      new.created_at,
      new.publication_status,
      new.claimed_by_member_id,
      new.is_verified,
      new.bio,
      new.profession,
      new.portrait_url,
      new.nationality,
      new.birth_date,
      new.death_date,
      new.title,
      new.consumption_philosophy,
      new.gender,
      new.nickname_en,
      new.slug_suffix,
      new.speech_tone,
      new.title_en,
      new.bio_en,
      new.consumption_philosophy_en,
      new.celeb_tier,
      new.has_voice,
      new.voice_id_ko,
      new.voice_id_en,
      new.voice_v,
      new.wikidata_qid,
      new.voice_speed,
      new.youtube_videos,
      new.virtual_monologue,
      new.virtual_monologue_en,
      new.view_count,
      new.content_research_status,
      new.content_research_updated_at,
      new.content_research_confirmed_empty_at,
      new.portrait_caption,
      new.portrait_caption_en,
      new.virtual_monologue_locked_at,
      new.updated_at
    );

    return new;
  end if;

  update public.profiles as profile
  set nickname = new.nickname,
      avatar_url = new.avatar_url,
      created_at = new.created_at,
      status = new.publication_status,
      claimed_by = new.claimed_by_member_id,
      is_verified = new.is_verified,
      bio = new.bio,
      profession = new.profession,
      portrait_url = new.portrait_url,
      nationality = new.nationality,
      birth_date = new.birth_date,
      death_date = new.death_date,
      title = new.title,
      consumption_philosophy = new.consumption_philosophy,
      gender = new.gender,
      nickname_en = new.nickname_en,
      slug_suffix = new.slug_suffix,
      speech_tone = new.speech_tone,
      title_en = new.title_en,
      bio_en = new.bio_en,
      consumption_philosophy_en = new.consumption_philosophy_en,
      celeb_tier = new.celeb_tier,
      has_voice = new.has_voice,
      voice_id_ko = new.voice_id_ko,
      voice_id_en = new.voice_id_en,
      voice_v = new.voice_v,
      wikidata_qid = new.wikidata_qid,
      voice_speed = new.voice_speed,
      youtube_videos = new.youtube_videos,
      virtual_monologue = new.virtual_monologue,
      virtual_monologue_en = new.virtual_monologue_en,
      view_count = new.view_count,
      content_research_status = new.content_research_status,
      content_research_updated_at = new.content_research_updated_at,
      content_research_confirmed_empty_at = new.content_research_confirmed_empty_at,
      portrait_caption = new.portrait_caption,
      portrait_caption_en = new.portrait_caption_en,
      virtual_monologue_locked_at = new.virtual_monologue_locked_at,
      updated_at = new.updated_at
  where profile.id = new.id
    and profile.profile_type = 'CELEB';

  if not found then
    if exists (
      select 1
      from public.profiles as profile
      where profile.id = new.id
    ) then
      raise exception 'celeb compatibility profile has wrong type: %', new.id
        using errcode = '23514';
    end if;

    raise exception 'celeb compatibility profile is missing: %', new.id
      using errcode = 'P0002';
  end if;

  return new;
end;
$$;

revoke all on function private.sync_celeb_to_compat()
from public, anon, authenticated, service_role;

-- Canonical rows own modification time. Compatibility rows receive that value.
create trigger trg_member_profiles_touch_updated_at
before update on public.member_profiles
for each row execute function public.touch_profile_updated_at();

create trigger trg_celebs_touch_updated_at
before update on public.celebs
for each row execute function public.touch_profile_updated_at();

-- This validation also derives research timestamps, so it must run on both rows.
-- now() is transaction-stable, keeping the canonical and compatibility values equal.
create trigger trg_celebs_guard_content_research_status
before update of content_research_status on public.celebs
for each row execute function public.guard_celeb_content_research_status();

-- The compatibility guard still protects legacy writes. updated_at is now a
-- system-mirrored value; the finalization migration removes direct DML later.
create or replace function public.guard_member_profile_domain()
returns trigger
language plpgsql
security invoker
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
            'showcase_titles',
            'updated_at'
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
            'showcase_titles',
            'updated_at'
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
    nullif(
      pg_catalog.split_part(coalesce(new.email, ''), '@', 1),
      ''
    ),
    'User'
  );
begin
  insert into public.user_accounts (id, email)
  values (new.id, new.email);

  insert into public.member_profiles (id, nickname)
  values (new.id, profile_nickname);

  return new;
end;
$$;

revoke all on function public.handle_new_user()
from public, anon, authenticated, service_role;

-- Accounts are created before member profiles now. Auth identity and celeb
-- exclusion are the domain boundary; the member trigger creates profiles.
create or replace function private.guard_user_account_domain()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if not exists (
    select 1
    from auth.users as auth_user
    where auth_user.id = new.id
  ) or exists (
    select 1
    from public.celebs as celeb
    where celeb.id = new.id
  ) then
    raise exception 'Member accounts require Auth users and cannot belong to celebs'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function private.guard_user_account_domain()
from public, anon, authenticated, service_role;

-- Signup no longer needs an account-side shadow fill.
drop trigger trg_user_accounts_sync_member_profile on public.user_accounts;

drop policy if exists member_profiles_update_own_active
on public.member_profiles;

create policy member_profiles_update_own_active
on public.member_profiles
for update
to authenticated
using (
  id = (select auth.uid())
  and public.is_current_account_active()
)
with check (
  id = (select auth.uid())
  and public.is_current_account_active()
);

revoke insert, update, delete
on table public.member_profiles, public.celebs
from public, anon, authenticated, service_role;

grant update (
  nickname,
  avatar_url,
  bio,
  birth_date,
  nationality,
  selected_title,
  showcase_titles
)
on table public.member_profiles
to authenticated;

grant insert, update
on table public.member_profiles, public.celebs
to service_role;

create or replace function public.apply_virtual_monologue_candidate(
  p_slug text,
  p_expected_text text,
  p_candidate_text text
)
returns table (
  applied boolean,
  current_text text
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  saved_text text;
begin
  if p_slug is null or btrim(p_slug) = '' then
    raise exception 'slug is required';
  end if;
  if p_candidate_text is null or btrim(p_candidate_text) = '' then
    raise exception 'candidate text is required';
  end if;

  update public.celebs
  set virtual_monologue = p_candidate_text
  where slug = p_slug
    and publication_status = 'active'
    and coalesce(virtual_monologue, '') = coalesce(p_expected_text, '')
  returning virtual_monologue into saved_text;

  if found then
    return query select true, saved_text;
    return;
  end if;

  select coalesce(celeb.virtual_monologue, '')
  into saved_text
  from public.celebs as celeb
  where celeb.slug = p_slug;

  return query select false, saved_text;
end;
$$;

create or replace function public.cancel_celeb_content_research_run(
  target_run_id uuid
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  target_celeb_id uuid;
  target_run_status text;
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
      '진행 중인 조사만 취소할 수 있습니다. run_id=% status=%',
      target_run_id,
      target_run_status;
  end if;

  update public.celeb_content_research_runs as run
  set status = 'cancelled'
  where run.id = target_run_id;

  update public.celebs as celeb
  set content_research_status = 'open'
  where celeb.id = target_celeb_id;

  if not found then
    raise exception 'CELEB 프로필을 찾을 수 없습니다. celeb_id=%', target_celeb_id;
  end if;

  return target_celeb_id;
end;
$$;

create or replace function public.complete_celeb_content_research_run(
  target_run_id uuid
)
returns table (
  celeb_id uuid,
  final_research_status text,
  actual_content_count bigint
)
language plpgsql
security invoker
set search_path = public
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
      target_run_id,
      target_run_status;
  end if;

  -- The completion trigger validates scopes, sources, decisions and links.
  update public.celeb_content_research_runs as run
  set status = 'completed'
  where run.id = target_run_id;

  select count(*)
  into measured_content_count
  from public.user_contents as user_content
  where user_content.user_id = target_celeb_id;

  update public.celebs as celeb
  set content_research_status =
    case
      when measured_content_count = 0 then 'confirmed_empty'
      else 'open'
    end
  where celeb.id = target_celeb_id;

  if not found then
    raise exception 'CELEB 프로필을 찾을 수 없습니다. celeb_id=%', target_celeb_id;
  end if;

  return query
  select
    target_celeb_id,
    case
      when measured_content_count = 0 then 'confirmed_empty'::text
      else 'open'::text
    end,
    measured_content_count;
end;
$$;

create or replace function public.complete_celeb_philosophy_rewrite(
  p_celeb_id uuid,
  p_worker text,
  p_consumption_philosophy text,
  p_consumption_philosophy_en text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_worker text := btrim(coalesce(p_worker, ''));
  v_ko text := btrim(coalesce(p_consumption_philosophy, ''));
  v_en text := btrim(coalesce(p_consumption_philosophy_en, ''));
  v_rows integer;
begin
  if v_worker = '' then
    raise exception 'p_worker is required';
  end if;
  if v_ko = '' then
    raise exception 'p_consumption_philosophy is required';
  end if;
  if v_en = '' then
    raise exception 'p_consumption_philosophy_en is required';
  end if;

  with owned as (
    select 1
    from public.celeb_task_queue as queue
    where queue.task_type = 'philosophy_rewrite_v2'
      and queue.celeb_id = p_celeb_id
      and queue.status = 'in_progress'
      and queue.claimed_by = v_worker
      and (
        queue.lease_expires_at is null
        or queue.lease_expires_at >= now()
      )
    for update of queue
  ),
  updated_celeb as (
    update public.celebs as celeb
    set consumption_philosophy = v_ko,
        consumption_philosophy_en = v_en
    where celeb.id = p_celeb_id
      and exists (select 1 from owned)
    returning celeb.id
  )
  update public.celeb_task_queue as queue
  set status = 'completed',
      completed_at = now(),
      lease_expires_at = null,
      updated_at = now(),
      last_error = null,
      payload = coalesce(queue.payload, '{}'::jsonb)
        || pg_catalog.jsonb_build_object(
          'last_completed_ko_len', pg_catalog.char_length(v_ko),
          'last_completed_en_len', pg_catalog.char_length(v_en)
        )
  where queue.task_type = 'philosophy_rewrite_v2'
    and queue.celeb_id = p_celeb_id
    and exists (select 1 from updated_celeb);

  get diagnostics v_rows = row_count;
  return v_rows = 1;
end;
$$;

create or replace function public.increment_celeb_view(
  p_celeb_id uuid,
  p_increment boolean default true
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  if not exists (
    select 1
    from public.celebs as celeb
    where celeb.id = p_celeb_id
  ) then
    return null;
  end if;

  if not p_increment then
    select celeb.view_count
    into v_count
    from public.celebs as celeb
    where celeb.id = p_celeb_id;

    return v_count;
  end if;

  insert into public.celeb_views_daily (celeb_id, view_date, views)
  values (p_celeb_id, current_date, 1)
  on conflict (celeb_id, view_date)
  do update set views = public.celeb_views_daily.views + 1;

  update public.celebs as celeb
  set view_count = celeb.view_count + 1
  where celeb.id = p_celeb_id
  returning celeb.view_count into v_count;

  return v_count;
end;
$$;

create or replace function public.mark_celeb_content_research_started()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.celebs as celeb
  set content_research_status = 'researching'
  where celeb.id = new.celeb_id;

  if not found then
    raise exception '조사 대상 CELEB 프로필을 찾을 수 없습니다. celeb_id=%', new.celeb_id;
  end if;

  return new;
end;
$$;

create or replace function public.promote_celeb_tier_on_first_content()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.celebs as celeb
  set celeb_tier = 'full'
  where celeb.id = new.user_id
    and celeb.celeb_tier = 'light';

  return null;
end;
$$;

create or replace function public.reopen_celeb_content_research_on_content()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.celebs as celeb
  set content_research_status = 'open'
  where celeb.id = new.user_id
    and celeb.content_research_status = 'confirmed_empty';

  return new;
end;
$$;

create or replace function public.delete_auth_user(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  has_member_account boolean;
  has_member_profile boolean;
  has_celeb boolean;
  compatibility_type text;
begin
  select exists (
    select 1
    from public.user_accounts as account
    where account.id = target_user_id
  ) into has_member_account;

  select exists (
    select 1
    from public.member_profiles as member
    where member.id = target_user_id
  ) into has_member_profile;

  select exists (
    select 1
    from public.celebs as celeb
    where celeb.id = target_user_id
  ) into has_celeb;

  select profile.profile_type
  into compatibility_type
  from public.profiles as profile
  where profile.id = target_user_id;

  if has_member_account or has_member_profile then
    if not has_member_account
      or not has_member_profile
      or has_celeb
      or compatibility_type is distinct from 'USER'
    then
      raise exception 'Member account domain mismatch: %', target_user_id
        using errcode = '23514';
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

    delete from public.member_profiles
    where id = target_user_id;

    delete from public.user_accounts
    where id = target_user_id;

    delete from public.profiles
    where id = target_user_id
      and profile_type = 'USER';

    if not found then
      raise exception 'Member compatibility profile not found: %', target_user_id
        using errcode = 'P0002';
    end if;

    -- user_accounts has an ON DELETE RESTRICT Auth FK, so Auth is always last.
    delete from auth.users
    where id = target_user_id;

    return;
  end if;

  if has_celeb then
    if compatibility_type is distinct from 'CELEB' then
      raise exception 'Celeb profile domain mismatch: %', target_user_id
        using errcode = '23514';
    end if;

    delete from public.celebs
    where id = target_user_id;

    delete from public.profiles
    where id = target_user_id
      and profile_type = 'CELEB';

    if not found then
      raise exception 'Celeb compatibility profile not found: %', target_user_id
        using errcode = 'P0002';
    end if;

    -- New celebs have no Auth row; deleting an absent row is intentionally valid.
    delete from auth.users
    where id = target_user_id;

    return;
  end if;

  raise exception 'Profile domain not found: %', target_user_id
    using errcode = 'P0002';
end;
$$;

revoke all on function public.delete_auth_user(uuid)
from public, anon, authenticated;

grant execute on function public.delete_auth_user(uuid)
to service_role;

-- Reverse triggers are added after canonical writers, validation, signup and
-- permissions are ready. Trigger-depth predicates make the temporary dual
-- direction safe while old app instances drain.
-- Existing profiles validators and slug mirrors run inside the reverse write;
-- any failure rolls back the originating canonical statement.
create trigger trg_member_profiles_sync_profile_compat
after insert or update on public.member_profiles
for each row
when (pg_catalog.pg_trigger_depth() = 0)
execute function private.sync_member_profile_to_compat();

create trigger trg_celebs_sync_profile_compat
after insert or update on public.celebs
for each row
when (pg_catalog.pg_trigger_depth() = 0)
execute function private.sync_celeb_to_compat();

do $$
declare
  reverse_trigger_count integer;
begin
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

  select count(*)
  into reverse_trigger_count
  from pg_catalog.pg_trigger as trigger_record
  join (
    values
      (
        'public.member_profiles'::pg_catalog.regclass,
        'trg_member_profiles_sync_profile_compat'::name,
        'private.sync_member_profile_to_compat()'::pg_catalog.regprocedure
      ),
      (
        'public.celebs'::pg_catalog.regclass,
        'trg_celebs_sync_profile_compat'::name,
        'private.sync_celeb_to_compat()'::pg_catalog.regprocedure
      )
  ) as expected(relation_id, trigger_name, function_id)
    on expected.relation_id = trigger_record.tgrelid
    and expected.trigger_name = trigger_record.tgname
    and expected.function_id = trigger_record.tgfoid
  where not trigger_record.tgisinternal
    and trigger_record.tgenabled = 'O'
    and trigger_record.tgtype = 21
    and trigger_record.tgqual is not null;

  if reverse_trigger_count <> 2 then
    raise exception 'reverse trigger definition mismatch';
  end if;

  if exists (
    select 1
    from pg_catalog.pg_trigger as trigger_record
    where trigger_record.tgrelid = 'public.user_accounts'::pg_catalog.regclass
      and trigger_record.tgname = 'trg_user_accounts_sync_member_profile'
      and not trigger_record.tgisinternal
  ) then
    raise exception 'account shadow trigger still exists';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_trigger as trigger_record
    where trigger_record.tgrelid = 'public.profiles'::pg_catalog.regclass
      and trigger_record.tgname = 'trg_profiles_touch_updated_at'
      and not trigger_record.tgisinternal
  ) then
    raise exception 'compatibility profile touch trigger is missing';
  end if;

  if pg_catalog.has_function_privilege(
      'anon',
      'private.sync_member_profile_to_compat()',
      'EXECUTE'
    )
    or pg_catalog.has_function_privilege(
      'authenticated',
      'private.sync_member_profile_to_compat()',
      'EXECUTE'
    )
    or pg_catalog.has_function_privilege(
      'service_role',
      'private.sync_member_profile_to_compat()',
      'EXECUTE'
    )
    or pg_catalog.has_function_privilege(
      'anon',
      'private.sync_celeb_to_compat()',
      'EXECUTE'
    )
    or pg_catalog.has_function_privilege(
      'authenticated',
      'private.sync_celeb_to_compat()',
      'EXECUTE'
    )
    or pg_catalog.has_function_privilege(
      'service_role',
      'private.sync_celeb_to_compat()',
      'EXECUTE'
    )
  then
    raise exception 'reverse sync function EXECUTE is exposed';
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

  if pg_catalog.has_any_column_privilege(
      'anon',
      'public.member_profiles',
      'INSERT'
    )
    or pg_catalog.has_any_column_privilege(
      'anon',
      'public.member_profiles',
      'UPDATE'
    )
    or pg_catalog.has_table_privilege(
      'anon',
      'public.member_profiles',
      'DELETE'
    )
    or pg_catalog.has_any_column_privilege(
      'anon',
      'public.celebs',
      'INSERT'
    )
    or pg_catalog.has_any_column_privilege(
      'anon',
      'public.celebs',
      'UPDATE'
    )
    or pg_catalog.has_table_privilege(
      'anon',
      'public.celebs',
      'DELETE'
    )
    or pg_catalog.has_any_column_privilege(
      'authenticated',
      'public.member_profiles',
      'INSERT'
    )
    or pg_catalog.has_table_privilege(
      'authenticated',
      'public.member_profiles',
      'DELETE'
    )
    or pg_catalog.has_any_column_privilege(
      'authenticated',
      'public.celebs',
      'INSERT'
    )
    or pg_catalog.has_any_column_privilege(
      'authenticated',
      'public.celebs',
      'UPDATE'
    )
    or pg_catalog.has_table_privilege(
      'authenticated',
      'public.celebs',
      'DELETE'
    )
    or pg_catalog.has_table_privilege(
      'service_role',
      'public.member_profiles',
      'DELETE'
    )
    or pg_catalog.has_table_privilege(
      'service_role',
      'public.celebs',
      'DELETE'
    )
  then
    raise exception 'canonical DML privileges are too broad';
  end if;

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

  if exists (
    select 1
    from pg_catalog.pg_attribute as attribute_record
    where attribute_record.attrelid = 'public.member_profiles'::pg_catalog.regclass
      and attribute_record.attnum > 0
      and not attribute_record.attisdropped
      and attribute_record.attname <> all (array[
        'nickname',
        'avatar_url',
        'bio',
        'birth_date',
        'nationality',
        'selected_title',
        'showcase_titles'
      ]::name[])
      and pg_catalog.has_column_privilege(
        'authenticated',
        'public.member_profiles',
        attribute_record.attname,
        'UPDATE'
      )
  ) then
    raise exception 'authenticated member UPDATE columns are too broad';
  end if;

  if exists (
    select 1
    from pg_catalog.unnest(array[
      'nickname',
      'avatar_url',
      'bio',
      'birth_date',
      'nationality',
      'selected_title',
      'showcase_titles'
    ]::text[]) as allowed(column_name)
    where not pg_catalog.has_column_privilege(
      'authenticated',
      'public.member_profiles',
      allowed.column_name,
      'UPDATE'
    )
  ) then
    raise exception 'authenticated member UPDATE columns are missing';
  end if;

  perform private.assert_profile_cutover_sync();
end;
$$;

notify pgrst, 'reload schema';

commit;
