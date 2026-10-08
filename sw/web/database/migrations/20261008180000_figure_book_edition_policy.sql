-- Generated from packages/content-search/src/book-edition-policy.ts by edition-policy-sql.mjs.
BEGIN; SET LOCAL lock_timeout='5s'; SET LOCAL statement_timeout='30s';
CREATE OR REPLACE FUNCTION public.book_translator_identity(value jsonb) RETURNS text
LANGUAGE sql IMMUTABLE SET search_path='pg_catalog' AS $names$
SELECT string_agg(name,'|' ORDER BY name) FROM (
 SELECT DISTINCT regexp_replace(lower(normalize(item,NFKC)),'[[:space:]]','','g') name
 FROM jsonb_array_elements_text(CASE WHEN jsonb_typeof(value)='array' THEN value ELSE '[]'::jsonb END) item
 WHERE btrim(item)<>''
) names;
$names$;
CREATE OR REPLACE FUNCTION public.guard_figure_book_edition_policy() RETURNS trigger
LANGUAGE plpgsql SET search_path='pg_catalog' AS $policy$
DECLARE translators text; figure jsonb; original_locale boolean;
BEGIN
 IF new.edition_kind='abridged' OR coalesce(new.title,'') ~* E'축약(?:본|판)|축역|요약본|원서\\s*발췌|천줄읽기|\\yabridg(?:ed|ement|ment)\\y'
  OR coalesce(new.title,'') ~* E'\\y(?:penguin\\s+(?:longman\\s+)?readers|(?:oxford\\s+)?bookworms)\\y'
  OR coalesce(new.text_scope,'') ~* E'^(?:abridg(?:ed|ement|ment)|축약|축역|요약본)(?=$|[\\s/:;,])'
 THEN RAISE EXCEPTION 'Abridged books and graded readers are not service editions'; END IF;
 SELECT metadata->'figureBook' INTO figure FROM public.contents WHERE id=new.content_id FOR NO KEY UPDATE;
 translators=public.book_translator_identity(new.sources->'translators');
 original_locale=figure->>'originalLanguage'=new.locale AND coalesce(figure->>'identityEvidence','') ~ '^https://';
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
COMMIT;
