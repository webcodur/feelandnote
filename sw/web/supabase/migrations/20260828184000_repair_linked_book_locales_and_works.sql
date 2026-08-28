begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';

create temporary table content_work_merge_map (
  old_id text primary key,
  canonical_id text not null,
  work_title text not null
) on commit drop;

insert into content_work_merge_map (old_id, canonical_id, work_title)
values
  ('9c731512-fe41-4ba1-a09c-0b55d334ccc5', 'b47e690d-7bb3-4f2f-afed-e3c8c125cdf5', '칼의 노래'),
  ('c3a74c37-124d-4ca9-9929-204da64e7ef6', 'd778ac82-5a59-4299-aced-748077cbcae8', '사조영웅전'),
  ('792f4be1-ee35-483b-b1ce-ae42ac28dd5f', 'adbd2550-8b07-4178-b231-ed67825ac86f', '삼국지연의'),
  ('940f6e20-4d0d-4110-b69b-a9a3be16c97b', 'adbd2550-8b07-4178-b231-ed67825ac86f', '삼국지연의'),
  ('f47d8a2a-ae41-4dd2-bb27-fb3f0d7d2716', 'f9dcf342-6d13-40b0-984a-7b2e5a7e74de', '의천도룡기'),
  -- 이 행은 ISBN은 Four Horsemen이지만 제목·영문판·감상 관계가 모두 The God Delusion으로 잘못 붙어 있었다.
  ('4ca45711-4191-4ac1-8efb-f7bc9ee1e23a', '01b762aa-bb6c-4c1c-a4d1-59637eac98ce', '만들어진 신');

select content.id
from public.contents as content
where content.id in (
  select old_id from content_work_merge_map
  union
  select canonical_id from content_work_merge_map
)
order by content.id
for update;

do $$
begin
  if exists (
    select 1
    from content_work_merge_map as mapping
    left join public.contents as canonical on canonical.id = mapping.canonical_id
    left join public.contents as duplicate on duplicate.id = mapping.old_id
    where canonical.id is null
       or canonical.type <> 'BOOK'
       or duplicate.id is null
       or duplicate.type <> 'BOOK'
  ) then
    raise exception 'linked BOOK merge target is missing or has the wrong type';
  end if;

  if exists (
    select 1
    from public.celeb_contents as duplicate
    join content_work_merge_map as mapping on mapping.old_id = duplicate.content_id
    join public.celeb_contents as canonical
      on canonical.celeb_id = duplicate.celeb_id
     and canonical.content_id = mapping.canonical_id
  ) then
    raise exception 'celeb_contents collision while repairing linked BOOKs';
  end if;

  if exists (
    select 1
    from public.member_contents as duplicate
    join content_work_merge_map as mapping on mapping.old_id = duplicate.content_id
    join public.member_contents as canonical
      on canonical.member_id = duplicate.member_id
     and canonical.content_id = mapping.canonical_id
  ) then
    raise exception 'member_contents collision while repairing linked BOOKs';
  end if;

  if exists (
    select 1
    from public.notes as duplicate
    join content_work_merge_map as mapping on mapping.old_id = duplicate.content_id
    join public.notes as canonical
      on canonical.user_id = duplicate.user_id
     and canonical.content_id = mapping.canonical_id
  ) then
    raise exception 'notes collision while repairing linked BOOKs';
  end if;

  if exists (
    select 1
    from public.flow_nodes as duplicate
    join content_work_merge_map as mapping on mapping.old_id = duplicate.content_id
    join public.flow_nodes as canonical
      on canonical.flow_id = duplicate.flow_id
     and canonical.content_id = mapping.canonical_id
  ) then
    raise exception 'flow_nodes collision while repairing linked BOOKs';
  end if;

  if exists (
    select 1
    from public.curated_list_items as duplicate
    join content_work_merge_map as mapping on mapping.old_id = duplicate.content_id
    join public.curated_list_items as canonical
      on canonical.list_id = duplicate.list_id
     and canonical.content_id = mapping.canonical_id
  ) then
    raise exception 'curated_list_items collision while repairing linked BOOKs';
  end if;

  if exists (
    select 1
    from public.fiction_source_contents as duplicate
    join content_work_merge_map as mapping on mapping.old_id = duplicate.content_id
    join public.fiction_source_contents as canonical
      on canonical.content_id = mapping.canonical_id
  ) then
    raise exception 'fiction_source_contents collision while repairing linked BOOKs';
  end if;
end
$$;

update public.celeb_contents as relation
set content_id = mapping.canonical_id
from content_work_merge_map as mapping
where relation.content_id = mapping.old_id;

update public.member_contents as relation
set content_id = mapping.canonical_id
from content_work_merge_map as mapping
where relation.content_id = mapping.old_id;

update public.records as relation
set content_id = mapping.canonical_id
from content_work_merge_map as mapping
where relation.content_id = mapping.old_id;

update public.notes as relation
set content_id = mapping.canonical_id
from content_work_merge_map as mapping
where relation.content_id = mapping.old_id;

update public.flow_nodes as relation
set content_id = mapping.canonical_id
from content_work_merge_map as mapping
where relation.content_id = mapping.old_id;

update public.curated_list_items as relation
set content_id = mapping.canonical_id
from content_work_merge_map as mapping
where relation.content_id = mapping.old_id;

insert into public.fiction_source_contents (content_id, created_at, updated_at)
select mapping.canonical_id, relation.created_at, now()
from public.fiction_source_contents as relation
join content_work_merge_map as mapping on mapping.old_id = relation.content_id;

update public.fiction_source_characters as relation
set content_id = mapping.canonical_id
from content_work_merge_map as mapping
where relation.content_id = mapping.old_id;

delete from public.fiction_source_contents as relation
using content_work_merge_map as mapping
where relation.content_id = mapping.old_id;

update public.activity_logs as activity
set content_id = mapping.canonical_id
from content_work_merge_map as mapping
where activity.content_id = mapping.old_id;

delete from public.contents as duplicate
using content_work_merge_map as mapping
where duplicate.id = mapping.old_id;

-- 전체 세트와 범위가 다른 일부 권, ISBN이 없는 임의 영문명은 locale로 두지 않는다.
delete from public.content_locales
where locale = 'en'
  and content_id in (
    'b47e690d-7bb3-4f2f-afed-e3c8c125cdf5',
    'd778ac82-5a59-4299-aced-748077cbcae8',
    'f9dcf342-6d13-40b0-984a-7b2e5a7e74de'
  );

-- OpenLibrary에서 같은 작품의 실제 영어판 ISBN을 확인한 행만 등록한다.
insert into public.content_locales (
  content_id,
  locale,
  title,
  creator,
  thumbnail_url,
  description,
  isbn,
  publisher,
  verified,
  sources
)
values
  (
    '55bd8115-1c37-40c7-a850-190e4d353155',
    'en',
    'Whale',
    'Cheon Myeong-Kwan',
    'https://covers.openlibrary.org/b/isbn/9781953861146-L.jpg',
    null,
    '9781953861146',
    'Archipelago',
    true,
    '{"primary":"openlibrary","thumbnail":"openlibrary"}'::jsonb
  ),
  (
    'b82eeab6-ebab-4728-add5-130e11fc7f31',
    'en',
    'If We Cannot Go at the Speed of Light',
    'Kim Choyeop',
    'https://covers.openlibrary.org/b/isbn/9781668049471-L.jpg',
    null,
    '9781668049471',
    'Simon & Schuster',
    true,
    '{"primary":"openlibrary","thumbnail":"openlibrary"}'::jsonb
  ),
  (
    'f02d4a44-dceb-4735-ad8c-69ec55fced1a',
    'en',
    'Demon Slayer: Kimetsu no Yaiba, Vol. 1',
    'Koyoharu Gotouge',
    'https://covers.openlibrary.org/b/isbn/9781974700523-L.jpg',
    null,
    '9781974700523',
    'Viz Media',
    true,
    '{"primary":"openlibrary","thumbnail":"openlibrary"}'::jsonb
  ),
  (
    '83cdb393-9a53-4132-b610-3378937e4a93',
    'en',
    'Dotcom Secrets',
    'Russell Brunson',
    'https://covers.openlibrary.org/b/isbn/9781401960469-L.jpg',
    null,
    '9781401960469',
    'Hay House, Incorporated',
    true,
    '{"primary":"openlibrary","thumbnail":"openlibrary"}'::jsonb
  ),
  (
    '01b762aa-bb6c-4c1c-a4d1-59637eac98ce',
    'en',
    'The God Delusion',
    'Richard Dawkins',
    'https://covers.openlibrary.org/b/isbn/9780593055489-L.jpg',
    null,
    '9780593055489',
    'Bantam Press',
    true,
    '{"primary":"openlibrary","thumbnail":"openlibrary"}'::jsonb
  ),
  (
    '6ec02edf-36fe-4882-89ef-795b67ce776f',
    'en',
    'If',
    'Rudyard Kipling',
    'https://covers.openlibrary.org/b/isbn/9780689877995-L.jpg',
    null,
    '9780689877995',
    'Ginee Seo Books',
    true,
    '{"primary":"openlibrary","thumbnail":"openlibrary"}'::jsonb
  ),
  (
    'fb6dc35a-7818-4b14-a67f-e4605a97a8a5',
    'en',
    'Bushido',
    'Inazo Nitobe',
    'https://covers.openlibrary.org/b/isbn/9780804836289-L.jpg',
    null,
    '9780804836289',
    'Tuttle',
    true,
    '{"primary":"openlibrary","thumbnail":"openlibrary"}'::jsonb
  ),
  (
    '17827175-d31a-4f38-a9dd-991b00dccc87',
    'en',
    'The Status Game',
    'Will Storr',
    null,
    null,
    '9780008521677',
    'HarperCollins Publishers Limited',
    true,
    '{"primary":"openlibrary","thumbnail":"confirmed_unavailable"}'::jsonb
  ),
  (
    'cf1d962d-2e71-4ca3-ac7b-288a2109765f',
    'en',
    'How to Live on 24 Hours a Day',
    'Arnold Bennett',
    'https://covers.openlibrary.org/b/isbn/9781250250674-L.jpg',
    null,
    '9781250250674',
    'St. Martin''s Press',
    true,
    '{"primary":"openlibrary","thumbnail":"openlibrary"}'::jsonb
  ),
  (
    'adbd2550-8b07-4178-b231-ed67825ac86f',
    'en',
    'Three Kingdoms',
    'Luo Guanzhong',
    'https://covers.openlibrary.org/b/isbn/9780520224780-L.jpg',
    null,
    '9780520224780',
    'University of California Press',
    true,
    '{"primary":"openlibrary","thumbnail":"openlibrary"}'::jsonb
  )
on conflict (content_id, locale) do update
set title = excluded.title,
    creator = excluded.creator,
    thumbnail_url = excluded.thumbnail_url,
    description = excluded.description,
    isbn = excluded.isbn,
    publisher = excluded.publisher,
    verified = excluded.verified,
    sources = excluded.sources,
    updated_at = now();

-- 한국어 대표 판본의 누락·레거시 출처를 카카오 응답과 맞춘다.
update public.content_locales
set publisher = '문학동네',
    verified = true,
    sources = '{"primary":"kakao_book","thumbnail":"kakao_book"}'::jsonb,
    updated_at = now()
where content_id = 'b47e690d-7bb3-4f2f-afed-e3c8c125cdf5'
  and locale = 'ko';

update public.content_locales
set publisher = '김영사',
    verified = true,
    sources = '{"primary":"kakao_book","thumbnail":"kakao_book"}'::jsonb,
    updated_at = now()
where content_id = 'f9dcf342-6d13-40b0-984a-7b2e5a7e74de'
  and locale = 'ko';

update public.content_locales
set isbn = '9788937830891',
    publisher = '북폴리오',
    thumbnail_url = 'https://t1.daumcdn.net/lbook/image/545485?timestamp=20240111174935',
    verified = true,
    sources = '{"primary":"kakao_book","thumbnail":"kakao_book"}'::jsonb,
    updated_at = now()
where content_id = '55fe353e-81af-40fe-8cf3-e0987668d081'
  and locale = 'ko';

update public.contents
set external_source = 'kakao_book',
    release_date = '2006-10-30',
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
      'isbn', '9788959131839',
      'publisher', '예담',
      'publishDate', '2006-10-30'
    )
where id = '7dc9a037-9783-414a-8213-124427fe1002';

update public.content_locales
set isbn = '9788959131839',
    publisher = '예담',
    thumbnail_url = 'https://t1.daumcdn.net/lbook/image/793787?timestamp=20221025114450',
    verified = true,
    sources = '{"primary":"kakao_book","thumbnail":"kakao_book"}'::jsonb,
    updated_at = now()
where content_id = '7dc9a037-9783-414a-8213-124427fe1002'
  and locale = 'ko';

-- 관계 이동 트리거 결과와 무관하게 실제 관계 수로 카운터를 확정한다.
update public.contents as content
set member_count = (
      select count(*) from public.member_contents where content_id = content.id
    ),
    celeb_count = (
      select count(*) from public.celeb_contents where content_id = content.id
    ),
    record_count = (
      select count(*) from public.member_contents where content_id = content.id
    ) + (
      select count(*) from public.celeb_contents where content_id = content.id
    )
where content.id in (
  select distinct canonical_id from content_work_merge_map
);

do $$
begin
  if exists (
    select 1
    from content_work_merge_map as mapping
    join public.contents as duplicate on duplicate.id = mapping.old_id
  ) then
    raise exception 'duplicate or mislinked BOOK rows remain after repair';
  end if;

  if exists (
    select 1
    from public.contents as content
    where content.id in (select distinct canonical_id from content_work_merge_map)
      and (
        content.member_count <> (select count(*) from public.member_contents where content_id = content.id)
        or content.celeb_count <> (select count(*) from public.celeb_contents where content_id = content.id)
        or content.record_count <> (
          (select count(*) from public.member_contents where content_id = content.id)
          + (select count(*) from public.celeb_contents where content_id = content.id)
        )
      )
  ) then
    raise exception 'linked BOOK counters do not match their relations';
  end if;

  if (
    select count(*)
    from public.content_locales
    where locale = 'en'
      and (content_id, isbn) in (
        ('55bd8115-1c37-40c7-a850-190e4d353155', '9781953861146'),
        ('b82eeab6-ebab-4728-add5-130e11fc7f31', '9781668049471'),
        ('f02d4a44-dceb-4735-ad8c-69ec55fced1a', '9781974700523'),
        ('83cdb393-9a53-4132-b610-3378937e4a93', '9781401960469'),
        ('01b762aa-bb6c-4c1c-a4d1-59637eac98ce', '9780593055489'),
        ('6ec02edf-36fe-4882-89ef-795b67ce776f', '9780689877995'),
        ('fb6dc35a-7818-4b14-a67f-e4605a97a8a5', '9780804836289'),
        ('17827175-d31a-4f38-a9dd-991b00dccc87', '9780008521677'),
        ('cf1d962d-2e71-4ca3-ac7b-288a2109765f', '9781250250674'),
        ('adbd2550-8b07-4178-b231-ed67825ac86f', '9780520224780')
      )
      and verified is true
      and sources ->> 'primary' = 'openlibrary'
  ) <> 10 then
    raise exception 'verified OpenLibrary BOOK locales are incomplete after repair';
  end if;

  if exists (
    select 1
    from public.content_locales
    where locale = 'en'
      and content_id in (
        'b47e690d-7bb3-4f2f-afed-e3c8c125cdf5',
        'd778ac82-5a59-4299-aced-748077cbcae8',
        'f9dcf342-6d13-40b0-984a-7b2e5a7e74de'
      )
  ) then
    raise exception 'unverified or partial English BOOK locales remain after repair';
  end if;

  if not exists (
    select 1
    from public.contents
    where id = '7dc9a037-9783-414a-8213-124427fe1002'
      and external_source = 'kakao_book'
  ) then
    raise exception 'legacy Google Books source was not replaced';
  end if;

  if not exists (
    select 1
    from public.content_locales
    where content_id = '55fe353e-81af-40fe-8cf3-e0987668d081'
      and locale = 'ko'
      and isbn = '9788937830891'
  ) then
    raise exception 'Night Picnic Korean ISBN was not repaired';
  end if;
end
$$;

commit;
