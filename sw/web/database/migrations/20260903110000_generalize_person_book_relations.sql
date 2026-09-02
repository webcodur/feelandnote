begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';

-- 공개 관계는 인물의 최초 등장·후대 각색을 따로 나누지 않는다.
-- 작품에 실제로 나오면 appearance, 인물을 이해하는 맥락 도서면 related다.
update public.fiction_source_characters
set relation_type = 'appearance'
where relation_type in ('origin', 'adaptation');

alter table public.fiction_source_characters
  drop constraint if exists fiction_source_characters_relation_type_check;

alter table public.fiction_source_characters
  add constraint fiction_source_characters_relation_type_check
  check (relation_type in ('appearance', 'related'));

alter table public.fiction_source_characters
  drop constraint if exists fiction_source_characters_related_description_check;

alter table public.fiction_source_characters
  add constraint fiction_source_characters_related_description_check
  check (
    relation_type <> 'related'
    or (description is null and description_en is null)
  );

comment on table public.fiction_source_contents is
  '인물의 등장 도서 또는 연관 도서로 지정한 기존 BOOK 작품';
comment on table public.fiction_source_characters is
  '인물과 BOOK 작품의 등장·연관 관계. celeb_contents의 감상 관계와 구분한다';
comment on column public.fiction_source_characters.relation_type is
  'appearance=인물이 작품에 실제 등장, related=인물을 이해하는 직접 맥락 도서';
comment on column public.fiction_source_characters.description is
  'appearance 관계에서만 쓰는 작품 속 인물 역할·사건·결말 한국어 설명';
comment on column public.fiction_source_characters.description_en is
  'appearance 관계에서만 쓰는 작품 속 인물 역할·사건·결말 영어 설명';

-- 이 카탈로그는 도서 전용이다. 판본·상품 계층을 만들 수 없는 다른 콘텐츠는 막는다.
create or replace function public.validate_fiction_source_content()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  target_type text;
begin
  select content.type
  into target_type
  from public.contents as content
  where content.id = new.content_id;

  if not found then
    raise exception '연결할 도서 콘텐츠를 찾을 수 없습니다: %', new.content_id;
  end if;
  if target_type is distinct from 'BOOK' then
    raise exception '인물 도서 카탈로그에는 BOOK만 지정할 수 있습니다: %', new.content_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_validate_fiction_source_content
  on public.fiction_source_contents;
create trigger trg_validate_fiction_source_content
  before insert or update of content_id
  on public.fiction_source_contents
  for each row
  execute function public.validate_fiction_source_content();

-- tier와 무관하게 celebs 도메인에 존재하는 인물은 연결할 수 있다.
create or replace function public.validate_fiction_source_character()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  if not exists (
    select 1
    from public.celebs as celeb
    where celeb.id = new.celeb_id
  ) then
    raise exception '연결할 CELEB 프로필을 찾을 수 없습니다: %', new.celeb_id;
  end if;
  return new;
end;
$$;

-- 백오피스가 작품 한 건의 혼합 관계를 원자적으로 교체하는 일반 쓰기 창구다.
create or replace function public.set_figure_book_relations(
  p_content_id text,
  p_relations jsonb default '[]'::jsonb
)
returns void
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  normalized_relations jsonb := coalesce(p_relations, '[]'::jsonb);
  target_type text;
begin
  if jsonb_typeof(normalized_relations) <> 'array' then
    raise exception '인물 도서 관계는 JSON 배열이어야 합니다';
  end if;

  select content.type
  into target_type
  from public.contents as content
  where content.id = p_content_id;

  if not found then
    raise exception '대표로 지정할 콘텐츠를 찾을 수 없습니다: %', p_content_id;
  end if;
  if target_type is distinct from 'BOOK' then
    raise exception '인물 도서 카탈로그에는 BOOK만 지정할 수 있습니다: %', p_content_id;
  end if;

  if exists (
    select 1
    from jsonb_array_elements(normalized_relations) as relation(value)
    where jsonb_typeof(relation.value) <> 'object'
       or nullif(btrim(relation.value ->> 'celeb_id'), '') is null
       or (relation.value ->> 'celeb_id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
       or coalesce(relation.value ->> 'relation_type', '') not in ('appearance', 'related')
       or coalesce(relation.value ->> 'sort_order', '') !~ '^[0-9]+$'
  ) then
    raise exception '각 관계에는 celeb_id, appearance|related relation_type, 0 이상의 sort_order가 필요합니다';
  end if;

  if jsonb_array_length(normalized_relations) <> (
    select count(distinct (relation.value ->> 'celeb_id')::uuid)
    from jsonb_array_elements(normalized_relations) as relation(value)
  ) then
    raise exception '동일한 인물을 한 도서에 중복 연결할 수 없습니다';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(normalized_relations) as relation(value)
    left join public.celebs as celeb
      on celeb.id = (relation.value ->> 'celeb_id')::uuid
    where celeb.id is null
  ) then
    raise exception '연결할 CELEB 프로필을 찾을 수 없습니다';
  end if;

  insert into public.fiction_source_contents(content_id)
  values (p_content_id)
  on conflict (content_id) do update set updated_at = now();

  delete from public.fiction_source_characters as current_relation
  where current_relation.content_id = p_content_id
    and not exists (
      select 1
      from jsonb_array_elements(normalized_relations) as relation(value)
      where (relation.value ->> 'celeb_id')::uuid = current_relation.celeb_id
    );

  insert into public.fiction_source_characters(
    content_id,
    celeb_id,
    relation_type,
    sort_order
  )
  select
    p_content_id,
    (relation.value ->> 'celeb_id')::uuid,
    relation.value ->> 'relation_type',
    (relation.value ->> 'sort_order')::integer
  from jsonb_array_elements(normalized_relations) as relation(value)
  on conflict (content_id, celeb_id) do update
  set relation_type = excluded.relation_type,
      sort_order = excluded.sort_order,
      description = case
        when excluded.relation_type = 'related' then null
        else fiction_source_characters.description
      end,
      description_en = case
        when excluded.relation_type = 'related' then null
        else fiction_source_characters.description_en
      end;

  update public.fiction_source_contents
  set updated_at = now()
  where content_id = p_content_id;
end;
$$;

revoke all on function public.set_figure_book_relations(text, jsonb) from public;
revoke all on function public.set_figure_book_relations(text, jsonb) from anon;
revoke all on function public.set_figure_book_relations(text, jsonb) from authenticated;
grant execute on function public.set_figure_book_relations(text, jsonb) to service_role;

-- 기존 배치와 옛 호출부는 모두 appearance 관계로 동작하게 유지한다.
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
  relations jsonb;
begin
  if cardinality(normalized_ids) <> (
    select count(distinct value_id)
    from unnest(normalized_ids) as ids(value_id)
  ) then
    raise exception '동일한 인물을 한 도서에 중복 연결할 수 없습니다';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'celeb_id', ids.value_id,
        'relation_type', 'appearance',
        'sort_order', ids.ordinal_position - 1
      )
      order by ids.ordinal_position
    ),
    '[]'::jsonb
  )
  into relations
  from unnest(normalized_ids) with ordinality as ids(value_id, ordinal_position);

  perform public.set_figure_book_relations(p_content_id, relations);
end;
$$;

revoke all on function public.set_fiction_source_characters(text, uuid[]) from public;
revoke all on function public.set_fiction_source_characters(text, uuid[]) from anon;
revoke all on function public.set_fiction_source_characters(text, uuid[]) from authenticated;
grant execute on function public.set_fiction_source_characters(text, uuid[]) to service_role;

do $$
begin
  if exists (
    select 1
    from public.fiction_source_characters
    where relation_type not in ('appearance', 'related')
  ) then
    raise exception '이전 인물 도서 관계 유형이 남아 있습니다';
  end if;

  if exists (
    select 1
    from public.fiction_source_characters
    where relation_type = 'related'
      and (description is not null or description_en is not null)
  ) then
    raise exception '연관 도서 관계에 등장 설명이 남아 있습니다';
  end if;
end;
$$;

commit;
