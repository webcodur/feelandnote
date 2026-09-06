begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';

-- 창작(authored): 인물이 쓴 작품. 지금까지는 related로 넣고 화면이 책의 저자 표기와 인물 이름을 글자로 비교해 「창작」을 갈랐는데,
-- 푸시킨/푸쉬킨·Mao Zedong/Mao Tse-tung 같은 표기 변형마다 어긋났다. DB 값으로 확정한다. 관계 유형은 등장·연관·창작 셋이다.
-- 창작도 연관처럼 등장 설명을 갖지 않는다.

alter table public.figure_book_characters
  drop constraint if exists fiction_source_characters_relation_type_check;

alter table public.figure_book_characters
  add constraint fiction_source_characters_relation_type_check
  check (relation_type in ('appearance', 'related', 'authored'));

alter table public.figure_book_characters
  drop constraint if exists fiction_source_characters_related_description_check;

alter table public.figure_book_characters
  add constraint fiction_source_characters_related_description_check
  check (
    relation_type = 'appearance'
    or (description is null and description_en is null)
  );

comment on column public.figure_book_characters.relation_type is
  'appearance=인물이 작품에 실제 등장(등장), related=인물을 이해하는 직접 맥락 작품(연관), authored=인물이 쓴 작품(창작)';
comment on column public.figure_book_characters.description is
  'appearance 관계에서만 쓰는 작품 속 인물 역할·사건·결말 한국어 설명';
comment on column public.figure_book_characters.description_en is
  'appearance 관계에서만 쓰는 작품 속 인물 역할·사건·결말 영어 설명';

-- set_figure_book_relations는 허용값과 설명 지움 조건을 본문에 들고 있다. 20260904010000과 같은 방식으로
-- 살아있는 정의를 그대로 치환해 재생성한다. 본문을 손으로 옮겨 적지 않는다.
do $migrate$
declare
  fn_oid oid;
  old_def text;
  new_def text;
begin
  select p.oid into fn_oid
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'set_figure_book_relations';

  if fn_oid is null then
    raise exception 'set_figure_book_relations 함수가 없습니다';
  end if;

  old_def := pg_get_functiondef(fn_oid);
  if position('not in (''appearance'', ''related'')' in old_def) = 0 then
    raise exception 'set_figure_book_relations 본문에서 관계 유형 검사를 찾지 못했습니다';
  end if;

  new_def := replace(old_def, 'not in (''appearance'', ''related'')', 'not in (''appearance'', ''related'', ''authored'')');
  new_def := replace(new_def, 'appearance|related relation_type', 'appearance|related|authored relation_type');
  new_def := replace(new_def, 'when excluded.relation_type = ''related'' then null', 'when excluded.relation_type <> ''appearance'' then null');
  execute new_def;
  raise notice 'set_figure_book_relations 본문 정정';
end;
$migrate$;

do $$
begin
  if exists (
    select 1
    from public.figure_book_characters
    where relation_type not in ('appearance', 'related', 'authored')
  ) then
    raise exception '허용되지 않은 인물 도서 관계 유형이 있습니다';
  end if;

  if exists (
    select 1
    from public.figure_book_characters
    where relation_type <> 'appearance'
      and (description is not null or description_en is not null)
  ) then
    raise exception '등장이 아닌 관계에 등장 설명이 남아 있습니다';
  end if;
end;
$$;

commit;
