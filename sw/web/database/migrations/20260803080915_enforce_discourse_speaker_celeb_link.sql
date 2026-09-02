-- 담화 발언자도 팩션 인물과 같은 DB CELEB 단일원천 규칙을 따른다.
-- 적용 시점 실측: discourse_speakers 9행, 미연결·잘못된 연결 0행.

do $$
begin
  if exists (select 1 from public.discourse_speakers where celeb_id is null) then
    raise exception 'discourse_speakers.celeb_id 미연결 행이 남아 있다. DB CELEB 연결을 먼저 완료하라';
  end if;

  if exists (
    select 1
    from public.discourse_speakers ds
    left join public.profiles p on p.id = ds.celeb_id
    where p.id is null
       or p.profile_type is distinct from 'CELEB'
       or p.status = 'deleted'
       or nullif(btrim(p.slug), '') is null
       or ds.slug is distinct from p.slug
  ) then
    raise exception 'discourse_speakers에 연결 불가능하거나 slug가 어긋난 프로필이 남아 있다';
  end if;
end
$$;

alter table public.discourse_speakers
  alter column celeb_id set not null;

alter table public.discourse_speakers
  drop constraint if exists discourse_speakers_celeb_id_fkey;

alter table public.discourse_speakers
  add constraint discourse_speakers_celeb_id_fkey
  foreign key (celeb_id)
  references public.profiles(id)
  on delete restrict;

comment on column public.discourse_speakers.celeb_id is
  '필수 DB CELEB 식별자. slug·표시 이름이 아니라 이 UUID가 발언자 정체성의 단일 원천이다.';

create or replace function public.discourse_speakers_require_celeb()
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
    raise exception 'discourse_speakers.celeb_id는 삭제되지 않은 CELEB 프로필이어야 한다: %', new.celeb_id;
  end if;
  if nullif(btrim(v_slug), '') is null then
    raise exception '담화에 연결할 CELEB에는 slug가 필요하다: %', new.celeb_id;
  end if;

  new.slug := v_slug;
  return new;
end
$$;

drop trigger if exists trg_discourse_speakers_require_celeb on public.discourse_speakers;
create trigger trg_discourse_speakers_require_celeb
before insert or update of celeb_id, slug
on public.discourse_speakers
for each row
execute function public.discourse_speakers_require_celeb();

create or replace function public.profiles_guard_discourse_references()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  if exists (select 1 from public.discourse_speakers ds where ds.celeb_id = new.id)
     and (
       new.profile_type is distinct from 'CELEB'
       or new.status = 'deleted'
       or nullif(btrim(new.nickname_en), '') is null
     ) then
    raise exception '담화에 연결된 프로필은 CELEB·비삭제·slug 보유 상태를 유지해야 한다: %', new.id;
  end if;
  return new;
end
$$;

drop trigger if exists trg_profiles_guard_discourse_references on public.profiles;
create trigger trg_profiles_guard_discourse_references
before update of profile_type, status, nickname_en, slug_suffix
on public.profiles
for each row
execute function public.profiles_guard_discourse_references();

create or replace function public.profiles_sync_discourse_slug()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  update public.discourse_speakers
  set slug = new.slug
  where celeb_id = new.id
    and slug is distinct from new.slug;
  return new;
end
$$;

drop trigger if exists trg_profiles_sync_discourse_slug on public.profiles;
create trigger trg_profiles_sync_discourse_slug
after update of nickname_en, slug_suffix
on public.profiles
for each row
when (old.slug is distinct from new.slug)
execute function public.profiles_sync_discourse_slug();

-- 전체 교체 RPC는 자식 삭제 전에 발언자 전원을 검증한다.
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
set search_path = pg_catalog, public
as $$
declare
  v_id uuid;
  v_prev timestamptz;
  v_next timestamptz;
  v_ep public.discourse_episodes;
  v_bad_speaker text;
begin
  if p_folder is null or btrim(p_folder) = '' then
    raise exception 'discourse_replace_episode: p_folder가 비었다';
  end if;
  if p_episode is null or jsonb_typeof(p_episode) <> 'object' then
    raise exception 'discourse_replace_episode: p_episode는 객체여야 한다';
  end if;
  if jsonb_typeof(coalesce(p_speakers, '[]'::jsonb)) <> 'array'
     or jsonb_typeof(coalesce(p_turns, '[]'::jsonb)) <> 'array' then
    raise exception 'discourse_replace_episode: 하위 인자는 배열이어야 한다';
  end if;

  select coalesce(speaker->>'name', speaker->>'celeb_id', '(이름 없음)')
    into v_bad_speaker
  from jsonb_array_elements(coalesce(p_speakers, '[]'::jsonb)) speaker
  where nullif(speaker->>'celeb_id', '') is null
     or not exists (
       select 1
       from public.profiles p
       where p.id::text = speaker->>'celeb_id'
         and p.profile_type = 'CELEB'
         and p.status <> 'deleted'
         and nullif(btrim(p.slug), '') is not null
     )
  limit 1;

  if v_bad_speaker is not null then
    raise exception 'discourse_replace_episode: DB CELEB 미연결 발언자=%', v_bad_speaker;
  end if;

  select id, updated_at into v_id, v_prev
  from public.discourse_episodes
  where folder = p_folder
  for update;

  if v_id is null then
    if p_expected_updated_at is not null then
      raise exception '저장 충돌: folder=% 에피소드가 DB에 없다. 기대 시각을 비우면 새로 만든다', p_folder;
    end if;
  elsif p_expected_updated_at is not null and v_prev <> p_expected_updated_at then
    raise exception '저장 충돌: folder=%를 다른 곳에서 먼저 저장했다 (DB=%, 기대=%)', p_folder, v_prev, p_expected_updated_at;
  end if;

  v_ep := jsonb_populate_record(null::public.discourse_episodes, p_episode);

  if v_id is null then
    insert into public.discourse_episodes
      (folder, title, title_en, topic, topic_en, logline, logline_en, notice, notice_en,
       status, registered, sort_order, longform_layout, data, updated_at)
    values
      (p_folder, v_ep.title, v_ep.title_en, v_ep.topic, v_ep.topic_en,
       v_ep.logline, v_ep.logline_en, v_ep.notice, v_ep.notice_en,
       coalesce(v_ep.status, 'todo'), coalesce(v_ep.registered, false), coalesce(v_ep.sort_order, 0),
       v_ep.longform_layout, coalesce(v_ep.data, '{}'::jsonb), now())
    returning id, updated_at into v_id, v_next;
  else
    update public.discourse_episodes set
      title           = v_ep.title,
      title_en        = v_ep.title_en,
      topic           = v_ep.topic,
      topic_en        = v_ep.topic_en,
      logline         = v_ep.logline,
      logline_en      = v_ep.logline_en,
      notice          = v_ep.notice,
      notice_en       = v_ep.notice_en,
      status          = coalesce(v_ep.status, 'todo'),
      registered      = coalesce(v_ep.registered, false),
      sort_order      = coalesce(v_ep.sort_order, 0),
      longform_layout = v_ep.longform_layout,
      data            = coalesce(v_ep.data, '{}'::jsonb),
      updated_at      = now()
    where id = v_id
    returning updated_at into v_next;
  end if;

  delete from public.discourse_turns where episode_id = v_id;
  delete from public.discourse_speakers where episode_id = v_id;

  if jsonb_array_length(coalesce(p_speakers, '[]'::jsonb)) > 0 then
    insert into public.discourse_speakers
    select * from jsonb_populate_recordset(
      null::public.discourse_speakers,
      (select jsonb_agg(speaker || jsonb_build_object('episode_id', v_id))
       from jsonb_array_elements(p_speakers) speaker)
    );
  end if;

  if jsonb_array_length(coalesce(p_turns, '[]'::jsonb)) > 0 then
    insert into public.discourse_turns
    select * from jsonb_populate_recordset(
      null::public.discourse_turns,
      (select jsonb_agg(turn_row || jsonb_build_object('episode_id', v_id))
       from jsonb_array_elements(p_turns) turn_row)
    );
  end if;

  return jsonb_build_object(
    'episode_id', v_id,
    'updated_at', v_next,
    'speakers', jsonb_array_length(coalesce(p_speakers, '[]'::jsonb)),
    'turns', jsonb_array_length(coalesce(p_turns, '[]'::jsonb))
  );
end
$$;

revoke all on function public.discourse_replace_episode(text, jsonb, jsonb, jsonb, timestamptz)
  from public, anon, authenticated;
grant execute on function public.discourse_replace_episode(text, jsonb, jsonb, jsonb, timestamptz)
  to service_role;

notify pgrst, 'reload schema';
