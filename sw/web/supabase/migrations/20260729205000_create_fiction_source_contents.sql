-- 신화·전설·허구 인물의 원전 연결.
--
-- contents는 판본 단위 데이터이므로, 작품마다 서비스에서 대표로 보여 줄 contents 행 하나를
-- fiction_source_contents에 지정한다. 인물이 그 작품을 감상했다는 뜻의 user_contents와는
-- 의미가 전혀 다르므로 별도 관계로 유지한다.

create table if not exists public.fiction_source_contents (
  content_id text primary key references public.contents(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.fiction_source_characters (
  content_id text not null references public.fiction_source_contents(content_id) on delete cascade,
  celeb_id uuid not null references public.profiles(id) on delete cascade,
  relation_type text not null default 'appearance',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (content_id, celeb_id),
  constraint fiction_source_characters_relation_type_check
    check (relation_type in ('appearance', 'origin', 'adaptation')),
  constraint fiction_source_characters_sort_order_check
    check (sort_order >= 0)
);

create index if not exists fiction_source_characters_celeb_id_idx
  on public.fiction_source_characters (celeb_id, sort_order, content_id);

comment on table public.fiction_source_contents is
  '신화·전설·허구 작품을 대표하도록 관리자가 지정한 기존 contents 행';
comment on table public.fiction_source_characters is
  '대표 원전 콘텐츠와 fiction 등급 인물의 등장 관계. user_contents(감상 관계)와 구분한다';
comment on column public.fiction_source_characters.relation_type is
  'appearance=작품 등장, origin=이 작품에서 처음 창작됨, adaptation=각색판 등장';

create or replace function public.validate_fiction_source_character()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  target_tier text;
  target_profile_type text;
begin
  select celeb_tier, profile_type
    into target_tier, target_profile_type
  from public.profiles
  where id = new.celeb_id;

  if not found then
    raise exception '연결할 인물 프로필을 찾을 수 없습니다: %', new.celeb_id;
  end if;

  if target_profile_type is distinct from 'CELEB'
     or target_tier is distinct from 'fiction' then
    raise exception '대표 원전에는 fiction 등급 CELEB만 연결할 수 있습니다: %', new.celeb_id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_fiction_source_character
  on public.fiction_source_characters;
create trigger trg_validate_fiction_source_character
  before insert or update of celeb_id
  on public.fiction_source_characters
  for each row
  execute function public.validate_fiction_source_character();

-- 백오피스 저장 한 번으로 대표 지정과 인물 목록 교체를 원자적으로 끝낸다.
create or replace function public.set_fiction_source_characters(
  p_content_id text,
  p_celeb_ids uuid[] default '{}'::uuid[]
)
returns void
language plpgsql
set search_path = public
as $$
declare
  normalized_ids uuid[] := coalesce(p_celeb_ids, '{}'::uuid[]);
begin
  if not exists (
    select 1
    from public.contents
    where id = p_content_id
  ) then
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
    left join public.profiles p on p.id = ids.value_id
    where p.id is null
       or p.profile_type is distinct from 'CELEB'
       or p.celeb_tier is distinct from 'fiction'
  ) then
    raise exception '대표 원전에는 fiction 등급 CELEB만 연결할 수 있습니다';
  end if;

  insert into public.fiction_source_contents (content_id)
  values (p_content_id)
  on conflict (content_id) do update
    set updated_at = now();

  delete from public.fiction_source_characters
  where content_id = p_content_id;

  insert into public.fiction_source_characters (
    content_id,
    celeb_id,
    relation_type,
    sort_order
  )
  select
    p_content_id,
    value_id,
    'appearance',
    ordinal_position - 1
  from unnest(normalized_ids) with ordinality as ids(value_id, ordinal_position);

  update public.fiction_source_contents
  set updated_at = now()
  where content_id = p_content_id;
end;
$$;

revoke all on function public.set_fiction_source_characters(text, uuid[]) from public;
revoke all on function public.set_fiction_source_characters(text, uuid[]) from anon;
revoke all on function public.set_fiction_source_characters(text, uuid[]) from authenticated;
grant execute on function public.set_fiction_source_characters(text, uuid[]) to service_role;

alter table public.fiction_source_contents enable row level security;
alter table public.fiction_source_characters enable row level security;

drop policy if exists "Public can view designated fiction source contents"
  on public.fiction_source_contents;
create policy "Public can view designated fiction source contents"
  on public.fiction_source_contents
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Public can view fiction source characters"
  on public.fiction_source_characters;
create policy "Public can view fiction source characters"
  on public.fiction_source_characters
  for select
  to anon, authenticated
  using (true);

grant select on public.fiction_source_contents to anon, authenticated;
grant select on public.fiction_source_characters to anon, authenticated;

-- 첫 대표 원전: 기존 네이버 도서 ISBN 9788991290167 《일리아스》를 재사용한다.
-- Homer-Iliad 팩션에는 트로이 전쟁 전체 인물이 섞여 있어, 《일리아스》 본문에 등장하지 않는
-- 펜테실레이아·멤논·시논은 의도적으로 제외한다.
with iliad as (
  select id
  from public.contents
  where external_source = 'naver_book'
    and external_id = '9788991290167'
  limit 1
),
iliad_characters(slug, sort_order) as (
  values
    ('agamemnon', 0),
    ('menelaus', 1),
    ('nestor', 2),
    ('achilles', 3),
    ('patroclus', 4),
    ('ajax-the-great', 5),
    ('diomedes', 6),
    ('ajax-the-lesser', 7),
    ('odysseus', 8),
    ('hector', 9),
    ('paris', 10),
    ('priam', 11),
    ('cassandra', 12),
    ('helen', 13),
    ('sarpedon', 14),
    ('aeneas', 15)
)
insert into public.fiction_source_contents (content_id)
select id
from iliad
on conflict (content_id) do nothing;

with iliad as (
  select id
  from public.contents
  where external_source = 'naver_book'
    and external_id = '9788991290167'
  limit 1
),
iliad_characters(slug, sort_order) as (
  values
    ('agamemnon', 0),
    ('menelaus', 1),
    ('nestor', 2),
    ('achilles', 3),
    ('patroclus', 4),
    ('ajax-the-great', 5),
    ('diomedes', 6),
    ('ajax-the-lesser', 7),
    ('odysseus', 8),
    ('hector', 9),
    ('paris', 10),
    ('priam', 11),
    ('cassandra', 12),
    ('helen', 13),
    ('sarpedon', 14),
    ('aeneas', 15)
)
insert into public.fiction_source_characters (
  content_id,
  celeb_id,
  relation_type,
  sort_order
)
select
  iliad.id,
  profiles.id,
  'appearance',
  iliad_characters.sort_order
from iliad
join iliad_characters on true
join public.profiles
  on profiles.slug = iliad_characters.slug
 and profiles.profile_type = 'CELEB'
 and profiles.celeb_tier = 'fiction'
on conflict (content_id, celeb_id) do update
  set relation_type = excluded.relation_type,
      sort_order = excluded.sort_order;
