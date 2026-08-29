begin;

alter table public.fiction_source_characters
  add column if not exists description text,
  add column if not exists description_en text;

comment on column public.fiction_source_characters.description is
  '해당 작품 본문에서 확인되는 인물의 역할·사건·결말 한국어 설명';
comment on column public.fiction_source_characters.description_en is
  '해당 작품 본문에서 확인되는 인물의 역할·사건·결말 영어 설명';

-- 유지된 연결은 설명·관계 유형·생성 시각을 보존하고, 명단과 순서만 갱신한다.
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
begin
  if not exists (select 1 from public.contents where id = p_content_id) then
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
    left join public.celebs as celeb on celeb.id = ids.value_id
    where celeb.id is null
       or celeb.celeb_tier is distinct from 'fiction'
  ) then
    raise exception '대표 원전에는 fiction 등급 CELEB만 연결할 수 있습니다';
  end if;

  insert into public.fiction_source_contents(content_id)
  values (p_content_id)
  on conflict (content_id) do update set updated_at = now();

  delete from public.fiction_source_characters
  where content_id = p_content_id
    and not (celeb_id = any(normalized_ids));

  insert into public.fiction_source_characters(
    content_id, celeb_id, relation_type, sort_order
  )
  select p_content_id, value_id, 'appearance', ordinal_position - 1
  from unnest(normalized_ids) with ordinality as ids(value_id, ordinal_position)
  on conflict (content_id, celeb_id) do update
  set sort_order = excluded.sort_order;

  update public.fiction_source_contents
  set updated_at = now()
  where content_id = p_content_id;
end;
$$;

revoke all on function public.set_fiction_source_characters(text, uuid[]) from public;
revoke all on function public.set_fiction_source_characters(text, uuid[]) from anon;
revoke all on function public.set_fiction_source_characters(text, uuid[]) from authenticated;
grant execute on function public.set_fiction_source_characters(text, uuid[]) to service_role;

commit;
