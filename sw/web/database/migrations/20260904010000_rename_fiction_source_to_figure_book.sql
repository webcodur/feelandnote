-- fiction_source_* 이름을 figure_book_*으로 정정한다.
--
-- 배경: 이 카탈로그는 20260903110000에서 이미 티어 무관(실존·픽션 모두)하게 동작하도록
-- 일반화됐다. 물리 이름만 "fiction_source"로 남아 있어 "픽션 인물 전용"이라는 오해를 계속
-- 만든다(celeb-02-05-fiction-sources.md:18도 이미 "물리 이름은 기존 호환을 위해 유지한다"고
-- 적어 뒀다). 동작은 하나도 바꾸지 않고 이름만 정정한다.
--
-- 적용: 운영 DB에 SSH 로 docker exec ... psql -f 실행.
-- 뒤따르는 애플리케이션 배포(코드의 테이블·함수명 참조 갱신)와 같은 유지보수 창에서 실행한다 —
-- 이 마이그레이션이 먼저 적용된 뒤 구 코드가 잠깐이라도 돌면 그 요청은 실패한다.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';

-- 1. 테이블·뷰 이름 정정
alter table public.fiction_source_contents rename to figure_book_contents;
alter table public.fiction_source_characters rename to figure_book_characters;
alter table public.fiction_source_editions rename to figure_book_editions;
alter table public.fiction_source_products rename to figure_book_products;
alter view public.fiction_source_purchase_options rename to figure_book_purchase_options;

-- 1-1. 기본키·인덱스 이름 정정(테이블 RENAME이 자동으로 안 따라옴)
alter index public.fiction_source_characters_pkey rename to figure_book_characters_pkey;
alter index public.fiction_source_contents_pkey rename to figure_book_contents_pkey;
alter index public.fiction_source_editions_pkey rename to figure_book_editions_pkey;
alter index public.fiction_source_products_pkey rename to figure_book_products_pkey;
alter index public.fiction_source_characters_celeb_id_idx rename to figure_book_characters_celeb_id_idx;
alter index public.fiction_source_editions_content_locale_isbn_uidx rename to figure_book_editions_content_locale_isbn_uidx;
alter index public.fiction_source_editions_content_locale_order_idx rename to figure_book_editions_content_locale_order_idx;
alter index public.fiction_source_products_active_platform_edition_idx rename to figure_book_products_active_platform_edition_idx;
alter index public.fiction_source_products_edition_id_idx rename to figure_book_products_edition_id_idx;
alter index public.fiction_source_products_one_active_platform_uidx rename to figure_book_products_one_active_platform_uidx;

-- 2. identity 컬럼이 만든 내부 시퀀스 이름 정정
alter sequence if exists public.fiction_source_editions_id_seq rename to figure_book_editions_id_seq;
alter sequence if exists public.fiction_source_products_id_seq rename to figure_book_products_id_seq;

-- 3. 함수 이름 정정(본문은 아직 손대지 않는다 — 4번에서 현재 살아있는 정의를 그대로 옮긴다)
alter function public.touch_fiction_source_catalog_updated_at()
  rename to touch_figure_book_catalog_updated_at;
alter function public.seed_fiction_source_editions()
  rename to seed_figure_book_editions;
alter function public.replace_fiction_source_product(bigint, text, text, text, text, jsonb, timestamptz)
  rename to replace_figure_book_product;
alter function public.deactivate_fiction_source_product(bigint, text)
  rename to deactivate_figure_book_product;
alter function public.fiction_source_related_celeb_cache_tags(text)
  rename to figure_book_related_celeb_cache_tags;
alter function public.validate_fiction_source_character()
  rename to validate_figure_book_character;
alter function public.validate_fiction_source_content()
  rename to validate_figure_book_content;

-- 옛 호출부 호환용으로 20260903110000이 남긴 래퍼. 현재 호출부는 set_figure_book_relations
-- 하나뿐이라(sw/web-bo/src/actions/admin/fiction-sources.ts) 정정 대신 제거한다.
drop function if exists public.set_fiction_source_characters(text, uuid[]);

-- 4. 방금 이름을 바꾼 함수와 set_figure_book_relations의 본문에 남은 "fiction_source_" 문자열을
--    지금 실제로 살아있는 정의에서 그대로 치환해 재생성한다. 본문을 손으로 옮겨 적지 않음으로써
--    이 마이그레이션 작성 시점과 실제 운영 정의 사이의 어긋남 위험을 없앤다.
do $migrate$
declare
  fn record;
  new_def text;
  before_count integer := 0;
  after_count integer := 0;
begin
  for fn in
    select p.oid, p.proname
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind = 'f'
      and position('fiction_source_' in pg_get_functiondef(p.oid)) > 0
  loop
    before_count := before_count + 1;
    new_def := replace(pg_get_functiondef(fn.oid), 'fiction_source_', 'figure_book_');
    execute new_def;
    raise notice '함수 본문 정정: %', fn.proname;
  end loop;

  select count(*) into after_count
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.prokind = 'f'
    and position('fiction_source_' in pg_get_functiondef(p.oid)) > 0;

  raise notice '본문 정정 대상 %건, 잔여 %건', before_count, after_count;

  if after_count > 0 then
    raise exception '함수 본문에 fiction_source_가 %건 남았습니다', after_count;
  end if;
end;
$migrate$;

-- 5. 트리거 이름 정정(함수 바인딩은 OID로 유지되므로 안 끊긴다)
alter trigger trg_fiction_source_editions_touch_updated_at
  on public.figure_book_editions
  rename to trg_figure_book_editions_touch_updated_at;
alter trigger trg_fiction_source_products_touch_updated_at
  on public.figure_book_products
  rename to trg_figure_book_products_touch_updated_at;
alter trigger trg_seed_fiction_source_editions
  on public.figure_book_contents
  rename to trg_seed_figure_book_editions;
alter trigger trg_validate_fiction_source_content
  on public.figure_book_contents
  rename to trg_validate_figure_book_content;
alter trigger trg_validate_fiction_source_character
  on public.figure_book_characters
  rename to trg_validate_figure_book_character;

-- 6. RLS 정책 이름 정정(표시용 문자열, 동작에는 영향 없음)
alter policy "Public can view designated fiction source contents"
  on public.figure_book_contents
  rename to "Public can view designated figure book contents";
alter policy "Public can view fiction source characters"
  on public.figure_book_characters
  rename to "Public can view figure book characters";
alter policy "Public can view fiction source editions"
  on public.figure_book_editions
  rename to "Public can view figure book editions";
alter policy "Public can view fiction source products"
  on public.figure_book_products
  rename to "Public can view figure book products";

-- 7. 남은 이름이 없는지 최종 확인(테이블·뷰·시퀀스·함수·트리거·정책 전부)
do $verify$
declare
  leftover integer;
begin
  select count(*) into leftover
  from (
    select relname as name from pg_class
    where relnamespace = 'public'::regnamespace and position('fiction_source_' in relname) > 0
    union all
    select proname from pg_proc
    where pronamespace = 'public'::regnamespace and position('fiction_source_' in proname) > 0
    union all
    select tgname from pg_trigger
    where not tgisinternal and position('fiction_source_' in tgname) > 0
    union all
    select polname from pg_policy
    where position('fiction source' in polname) > 0
  ) as leftovers;

  if leftover > 0 then
    raise exception 'fiction_source 이름이 %건 남았습니다', leftover;
  end if;
end;
$verify$;

commit;
