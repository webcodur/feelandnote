begin;

-- faction_people를 「개인샷만」이 아니라 영상 타임라인의 공통 개인 항목으로 일반화한다.
-- 기존 행은 전부 개인샷이므로 기본값 true로 무손실 승격한다.
alter table public.faction_people
  add column if not exists is_person boolean not null default true;

alter table public.faction_people
  alter column celeb_id drop not null;

alter table public.faction_people
  drop constraint if exists faction_people_subject_link_check;

alter table public.faction_people
  add constraint faction_people_subject_link_check
  check (
    (is_person = true and celeb_id is not null)
    or (is_person = false and celeb_id is null)
  );

comment on column public.faction_people.is_person is
  'true=DB CELEB에 연결되는 개인샷·세력도감 인물, false=같은 영상 타임라인을 쓰지만 세력도감에는 노출하지 않는 서사 컷';

create or replace function public.faction_people_require_celeb()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  canonical_slug text;
begin
  if new.is_person = false then
    new.celeb_id := null;
    new.slug := null;
    return new;
  end if;

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

drop trigger if exists trg_faction_people_require_celeb on public.faction_people;
create trigger trg_faction_people_require_celeb
before insert or update of is_person, celeb_id, slug on public.faction_people
for each row execute function public.faction_people_require_celeb();

create or replace function public.assert_faction_individual_subject()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_name text := lower(trim(coalesce(new.name, '')));
  v_name_en text := lower(trim(coalesce(new.name_en, '')));
begin
  if v_name = '' then
    raise exception 'faction_people.name은 비울 수 없다';
  end if;

  -- 서사 컷 제목은 회사·집단·괴물·사건명일 수 있다. 개인샷에만 자연인 주체 규칙을 적용한다.
  if new.is_person = false then
    return new;
  end if;

  if new.name ~ '(&|[[:space:]]/[[:space:]])'
     or coalesce(new.name_en, '') ~ '(&|[[:space:]]/[[:space:]])'
     or new.name ~ '(형제|자매|족$|조직|단체|집단|협회|재단|위원회|교단|부대|특임단|군단|함대|자주포|전투기|폭격기|미사일|전차|로봇)'
     or coalesce(new.name_en, '') ~* '\m(brothers|sisters|twins|collective|organization|association|foundation|committee|systems|technologies|motors|airlines|airways|corporation|company|group|team|brigade|battalion|missile|bomber|fighter aircraft|tank|robot|harpies|sirens|lotus-eaters|laestrygonians)\M'
     or v_name = any(array[
       'waymo','tesla (fsd)','cruise','boeing','airbus','c919','shield ai','bae systems','rheinmetall',
       'dji','skydio','nuscale','terrapower','x-energy','commonwealth fusion','helion energy','tae technologies',
       'quantumscape','catl','byd','rivian','lucid motors','lg에너지솔루션','panasonic','cia','mi6 (sis)',
       'mossad','sas','devgru (seal team 6)','어나니머스','럴즈섹','다크사이드','죽은 소의 교단',
       '하르피이아','라이스트뤼고네스','라이스트뤼고네스족','세이렌','로토스파고스족','기주키의 형제들'
     ])
     or v_name ~ '^(f-[0-9]|b-[0-9]|k[29]([^[:alnum:]]|$)|m1([^[:alnum:]]|$)|falcon (9|heavy)$|starship$|dragon$|new (shepard|glenn)$|saturn v$|sls$|atlas v$|vulcan centaur$|electron$|neutron$|figure [0-9]|neo beta$|unitree g1$)'
  then
    raise exception 'faction_people 개인샷에는 개별 인물만 등록할 수 있다: %', new.name;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_faction_people_individual_subject on public.faction_people;
create trigger trg_faction_people_individual_subject
before insert or update of is_person, name, name_en on public.faction_people
for each row execute function public.assert_faction_individual_subject();

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
  where coalesce((person ->> 'is_person')::boolean, true) = true
    and (
      nullif(person ->> 'celeb_id', '') is null
      or not exists (
        select 1
        from public.celebs as celeb
        where celeb.id::text = person ->> 'celeb_id'
          and celeb.publication_status <> 'deleted'
          and nullif(btrim(celeb.slug), '') is not null
      )
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
  elsif p_expected_updated_at is not null and previous_updated_at <> p_expected_updated_at then
    raise exception '저장 충돌: folder=%를 다른 곳에서 먼저 저장했다', p_folder;
  end if;

  episode_row := jsonb_populate_record(null::public.faction_episodes, p_episode);
  if v_episode_id is null then
    insert into public.faction_episodes(
      folder, title, title_en, logline, logline_en, status, registered,
      sort_order, longform_layout, data, updated_at
    ) values (
      p_folder, episode_row.title, episode_row.title_en, episode_row.logline, episode_row.logline_en,
      coalesce(episode_row.status, 'blocked'), coalesce(episode_row.registered, false),
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
    select * from jsonb_populate_recordset(
      null::public.faction_groups,
      (select jsonb_agg(group_row || jsonb_build_object('episode_id', v_episode_id))
       from jsonb_array_elements(p_groups) as group_row)
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

commit;
