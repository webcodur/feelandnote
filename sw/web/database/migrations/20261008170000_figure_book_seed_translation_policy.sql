-- 축약본을 자동 등록하지 않고 같은 번역의 상품을 판본으로 복제하지 않는다.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

create or replace function public.seed_figure_book_editions()
returns trigger
language plpgsql
set search_path to 'pg_catalog'
as $function$
begin
  -- ISBN 없는 공급자 판본도 인물 관계가 추가될 때마다 복제하지 않는다.
  perform 1 from public.contents where id = new.content_id for no key update;
  insert into public.figure_book_editions (
    content_id, locale, title, creator, description, isbn, publisher,
    thumbnail_url, release_date, edition_kind, text_scope, sort_order,
    verified, sources
  )
  select
    locale.content_id, locale.locale,
    coalesce(nullif(btrim(locale.sources->>'edition_title'), ''),
      nullif(btrim(locale.title), ''), content.external_id, content.id),
    nullif(btrim(locale.creator), ''), locale.description,
    nullif(btrim(locale.isbn), ''), nullif(btrim(locale.publisher), ''),
    locale.thumbnail_url,
    case when content.release_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}'
      then left(content.release_date, 10)::date else null end,
    case when content.metadata #>> '{fictionSource,editionKind}'
      in ('full', 'abridged', 'retelling', 'adaptation', 'selection', 'volume')
      then content.metadata #>> '{fictionSource,editionKind}' else null end,
    nullif(content.metadata #>> '{fictionSource,textScope}', ''),
    0, locale.verified, locale.sources
  from public.contents as content
  join public.content_locales as locale on locale.content_id = content.id
  where content.id = new.content_id and content.type = 'BOOK'
    and coalesce(content.metadata #>> '{fictionSource,editionKind}', '') <> 'abridged'
    and coalesce(content.metadata #>> '{figureBook,editionKind}', '') <> 'abridged'
    and coalesce(locale.title, '') !~* '(축약본|축약판|축역|요약본|원서[[:space:]]*발췌|천줄읽기|\mabridged\M|penguin[[:space:]]+(longman[[:space:]]+)?readers|bookworms)'
    and not (locale.locale = 'en' and coalesce(locale.sources->>'primary', '') = 'kakao_book')
    and not (coalesce(locale.sources->>'primary', '') = 'none'
      and coalesce(locale.sources->>'title', '') in ('translated', 'romanized', 'original'))
    and not (nullif(btrim(locale.isbn), '') is null
      and coalesce(locale.sources->>'title', '') = 'kakao_title_search'
      and coalesce(locale.sources->>'series_source_url', '') !~ '^https://(m\.)?search\.daum\.net/search\?.*bookId=[0-9]+')
    and (nullif(btrim(locale.isbn), '') is not null
      or locale.sources->>'primary' in ('kakao_book', 'openlibrary'))
    and not exists (
      select 1 from public.figure_book_editions edition
      where edition.content_id = locale.content_id and edition.locale = locale.locale
        and jsonb_typeof(locale.sources->'translators') = 'array'
        and jsonb_array_length(locale.sources->'translators') > 0
        and edition.sources->'translators' = locale.sources->'translators'
    )
    and not exists (
      select 1 from public.figure_book_editions edition
      where edition.content_id = locale.content_id and edition.locale = locale.locale
        and edition.isbn is not distinct from nullif(btrim(locale.isbn), '')
        and (edition.isbn is not null or edition.title = coalesce(
          nullif(btrim(locale.sources->>'edition_title'), ''),
          nullif(btrim(locale.title), ''), content.external_id, content.id))
    )
  on conflict (content_id, locale, isbn) where isbn is not null do nothing;
  return new;
end;
$function$;
commit;
