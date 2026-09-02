begin;

set local lock_timeout = '5s';
set local statement_timeout = '120s';

-- Keep the compatibility row in step with domain deletion without making the
-- account-deletion RPC itself depend on the legacy profile table.  These two
-- trigger functions are intentionally compatibility-only and are removed by
-- the later legacy-table drop migration.
create or replace function private.delete_member_profile_compat_row()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if to_regclass('public.profiles') is not null then
    delete from public.profiles
    where id = old.id
      and profile_type = 'USER';
  end if;
  return old;
end;
$$;

create or replace function private.delete_celeb_profile_compat_row()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if to_regclass('public.profiles') is not null then
    delete from public.profiles
    where id = old.id
      and profile_type = 'CELEB';
  end if;
  return old;
end;
$$;

drop trigger if exists member_profiles_delete_compat on public.member_profiles;
create trigger member_profiles_delete_compat
after delete on public.member_profiles
for each row execute function private.delete_member_profile_compat_row();

drop trigger if exists celebs_delete_profile_compat on public.celebs;
create trigger celebs_delete_profile_compat
after delete on public.celebs
for each row execute function private.delete_celeb_profile_compat_row();

-- The service-only primitive works from the physical account domains.  Child
-- domain rows are removed by validated FKs; nullable attribution is cleared
-- first so historical rows survive with their contributor snapshots.
create or replace function public.delete_auth_user(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  has_account boolean;
  has_member boolean;
  has_celeb boolean;
begin
  select exists (
    select 1 from public.user_accounts where id = target_user_id
  ) into has_account;
  select exists (
    select 1 from public.member_profiles where id = target_user_id
  ) into has_member;
  select exists (
    select 1 from public.celebs where id = target_user_id
  ) into has_celeb;

  if has_account or has_member then
    if not has_account or not has_member or has_celeb then
      raise exception 'Member account domain mismatch: %', target_user_id
        using errcode = '23514';
    end if;

    update public.records
    set contributor_id = null
    where contributor_id = target_user_id;

    update public.member_contents
    set contributor_member_id = null
    where contributor_member_id = target_user_id;

    update public.celeb_contents
    set contributor_member_id = null
    where contributor_member_id = target_user_id;

    update public.reports
    set resolved_by = null
    where resolved_by = target_user_id;

    delete from public.user_accounts
    where id = target_user_id;

    if not found then
      raise exception 'Member account not found: %', target_user_id
        using errcode = 'P0002';
    end if;

    delete from auth.users where id = target_user_id;
    return;
  end if;

  if has_celeb then
    delete from public.celebs where id = target_user_id;
    if not found then
      raise exception 'Celeb not found: %', target_user_id
        using errcode = 'P0002';
    end if;

    -- Historical celeb identities may have an auth row; deleting zero rows
    -- is expected for celebs created after the account-domain split.
    delete from auth.users where id = target_user_id;
    return;
  end if;

  raise exception 'Profile domain not found: %', target_user_id
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

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  current_member_id uuid := (select auth.uid());
begin
  if current_member_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.user_accounts
    where id = current_member_id
  ) then
    raise exception 'Member account not found' using errcode = 'P0002';
  end if;

  perform private.delete_member_account(current_member_id);
end;
$$;

-- Celeb validation belongs to the physical celeb row.
create or replace function public.enforce_active_celeb_avatar()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  if new.publication_status = 'active'
     and nullif(btrim(new.avatar_url), '') is null
     and (
       tg_op = 'INSERT'
       or old.publication_status is distinct from 'active'
       or old.avatar_url is distinct from new.avatar_url
     )
  then
    raise exception 'active CELEB requires avatar_url: %', coalesce(new.slug, new.id::text)
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create or replace function public.enforce_celeb_full_requires_content()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  if new.celeb_tier = 'full'
     and (
       tg_op = 'INSERT'
       or old.celeb_tier is distinct from 'full'
     )
     and not exists (
       select 1
       from public.celeb_contents
       where celeb_id = new.id
     )
  then
    raise exception 'celeb_tier=full requires at least one celeb_contents row (celeb id=%, slug=%)',
      new.id, new.slug using errcode = '23514';
  end if;
  return new;
end;
$$;

create or replace function public.guard_virtual_monologue_lock()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  if old.virtual_monologue_locked_at is not null
     and new.virtual_monologue is distinct from old.virtual_monologue
  then
    raise exception
      'virtual_monologue is locked for % (locked at %). Unlock first in a separate statement.',
      coalesce(old.slug, old.id::text), old.virtual_monologue_locked_at;
  end if;
  return new;
end;
$$;

create or replace function public.guard_celeb_content_research_status()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if new.content_research_status is distinct from old.content_research_status then
    if new.content_research_status = 'confirmed_empty' then
      if exists (
        select 1 from public.celeb_contents where celeb_id = new.id
      ) then
        raise exception
          '콘텐츠가 등록된 인물은 confirmed_empty로 변경할 수 없습니다. celeb_id=%',
          new.id;
      end if;

      if not exists (
        select 1
        from public.celeb_content_research_runs as run
        where run.celeb_id = new.id
          and run.status = 'completed'
          and run.completed_at = (
            select max(latest.completed_at)
            from public.celeb_content_research_runs as latest
            where latest.celeb_id = new.id
              and latest.status = 'completed'
          )
          and not exists (
            select 1
            from public.celeb_content_research_findings as finding
            where finding.run_id = run.id
              and finding.decision = 'accepted'
          )
      ) then
        raise exception
          '네 유형 조사 이력 없이 confirmed_empty로 변경할 수 없습니다. celeb_id=%',
          new.id;
      end if;

      if exists (
        select 1
        from public.celeb_content_research_runs
        where celeb_id = new.id and status = 'in_progress'
      ) then
        raise exception
          '진행 중인 조사 실행이 있어 confirmed_empty로 변경할 수 없습니다. celeb_id=%',
          new.id;
      end if;
    end if;

    new.content_research_updated_at := now();
    new.content_research_confirmed_empty_at := case
      when new.content_research_status = 'confirmed_empty' then now()
      else null
    end;
  end if;
  return new;
end;
$$;

create or replace function public.guard_celeb_content_research_run_celeb()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  if tg_op = 'INSERT' and new.status <> 'in_progress' then
    raise exception
      '콘텐츠 조사 실행은 in_progress 상태로만 생성할 수 있습니다. status=%',
      new.status;
  end if;

  if not exists (select 1 from public.celebs where id = new.celeb_id) then
    raise exception
      '콘텐츠 조사 실행은 CELEB에만 만들 수 있습니다. celeb_id=%',
      new.celeb_id;
  end if;
  return new;
end;
$$;

create or replace function public.reopen_celeb_content_research_on_content()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  update public.celebs
  set content_research_status = 'open'
  where id = new.celeb_id
    and content_research_status = 'confirmed_empty';
  return new;
end;
$$;

create or replace function public.promote_celeb_tier_on_first_content()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  update public.celebs
  set celeb_tier = 'full'
  where id = new.celeb_id
    and celeb_tier = 'light';
  return new;
end;
$$;

drop trigger if exists trg_active_celeb_requires_avatar on public.profiles;
drop trigger if exists trg_celeb_full_requires_content on public.profiles;
drop trigger if exists trg_guard_virtual_monologue_lock on public.profiles;
drop trigger if exists trg_guard_celeb_content_research_status on public.profiles;
drop trigger if exists trg_promote_celeb_tier_on_content on public.user_contents;
drop trigger if exists trg_reopen_celeb_content_research_on_content on public.user_contents;

drop trigger if exists trg_celebs_active_requires_avatar on public.celebs;
drop trigger if exists trg_active_celeb_requires_avatar on public.celebs;
create trigger trg_active_celeb_requires_avatar
before insert or update of publication_status, avatar_url on public.celebs
for each row execute function public.enforce_active_celeb_avatar();

drop trigger if exists trg_celebs_full_requires_content on public.celebs;
drop trigger if exists trg_celeb_full_requires_content on public.celebs;
create trigger trg_celeb_full_requires_content
before insert or update of celeb_tier on public.celebs
for each row execute function public.enforce_celeb_full_requires_content();

drop trigger if exists trg_celebs_guard_virtual_monologue_lock on public.celebs;
drop trigger if exists trg_guard_virtual_monologue_lock on public.celebs;
create trigger trg_guard_virtual_monologue_lock
before update of virtual_monologue on public.celebs
for each row execute function public.guard_virtual_monologue_lock();

drop trigger if exists trg_celebs_guard_content_research_status on public.celebs;
create trigger trg_celebs_guard_content_research_status
before update of content_research_status on public.celebs
for each row execute function public.guard_celeb_content_research_status();

drop trigger if exists celeb_contents_promote_tier on public.celeb_contents;
create trigger celeb_contents_promote_tier
after insert on public.celeb_contents
for each row execute function public.promote_celeb_tier_on_first_content();

drop trigger if exists celeb_contents_reopen_research on public.celeb_contents;
create trigger celeb_contents_reopen_research
after insert on public.celeb_contents
for each row execute function public.reopen_celeb_content_research_on_content();

create or replace function public.assert_celeb_content_research_run_ready(
  target_run_id uuid
)
returns void
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  target_celeb_id uuid;
  scope_count integer;
  completed_scope_count integer;
  scope_without_source_count integer;
  unresolved_finding_count integer;
  finding_without_source_count integer;
  accepted_without_primary_count integer;
  accepted_link_mismatch_count integer;
  accepted_type_mismatch_count integer;
begin
  select run.celeb_id
  into target_celeb_id
  from public.celeb_content_research_runs as run
  where run.id = target_run_id;

  if target_celeb_id is null then
    raise exception '조사 실행을 찾을 수 없습니다. run_id=%', target_run_id;
  end if;

  select
    count(*),
    count(*) filter (where scope.status = 'completed')
  into scope_count, completed_scope_count
  from public.celeb_content_research_scopes as scope
  where scope.run_id = target_run_id;

  if scope_count <> 4 or completed_scope_count <> 4 then
    raise exception
      'BOOK/VIDEO/GAME/MUSIC 네 유형을 모두 완료해야 합니다. total=% completed=%',
      scope_count, completed_scope_count;
  end if;

  select count(*)
  into scope_without_source_count
  from public.celeb_content_research_scopes as scope
  where scope.run_id = target_run_id
    and not exists (
      select 1
      from public.celeb_content_research_sources as source
      where source.run_id = scope.run_id
        and source.content_type = scope.content_type
    );

  if scope_without_source_count <> 0 then
    raise exception
      '각 조사 유형에는 실제 확인한 출처 URL이 하나 이상 필요합니다. missing_scopes=%',
      scope_without_source_count;
  end if;

  select count(*)
  into unresolved_finding_count
  from public.celeb_content_research_findings
  where run_id = target_run_id
    and decision = 'candidate';

  if unresolved_finding_count <> 0 then
    raise exception '미판정 후보가 남아 있습니다. unresolved=%', unresolved_finding_count;
  end if;

  select count(*)
  into finding_without_source_count
  from public.celeb_content_research_findings as finding
  where finding.run_id = target_run_id
    and not exists (
      select 1
      from public.celeb_content_research_sources as source
      where source.finding_id = finding.id
    );

  if finding_without_source_count <> 0 then
    raise exception
      '채택·기각 판정마다 출처 URL이 하나 이상 필요합니다. missing_findings=%',
      finding_without_source_count;
  end if;

  select count(*)
  into accepted_without_primary_count
  from public.celeb_content_research_findings as finding
  where finding.run_id = target_run_id
    and finding.decision = 'accepted'
    and not exists (
      select 1
      from public.celeb_content_research_sources as source
      where source.finding_id = finding.id
        and source.source_tier = 'primary'
    );

  if accepted_without_primary_count <> 0 then
    raise exception
      '채택 작품마다 1차 출처가 하나 이상 필요합니다. missing_accepted=%',
      accepted_without_primary_count;
  end if;

  select count(*)
  into accepted_link_mismatch_count
  from public.celeb_content_research_findings as finding
  where finding.run_id = target_run_id
    and finding.decision = 'accepted'
    and not exists (
      select 1
      from public.celeb_contents as content_row
      where content_row.celeb_id = target_celeb_id
        and content_row.content_id = finding.content_id
    );

  if accepted_link_mismatch_count <> 0 then
    raise exception
      '채택 작품이 인물의 celeb_contents에 연결되지 않았습니다. missing_links=%',
      accepted_link_mismatch_count;
  end if;

  select count(*)
  into accepted_type_mismatch_count
  from public.celeb_content_research_findings as finding
  join public.contents as content on content.id = finding.content_id
  where finding.run_id = target_run_id
    and finding.decision = 'accepted'
    and content.type is distinct from finding.content_type;

  if accepted_type_mismatch_count <> 0 then
    raise exception
      '채택 작품의 조사 유형과 콘텐츠 메타 유형이 다릅니다. mismatches=%',
      accepted_type_mismatch_count;
  end if;
end;
$$;

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

  update public.celeb_content_research_runs
  set status = 'completed'
  where id = target_run_id;

  select count(*)
  into measured_content_count
  from public.celeb_contents
  where celeb_id = target_celeb_id;

  update public.celebs
  set content_research_status = case
    when measured_content_count = 0 then 'confirmed_empty'
    else 'open'
  end
  where id = target_celeb_id;

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

create or replace function public.guard_celeb_explanation_profile()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  if not exists (select 1 from public.celebs where id = new.profile_id) then
    raise exception
      '인물 설명은 CELEB에만 만들 수 있습니다. profile_id=%',
      new.profile_id;
  end if;
  return new;
end;
$$;

-- The rewrite queue is operational tooling, but it is still a live RPC
-- surface and must not retain a hidden dependency on profiles.
create or replace function public.claim_next_celeb_philosophy_rewrite(
  p_worker text,
  p_lease_minutes integer default 60
)
returns table(
  celeb_id uuid,
  slug text,
  nickname text,
  profession text,
  celeb_tier text,
  consumption_philosophy text,
  consumption_philosophy_en text,
  priority integer,
  attempt_count integer,
  claimed_at timestamptz,
  lease_expires_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  worker_label text := btrim(coalesce(p_worker, ''));
  lease_minutes integer := greatest(coalesce(p_lease_minutes, 60), 1);
begin
  if worker_label = '' then
    raise exception 'p_worker is required';
  end if;

  return query
  with candidate as (
    select queue.task_type, queue.celeb_id
    from public.celeb_task_queue as queue
    join public.celebs as celeb on celeb.id = queue.celeb_id
    where queue.task_type = 'philosophy_rewrite_v2'
      and celeb.publication_status = 'active'
      and (
        queue.status = 'pending'
        or (queue.status = 'failed' and queue.claimed_by is null)
        or (
          queue.status = 'in_progress'
          and queue.lease_expires_at is not null
          and queue.lease_expires_at < now()
        )
      )
    order by queue.priority desc, queue.created_at, queue.celeb_id
    limit 1
    for update of queue skip locked
  ),
  claimed as (
    update public.celeb_task_queue as queue
    set status = 'in_progress',
        claimed_by = worker_label,
        claimed_at = now(),
        lease_expires_at = now() + make_interval(mins => lease_minutes),
        attempt_count = queue.attempt_count + 1,
        last_error = null,
        completed_at = null,
        updated_at = now()
    from candidate
    where queue.task_type = candidate.task_type
      and queue.celeb_id = candidate.celeb_id
    returning queue.celeb_id, queue.priority, queue.attempt_count,
              queue.claimed_at, queue.lease_expires_at
  )
  select
    celeb.id,
    celeb.slug,
    celeb.nickname,
    celeb.profession,
    celeb.celeb_tier,
    celeb.consumption_philosophy,
    celeb.consumption_philosophy_en,
    claimed.priority,
    claimed.attempt_count,
    claimed.claimed_at,
    claimed.lease_expires_at
  from claimed
  join public.celebs as celeb on celeb.id = claimed.celeb_id;
end;
$$;

create or replace function public.enqueue_missing_celeb_philosophy_rewrite_jobs()
returns integer
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  affected_rows integer;
begin
  insert into public.celeb_task_queue(task_type, celeb_id, status, priority, payload)
  select
    'philosophy_rewrite_v2',
    celeb.id,
    'pending',
    greatest(
      char_length(coalesce(celeb.consumption_philosophy, '')),
      char_length(coalesce(celeb.consumption_philosophy_en, ''))
    ),
    jsonb_build_object(
      'slug', celeb.slug,
      'nickname', celeb.nickname,
      'celeb_tier', celeb.celeb_tier,
      'ko_len', char_length(coalesce(celeb.consumption_philosophy, '')),
      'en_len', char_length(coalesce(celeb.consumption_philosophy_en, ''))
    )
  from public.celebs as celeb
  where celeb.publication_status = 'active'
  on conflict (task_type, celeb_id) do update
    set priority = excluded.priority,
        payload = excluded.payload,
        updated_at = now()
  where public.celeb_task_queue.status in ('pending', 'failed');

  get diagnostics affected_rows = row_count;
  return affected_rows;
end;
$$;

-- Faction/discourse identity and slug mirrors now validate against celebs.
create or replace function public.faction_people_require_celeb()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  canonical_slug text;
begin
  select slug
  into canonical_slug
  from public.celebs
  where id = new.celeb_id
    and publication_status <> 'deleted';

  if not found then
    raise exception 'faction_people.celeb_id는 삭제되지 않은 CELEB여야 한다: %', new.celeb_id;
  end if;
  if nullif(btrim(canonical_slug), '') is null then
    raise exception '팩션에 연결할 CELEB에는 slug가 필요하다: %', new.celeb_id;
  end if;

  new.slug := canonical_slug;
  return new;
end;
$$;

create or replace function public.celebs_guard_faction_references()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  if exists (
    select 1 from public.faction_people where celeb_id = new.id
  ) and (
    new.publication_status = 'deleted'
    or nullif(btrim(new.nickname_en), '') is null
  ) then
    raise exception '팩션에 연결된 CELEB는 비삭제·slug 보유 상태를 유지해야 한다: %', new.id;
  end if;
  return new;
end;
$$;

create or replace function public.celebs_sync_faction_slug()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  update public.faction_people
  set slug = new.slug
  where celeb_id = new.id
    and slug is distinct from new.slug;
  return new;
end;
$$;

create or replace function public.discourse_speakers_require_celeb()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  canonical_slug text;
begin
  select slug
  into canonical_slug
  from public.celebs
  where id = new.celeb_id
    and publication_status <> 'deleted';

  if not found then
    raise exception 'discourse_speakers.celeb_id는 삭제되지 않은 CELEB여야 한다: %', new.celeb_id;
  end if;
  if nullif(btrim(canonical_slug), '') is null then
    raise exception '담화에 연결할 CELEB에는 slug가 필요하다: %', new.celeb_id;
  end if;

  new.slug := canonical_slug;
  return new;
end;
$$;

create or replace function public.celebs_guard_discourse_references()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  if exists (
    select 1 from public.discourse_speakers where celeb_id = new.id
  ) and (
    new.publication_status = 'deleted'
    or nullif(btrim(new.nickname_en), '') is null
  ) then
    raise exception '담화에 연결된 CELEB는 비삭제·slug 보유 상태를 유지해야 한다: %', new.id;
  end if;
  return new;
end;
$$;

create or replace function public.celebs_sync_discourse_slug()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  update public.discourse_speakers
  set slug = new.slug
  where celeb_id = new.id
    and slug is distinct from new.slug;
  return new;
end;
$$;

drop trigger if exists trg_profiles_guard_faction_references on public.profiles;
drop trigger if exists trg_profiles_sync_faction_slug on public.profiles;
drop trigger if exists trg_profiles_guard_discourse_references on public.profiles;
drop trigger if exists trg_profiles_sync_discourse_slug on public.profiles;

drop trigger if exists trg_celebs_guard_faction_references on public.celebs;
create trigger trg_celebs_guard_faction_references
before update of publication_status, nickname_en, slug_suffix on public.celebs
for each row execute function public.celebs_guard_faction_references();

drop trigger if exists trg_celebs_sync_faction_slug on public.celebs;
create trigger trg_celebs_sync_faction_slug
after update of nickname_en, slug_suffix on public.celebs
for each row
when (old.slug is distinct from new.slug)
execute function public.celebs_sync_faction_slug();

drop trigger if exists trg_celebs_guard_discourse_references on public.celebs;
create trigger trg_celebs_guard_discourse_references
before update of publication_status, nickname_en, slug_suffix on public.celebs
for each row execute function public.celebs_guard_discourse_references();

drop trigger if exists trg_celebs_sync_discourse_slug on public.celebs;
create trigger trg_celebs_sync_discourse_slug
after update of nickname_en, slug_suffix on public.celebs
for each row
when (old.slug is distinct from new.slug)
execute function public.celebs_sync_discourse_slug();

drop function if exists public.profiles_guard_faction_references();
drop function if exists public.profiles_sync_faction_slug();
drop function if exists public.profiles_guard_discourse_references();
drop function if exists public.profiles_sync_discourse_slug();

create or replace function public.faction_replace_episode(
  p_folder text,
  p_episode jsonb,
  p_groups jsonb default '[]'::jsonb,
  p_clusters jsonb default '[]'::jsonb,
  p_people jsonb default '[]'::jsonb,
  p_parts jsonb default '[]'::jsonb,
  p_expected_updated_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_episode_id uuid;
  previous_updated_at timestamptz;
  next_updated_at timestamptz;
  episode_row public.faction_episodes;
  invalid_person text;
begin
  if nullif(btrim(p_folder), '') is null then
    raise exception 'faction_replace_episode: p_folder가 비었다';
  end if;
  if p_episode is null or jsonb_typeof(p_episode) <> 'object' then
    raise exception 'faction_replace_episode: p_episode는 객체여야 한다';
  end if;
  if jsonb_typeof(coalesce(p_groups, '[]'::jsonb)) <> 'array'
     or jsonb_typeof(coalesce(p_clusters, '[]'::jsonb)) <> 'array'
     or jsonb_typeof(coalesce(p_people, '[]'::jsonb)) <> 'array'
     or jsonb_typeof(coalesce(p_parts, '[]'::jsonb)) <> 'array'
  then
    raise exception 'faction_replace_episode: 하위 인자는 배열이어야 한다';
  end if;

  select coalesce(person ->> 'name', person ->> 'celeb_id', '(이름 없음)')
  into invalid_person
  from jsonb_array_elements(coalesce(p_people, '[]'::jsonb)) as person
  where nullif(person ->> 'celeb_id', '') is null
     or not exists (
       select 1
       from public.celebs as celeb
       where celeb.id::text = person ->> 'celeb_id'
         and celeb.publication_status <> 'deleted'
         and nullif(btrim(celeb.slug), '') is not null
     )
  limit 1;

  if invalid_person is not null then
    raise exception 'faction_replace_episode: DB CELEB 미연결 인물=%', invalid_person;
  end if;

  select id, updated_at
  into v_episode_id, previous_updated_at
  from public.faction_episodes
  where folder = p_folder
  for update;

  if v_episode_id is null then
    if p_expected_updated_at is not null then
      raise exception '저장 충돌: folder=% 에피소드가 DB에 없다', p_folder;
    end if;
  elsif p_expected_updated_at is not null
        and previous_updated_at <> p_expected_updated_at
  then
    raise exception '저장 충돌: folder=%를 다른 곳에서 먼저 저장했다', p_folder;
  end if;

  episode_row := jsonb_populate_record(null::public.faction_episodes, p_episode);

  if v_episode_id is null then
    insert into public.faction_episodes(
      folder, title, title_en, logline, logline_en, status, registered,
      sort_order, longform_layout, data, updated_at
    ) values (
      p_folder, episode_row.title, episode_row.title_en,
      episode_row.logline, episode_row.logline_en,
      coalesce(episode_row.status, 'blocked'),
      coalesce(episode_row.registered, false),
      coalesce(episode_row.sort_order, 0), episode_row.longform_layout,
      coalesce(episode_row.data, '{}'::jsonb), now()
    ) returning id, updated_at into v_episode_id, next_updated_at;
  else
    update public.faction_episodes
    set title = episode_row.title,
        title_en = episode_row.title_en,
        logline = episode_row.logline,
        logline_en = episode_row.logline_en,
        status = coalesce(episode_row.status, 'blocked'),
        registered = coalesce(episode_row.registered, false),
        sort_order = coalesce(episode_row.sort_order, 0),
        longform_layout = episode_row.longform_layout,
        data = coalesce(episode_row.data, '{}'::jsonb),
        updated_at = now()
    where id = v_episode_id
    returning updated_at into next_updated_at;
  end if;

  delete from public.faction_groups where episode_id = v_episode_id;
  delete from public.faction_episode_parts where episode_id = v_episode_id;

  if jsonb_array_length(coalesce(p_groups, '[]'::jsonb)) > 0 then
    insert into public.faction_groups
    select *
    from jsonb_populate_recordset(
      null::public.faction_groups,
      (
        select jsonb_agg(group_row || jsonb_build_object('episode_id', v_episode_id))
        from jsonb_array_elements(p_groups) as group_row
      )
    );
  end if;

  if jsonb_array_length(coalesce(p_clusters, '[]'::jsonb)) > 0 then
    insert into public.faction_clusters
    select * from jsonb_populate_recordset(null::public.faction_clusters, p_clusters);
  end if;

  if jsonb_array_length(coalesce(p_people, '[]'::jsonb)) > 0 then
    insert into public.faction_people
    select * from jsonb_populate_recordset(null::public.faction_people, p_people);
  end if;

  if jsonb_array_length(coalesce(p_parts, '[]'::jsonb)) > 0 then
    insert into public.faction_episode_parts(episode_id, part, comment)
    select v_episode_id, (part_row ->> 'part')::integer, part_row ->> 'comment'
    from jsonb_array_elements(p_parts) as part_row;
  end if;

  return jsonb_build_object(
    'episode_id', v_episode_id,
    'updated_at', next_updated_at,
    'groups', jsonb_array_length(coalesce(p_groups, '[]'::jsonb)),
    'clusters', jsonb_array_length(coalesce(p_clusters, '[]'::jsonb)),
    'people', jsonb_array_length(coalesce(p_people, '[]'::jsonb)),
    'parts', jsonb_array_length(coalesce(p_parts, '[]'::jsonb))
  );
end;
$$;

create or replace function public.discourse_replace_episode(
  p_folder text,
  p_episode jsonb,
  p_speakers jsonb default '[]'::jsonb,
  p_turns jsonb default '[]'::jsonb,
  p_expected_updated_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_episode_id uuid;
  previous_updated_at timestamptz;
  next_updated_at timestamptz;
  episode_row public.discourse_episodes;
  invalid_speaker text;
begin
  if nullif(btrim(p_folder), '') is null then
    raise exception 'discourse_replace_episode: p_folder가 비었다';
  end if;
  if p_episode is null or jsonb_typeof(p_episode) <> 'object' then
    raise exception 'discourse_replace_episode: p_episode는 객체여야 한다';
  end if;
  if jsonb_typeof(coalesce(p_speakers, '[]'::jsonb)) <> 'array'
     or jsonb_typeof(coalesce(p_turns, '[]'::jsonb)) <> 'array'
  then
    raise exception 'discourse_replace_episode: 하위 인자는 배열이어야 한다';
  end if;

  select coalesce(speaker ->> 'name', speaker ->> 'celeb_id', '(이름 없음)')
  into invalid_speaker
  from jsonb_array_elements(coalesce(p_speakers, '[]'::jsonb)) as speaker
  where nullif(speaker ->> 'celeb_id', '') is null
     or not exists (
       select 1
       from public.celebs as celeb
       where celeb.id::text = speaker ->> 'celeb_id'
         and celeb.publication_status <> 'deleted'
         and nullif(btrim(celeb.slug), '') is not null
     )
  limit 1;

  if invalid_speaker is not null then
    raise exception 'discourse_replace_episode: DB CELEB 미연결 발언자=%', invalid_speaker;
  end if;

  select id, updated_at
  into v_episode_id, previous_updated_at
  from public.discourse_episodes
  where folder = p_folder
  for update;

  if v_episode_id is null then
    if p_expected_updated_at is not null then
      raise exception '저장 충돌: folder=% 에피소드가 DB에 없다', p_folder;
    end if;
  elsif p_expected_updated_at is not null
        and previous_updated_at <> p_expected_updated_at
  then
    raise exception '저장 충돌: folder=%를 다른 곳에서 먼저 저장했다', p_folder;
  end if;

  episode_row := jsonb_populate_record(null::public.discourse_episodes, p_episode);

  if v_episode_id is null then
    insert into public.discourse_episodes(
      folder, title, title_en, topic, topic_en, logline, logline_en,
      notice, notice_en, status, registered, sort_order, longform_layout,
      data, updated_at
    ) values (
      p_folder, episode_row.title, episode_row.title_en,
      episode_row.topic, episode_row.topic_en,
      episode_row.logline, episode_row.logline_en,
      episode_row.notice, episode_row.notice_en,
      coalesce(episode_row.status, 'todo'),
      coalesce(episode_row.registered, false),
      coalesce(episode_row.sort_order, 0), episode_row.longform_layout,
      coalesce(episode_row.data, '{}'::jsonb), now()
    ) returning id, updated_at into v_episode_id, next_updated_at;
  else
    update public.discourse_episodes
    set title = episode_row.title,
        title_en = episode_row.title_en,
        topic = episode_row.topic,
        topic_en = episode_row.topic_en,
        logline = episode_row.logline,
        logline_en = episode_row.logline_en,
        notice = episode_row.notice,
        notice_en = episode_row.notice_en,
        status = coalesce(episode_row.status, 'todo'),
        registered = coalesce(episode_row.registered, false),
        sort_order = coalesce(episode_row.sort_order, 0),
        longform_layout = episode_row.longform_layout,
        data = coalesce(episode_row.data, '{}'::jsonb),
        updated_at = now()
    where id = v_episode_id
    returning updated_at into next_updated_at;
  end if;

  delete from public.discourse_turns where episode_id = v_episode_id;
  delete from public.discourse_speakers where episode_id = v_episode_id;

  if jsonb_array_length(coalesce(p_speakers, '[]'::jsonb)) > 0 then
    insert into public.discourse_speakers
    select *
    from jsonb_populate_recordset(
      null::public.discourse_speakers,
      (
        select jsonb_agg(speaker || jsonb_build_object('episode_id', v_episode_id))
        from jsonb_array_elements(p_speakers) as speaker
      )
    );
  end if;

  if jsonb_array_length(coalesce(p_turns, '[]'::jsonb)) > 0 then
    insert into public.discourse_turns
    select *
    from jsonb_populate_recordset(
      null::public.discourse_turns,
      (
        select jsonb_agg(turn_row || jsonb_build_object('episode_id', v_episode_id))
        from jsonb_array_elements(p_turns) as turn_row
      )
    );
  end if;

  return jsonb_build_object(
    'episode_id', v_episode_id,
    'updated_at', next_updated_at,
    'speakers', jsonb_array_length(coalesce(p_speakers, '[]'::jsonb)),
    'turns', jsonb_array_length(coalesce(p_turns, '[]'::jsonb))
  );
end;
$$;

-- Fiction and speech write helpers validate the physical celeb domain.
create or replace function public.validate_fiction_source_character()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  target_tier text;
begin
  select celeb_tier
  into target_tier
  from public.celebs
  where id = new.celeb_id;

  if not found then
    raise exception '연결할 인물 프로필을 찾을 수 없습니다: %', new.celeb_id;
  end if;
  if target_tier is distinct from 'fiction' then
    raise exception '대표 원전에는 fiction 등급 CELEB만 연결할 수 있습니다: %', new.celeb_id;
  end if;
  return new;
end;
$$;

create or replace function public.set_fiction_source_characters(
  p_content_id text,
  p_celeb_ids uuid[] default '{}'::uuid[]
)
returns void
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  normalized_ids uuid[] := coalesce(p_celeb_ids, '{}'::uuid[]);
begin
  if not exists (select 1 from public.contents where id = p_content_id) then
    raise exception '대표로 지정할 콘텐츠를 찾을 수 없습니다: %', p_content_id;
  end if;

  if cardinality(normalized_ids) <> (
    select count(distinct value_id)
    from unnest(normalized_ids) as ids(value_id)
  ) then
    raise exception '동일한 인물을 한 원전에 중복 연결할 수 없습니다';
  end if;

  if exists (
    select 1
    from unnest(normalized_ids) as ids(value_id)
    left join public.celebs as celeb on celeb.id = ids.value_id
    where celeb.id is null
       or celeb.celeb_tier is distinct from 'fiction'
  ) then
    raise exception '대표 원전에는 fiction 등급 CELEB만 연결할 수 있습니다';
  end if;

  insert into public.fiction_source_contents(content_id)
  values (p_content_id)
  on conflict (content_id) do update set updated_at = now();

  delete from public.fiction_source_characters where content_id = p_content_id;

  insert into public.fiction_source_characters(
    content_id, celeb_id, relation_type, sort_order
  )
  select p_content_id, value_id, 'appearance', ordinal_position - 1
  from unnest(normalized_ids) with ordinality as ids(value_id, ordinal_position);

  update public.fiction_source_contents
  set updated_at = now()
  where content_id = p_content_id;
end;
$$;

create or replace function public.set_celeb_quote(
  p_celeb_id uuid,
  p_quote_ko text,
  p_quote_en text default null
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if nullif(btrim(p_quote_ko), '') is null then
    return false;
  end if;
  if not exists (select 1 from public.celebs where id = p_celeb_id) then
    return false;
  end if;

  insert into public.celeb_dialogues(celeb_id, lines, lines_en)
  values (
    p_celeb_id,
    jsonb_build_object('quote', btrim(p_quote_ko)),
    case
      when nullif(btrim(p_quote_en), '') is null then null
      else jsonb_build_object('quote', btrim(p_quote_en))
    end
  )
  on conflict (celeb_id) do update
  set lines = jsonb_set(
        coalesce(public.celeb_dialogues.lines, '{}'::jsonb),
        '{quote}',
        to_jsonb(btrim(p_quote_ko)),
        true
      ),
      lines_en = case
        when nullif(btrim(p_quote_en), '') is null
          then public.celeb_dialogues.lines_en
        else jsonb_set(
          coalesce(public.celeb_dialogues.lines_en, '{}'::jsonb),
          '{quote}',
          to_jsonb(btrim(p_quote_en)),
          true
        )
      end,
      updated_at = now();

  return true;
end;
$$;

create or replace function public.set_fiction_narrative_events(
  p_celeb_id uuid,
  p_events jsonb
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  inserted_rows integer;
begin
  if not exists (
    select 1
    from public.celebs
    where id = p_celeb_id
      and celeb_tier = 'fiction'
      and publication_status = 'active'
  ) then
    raise exception 'active fiction profile not found: %', p_celeb_id;
  end if;
  if jsonb_typeof(p_events) <> 'array' or jsonb_array_length(p_events) = 0 then
    raise exception 'p_events must be a non-empty JSON array';
  end if;

  delete from public.celeb_timeline_events
  where celeb_id = p_celeb_id and year is null;

  insert into public.celeb_timeline_events(
    celeb_id, year, year_end, month, day, sequence_label, sequence_label_en,
    title, title_en, description, description_en, kind, place_name,
    place_name_en, lat, lng, place_qid, source, source_url, sort_order
  )
  select
    p_celeb_id, null, null, null, null,
    nullif(btrim(event.sequence_label), ''),
    nullif(btrim(event.sequence_label_en), ''),
    btrim(event.title),
    nullif(btrim(event.title_en), ''),
    nullif(btrim(event.description), ''),
    nullif(btrim(event.description_en), ''),
    coalesce(nullif(btrim(event.kind), ''), 'other'),
    nullif(btrim(event.place_name), ''),
    nullif(btrim(event.place_name_en), ''),
    null, null, null, 'manual',
    nullif(btrim(event.source_url), ''),
    event.sort_order
  from jsonb_to_recordset(p_events) as event(
    sequence_label text,
    sequence_label_en text,
    title text,
    title_en text,
    description text,
    description_en text,
    kind text,
    place_name text,
    place_name_en text,
    source_url text,
    sort_order integer
  );

  get diagnostics inserted_rows = row_count;
  return inserted_rows;
end;
$$;

-- One notification per source event makes deletes exact and avoids the old
-- aggregate-count drift.  Existing aggregate rows do not carry these event
-- ids and are therefore preserved.
create unique index if not exists member_notifications_follow_event_idx
  on public.member_notifications((metadata ->> 'follow_id'))
  where type = 'follow' and metadata ? 'follow_id';
create unique index if not exists member_notifications_guestbook_event_idx
  on public.member_notifications((metadata ->> 'guestbook_id'))
  where type = 'guestbook' and metadata ? 'guestbook_id';
create unique index if not exists member_notifications_comment_event_idx
  on public.member_notifications((metadata ->> 'comment_id'))
  where type = 'comment' and metadata ? 'comment_id';
create unique index if not exists member_notifications_like_event_idx
  on public.member_notifications((metadata ->> 'like_id'))
  where type = 'like' and metadata ? 'like_id';

create or replace function private.insert_member_follow_notification(
  p_follow_id uuid,
  p_follower_id uuid,
  p_followed_id uuid
)
returns void
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  follower_name text;
begin
  if p_follower_id = p_followed_id then
    return;
  end if;

  select nickname into follower_name
  from public.member_profiles
  where id = p_follower_id;

  insert into public.member_notifications(
    member_id, actor_member_id, type, message, link, metadata
  ) values (
    p_followed_id,
    p_follower_id,
    'follow',
    coalesce(follower_name, '누군가') || '님이 회원님을 팔로우하기 시작했습니다.',
    '/' || p_follower_id,
    jsonb_build_object('follow_id', p_follow_id, 'follower_id', p_follower_id)
  )
  on conflict do nothing;
end;
$$;

create or replace function private.delete_member_follow_notification(
  p_follow_id uuid
)
returns void
language sql
security definer
set search_path = pg_catalog
as $$
  delete from public.member_notifications
  where type = 'follow'
    and metadata ->> 'follow_id' = p_follow_id::text;
$$;

create or replace function private.insert_member_guestbook_notification(
  p_guestbook_id uuid,
  p_owner_id uuid,
  p_author_id uuid
)
returns void
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  author_name text;
begin
  if p_owner_id = p_author_id
     or not exists (select 1 from public.member_profiles where id = p_owner_id)
  then
    return;
  end if;

  select nickname into author_name
  from public.member_profiles
  where id = p_author_id;

  insert into public.member_notifications(
    member_id, actor_member_id, type, message, link, metadata
  ) values (
    p_owner_id,
    p_author_id,
    'guestbook',
    coalesce(author_name, '누군가') || '님이 방명록에 글을 남겼습니다.',
    '/' || p_owner_id,
    jsonb_build_object('guestbook_id', p_guestbook_id)
  )
  on conflict do nothing;
end;
$$;

create or replace function private.delete_member_guestbook_notification(
  p_guestbook_id uuid
)
returns void
language sql
security definer
set search_path = pg_catalog
as $$
  delete from public.member_notifications
  where type = 'guestbook'
    and metadata ->> 'guestbook_id' = p_guestbook_id::text;
$$;

-- Compatibility-table triggers call these wrappers during the expand phase.
-- They write only to the final notification table.
create or replace function public.handle_new_follow()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  perform private.insert_member_follow_notification(
    new.id, new.follower_id, new.following_id
  );
  return new;
end;
$$;

create or replace function public.handle_delete_follow()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  perform private.delete_member_follow_notification(old.id);
  return old;
end;
$$;

create or replace function public.handle_new_guestbook_entry()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  perform private.insert_member_guestbook_notification(
    new.id, new.profile_id, new.author_id
  );
  return new;
end;
$$;

create or replace function public.handle_delete_guestbook_entry()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  perform private.delete_member_guestbook_notification(old.id);
  return old;
end;
$$;

create or replace function private.handle_new_member_follow_notification()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  -- The compatibility insert fires public.handle_new_follow first.  Once the
  -- old relation is dropped, this trigger becomes the sole producer.
  if to_regclass('public.follows') is not null then
    return new;
  end if;
  perform private.insert_member_follow_notification(
    new.id, new.follower_member_id, new.followed_member_id
  );
  return new;
end;
$$;

create or replace function private.handle_delete_member_follow_notification()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if to_regclass('public.follows') is not null then
    return old;
  end if;
  perform private.delete_member_follow_notification(old.id);
  return old;
end;
$$;

create or replace function private.handle_new_member_guestbook_notification()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if to_regclass('public.guestbook_entries') is not null then
    return new;
  end if;
  perform private.insert_member_guestbook_notification(
    new.id, new.owner_member_id, new.author_member_id
  );
  return new;
end;
$$;

create or replace function private.handle_delete_member_guestbook_notification()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if to_regclass('public.guestbook_entries') is not null then
    return old;
  end if;
  perform private.delete_member_guestbook_notification(old.id);
  return old;
end;
$$;

drop trigger if exists zz_member_follow_notification_insert on public.member_member_follows;
create trigger zz_member_follow_notification_insert
after insert on public.member_member_follows
for each row execute function private.handle_new_member_follow_notification();

drop trigger if exists zz_member_follow_notification_delete on public.member_member_follows;
create trigger zz_member_follow_notification_delete
after delete on public.member_member_follows
for each row execute function private.handle_delete_member_follow_notification();

drop trigger if exists zz_member_guestbook_notification_insert on public.member_guestbook_entries;
create trigger zz_member_guestbook_notification_insert
after insert on public.member_guestbook_entries
for each row execute function private.handle_new_member_guestbook_notification();

drop trigger if exists zz_member_guestbook_notification_delete on public.member_guestbook_entries;
create trigger zz_member_guestbook_notification_delete
after delete on public.member_guestbook_entries
for each row execute function private.handle_delete_member_guestbook_notification();

create or replace function public.handle_new_record_comment()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  record_owner_id uuid;
  record_content_title text;
  commenter_name text;
begin
  select record.user_id, coalesce(locale_ko.title, locale_en.title, '')
  into record_owner_id, record_content_title
  from public.records as record
  left join public.content_locales as locale_ko
    on locale_ko.content_id = record.content_id and locale_ko.locale = 'ko'
  left join public.content_locales as locale_en
    on locale_en.content_id = record.content_id and locale_en.locale = 'en'
  where record.id = new.record_id;

  select nickname into commenter_name
  from public.member_profiles
  where id = new.user_id;

  if record_owner_id is not null and record_owner_id <> new.user_id then
    insert into public.member_notifications(
      member_id, actor_member_id, type, message, link, metadata
    ) values (
      record_owner_id,
      new.user_id,
      'comment',
      coalesce(commenter_name, '누군가') || '님이 회원님의 "'
        || coalesce(record_content_title, '기록') || '"에 댓글을 남겼습니다.',
      '/records/' || new.record_id,
      jsonb_build_object('record_id', new.record_id, 'comment_id', new.id)
    )
    on conflict do nothing;
  end if;
  return new;
end;
$$;

create or replace function public.handle_delete_record_comment()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  delete from public.member_notifications
  where type = 'comment'
    and metadata ->> 'comment_id' = old.id::text;
  return old;
end;
$$;

create or replace function public.handle_new_record_like()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  record_owner_id uuid;
  record_content_title text;
  liker_name text;
begin
  select record.user_id, coalesce(locale_ko.title, locale_en.title, '')
  into record_owner_id, record_content_title
  from public.records as record
  left join public.content_locales as locale_ko
    on locale_ko.content_id = record.content_id and locale_ko.locale = 'ko'
  left join public.content_locales as locale_en
    on locale_en.content_id = record.content_id and locale_en.locale = 'en'
  where record.id = new.record_id;

  select nickname into liker_name
  from public.member_profiles
  where id = new.user_id;

  if record_owner_id is not null and record_owner_id <> new.user_id then
    insert into public.member_notifications(
      member_id, actor_member_id, type, message, link, metadata
    ) values (
      record_owner_id,
      new.user_id,
      'like',
      coalesce(liker_name, '누군가') || '님이 회원님의 "'
        || coalesce(record_content_title, '기록') || '" 기록을 좋아합니다.',
      '/records/' || new.record_id,
      jsonb_build_object('record_id', new.record_id, 'like_id', new.id)
    )
    on conflict do nothing;
  end if;
  return new;
end;
$$;

create or replace function public.handle_delete_record_like()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  delete from public.member_notifications
  where type = 'like'
    and metadata ->> 'like_id' = old.id::text;
  return old;
end;
$$;

create unique index if not exists member_score_logs_record_add_once_idx
  on public.member_score_logs(member_id, reference_id)
  where type = 'activity'
    and action = 'record_add'
    and reference_id is not null;

create or replace function public.on_record_add()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  inserted_rows integer;
begin
  insert into public.member_score_logs(
    member_id, type, action, amount, reference_id
  ) values (
    new.user_id, 'activity', 'record_add', 5, new.id
  )
  on conflict do nothing;

  get diagnostics inserted_rows = row_count;
  if inserted_rows = 0 then
    return new;
  end if;

  insert into public.member_scores(member_id)
  values (new.user_id)
  on conflict (member_id) do nothing;

  update public.member_scores
  set activity_score = activity_score + 5,
      total_score = total_score + 5,
      updated_at = now()
  where member_id = new.user_id;

  return new;
end;
$$;

create or replace function public.update_influence(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  calculated_influence integer;
begin
  select
    coalesce(social.friend_count, 0) * 10
      + coalesce(social.follower_count, 0) * 5
      + coalesce(score.total_score, 0)
  into calculated_influence
  from public.member_social_stats as social
  left join public.member_scores as score on score.member_id = social.member_id
  where social.member_id = p_user_id;

  update public.member_social_stats
  set influence = coalesce(calculated_influence, 0),
      updated_at = now()
  where member_id = p_user_id;
end;
$$;

-- Records are a member-owned domain.  Public rows remain public, follower
-- rows use the member-to-member edge, and suspended/deleted accounts do not
-- leak records through a stale profile row.
drop policy if exists "Users can view own or celeb records." on public.records;
drop policy if exists "Users can insert into own or celeb records." on public.records;
drop policy if exists "Users can update own record entries." on public.records;
drop policy if exists "Users can delete own record entries." on public.records;
drop policy if exists records_select on public.records;
drop policy if exists records_select_visible on public.records;
drop policy if exists records_insert_member on public.records;
drop policy if exists records_update_member on public.records;
drop policy if exists records_delete_member on public.records;

create policy records_select_visible
on public.records
for select
to anon, authenticated
using (
  public.is_admin()
  or user_id = (select auth.uid())
  or (
    exists (
      select 1
      from public.user_accounts as account
      where account.id = records.user_id
        and account.account_status = 'active'
    )
    and (
      visibility = 'public'::public.visibility_type
      or (
        visibility = 'followers'::public.visibility_type
        and exists (
          select 1
          from public.member_member_follows as follow_edge
          where follow_edge.follower_member_id = (select auth.uid())
            and follow_edge.followed_member_id = records.user_id
        )
      )
    )
    and not exists (
      select 1
      from public.blocks as blocked
      where (
        blocked.blocker_id = (select auth.uid())
        and blocked.blocked_id = records.user_id
      ) or (
        blocked.blocker_id = records.user_id
        and blocked.blocked_id = (select auth.uid())
      )
    )
  )
);

create policy records_insert_member
on public.records
for insert
to authenticated
with check (
  public.is_admin()
  or (
    public.is_current_account_active()
    and user_id = (select auth.uid())
    and (contributor_id is null or contributor_id = (select auth.uid()))
  )
);

create policy records_update_member
on public.records
for update
to authenticated
using (
  public.is_admin()
  or (
    public.is_current_account_active()
    and (
      user_id = (select auth.uid())
      or contributor_id = (select auth.uid())
    )
  )
)
with check (
  public.is_admin()
  or (
    public.is_current_account_active()
    and (
      user_id = (select auth.uid())
      or contributor_id = (select auth.uid())
    )
  )
);

create policy records_delete_member
on public.records
for delete
to authenticated
using (
  public.is_admin()
  or (
    public.is_current_account_active()
    and (
      user_id = (select auth.uid())
      or contributor_id = (select auth.uid())
    )
  )
);

drop policy if exists activity_logs_select_own_or_following on public.activity_logs;
drop policy if exists activity_logs_insert_own on public.activity_logs;

create policy activity_logs_select_own_or_following
on public.activity_logs
for select
to authenticated
using (
  public.is_admin()
  or user_id = (select auth.uid())
  or (
    exists (
      select 1
      from public.member_member_follows as follow_edge
      where follow_edge.follower_member_id = (select auth.uid())
        and follow_edge.followed_member_id = activity_logs.user_id
    )
    and exists (
      select 1
      from public.user_accounts as account
      where account.id = activity_logs.user_id
        and account.account_status = 'active'
    )
    and not exists (
      select 1
      from public.blocks as blocked
      where (
        blocked.blocker_id = (select auth.uid())
        and blocked.blocked_id = activity_logs.user_id
      ) or (
        blocked.blocker_id = activity_logs.user_id
        and blocked.blocked_id = (select auth.uid())
      )
    )
  )
);

create policy activity_logs_insert_own
on public.activity_logs
for insert
to authenticated
with check (
  public.is_admin()
  or (
    public.is_current_account_active()
    and user_id = (select auth.uid())
  )
);

-- Trigger functions are internal implementation details, not Data API RPCs.
revoke all on function
  public.enforce_active_celeb_avatar(),
  public.enforce_celeb_full_requires_content(),
  public.guard_virtual_monologue_lock(),
  public.guard_celeb_content_research_status(),
  public.guard_celeb_content_research_run_celeb(),
  public.reopen_celeb_content_research_on_content(),
  public.promote_celeb_tier_on_first_content(),
  public.guard_celeb_explanation_profile(),
  public.faction_people_require_celeb(),
  public.celebs_guard_faction_references(),
  public.celebs_sync_faction_slug(),
  public.discourse_speakers_require_celeb(),
  public.celebs_guard_discourse_references(),
  public.celebs_sync_discourse_slug(),
  public.validate_fiction_source_character(),
  public.handle_new_follow(),
  public.handle_delete_follow(),
  public.handle_new_guestbook_entry(),
  public.handle_delete_guestbook_entry(),
  public.handle_new_record_comment(),
  public.handle_delete_record_comment(),
  public.handle_new_record_like(),
  public.handle_delete_record_like(),
  public.on_record_add()
from public, anon, authenticated, service_role;

revoke all on function
  private.delete_member_profile_compat_row(),
  private.delete_celeb_profile_compat_row(),
  private.delete_member_account(uuid),
  private.insert_member_follow_notification(uuid, uuid, uuid),
  private.delete_member_follow_notification(uuid),
  private.insert_member_guestbook_notification(uuid, uuid, uuid),
  private.delete_member_guestbook_notification(uuid),
  private.handle_new_member_follow_notification(),
  private.handle_delete_member_follow_notification(),
  private.handle_new_member_guestbook_notification(),
  private.handle_delete_member_guestbook_notification()
from public, anon, authenticated, service_role;

revoke all on function public.delete_auth_user(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.delete_auth_user(uuid) to service_role;

revoke all on function public.delete_my_account()
  from public, anon, authenticated, service_role;
grant execute on function public.delete_my_account() to authenticated;

revoke all on function
  public.assert_celeb_content_research_run_ready(uuid),
  public.complete_celeb_content_research_run(uuid),
  public.claim_next_celeb_philosophy_rewrite(text, integer),
  public.enqueue_missing_celeb_philosophy_rewrite_jobs(),
  public.faction_replace_episode(text, jsonb, jsonb, jsonb, jsonb, jsonb, timestamptz),
  public.discourse_replace_episode(text, jsonb, jsonb, jsonb, timestamptz),
  public.set_celeb_quote(uuid, text, text),
  public.set_fiction_narrative_events(uuid, jsonb),
  public.set_fiction_source_characters(text, uuid[]),
  public.update_influence(uuid)
from public, anon, authenticated, service_role;

grant execute on function
  public.assert_celeb_content_research_run_ready(uuid),
  public.complete_celeb_content_research_run(uuid),
  public.claim_next_celeb_philosophy_rewrite(text, integer),
  public.enqueue_missing_celeb_philosophy_rewrite_jobs(),
  public.faction_replace_episode(text, jsonb, jsonb, jsonb, jsonb, jsonb, timestamptz),
  public.discourse_replace_episode(text, jsonb, jsonb, jsonb, timestamptz),
  public.set_celeb_quote(uuid, text, text),
  public.set_fiction_narrative_events(uuid, jsonb),
  public.set_fiction_source_characters(text, uuid[]),
  public.update_influence(uuid)
to service_role;

do $$
declare
  stale_required_functions text;
begin
  select string_agg(
    routine.proname || '(' || pg_get_function_identity_arguments(routine.oid) || ')',
    ', ' order by routine.proname
  )
  into stale_required_functions
  from pg_proc as routine
  join pg_namespace as namespace on namespace.oid = routine.pronamespace
  where namespace.nspname = 'public'
    and routine.proname = any(array[
      'delete_auth_user',
      'delete_my_account',
      'assert_celeb_content_research_run_ready',
      'complete_celeb_content_research_run',
      'guard_celeb_content_research_run_celeb',
      'guard_celeb_content_research_status',
      'guard_celeb_explanation_profile',
      'enforce_active_celeb_avatar',
      'enforce_celeb_full_requires_content',
      'guard_virtual_monologue_lock',
      'faction_people_require_celeb',
      'faction_replace_episode',
      'celebs_guard_faction_references',
      'celebs_sync_faction_slug',
      'discourse_speakers_require_celeb',
      'discourse_replace_episode',
      'celebs_guard_discourse_references',
      'celebs_sync_discourse_slug',
      'set_celeb_quote',
      'set_fiction_narrative_events',
      'set_fiction_source_characters',
      'validate_fiction_source_character',
      'handle_new_record_comment',
      'handle_delete_record_comment',
      'handle_new_record_like',
      'handle_delete_record_like',
      'on_record_add',
      'update_influence',
      'claim_next_celeb_philosophy_rewrite',
      'enqueue_missing_celeb_philosophy_rewrite_jobs'
    ])
    and routine.prosrc ~ '\m(profiles|user_contents|follows|guestbook_entries|user_social|user_scores|score_logs|notifications)\M';

  if stale_required_functions is not null then
    raise exception 'Required trigger/RPC cutover left legacy references: %',
      stale_required_functions;
  end if;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename in ('records', 'activity_logs')
      and (coalesce(qual, '') || coalesce(with_check, ''))
          ~ '\m(profiles|follows)\M'
  ) then
    raise exception 'Record/activity RLS still references a legacy relation';
  end if;

  if exists (
    select 1
    from pg_trigger as trigger_row
    join pg_class as relation on relation.oid = trigger_row.tgrelid
    join pg_namespace as namespace on namespace.oid = relation.relnamespace
    where not trigger_row.tgisinternal
      and namespace.nspname = 'public'
      and relation.relname = 'profiles'
      and trigger_row.tgname = any(array[
        'trg_active_celeb_requires_avatar',
        'trg_celeb_full_requires_content',
        'trg_guard_virtual_monologue_lock',
        'trg_guard_celeb_content_research_status',
        'trg_profiles_guard_faction_references',
        'trg_profiles_sync_faction_slug',
        'trg_profiles_guard_discourse_references',
        'trg_profiles_sync_discourse_slug'
      ])
  ) then
    raise exception 'A celeb-domain validation trigger remains on profiles';
  end if;
end;
$$;

notify pgrst, 'reload schema';

commit;
