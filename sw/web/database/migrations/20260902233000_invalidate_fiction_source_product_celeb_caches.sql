begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';

create or replace function public.fiction_source_related_celeb_cache_tags(
  p_content_id text
)
returns text[]
language sql
stable
set search_path = pg_catalog, pg_temp
as $function$
  select coalesce(
    pg_catalog.array_agg(cache_tag.tag order by cache_tag.tag),
    array[]::text[]
  )
  from (
    select 'celebs:' || relation.celeb_id::text as tag
    from public.fiction_source_characters as relation
    where relation.content_id = p_content_id

    union

    select 'celebs:' || celeb.slug as tag
    from public.fiction_source_characters as relation
    join public.celebs as celeb on celeb.id = relation.celeb_id
    where relation.content_id = p_content_id
      and nullif(pg_catalog.btrim(celeb.slug), '') is not null
  ) as cache_tag;
$function$;

alter function public.fiction_source_related_celeb_cache_tags(text) owner to postgres;
revoke all on function public.fiction_source_related_celeb_cache_tags(text)
  from public, anon, authenticated, service_role;

drop trigger if exists web_reval_ins on public.fiction_source_editions;
drop trigger if exists web_reval_upd on public.fiction_source_editions;
drop trigger if exists web_reval_del on public.fiction_source_editions;

create trigger web_reval_ins
after insert on public.fiction_source_editions
referencing new table as new_rows
for each statement
execute function public.web_revalidate_trigger(
  $tag$array[
    'fiction-sources',
    'contents:' || r.content_id,
    'contents:' || (select c.external_id from public.contents as c where c.id = r.content_id)
  ] || public.fiction_source_related_celeb_cache_tags(r.content_id)$tag$,
  '',
  'n.id = o.id'
);

create trigger web_reval_upd
after update on public.fiction_source_editions
referencing old table as old_rows new table as new_rows
for each statement
execute function public.web_revalidate_trigger(
  $tag$array[
    'fiction-sources',
    'contents:' || r.content_id,
    'contents:' || (select c.external_id from public.contents as c where c.id = r.content_id)
  ] || public.fiction_source_related_celeb_cache_tags(r.content_id)$tag$,
  'updated_at',
  'n.id = o.id'
);

create trigger web_reval_del
after delete on public.fiction_source_editions
referencing old table as old_rows
for each statement
execute function public.web_revalidate_trigger(
  $tag$array[
    'fiction-sources',
    'contents:' || r.content_id,
    'contents:' || (select c.external_id from public.contents as c where c.id = r.content_id)
  ] || public.fiction_source_related_celeb_cache_tags(r.content_id)$tag$,
  '',
  'n.id = o.id'
);

drop trigger if exists web_reval_ins on public.fiction_source_products;
drop trigger if exists web_reval_upd on public.fiction_source_products;
drop trigger if exists web_reval_del on public.fiction_source_products;

create trigger web_reval_ins
after insert on public.fiction_source_products
referencing new table as new_rows
for each statement
execute function public.web_revalidate_trigger(
  $tag$array[
    'fiction-sources',
    'contents:' || (select e.content_id from public.fiction_source_editions as e where e.id = r.edition_id),
    'contents:' || (
      select c.external_id
      from public.fiction_source_editions as e
      join public.contents as c on c.id = e.content_id
      where e.id = r.edition_id
    )
  ] || public.fiction_source_related_celeb_cache_tags((
    select e.content_id
    from public.fiction_source_editions as e
    where e.id = r.edition_id
  ))$tag$,
  '',
  'n.id = o.id'
);

create trigger web_reval_upd
after update on public.fiction_source_products
referencing old table as old_rows new table as new_rows
for each statement
execute function public.web_revalidate_trigger(
  $tag$array[
    'fiction-sources',
    'contents:' || (select e.content_id from public.fiction_source_editions as e where e.id = r.edition_id),
    'contents:' || (
      select c.external_id
      from public.fiction_source_editions as e
      join public.contents as c on c.id = e.content_id
      where e.id = r.edition_id
    )
  ] || public.fiction_source_related_celeb_cache_tags((
    select e.content_id
    from public.fiction_source_editions as e
    where e.id = r.edition_id
  ))$tag$,
  'updated_at',
  'n.id = o.id'
);

create trigger web_reval_del
after delete on public.fiction_source_products
referencing old table as old_rows
for each statement
execute function public.web_revalidate_trigger(
  $tag$array[
    'fiction-sources',
    'contents:' || (select e.content_id from public.fiction_source_editions as e where e.id = r.edition_id),
    'contents:' || (
      select c.external_id
      from public.fiction_source_editions as e
      join public.contents as c on c.id = e.content_id
      where e.id = r.edition_id
    )
  ] || public.fiction_source_related_celeb_cache_tags((
    select e.content_id
    from public.fiction_source_editions as e
    where e.id = r.edition_id
  ))$tag$,
  '',
  'n.id = o.id'
);

commit;
