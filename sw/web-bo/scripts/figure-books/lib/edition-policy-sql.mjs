import { BOOK_EDITION_EXCLUDED_TITLE, BOOK_EDITION_ENGLISH_SOURCE_TITLE, BOOK_EDITION_GRADED_READER, BOOK_EDITION_EXCLUDED_SCOPE, BOOK_EDITION_KAKAO_PAGE, BOOK_EDITION_NONSTART_SCOPE, BOOK_EDITION_EXCLUDED_PROVIDER_DESCRIPTION, BOOK_TRANSLATOR_IGNORED_CHARACTERS, BOOK_EDITION_VOLUME_TITLE, BOOK_EDITION_VOLUME_TITLE_FORMAT, BOOK_EDITION_WORK_TITLE_ARTICLE, BOOK_EDITION_WORK_TITLE_PUNCTUATION, SERVICE_BOOK_EDITION_KINDS } from '../../../../../packages/content-search/src/book-edition-policy.ts'
import { sqlLiteral } from './merge-work-sql.mjs'
const pg = regex => sqlLiteral(regex.source.replaceAll('\\b','\\y'))
export function editionPolicySql() {
 return `BEGIN; SET LOCAL lock_timeout='5s'; SET LOCAL statement_timeout='30s';
CREATE OR REPLACE FUNCTION public.book_translator_identity(value jsonb) RETURNS text
LANGUAGE sql IMMUTABLE SET search_path='pg_catalog' AS $names$
SELECT string_agg(name,'|' ORDER BY name) FROM (
 SELECT DISTINCT regexp_replace(lower(normalize(item,NFKC)),${pg(BOOK_TRANSLATOR_IGNORED_CHARACTERS)},'','g') name
 FROM jsonb_array_elements_text(CASE WHEN jsonb_typeof(value)='array' THEN value ELSE '[]'::jsonb END) item
 WHERE btrim(item)<>''
) names WHERE name<>'';
$names$;
CREATE OR REPLACE FUNCTION public.book_nonstart_work_volume(title text,figure jsonb,scope text) RETURNS boolean
LANGUAGE plpgsql IMMUTABLE SET search_path='pg_catalog' AS $volume$
DECLARE matched text[]; prefix text;
BEGIN
 IF coalesce(figure #>> '{series,sourceUrl}','') !~ '^https://' AND (nullif(scope,'') IS NULL OR scope ~* '^(complete|full|unknown)$') THEN RETURN false; END IF;
 matched=regexp_match(regexp_replace(normalize(coalesce(title,''),NFKC),${pg(BOOK_EDITION_VOLUME_TITLE_FORMAT)},'','gi'),${pg(BOOK_EDITION_VOLUME_TITLE)},'i');
 IF matched IS NULL THEN RETURN false; END IF;
 IF upper(matched[2])='I' OR (CASE WHEN matched[2] ~ '^[0-9]+$' THEN matched[2]::numeric<=1 ELSE false END) THEN RETURN false; END IF;
 prefix=regexp_replace(regexp_replace(lower(normalize(matched[1],NFKC)),${pg(BOOK_EDITION_WORK_TITLE_ARTICLE)},'','i'),${pg(BOOK_EDITION_WORK_TITLE_PUNCTUATION)},'','g');
 RETURN EXISTS(SELECT 1 FROM (VALUES(figure->>'workTitle'),(figure->>'originalTitle')) roots(value)
   WHERE regexp_replace(regexp_replace(lower(normalize(coalesce(value,''),NFKC)),${pg(BOOK_EDITION_WORK_TITLE_ARTICLE)},'','i'),${pg(BOOK_EDITION_WORK_TITLE_PUNCTUATION)},'','g')=prefix);
END;
$volume$;
CREATE OR REPLACE FUNCTION public.guard_figure_book_edition_policy() RETURNS trigger
LANGUAGE plpgsql SET search_path='pg_catalog' AS $policy$
DECLARE translators text; figure jsonb; original_locale boolean;
BEGIN
 SELECT metadata->'figureBook' INTO figure FROM public.contents WHERE id=new.content_id FOR NO KEY UPDATE;
 IF (new.locale='ko' AND coalesce(new.title,'') ~ ${pg(BOOK_EDITION_ENGLISH_SOURCE_TITLE)}) OR public.book_nonstart_work_volume(new.title,figure,new.text_scope) OR new.edition_kind='abridged' OR coalesce(new.title,'') ~* ${pg(BOOK_EDITION_EXCLUDED_TITLE)}
  OR coalesce(new.title,'') ~* ${pg(BOOK_EDITION_GRADED_READER)}
  OR (new.sources->>'provider_edition_isbn'=new.isbn AND (coalesce(new.sources->>'provider_edition_title','') ~* ${pg(BOOK_EDITION_EXCLUDED_TITLE)} OR coalesce(new.sources->>'provider_edition_title','') ~* ${pg(BOOK_EDITION_GRADED_READER)}))
  OR (new.locale='ko' AND new.sources->>'provider_edition_isbn'=new.isbn AND coalesce(new.sources->>'provider_edition_title','') ~ ${pg(BOOK_EDITION_ENGLISH_SOURCE_TITLE)})
  OR coalesce(new.text_scope,'') ~* ${pg(BOOK_EDITION_EXCLUDED_SCOPE)}
  OR coalesce(new.text_scope,'') ~* ${pg(BOOK_EDITION_NONSTART_SCOPE)}
  OR coalesce(new.sources->>'provider_scope_description',new.sources #>> '{provider_metadata,contents}','') ~* ${pg(BOOK_EDITION_EXCLUDED_PROVIDER_DESCRIPTION)}
  OR (new.sources->>'primary'='none' AND new.sources->>'title'='display_only')
  OR (nullif(btrim(new.isbn),'') IS NULL AND new.sources->>'title'='kakao_title_search' AND coalesce(new.sources->>'series_source_url','') !~ ${pg(BOOK_EDITION_KAKAO_PAGE)})
  OR (nullif(btrim(new.isbn),'') IS NULL AND nullif(btrim(new.publisher),'') IS NULL AND new.release_date IS NULL
    AND new.sources->>'primary' IN ('manual','manual-research','wikidata')
    AND nullif(new.sources->>'edition_key','') IS NULL AND nullif(new.sources->>'provider_edition_url','') IS NULL
    AND NOT EXISTS (SELECT 1 FROM (VALUES(new.sources->>'title'),(new.sources->>'isbn'),(new.sources->>'primary')) v(url)
      WHERE coalesce(url,'') ~ ${pg(BOOK_EDITION_KAKAO_PAGE)} OR coalesce(url,'') ~ '^https://openlibrary[.]org/books/OL[0-9]+M(/|$)'))
 THEN RAISE EXCEPTION 'Abridged books, graded readers and unverified placeholders are not service editions'; END IF;
 translators=public.book_translator_identity(new.sources->'translators');
 original_locale=coalesce(figure->>'originalLanguage'=new.locale AND coalesce(figure->>'identityEvidence','') ~ '^https://',false);
 IF (TG_OP='INSERT' OR new.content_id IS DISTINCT FROM old.content_id OR new.locale IS DISTINCT FROM old.locale OR new.isbn IS DISTINCT FROM old.isbn)
 AND EXISTS (SELECT 1 FROM public.figure_book_editions e WHERE e.content_id=new.content_id AND e.locale=new.locale AND e.id<>new.id
   AND NOT original_locale AND (translators IS NULL OR public.book_translator_identity(e.sources->'translators') IS NULL))
 THEN RAISE EXCEPTION 'An additional edition requires a verified different translation; ISBN and publisher changes are products'; END IF;
 IF (translators IS NOT NULL OR original_locale) AND EXISTS (
  SELECT 1 FROM public.figure_book_editions e WHERE e.content_id=new.content_id AND e.locale=new.locale AND e.id<>new.id
   AND public.book_translator_identity(e.sources->'translators') IS NOT DISTINCT FROM translators
 ) THEN RAISE EXCEPTION 'Same original or translation already has a representative edition; attach products to it'; END IF;
 RETURN new;
END;
$policy$;
DROP TRIGGER IF EXISTS guard_figure_book_edition_policy ON public.figure_book_editions;
CREATE TRIGGER guard_figure_book_edition_policy BEFORE INSERT OR UPDATE OF content_id,locale,title,isbn,edition_kind,text_scope,sources ON public.figure_book_editions
FOR EACH ROW EXECUTE FUNCTION public.guard_figure_book_edition_policy();
${seedPolicySql()}
COMMIT;`
}

function seedPolicySql() {
 return `create or replace function public.seed_figure_book_editions()
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
      in (${SERVICE_BOOK_EDITION_KINDS.map(sqlLiteral).join(',')})
      then content.metadata #>> '{fictionSource,editionKind}' else null end,
    nullif(content.metadata #>> '{fictionSource,textScope}', ''),
    0, locale.verified, locale.sources
  from public.contents as content
  join public.content_locales as locale on locale.content_id = content.id
  where content.id = new.content_id and content.type = 'BOOK'
    and NOT public.book_nonstart_work_volume(locale.title,content.metadata->'figureBook',content.metadata #>> '{fictionSource,textScope}')
    and coalesce(content.metadata #>> '{fictionSource,editionKind}', '') <> 'abridged'
    and coalesce(content.metadata #>> '{figureBook,editionKind}', '') <> 'abridged'
    and NOT (locale.locale='ko' AND coalesce(locale.title,'') ~ ${pg(BOOK_EDITION_ENGLISH_SOURCE_TITLE)})
    and coalesce(locale.title, '') !~* ${pg(BOOK_EDITION_EXCLUDED_TITLE)}
    and coalesce(locale.title, '') !~* ${pg(BOOK_EDITION_GRADED_READER)}
    and NOT coalesce(locale.sources->>'provider_edition_isbn'=locale.isbn AND (coalesce(locale.sources->>'provider_edition_title','') ~* ${pg(BOOK_EDITION_EXCLUDED_TITLE)} OR coalesce(locale.sources->>'provider_edition_title','') ~* ${pg(BOOK_EDITION_GRADED_READER)}),false)
    and NOT coalesce(locale.locale='ko' AND locale.sources->>'provider_edition_isbn'=locale.isbn AND coalesce(locale.sources->>'provider_edition_title','') ~ ${pg(BOOK_EDITION_ENGLISH_SOURCE_TITLE)},false)
    and coalesce(locale.sources->>'provider_scope_description',locale.sources #>> '{provider_metadata,contents}','') !~* ${pg(BOOK_EDITION_EXCLUDED_PROVIDER_DESCRIPTION)}
    and coalesce(content.metadata #>> '{fictionSource,textScope}', '') !~* ${pg(BOOK_EDITION_EXCLUDED_SCOPE)}
    and coalesce(content.metadata #>> '{fictionSource,textScope}', '') !~* ${pg(BOOK_EDITION_NONSTART_SCOPE)}
    and not (locale.locale = 'en' and coalesce(locale.sources->>'primary', '') = 'kakao_book')
    and not (coalesce(locale.sources->>'primary', '') = 'none'
      and coalesce(locale.sources->>'title', '') in ('translated', 'romanized', 'original', 'display_only'))
    and not (nullif(btrim(locale.isbn), '') is null
      and coalesce(locale.sources->>'title', '') = 'kakao_title_search'
      and coalesce(locale.sources->>'series_source_url', '') !~ ${pg(BOOK_EDITION_KAKAO_PAGE)})
    and (nullif(btrim(locale.isbn), '') is not null
      or locale.sources->>'primary' in ('kakao_book', 'openlibrary'))
    and not exists (
      select 1 from public.figure_book_editions edition
      where edition.content_id = locale.content_id and edition.locale = locale.locale
        and ((NOT coalesce(content.metadata #>> '{figureBook,originalLanguage}'=locale.locale
            AND content.metadata #>> '{figureBook,identityEvidence}' ~ '^https://',false)
          and (public.book_translator_identity(locale.sources->'translators') IS NULL
            or public.book_translator_identity(edition.sources->'translators') IS NULL))
          or public.book_translator_identity(edition.sources->'translators') IS NOT DISTINCT FROM public.book_translator_identity(locale.sources->'translators'))
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
$function$;`
}
