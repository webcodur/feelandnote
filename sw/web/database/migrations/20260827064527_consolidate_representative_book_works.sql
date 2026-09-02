begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';

-- contents는 작품 마스터다. 번역·출판·장정이 다른 판본 때문에 갈라진
-- 성경·일리아스·오디세이아 관계를 대표 작품 행으로 되돌린다.
-- 신약전서·창세기 같은 하위 작품, 합본, 개작·축약본은 이 병합에 넣지 않는다.
create temporary table content_work_merge_map (
  old_id text primary key,
  canonical_id text not null,
  work_title text not null
) on commit drop;

insert into content_work_merge_map (old_id, canonical_id, work_title)
values
  ('acbe5ffb-7490-4808-a84e-7a37981f3129', 'f44760c9-113f-4a04-89da-6eaca5f8af13', '일리아스'),
  ('a2d9d61f-7205-40da-be56-ab93428ebef6', 'f44760c9-113f-4a04-89da-6eaca5f8af13', '일리아스'),
  ('1466faed-bcd7-482a-b9e9-d86751bea45c', '0818cbb2-d0f5-43d0-b57d-cb3c6d0522bd', '오디세이아'),
  ('7dac869b-c4b0-4473-88e0-1ca0156ad850', '0818cbb2-d0f5-43d0-b57d-cb3c6d0522bd', '오디세이아'),
  ('b10294ae-f806-4387-9238-b124586f7d3e', '0818cbb2-d0f5-43d0-b57d-cb3c6d0522bd', '오디세이아'),
  ('d139c6e9-df2e-478b-9359-18130fc8af70', '0818cbb2-d0f5-43d0-b57d-cb3c6d0522bd', '오디세이아'),
  ('5a856bfc-6f97-4b70-b26c-fb68fcecf29a', '0818cbb2-d0f5-43d0-b57d-cb3c6d0522bd', '오디세이아'),
  ('069500e6-3017-4d87-a5a5-3dc99cca6c35', '6e5989e2-0cfb-4a4c-8e47-182d0599bfd0', '성경'),
  ('53ac2be8-90f2-49e6-88ae-eaae9a5cb251', '6e5989e2-0cfb-4a4c-8e47-182d0599bfd0', '성경'),
  ('c195dee6-dea4-44f1-aa92-7a71b212396b', '6e5989e2-0cfb-4a4c-8e47-182d0599bfd0', '성경'),
  ('0b40672f-8d4c-490e-9b82-a8c1a2095563', '6e5989e2-0cfb-4a4c-8e47-182d0599bfd0', '성경'),
  ('03badcc5-95a7-4a6d-8179-ed1c8e2727a8', '6e5989e2-0cfb-4a4c-8e47-182d0599bfd0', '성경'),
  ('1a7706cb-51e9-4d00-8585-824dcf5f6ce7', '6e5989e2-0cfb-4a4c-8e47-182d0599bfd0', '성경'),
  ('d27b95da-3481-467f-9ca2-91bd4ec7adc4', '6e5989e2-0cfb-4a4c-8e47-182d0599bfd0', '성경'),
  ('f29da8a6-b544-4140-a5ad-e5b510f2efed', '6e5989e2-0cfb-4a4c-8e47-182d0599bfd0', '성경'),
  ('9079588f-bb28-425f-b99d-8057d0b255f0', '6e5989e2-0cfb-4a4c-8e47-182d0599bfd0', '성경'),
  ('1a49d8a1-31e0-4f17-933f-7e03a71611ff', '6e5989e2-0cfb-4a4c-8e47-182d0599bfd0', '성경'),
  ('a4b4aa1f-5fff-4694-a3f8-a0e0bd75d9d0', '6e5989e2-0cfb-4a4c-8e47-182d0599bfd0', '성경'),
  ('6c230c21-9dec-4461-84ea-8285f22f38b9', '6e5989e2-0cfb-4a4c-8e47-182d0599bfd0', '성경'),
  ('7f6cf443-3a66-409c-9856-292245956ef5', '6e5989e2-0cfb-4a4c-8e47-182d0599bfd0', '성경'),
  ('3f1a9c54-39e5-428e-a668-ca54daf674f8', '6e5989e2-0cfb-4a4c-8e47-182d0599bfd0', '성경');

-- 여러 관계 테이블이 같은 contents 행을 바라보므로 작품 행을 일정한 순서로 잠근다.
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
    raise exception 'representative BOOK row is missing or has the wrong type';
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
    select 1
    from public.celeb_contents as duplicate
    join content_work_merge_map as mapping on mapping.old_id = duplicate.content_id
    join public.celeb_contents as canonical
      on canonical.celeb_id = duplicate.celeb_id
     and canonical.content_id = mapping.canonical_id
  ) then
    raise exception 'celeb_contents collision while consolidating representative BOOK works';
  end if;

  if exists (
    select 1
    from public.member_contents as duplicate
    join content_work_merge_map as mapping on mapping.old_id = duplicate.content_id
    join public.member_contents as canonical
      on canonical.member_id = duplicate.member_id
     and canonical.content_id = mapping.canonical_id
  ) then
    raise exception 'member_contents collision while consolidating representative BOOK works';
  end if;

  if exists (
    select 1
    from public.notes as duplicate
    join content_work_merge_map as mapping on mapping.old_id = duplicate.content_id
    join public.notes as canonical
      on canonical.user_id = duplicate.user_id
     and canonical.content_id = mapping.canonical_id
  ) then
    raise exception 'notes collision while consolidating representative BOOK works';
  end if;

  if exists (
    select 1
    from public.flow_nodes as duplicate
    join content_work_merge_map as mapping on mapping.old_id = duplicate.content_id
    join public.flow_nodes as canonical
      on canonical.flow_id = duplicate.flow_id
     and canonical.content_id = mapping.canonical_id
  ) then
    raise exception 'flow_nodes collision while consolidating representative BOOK works';
  end if;

  if exists (
    select 1
    from public.fiction_source_contents as duplicate
    join content_work_merge_map as mapping on mapping.old_id = duplicate.content_id
    join public.fiction_source_contents as canonical
      on canonical.content_id = mapping.canonical_id
  ) then
    raise exception 'fiction_source_contents collision while consolidating representative BOOK works';
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

-- 활동 로그는 FK가 없지만 과거 활동에서 작품 상세로 이동할 때 같은 대표 행을 써야 한다.
update public.activity_logs as activity
set content_id = mapping.canonical_id
from content_work_merge_map as mapping
where activity.content_id = mapping.old_id;

delete from public.contents as duplicate
using content_work_merge_map as mapping
where duplicate.id = mapping.old_id;

-- 성경의 판본명이 대표 작품명으로 보이지 않도록 작품 단위 표기로 고정한다.
update public.content_locales
set title = '성경', creator = '여러 저자'
where content_id = '6e5989e2-0cfb-4a4c-8e47-182d0599bfd0'
  and locale = 'ko';

update public.content_locales
set title = 'The Bible', creator = 'Various Authors'
where content_id = '6e5989e2-0cfb-4a4c-8e47-182d0599bfd0'
  and locale = 'en';

-- 관계 이동 트리거 결과를 신뢰하되 최종 카운터는 실제 관계 수로 다시 맞춘다.
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
  'f44760c9-113f-4a04-89da-6eaca5f8af13',
  '0818cbb2-d0f5-43d0-b57d-cb3c6d0522bd',
  '6e5989e2-0cfb-4a4c-8e47-182d0599bfd0'
);

do $$
begin
  if exists (
    select 1
    from content_work_merge_map as mapping
    join public.contents as duplicate on duplicate.id = mapping.old_id
  ) then
    raise exception 'duplicate representative BOOK rows remain after consolidation';
  end if;

  if exists (
    select 1
    from public.contents as content
    where content.id in (
      'f44760c9-113f-4a04-89da-6eaca5f8af13',
      '0818cbb2-d0f5-43d0-b57d-cb3c6d0522bd',
      '6e5989e2-0cfb-4a4c-8e47-182d0599bfd0'
    )
      and (
        content.member_count <> (select count(*) from public.member_contents where content_id = content.id)
        or content.celeb_count <> (select count(*) from public.celeb_contents where content_id = content.id)
        or content.record_count <> (
          (select count(*) from public.member_contents where content_id = content.id)
          + (select count(*) from public.celeb_contents where content_id = content.id)
        )
      )
  ) then
    raise exception 'representative BOOK counters do not match their relations';
  end if;
end
$$;

commit;
