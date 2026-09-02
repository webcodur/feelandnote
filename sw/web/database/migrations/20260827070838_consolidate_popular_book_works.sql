begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';

-- BOOK contents는 작품 마스터다. 실제 연결이 많은 동일 작품의 번역·출판 판본을
-- 하나의 대표 작품으로 통합한다. 권차본·합본·각색·해설서는 이 목록에서 제외했다.
create temporary table content_work_merge_map (
  old_id text primary key,
  canonical_id text not null,
  work_title text not null
) on commit drop;

insert into content_work_merge_map (old_id, canonical_id, work_title)
values
  ('653230d5-a133-4990-9282-a1f15de30888', '449813c5-cae4-482c-9737-37c5dcc803d7', '1984'),
  ('df6edac0-cff2-46c4-9c5b-fbcf4eec27ee', '449813c5-cae4-482c-9737-37c5dcc803d7', '1984'),
  ('04a5baaa-7e73-4db4-9478-b8dd8c30391b', 'df094f0f-db6b-458f-99bf-66ffdb45de30', 'The Prince'),
  ('f4d1c85c-e820-4ce9-b4bb-2325d86a8c1b', 'df094f0f-db6b-458f-99bf-66ffdb45de30', 'The Prince'),
  ('3e719d27-08c1-4abe-907d-e9e2b6189b18', 'df094f0f-db6b-458f-99bf-66ffdb45de30', 'The Prince'),
  ('0604f7b7-8b9c-4907-b4a1-b398a018d213', '46765640-ce9c-483d-bd70-0059b63a12b9', 'Republic'),
  ('2f732acd-e813-473d-bc0e-22d4736b266c', '982f45d5-701b-4baf-af54-634410411299', 'Ulysses'),
  ('9f56bc82-cf95-4453-8dfa-8015641b9936', '32838ac4-4041-430b-b953-ccd98244a52b', 'The Analects'),
  ('0235400f-692c-40f4-b9e2-e5bc569028ec', '32838ac4-4041-430b-b953-ccd98244a52b', 'The Analects'),
  ('17444a94-992e-4ee4-8d8b-ca8053503895', '32838ac4-4041-430b-b953-ccd98244a52b', 'The Analects'),
  ('f871fc5c-43c2-4aae-98d8-7085210469b6', '32838ac4-4041-430b-b953-ccd98244a52b', 'The Analects'),
  ('484bc6bc-519d-4c98-804a-89e19a2aba82', '32838ac4-4041-430b-b953-ccd98244a52b', 'The Analects'),
  ('bd22c50a-8d9f-4edf-9cf8-ea771b485d6b', '70d75785-5f1e-45fb-99ef-f936e6fd8298', 'The Divine Comedy'),
  ('f9926a82-ab61-4cad-84df-b0b9d8431e89', '70d75785-5f1e-45fb-99ef-f936e6fd8298', 'The Divine Comedy'),
  ('b8a2151d-895f-42bb-846c-93ee3e7865ff', '70d75785-5f1e-45fb-99ef-f936e6fd8298', 'The Divine Comedy'),
  ('d4aebb2b-06a2-4277-8fbe-2b206e13e126', '70d75785-5f1e-45fb-99ef-f936e6fd8298', 'The Divine Comedy'),
  ('ce2c0bf4-3df8-46d8-919c-dc14ad073faa', 'e3ee89b1-595c-4946-97a6-fbcc4d7d744e', 'Tao Te Ching'),
  ('1704dbb6-82ba-4469-ad53-2e940dbad597', 'e3ee89b1-595c-4946-97a6-fbcc4d7d744e', 'Tao Te Ching'),
  ('239b10e5-3334-4d36-8b27-65d358dbcf82', 'e3ee89b1-595c-4946-97a6-fbcc4d7d744e', 'Tao Te Ching'),
  ('2c694de7-f52f-447f-a7bc-67896ce78495', 'e3ee89b1-595c-4946-97a6-fbcc4d7d744e', 'Tao Te Ching'),
  ('fc722349-0fd9-4f55-8103-bc7064812853', 'e3ee89b1-595c-4946-97a6-fbcc4d7d744e', 'Tao Te Ching'),
  ('5a0b0745-a3f9-409d-9d2f-4207b6f9482c', 'e3ee89b1-595c-4946-97a6-fbcc4d7d744e', 'Tao Te Ching'),
  ('a9871494-11a6-4442-ae33-735227af31cb', '289cbc11-0621-486d-b4d7-cbf537fe830a', 'Zhuangzi'),
  ('38c64e9e-5fe4-43f4-80fa-4448e887d0a3', '289cbc11-0621-486d-b4d7-cbf537fe830a', 'Zhuangzi'),
  ('e4ca5bf9-57f0-4a1e-8efa-730f68b86378', 'fd62028f-898e-4207-9af8-91fa83de7bbc', 'Les Miserables'),
  ('94e7e90a-836f-47dd-8f72-36dbdd1cfee5', 'fd62028f-898e-4207-9af8-91fa83de7bbc', 'Les Miserables'),
  ('a530f313-5e43-4137-854f-d60660c20bc1', 'e3af1b50-0c2e-404b-9f83-3f8a470974a0', 'The History of the Decline and Fall of the Roman Empire'),
  ('a398e5b6-f09c-46e1-b0c9-0f8e3cb74145', 'dc853e88-cb65-4cdf-b82b-15c74edcfe0c', 'King Lear'),
  ('f9a179b7-a02a-4f4f-aa51-5eb7057ee1ff', 'dc853e88-cb65-4cdf-b82b-15c74edcfe0c', 'King Lear'),
  ('72c1fc5b-5f12-4b47-b3d2-7811e9c03370', '1d46a8e1-a60e-4c7b-be32-7f8a2d86d167', 'Mencius'),
  ('5db77238-0c13-470d-bfb0-ab4f56391525', '1d46a8e1-a60e-4c7b-be32-7f8a2d86d167', 'Mencius'),
  ('2738e552-e6dc-4519-b433-19ac16f123f4', '3253a8c8-50f5-4138-8558-803d7f179d7e', 'Moby-Dick'),
  ('baa99448-661b-4b2a-8332-6c3d8d84dfbc', '897f1093-818e-457c-a344-8fd3b6c08da2', 'The Complete Essays of Montaigne'),
  ('62f87770-2279-45f2-9c77-dcb27cf1e6b9', '13410b89-7c1f-4461-a1e2-b3f2975148e6', 'Metamorphoses'),
  ('db317b51-d910-4d95-b6ad-4a7964d191d9', 'ea9a0534-d154-4d83-8235-caa5669b93aa', 'The Grapes of Wrath'),
  ('d0f19e70-5227-4e19-a47b-b730740b4aad', '5706fb16-214a-4862-b970-343ae1f0bc76', 'Man''s Search for Meaning'),
  ('d7a0c705-644f-4572-a8a7-5741883704d3', '5706fb16-214a-4862-b970-343ae1f0bc76', 'Man''s Search for Meaning'),
  ('bef21c1b-387e-42d9-a4c8-3ea5cbe1b464', '5706fb16-214a-4862-b970-343ae1f0bc76', 'Man''s Search for Meaning'),
  ('9e85a34f-5a81-4097-8be3-b77247f32e8a', 'aa0d0fab-50da-4daa-abb8-c5a2d3950cb4', 'The Complete Works of Shakespeare'),
  ('5bd70c19-6d2d-4cc1-bbbb-9d005f631368', 'c997e88c-43d3-4d0f-bfd4-dcb4d71010d1', 'Critique of Pure Reason'),
  ('b97d5629-bf45-436d-912b-074964fb8854', 'd34b3df2-d4a6-4a48-ad62-a48fa6f38143', 'Paradise Lost'),
  ('1790b841-833c-41d3-b147-a004cc07d68b', 'd34b3df2-d4a6-4a48-ad62-a48fa6f38143', 'Paradise Lost'),
  ('61775436-b44a-4ada-87c7-6ae55827384b', 'd34b3df2-d4a6-4a48-ad62-a48fa6f38143', 'Paradise Lost'),
  ('03af6072-4ac6-4c06-9ea0-dfbbbd7bb41a', '659578fc-407e-42a4-b378-33229c9b8ae2', 'The Aeneid'),
  ('39e66caf-45e1-49a1-9d91-90205b26c1d2', '659578fc-407e-42a4-b378-33229c9b8ae2', 'The Aeneid'),
  ('93235f42-07f4-4c9e-9899-e76733d8d711', '53d10940-2ae5-4a9f-9e77-b056c41686e5', 'Anna Karenina'),
  ('027b4d41-1942-40d8-953d-cb7939937aeb', 'a4d43ff1-7568-450b-ace6-69ab9ce51f1a', 'The Great Gatsby'),
  ('0bdc842d-39e2-4375-9adb-aa52b881199b', 'a4d43ff1-7568-450b-ace6-69ab9ce51f1a', 'The Great Gatsby'),
  ('5da83841-bebd-40a6-b223-8f4f9a874d9c', 'f8ab14c9-9c89-42ef-adb0-d323508d9022', 'De Officiis'),
  ('f016766f-ce4c-48b2-a5a0-73ea7ddc44a1', '82b7927b-6739-4f85-b9a5-85c993f48f4d', 'The World as Will and Representation'),
  ('7d6ea9a9-4032-48a9-b088-e0cdd1e8c7ae', '82b7927b-6739-4f85-b9a5-85c993f48f4d', 'The World as Will and Representation'),
  ('f5e280c8-7adf-4b49-97bd-a35c4c845448', '0f0b374d-cf65-406a-8dd2-f8f3e785c858', 'War and Peace'),
  ('3c3aef1e-9aed-4b49-91da-fd3798b43d94', '0f0b374d-cf65-406a-8dd2-f8f3e785c858', 'War and Peace'),
  ('3541e717-8014-44e8-b27b-81b81175321a', '0f0b374d-cf65-406a-8dd2-f8f3e785c858', 'War and Peace'),
  ('32b0a8bb-d191-4d4b-830a-465d0970d1ba', '6e4ceff7-b652-412d-9fa0-cb26a659df2f', 'Zero to One'),
  ('29ced21f-b4f6-4d7f-9130-c5ee1c62bcbf', 'f0a1a3ca-e7db-4534-b915-c98d8b4c2f0b', 'I Ching'),
  ('35e05a10-6ff3-4325-b5e3-6cde1799e48c', 'f0a1a3ca-e7db-4534-b915-c98d8b4c2f0b', 'I Ching'),
  ('9de82dd0-a76f-48d8-b65c-500ba6beb57b', 'f0a1a3ca-e7db-4534-b915-c98d8b4c2f0b', 'I Ching'),
  ('4466f198-d92c-4ef8-a839-f22943178561', '2376f642-0de4-40ce-bbe6-3a0e6df0f295', 'The Power of Now'),
  ('f39bc0c5-99b8-4c7d-b3e6-24fc5d45d69f', '2172576b-160a-4292-967c-b16e4b923eb4', 'Zuo Zhuan'),
  ('aa215a0e-5620-4517-b3e1-0b0eb7a0fa05', '2172576b-160a-4292-967c-b16e4b923eb4', 'Zuo Zhuan'),
  ('3cb453d9-52ce-4211-9323-d2d949d8b7a1', 'a4a17ce9-7cba-413c-a2e3-c37bd59e655f', 'The Brothers Karamazov'),
  ('7ca31f8c-add9-426f-96a9-b3e070edcc17', 'a4a17ce9-7cba-413c-a2e3-c37bd59e655f', 'The Brothers Karamazov'),
  ('99bedaba-bb03-4a31-bf3f-dc920a6681db', 'a4703e62-3499-4423-9741-c725d9017f5f', 'Faust'),
  ('ffa8e017-ce11-4b81-bc85-01ccb4e51efc', 'caa6ab7a-d8ed-4cc7-8c8a-7ff621dad5d8', 'Leaves of Grass'),
  ('028fac68-7223-40c5-bd7c-9f83007514de', 'caa6ab7a-d8ed-4cc7-8c8a-7ff621dad5d8', 'Leaves of Grass'),
  ('c12762ec-f9c9-49d6-a3dd-f161b64f2301', 'caa6ab7a-d8ed-4cc7-8c8a-7ff621dad5d8', 'Leaves of Grass'),
  ('45b10125-6f11-47e5-b5e3-ba4b2431f170', 'e5621d04-8c77-41bf-8edb-0045baf8670d', 'Greek Lives'),
  ('dc319c5e-cd8b-46a5-b416-62a04a0b19f9', '43e3bc6a-5f95-45c9-ad89-6f22a6a0c33d', 'Hamlet'),
  ('c0100745-ea3d-4f80-ad1a-e047d01eb98d', '43e3bc6a-5f95-45c9-ad89-6f22a6a0c33d', 'Hamlet'),
  ('8113c65e-aea8-4ad8-b982-eae453b6a716', '11a0385a-15d4-4c58-8b41-32c4c9cddae1', 'The Innovator''s Dilemma'),
  ('859b2165-57cd-476a-847a-4fde1ee9d74f', '0e53c73f-f29c-445f-9813-4dd6cf4ee84b', 'On the Road');

-- 모든 참조 행이 같은 순서로 잠기도록 대상 contents를 UUID 순서로 먼저 잠근다.
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
    where canonical.id is null or canonical.type <> 'BOOK'
  ) then
    raise exception 'canonical BOOK row is missing or has the wrong type';
  end if;

  if exists (
    select 1
    from content_work_merge_map as mapping
    join public.contents as duplicate on duplicate.id = mapping.old_id
    where duplicate.type <> 'BOOK'
  ) then
    raise exception 'duplicate row has the wrong content type';
  end if;

  if exists (
    with affected as (
      select mapping.canonical_id, relation.celeb_id
      from public.celeb_contents as relation
      join content_work_merge_map as mapping on mapping.old_id = relation.content_id
      union all
      select relation.content_id, relation.celeb_id
      from public.celeb_contents as relation
      where relation.content_id in (select distinct canonical_id from content_work_merge_map)
    )
    select 1 from affected group by canonical_id, celeb_id having count(*) > 1
  ) then
    raise exception 'celeb_contents collision while consolidating popular BOOK works';
  end if;

  if exists (
    with affected as (
      select mapping.canonical_id, relation.member_id
      from public.member_contents as relation
      join content_work_merge_map as mapping on mapping.old_id = relation.content_id
      union all
      select relation.content_id, relation.member_id
      from public.member_contents as relation
      where relation.content_id in (select distinct canonical_id from content_work_merge_map)
    )
    select 1 from affected group by canonical_id, member_id having count(*) > 1
  ) then
    raise exception 'member_contents collision while consolidating popular BOOK works';
  end if;

  if exists (
    with affected as (
      select mapping.canonical_id, relation.user_id
      from public.notes as relation
      join content_work_merge_map as mapping on mapping.old_id = relation.content_id
      union all
      select relation.content_id, relation.user_id
      from public.notes as relation
      where relation.content_id in (select distinct canonical_id from content_work_merge_map)
    )
    select 1 from affected group by canonical_id, user_id having count(*) > 1
  ) then
    raise exception 'notes collision while consolidating popular BOOK works';
  end if;

  if exists (
    with affected as (
      select mapping.canonical_id, relation.flow_id
      from public.flow_nodes as relation
      join content_work_merge_map as mapping on mapping.old_id = relation.content_id
      union all
      select relation.content_id, relation.flow_id
      from public.flow_nodes as relation
      where relation.content_id in (select distinct canonical_id from content_work_merge_map)
    )
    select 1 from affected group by canonical_id, flow_id having count(*) > 1
  ) then
    raise exception 'flow_nodes collision while consolidating popular BOOK works';
  end if;

  if exists (
    select mapping.canonical_id
    from public.fiction_source_contents as relation
    join content_work_merge_map as mapping on mapping.old_id = relation.content_id
    group by mapping.canonical_id
    having count(*) + (
      select count(*)
      from public.fiction_source_contents as canonical
      where canonical.content_id = mapping.canonical_id
    ) > 1
  ) then
    raise exception 'fiction_source_contents collision while consolidating popular BOOK works';
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

update public.fiction_source_contents as relation
set content_id = mapping.canonical_id
from content_work_merge_map as mapping
where relation.content_id = mapping.old_id;

update public.activity_logs as activity
set content_id = mapping.canonical_id
from content_work_merge_map as mapping
where activity.content_id = mapping.old_id;

delete from public.contents as duplicate
using content_work_merge_map as mapping
where duplicate.id = mapping.old_id;

-- 대표 행에서 번역자를 저자로 잘못 넣은 영문 creator만 원저자로 바로잡는다.
update public.content_locales
set creator = 'Mencius'
where content_id = '1d46a8e1-a60e-4c7b-be32-7f8a2d86d167'
  and locale = 'en';

update public.content_locales
set creator = 'Arthur Schopenhauer'
where content_id = '82b7927b-6739-4f85-b9a5-85c993f48f4d'
  and locale = 'en';

update public.content_locales
set title = '율리시스', creator = '제임스 조이스'
where content_id = '982f45d5-701b-4baf-af54-634410411299'
  and locale = 'ko';

update public.content_locales
set title = 'Ulysses', creator = 'James Joyce'
where content_id = '982f45d5-701b-4baf-af54-634410411299'
  and locale = 'en';

-- 트리거 동작 여부와 무관하게 실제 관계 수로 카운터를 확정한다.
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
where content.id in (select distinct canonical_id from content_work_merge_map);

do $$
begin
  if exists (
    select 1
    from content_work_merge_map as mapping
    join public.contents as duplicate on duplicate.id = mapping.old_id
  ) then
    raise exception 'duplicate popular BOOK rows remain after consolidation';
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
    raise exception 'popular BOOK counters do not match their relations';
  end if;
end
$$;

commit;
