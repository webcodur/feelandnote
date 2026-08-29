begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';

-- 대표 작품 통합 뒤 정본 《일리아스》 행만 남고 등장인물 24명 연결이 사라졌다.
-- 같은 인물의 여러 작품 연결을 복구하되, 본문에 나오지 않는 멤논·펜테실레이아·시논은 넣지 않는다.
create temporary table iliad_expected_characters (
  slug text primary key,
  sort_order integer not null
) on commit drop;

insert into iliad_expected_characters (slug, sort_order)
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
  ('aeneas', 15),
  ('zeus', 16),
  ('hera', 17),
  ('poseidon', 18),
  ('athena', 19),
  ('apollo', 20),
  ('ares', 21),
  ('aphrodite', 22),
  ('hermes', 23);

select content.id
from public.contents as content
where content.id = 'f44760c9-113f-4a04-89da-6eaca5f8af13'
for update;

do $$
declare
  resolved_count integer;
begin
  if not exists (
    select 1
    from public.fiction_source_contents as source
    join public.content_locales as locale
      on locale.content_id = source.content_id
     and locale.locale = 'ko'
    where source.content_id = 'f44760c9-113f-4a04-89da-6eaca5f8af13'
      and locale.title = '일리아스'
  ) then
    raise exception '정본 일리아스 대표 원전을 찾을 수 없습니다';
  end if;

  select count(*)
    into resolved_count
  from iliad_expected_characters as expected
  join public.celebs as celeb
    on celeb.slug = expected.slug
   and celeb.celeb_tier = 'fiction'
   and celeb.publication_status = 'active';

  if resolved_count <> 24 then
    raise exception '일리아스 등장인물 해석 실패: 24명 중 %명', resolved_count;
  end if;

  insert into public.fiction_source_characters (
    content_id,
    celeb_id,
    relation_type,
    sort_order
  )
  select
    'f44760c9-113f-4a04-89da-6eaca5f8af13',
    celeb.id,
    'appearance',
    expected.sort_order
  from iliad_expected_characters as expected
  join public.celebs as celeb
    on celeb.slug = expected.slug
  order by expected.sort_order
  on conflict (content_id, celeb_id) do update
  set relation_type = excluded.relation_type,
      sort_order = excluded.sort_order;

  update public.fiction_source_contents
  set updated_at = now()
  where content_id = 'f44760c9-113f-4a04-89da-6eaca5f8af13';

  if (
    select count(*)
    from public.fiction_source_characters
    where content_id = 'f44760c9-113f-4a04-89da-6eaca5f8af13'
  ) <> 24 then
    raise exception '일리아스 등장인물 연결 복구 뒤 관계 수가 24건이 아닙니다';
  end if;
end
$$;

commit;
