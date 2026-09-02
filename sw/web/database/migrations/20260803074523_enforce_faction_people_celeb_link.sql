-- 팩션 인물은 언제나 실제 DB CELEB를 가리킨다.
-- 선행 조건: 실제 개별 인물만 연결하고 비인물 행은 제거한 뒤 미연결 0건.
-- scripts/backfill-faction-celebs.ts의 전수 자동 계정화는 비인물 계정 사고로 폐기됐다.

do $$
begin
  if exists (select 1 from public.faction_people where celeb_id is null) then
    raise exception 'faction_people.celeb_id 미연결 행이 남아 있다. 개별 인물은 DB 프로필에 연결하고 비인물 행은 제거하라';
  end if;

  if exists (
    select 1
    from public.faction_people fp
    left join public.profiles p on p.id = fp.celeb_id
    where p.id is null
       or p.profile_type is distinct from 'CELEB'
       or p.status = 'deleted'
       or nullif(btrim(p.slug), '') is null
  ) then
    raise exception 'faction_people에 연결 불가능한 프로필이 남아 있다';
  end if;
end
$$;

alter table public.faction_people
  alter column celeb_id set not null;

alter table public.faction_people
  drop constraint if exists faction_people_celeb_id_fkey;

alter table public.faction_people
  add constraint faction_people_celeb_id_fkey
  foreign key (celeb_id)
  references public.profiles(id)
  on delete restrict;

comment on column public.faction_people.celeb_id is
  '필수 DB CELEB 식별자. slug·표시 이름이 아니라 이 UUID가 인물 정체성의 단일 원천이다.';

-- 삽입·교체 때 CELEB 여부를 검사하고 slug 미러를 프로필의 현재 값으로 정규화한다.
create or replace function public.faction_people_require_celeb()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_slug text;
begin
  select p.slug
    into v_slug
  from public.profiles p
  where p.id = new.celeb_id
    and p.profile_type = 'CELEB'
    and p.status <> 'deleted';

  if not found then
    raise exception 'faction_people.celeb_id는 삭제되지 않은 CELEB 프로필이어야 한다: %', new.celeb_id;
  end if;
  if nullif(btrim(v_slug), '') is null then
    raise exception '팩션에 연결할 CELEB에는 slug가 필요하다: %', new.celeb_id;
  end if;

  new.slug := v_slug;
  return new;
end
$$;

drop trigger if exists trg_faction_people_require_celeb on public.faction_people;
create trigger trg_faction_people_require_celeb
before insert or update of celeb_id, slug
on public.faction_people
for each row
execute function public.faction_people_require_celeb();

-- 참조 중인 프로필을 USER/삭제/slug 없음 상태로 바꾸는 역방향 우회도 막는다.
create or replace function public.profiles_guard_faction_references()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  if exists (select 1 from public.faction_people fp where fp.celeb_id = new.id)
     and (
       new.profile_type is distinct from 'CELEB'
       or new.status = 'deleted'
       or nullif(btrim(new.nickname_en), '') is null
     ) then
    raise exception '팩션에 연결된 프로필은 CELEB·비삭제·slug 보유 상태를 유지해야 한다: %', new.id;
  end if;
  return new;
end
$$;

drop trigger if exists trg_profiles_guard_faction_references on public.profiles;
create trigger trg_profiles_guard_faction_references
before update of profile_type, status, nickname_en, slug_suffix
on public.profiles
for each row
execute function public.profiles_guard_faction_references();

-- 프로필 slug 변경은 허용하되 배치 행의 읽기용 미러를 자동 갱신한다.
create or replace function public.profiles_sync_faction_slug()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  update public.faction_people
  set slug = new.slug
  where celeb_id = new.id
    and slug is distinct from new.slug;
  return new;
end
$$;

drop trigger if exists trg_profiles_sync_faction_slug on public.profiles;
create trigger trg_profiles_sync_faction_slug
after update of nickname_en, slug_suffix
on public.profiles
for each row
when (old.slug is distinct from new.slug)
execute function public.profiles_sync_faction_slug();

-- 전체 교체 RPC는 자식 삭제 전에 모든 인물 연결을 선검증한다.
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
set search_path = pg_catalog, public
as $$
declare
  v_id uuid;
  v_prev timestamptz;
  v_next timestamptz;
  v_ep public.faction_episodes;
  v_bad_person text;
begin
  if p_folder is null or btrim(p_folder) = '' then
    raise exception 'faction_replace_episode: p_folder가 비었다';
  end if;
  if p_episode is null or jsonb_typeof(p_episode) <> 'object' then
    raise exception 'faction_replace_episode: p_episode는 객체여야 한다';
  end if;
  if jsonb_typeof(coalesce(p_groups, '[]'::jsonb)) <> 'array'
     or jsonb_typeof(coalesce(p_clusters, '[]'::jsonb)) <> 'array'
     or jsonb_typeof(coalesce(p_people, '[]'::jsonb)) <> 'array'
     or jsonb_typeof(coalesce(p_parts, '[]'::jsonb)) <> 'array' then
    raise exception 'faction_replace_episode: 하위 인자는 배열이어야 한다';
  end if;

  select coalesce(person->>'name', person->>'celeb_id', '(이름 없음)')
    into v_bad_person
  from jsonb_array_elements(coalesce(p_people, '[]'::jsonb)) person
  where nullif(person->>'celeb_id', '') is null
     or not exists (
       select 1
       from public.profiles p
       where p.id::text = person->>'celeb_id'
         and p.profile_type = 'CELEB'
         and p.status <> 'deleted'
         and nullif(btrim(p.slug), '') is not null
     )
  limit 1;

  if v_bad_person is not null then
    raise exception 'faction_replace_episode: DB CELEB 미연결 인물=%', v_bad_person;
  end if;

  select id, updated_at into v_id, v_prev
  from public.faction_episodes
  where folder = p_folder
  for update;

  if v_id is null then
    if p_expected_updated_at is not null then
      raise exception '저장 충돌: folder=% 에피소드가 DB에 없다. 기대 시각을 비우면 새로 만든다', p_folder;
    end if;
  elsif p_expected_updated_at is not null and v_prev <> p_expected_updated_at then
    raise exception '저장 충돌: folder=%를 다른 곳에서 먼저 저장했다 (DB=%, 기대=%)', p_folder, v_prev, p_expected_updated_at;
  end if;

  v_ep := jsonb_populate_record(null::public.faction_episodes, p_episode);

  if v_id is null then
    insert into public.faction_episodes
      (folder, title, title_en, logline, logline_en, status, registered, sort_order, longform_layout, data, updated_at)
    values
      (p_folder, v_ep.title, v_ep.title_en, v_ep.logline, v_ep.logline_en,
       coalesce(v_ep.status, 'blocked'), coalesce(v_ep.registered, false), coalesce(v_ep.sort_order, 0),
       v_ep.longform_layout, coalesce(v_ep.data, '{}'::jsonb), now())
    returning id, updated_at into v_id, v_next;
  else
    update public.faction_episodes set
      title           = v_ep.title,
      title_en        = v_ep.title_en,
      logline         = v_ep.logline,
      logline_en      = v_ep.logline_en,
      status          = coalesce(v_ep.status, 'blocked'),
      registered      = coalesce(v_ep.registered, false),
      sort_order      = coalesce(v_ep.sort_order, 0),
      longform_layout = v_ep.longform_layout,
      data            = coalesce(v_ep.data, '{}'::jsonb),
      updated_at      = now()
    where id = v_id
    returning updated_at into v_next;
  end if;

  delete from public.faction_groups where episode_id = v_id;
  delete from public.faction_episode_parts where episode_id = v_id;

  if jsonb_array_length(coalesce(p_groups, '[]'::jsonb)) > 0 then
    insert into public.faction_groups
    select * from jsonb_populate_recordset(
      null::public.faction_groups,
      (select jsonb_agg(g || jsonb_build_object('episode_id', v_id))
       from jsonb_array_elements(p_groups) g)
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
    insert into public.faction_episode_parts (episode_id, part, comment)
    select v_id, (x->>'part')::int, x->>'comment'
    from jsonb_array_elements(p_parts) x;
  end if;

  return jsonb_build_object(
    'episode_id', v_id,
    'updated_at', v_next,
    'groups', jsonb_array_length(coalesce(p_groups, '[]'::jsonb)),
    'clusters', jsonb_array_length(coalesce(p_clusters, '[]'::jsonb)),
    'people', jsonb_array_length(coalesce(p_people, '[]'::jsonb)),
    'parts', jsonb_array_length(coalesce(p_parts, '[]'::jsonb))
  );
end
$$;

revoke all on function public.faction_replace_episode(text, jsonb, jsonb, jsonb, jsonb, jsonb, timestamptz)
  from public, anon, authenticated;
grant execute on function public.faction_replace_episode(text, jsonb, jsonb, jsonb, jsonb, jsonb, timestamptz)
  to service_role;

-- 공개 도감 뷰는 읽기만 허용한다. 뷰 소유자 권한으로 선별된 공개 행을 읽는 설계는 유지한다.
revoke all privileges on table public.faction_atlas_members from public, anon, authenticated, service_role;
grant select on table public.faction_atlas_members to anon, authenticated, service_role;

notify pgrst, 'reload schema';
