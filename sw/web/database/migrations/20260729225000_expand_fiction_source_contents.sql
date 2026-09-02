-- 현재 등록된 fiction 인물 48명의 대표 원전 연결을 확장한다.
--
-- 판본 선택 기준:
-- - 이미 contents에 등록되어 있고
-- - 한국어·영문 locale과 표지가 모두 있으며
-- - 같은 작품의 판본 중 user_count가 가장 많은 행
--
-- 작품 경계:
-- - 《일리아스》: 본문에서 실제로 행동하는 영웅·왕·신 24명
-- - 《오디세이아》: 본문 핵심 인물 22명 + 귀향에 직접 개입하는 신 4명
-- - 《신통기》: 현재 등록된 올림포스 신 8명
-- - 《아이네이스》: 아이네이아스와 시논
-- - 펜테실레이아·멤논: 소실된 《아이티오피스》가 직접 원전이며 기존 대표
--   콘텐츠가 없으므로 억지로 다른 작품에 연결하지 않는다.

begin;

do $$
declare
  iliad_id text;
  odyssey_id text;
  theogony_id text;
  aeneid_id text;
  resolved_ids uuid[];
  resolved_count integer;
  linked_count integer;
begin
  select contents.id
    into strict iliad_id
  from public.contents
  where external_source = 'naver_book'
    and external_id = '9788991290167'
    and type = 'BOOK';

  select contents.id
    into strict odyssey_id
  from public.contents
  where external_source = 'naver_book'
    and external_id = '9788961673747'
    and type = 'BOOK';

  select contents.id
    into strict theogony_id
  from public.contents
  where external_source = 'naver_book'
    and external_id = '9788937480515'
    and type = 'BOOK';

  select contents.id
    into strict aeneid_id
  from public.contents
  where external_source = 'naver_book'
    and external_id = '9788952237309'
    and type = 'BOOK';

  -- 《일리아스》: 기존 16명에 본문에서 직접 행동하는 신 8명을 더한다.
  with expected(slug, sort_order) as (
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
      ('hermes', 23)
  ),
  resolved as (
    select profiles.id, expected.sort_order
    from expected
    join public.profiles
      on profiles.slug = expected.slug
     and profiles.profile_type = 'CELEB'
     and profiles.celeb_tier = 'fiction'
     and profiles.status = 'active'
  )
  select array_agg(id order by sort_order), count(*)
    into resolved_ids, resolved_count
  from resolved;

  if resolved_count <> 24 then
    raise exception '일리아스 fiction 인물 해석 실패: 24명 중 %명', resolved_count;
  end if;

  perform public.set_fiction_source_characters(iliad_id, resolved_ids);

  -- 《오디세이아》: faction 명단 22명과 귀향에 직접 개입하는 네 신.
  with expected(slug, sort_order) as (
    values
      ('odysseus', 0),
      ('penelope', 1),
      ('telemachus', 2),
      ('eurylochus', 3),
      ('elpenor', 4),
      ('eumaeus', 5),
      ('eurycleia', 6),
      ('argos', 7),
      ('polyphemus', 8),
      ('scylla', 9),
      ('charybdis', 10),
      ('laestrygonians', 11),
      ('circe', 12),
      ('sirens', 13),
      ('calypso', 14),
      ('lotus-eaters', 15),
      ('tiresias', 16),
      ('nausicaa', 17),
      ('aeolus', 18),
      ('antinous', 19),
      ('eurymachus', 20),
      ('melanthius', 21),
      ('athena', 22),
      ('zeus', 23),
      ('poseidon', 24),
      ('hermes', 25)
  ),
  resolved as (
    select profiles.id, expected.sort_order
    from expected
    join public.profiles
      on profiles.slug = expected.slug
     and profiles.profile_type = 'CELEB'
     and profiles.celeb_tier = 'fiction'
     and profiles.status = 'active'
  )
  select array_agg(id order by sort_order), count(*)
    into resolved_ids, resolved_count
  from resolved;

  if resolved_count <> 26 then
    raise exception '오디세이아 fiction 인물 해석 실패: 26명 중 %명', resolved_count;
  end if;

  perform public.set_fiction_source_characters(odyssey_id, resolved_ids);

  -- 《신통기》: 현재 그리스·로마 신화 faction에 등록된 올림포스 신 8명.
  with expected(slug, sort_order) as (
    values
      ('zeus', 0),
      ('hera', 1),
      ('poseidon', 2),
      ('athena', 3),
      ('apollo', 4),
      ('ares', 5),
      ('aphrodite', 6),
      ('hermes', 7)
  ),
  resolved as (
    select profiles.id, expected.sort_order
    from expected
    join public.profiles
      on profiles.slug = expected.slug
     and profiles.profile_type = 'CELEB'
     and profiles.celeb_tier = 'fiction'
     and profiles.status = 'active'
  )
  select array_agg(id order by sort_order), count(*)
    into resolved_ids, resolved_count
  from resolved;

  if resolved_count <> 8 then
    raise exception '신통기 fiction 인물 해석 실패: 8명 중 %명', resolved_count;
  end if;

  perform public.set_fiction_source_characters(theogony_id, resolved_ids);

  -- 《아이네이스》: 작품의 주인공 아이네이아스와 2권의 목마 기만을 수행한 시논.
  with expected(slug, sort_order) as (
    values
      ('aeneas', 0),
      ('sinon', 1)
  ),
  resolved as (
    select profiles.id, expected.sort_order
    from expected
    join public.profiles
      on profiles.slug = expected.slug
     and profiles.profile_type = 'CELEB'
     and profiles.celeb_tier = 'fiction'
     and profiles.status = 'active'
  )
  select array_agg(id order by sort_order), count(*)
    into resolved_ids, resolved_count
  from resolved;

  if resolved_count <> 2 then
    raise exception '아이네이스 fiction 인물 해석 실패: 2명 중 %명', resolved_count;
  end if;

  perform public.set_fiction_source_characters(aeneid_id, resolved_ids);

  select count(distinct fiction_source_characters.celeb_id)
    into linked_count
  from public.fiction_source_characters;

  if linked_count < 46 then
    raise exception 'fiction 대표 원전 커버리지 실패: 최소 46명, 현재 %명', linked_count;
  end if;
end;
$$;

commit;
