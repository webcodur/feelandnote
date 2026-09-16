-- 캐시 태그 도메인 목록을 DB 안에서 한 곳에만 둔다.
--
-- 원천은 packages/shared/src/constants/cache-tags.ts 의 CACHE_TAGS 하나다.
-- web_revalidate_allowed_domains() 는 그 사본이며 손으로 고치지 않는다.
-- 원천을 바꾸면 `pnpm check:cache-tags` 가 불일치를 잡고 붙여 넣을 SQL을 출력한다.
--
-- 경위: 26.09.04 fiction-sources → figure-books 이름 변경 때 web_revalidate_send 안에
-- 하드코딩된 목록만 옛 이름에 남았다. 트리거가 보내는 figure-books 태그가 전부 버려져
-- 인물↔도서 연결을 바꿔도 해당 캐시가 비워지지 않았다(26.09.14~16 경고 1,608건).

create or replace function public.web_revalidate_allowed_domains()
returns text[]
language sql
immutable
set search_path = ''
as $$
  select array['celebs', 'contents', 'dialogues', 'spectrum', 'tags', 'figure-books', 'curated']::text[]
$$;

alter function public.web_revalidate_allowed_domains() owner to postgres;
revoke all on function public.web_revalidate_allowed_domains()
from public, anon, authenticated, service_role;
grant execute on function public.web_revalidate_allowed_domains() to postgres;

-- 하드코딩 목록을 위 함수 호출로 바꾼 것 외에는 운영 정의와 같다.
CREATE OR REPLACE FUNCTION public.web_revalidate_send(p_tags text[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'pg_temp'
AS $function$
declare
  v_secret text;
  v_secret_count bigint;
  v_tags text[];
  v_chunk text[];
  v_chunk_size constant integer := 200;
  v_offset integer := 1;
  v_rejected_count integer;
begin
  -- Keep this boundary equivalent to isAllowedCacheTag() in
  -- packages/shared/src/constants/cache-tags.ts: Unicode and punctuation are
  -- valid identifiers, except whitespace, URL path/query delimiters, percent,
  -- ASCII controls, and the dot-segment aliases that change URL semantics.
  with normalized_tags as (
    select pg_catalog.btrim(input_tag.tag) as tag
    from pg_catalog.unnest(p_tags) as input_tag(tag)
    where input_tag.tag is not null
  ), parsed_tags as (
    select
      normalized_tag.tag,
      pg_catalog.strpos(normalized_tag.tag, ':') as separator_at,
      pg_catalog.split_part(normalized_tag.tag, ':', 1) as domain,
      case
        when pg_catalog.strpos(normalized_tag.tag, ':') > 0 then
          pg_catalog.substr(
            normalized_tag.tag,
            pg_catalog.strpos(normalized_tag.tag, ':') + 1
          )
        else null
      end as identifier
    from normalized_tags as normalized_tag
    where normalized_tag.tag <> ''
  ), classified_tags as (
    select
      parsed_tag.tag,
      (
        -- JavaScript String.length counts astral code points as two UTF-16
        -- units; add their count to PostgreSQL's code-point length.
        pg_catalog.length(parsed_tag.tag)
          + pg_catalog.regexp_count(
            parsed_tag.tag,
            U&'[\+010000-\+10FFFF]'
          ) <= 200
        and parsed_tag.domain = any (public.web_revalidate_allowed_domains())
        and (
          parsed_tag.separator_at = 0
          or (
            pg_catalog.length(parsed_tag.identifier) between 1 and 128
            and parsed_tag.identifier not in ('.', '..')
            -- PostgreSQL UTF-8 cannot represent NUL or UTF-16 surrogates.
            -- The remaining Unicode 17 Cc/Cf ranges mirror the JS \p contract.
            and parsed_tag.identifier !~
              U&'[\0001-\001F\007F-\009F\00AD\0600-\0605\061C\06DD\070F\0890-\0891\08E2\180E\200B-\200F\202A-\202E\2060-\2064\2066-\206F\FEFF\FFF9-\FFFB\+0110BD\+0110CD\+013430-\+01343F\+01BCA0-\+01BCA3\+01D173-\+01D17A\+0E0001\+0E0020-\+0E007F]'
            and parsed_tag.identifier !~
              U&'[\0020\00A0\1680\2000-\200A\2028\2029\202F\205F\3000\FEFF]'
            and pg_catalog.strpos(parsed_tag.identifier, '/') = 0
            and pg_catalog.strpos(parsed_tag.identifier, E'\\') = 0
            and pg_catalog.strpos(parsed_tag.identifier, '?') = 0
            and pg_catalog.strpos(parsed_tag.identifier, '#') = 0
            and pg_catalog.strpos(parsed_tag.identifier, '%') = 0
          )
        )
      ) as is_allowed
    from parsed_tags as parsed_tag
  )
  select
    pg_catalog.array_agg(distinct classified_tag.tag order by classified_tag.tag)
      filter (where classified_tag.is_allowed),
    pg_catalog.count(*) filter (where not classified_tag.is_allowed)
  into v_tags, v_rejected_count
  from classified_tags as classified_tag;

  if v_rejected_count > 0 then
    raise warning
      'web_revalidate_send: discarded % structurally unsafe cache tag(s)',
      v_rejected_count;
  end if;

  if coalesce(pg_catalog.cardinality(v_tags), 0) = 0 then
    return;
  end if;

  -- Secret provisioning stays an external secure bootstrap step. At runtime,
  -- fail closed unless exactly one nonblank named secret exists; never place
  -- its value in a migration, assertion, or diagnostic message.
  select secret_row.decrypted_secret, pg_catalog.count(*) over ()
  into v_secret, v_secret_count
  from vault.decrypted_secrets as secret_row
  where secret_row.name = 'web_revalidate_secret'
  order by secret_row.created_at desc
  limit 1;

  if coalesce(v_secret_count, 0) <> 1
     or nullif(pg_catalog.btrim(v_secret), '') is null then
    raise exception 'web_revalidate_send requires exactly one nonblank vault secret named web_revalidate_secret';
  end if;

  while v_offset <= pg_catalog.cardinality(v_tags) loop
    v_chunk := v_tags[
      v_offset:least(
        v_offset + v_chunk_size - 1,
        pg_catalog.cardinality(v_tags)
      )
    ];

    perform net.http_post(
      url := 'https://feelandnote.com/api/revalidate'::text,
      body := pg_catalog.jsonb_build_object(
        'tag', pg_catalog.to_jsonb(v_chunk),
        'secret', v_secret
      ),
      params := '{}'::jsonb,
      headers := pg_catalog.jsonb_build_object(
        'Content-Type', 'application/json',
        'User-Agent', 'feelandnote-db-revalidate/2.0'
      ),
      timeout_milliseconds := 8000
    );

    v_offset := v_offset + v_chunk_size;
  end loop;
end;
$function$;
