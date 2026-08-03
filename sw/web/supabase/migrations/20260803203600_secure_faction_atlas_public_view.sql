begin;

-- Keep the production query in an unexposed schema. The view itself is an
-- invoker view; the internal refresh trigger runs as postgres and therefore
-- evaluates the existing admin-only RLS policies without opening the source
-- tables to API roles.
create schema if not exists private;

revoke all on schema private from public;
grant usage on schema private to anon, authenticated, service_role;

create or replace view private.faction_atlas_members_source
with (security_invoker = true)
as
with production as (
  select distinct on (g.tag_id, fp.celeb_id)
    g.tag_id,
    fp.celeb_id,
    nullif(btrim(fp.lines[1]), '') as short_desc,
    nullif(btrim(fp.lines_en[1]), '') as short_desc_en,
    coalesce(
      fp.web_long_desc,
      nullif(btrim(fp.epithet), ''),
      nullif(array_to_string(fp.lines[2:3], ', '), '')
    ) as long_desc,
    coalesce(
      fp.web_long_desc_en,
      nullif(btrim(fp.epithet_en), ''),
      nullif(array_to_string(fp.lines_en[2:3], ', '), '')
    ) as long_desc_en,
    nullif(btrim(fp.quote), '') as quote,
    nullif(btrim(fp.quote_en), '') as quote_en,
    fp.web_image_url as faction_image_url,
    fp.web_hidden as hidden,
    fp.id as person_id,
    nullif(btrim(split_part(g.name, E'\n', 1)), '') as group_label,
    nullif(btrim(split_part(coalesce(g.name_en, ''), E'\n', 1)), '') as group_label_en,
    nullif(btrim(split_part(g.name, E'\n', 2)), '') as group_subtitle,
    nullif(btrim(split_part(coalesce(g.name_en, ''), E'\n', 2)), '') as group_subtitle_en,
    nullif(btrim(g.color), '') as group_color,
    nullif(btrim(g.web_logo_url), '') as group_logo_url,
    g.position as g_pos,
    c.position as c_pos,
    fp.position as p_pos,
    fp.web_quote_media
  from public.faction_people fp
  join public.faction_clusters c on c.id = fp.cluster_id
  join public.faction_groups g on g.id = c.group_id
  where g.tag_id is not null
    and fp.celeb_id is not null
    and coalesce(fp.disabled, false) = false
  order by g.tag_id, fp.celeb_id, g.position, c.position, fp.position
)
select
  production.tag_id,
  production.celeb_id,
  production.short_desc,
  production.short_desc_en,
  production.long_desc,
  production.long_desc_en,
  production.quote,
  production.quote_en,
  production.faction_image_url,
  production.hidden,
  row_number() over (
    partition by production.tag_id
    order by production.g_pos, production.c_pos, production.p_pos
  )::integer as sort_order,
  'production'::text as source,
  production.person_id,
  null::uuid as assignment_id,
  production.group_label,
  production.group_label_en,
  production.g_pos as group_position,
  production.group_subtitle,
  production.group_subtitle_en,
  production.group_color,
  production.group_logo_url,
  production.web_quote_media as faction_quote_media
from production

union all

select
  a.tag_id,
  a.celeb_id,
  a.short_desc,
  a.short_desc_en,
  a.long_desc,
  a.long_desc_en,
  a.quote,
  a.quote_en,
  a.faction_image_url,
  a.hidden,
  10000 + a.sort_order as sort_order,
  'manual'::text as source,
  null::uuid as person_id,
  a.id as assignment_id,
  null::text as group_label,
  null::text as group_label_en,
  null::integer as group_position,
  null::text as group_subtitle,
  null::text as group_subtitle_en,
  null::text as group_color,
  null::text as group_logo_url,
  null::jsonb as faction_quote_media
from public.celeb_tag_assignments a
where not exists (
  select 1
  from public.faction_people fp
  join public.faction_clusters c on c.id = fp.cluster_id
  join public.faction_groups g on g.id = c.group_id
  where g.tag_id = a.tag_id
    and fp.celeb_id = a.celeb_id
    and coalesce(fp.disabled, false) = false
);

revoke all privileges on table private.faction_atlas_members_source
  from public, anon, authenticated, service_role;

create table private.faction_atlas_members_cache (
  tag_id uuid not null,
  celeb_id uuid not null,
  short_desc text,
  short_desc_en text,
  long_desc text,
  long_desc_en text,
  quote text,
  quote_en text,
  faction_image_url text,
  hidden boolean not null,
  sort_order integer not null,
  source text not null,
  person_id uuid,
  assignment_id uuid,
  group_label text,
  group_label_en text,
  group_position integer,
  group_subtitle text,
  group_subtitle_en text,
  group_color text,
  group_logo_url text,
  faction_quote_media jsonb,
  constraint faction_atlas_members_cache_pkey primary key (tag_id, celeb_id),
  constraint faction_atlas_members_cache_source_check
    check (source in ('production', 'manual')),
  constraint faction_atlas_members_cache_identity_check
    check (
      (source = 'production' and person_id is not null and assignment_id is null)
      or
      (source = 'manual' and person_id is null and assignment_id is not null)
    )
);

create index faction_atlas_members_cache_tag_sort_idx
  on private.faction_atlas_members_cache (tag_id, hidden, sort_order);
create index faction_atlas_members_cache_celeb_idx
  on private.faction_atlas_members_cache (celeb_id);

alter table private.faction_atlas_members_cache
  enable row level security;

create policy faction_atlas_members_cache_public_select
  on private.faction_atlas_members_cache
  for select
  to anon, authenticated
  using (true);

revoke all privileges on table private.faction_atlas_members_cache
  from public, anon, authenticated, service_role;
grant select on table private.faction_atlas_members_cache
  to anon, authenticated, service_role;

create or replace function private.refresh_faction_atlas_members_cache()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from private.faction_atlas_members_cache;

  insert into private.faction_atlas_members_cache (
    tag_id,
    celeb_id,
    short_desc,
    short_desc_en,
    long_desc,
    long_desc_en,
    quote,
    quote_en,
    faction_image_url,
    hidden,
    sort_order,
    source,
    person_id,
    assignment_id,
    group_label,
    group_label_en,
    group_position,
    group_subtitle,
    group_subtitle_en,
    group_color,
    group_logo_url,
    faction_quote_media
  )
  select
    tag_id,
    celeb_id,
    short_desc,
    short_desc_en,
    long_desc,
    long_desc_en,
    quote,
    quote_en,
    faction_image_url,
    hidden,
    sort_order,
    source,
    person_id,
    assignment_id,
    group_label,
    group_label_en,
    group_position,
    group_subtitle,
    group_subtitle_en,
    group_color,
    group_logo_url,
    faction_quote_media
  from private.faction_atlas_members_source;

  return null;
end
$$;

revoke all privileges on function private.refresh_faction_atlas_members_cache()
  from public, anon, authenticated, service_role;

-- Seed the cache before the public view is redirected to it.
insert into private.faction_atlas_members_cache (
  tag_id,
  celeb_id,
  short_desc,
  short_desc_en,
  long_desc,
  long_desc_en,
  quote,
  quote_en,
  faction_image_url,
  hidden,
  sort_order,
  source,
  person_id,
  assignment_id,
  group_label,
  group_label_en,
  group_position,
  group_subtitle,
  group_subtitle_en,
  group_color,
  group_logo_url,
  faction_quote_media
)
select
  tag_id,
  celeb_id,
  short_desc,
  short_desc_en,
  long_desc,
  long_desc_en,
  quote,
  quote_en,
  faction_image_url,
  hidden,
  sort_order,
  source,
  person_id,
  assignment_id,
  group_label,
  group_label_en,
  group_position,
  group_subtitle,
  group_subtitle_en,
  group_color,
  group_logo_url,
  faction_quote_media
from private.faction_atlas_members_source;

drop trigger if exists trg_refresh_faction_atlas_from_groups
  on public.faction_groups;
create trigger trg_refresh_faction_atlas_from_groups
after insert or update or delete or truncate
on public.faction_groups
for each statement
execute function private.refresh_faction_atlas_members_cache();

drop trigger if exists trg_refresh_faction_atlas_from_clusters
  on public.faction_clusters;
create trigger trg_refresh_faction_atlas_from_clusters
after insert or update or delete or truncate
on public.faction_clusters
for each statement
execute function private.refresh_faction_atlas_members_cache();

drop trigger if exists trg_refresh_faction_atlas_from_people
  on public.faction_people;
create trigger trg_refresh_faction_atlas_from_people
after insert or update or delete or truncate
on public.faction_people
for each statement
execute function private.refresh_faction_atlas_members_cache();

drop trigger if exists trg_refresh_faction_atlas_from_assignments
  on public.celeb_tag_assignments;
create trigger trg_refresh_faction_atlas_from_assignments
after insert or update or delete or truncate
on public.celeb_tag_assignments
for each statement
execute function private.refresh_faction_atlas_members_cache();

create or replace view public.faction_atlas_members
with (security_invoker = true)
as
select
  tag_id,
  celeb_id,
  short_desc,
  short_desc_en,
  long_desc,
  long_desc_en,
  quote,
  quote_en,
  faction_image_url,
  hidden,
  sort_order,
  source,
  person_id,
  assignment_id,
  group_label,
  group_label_en,
  group_position,
  group_subtitle,
  group_subtitle_en,
  group_color,
  group_logo_url,
  faction_quote_media
from private.faction_atlas_members_cache;

comment on view public.faction_atlas_members is
  'Public faction-atlas read model. Reads an RLS-protected private cache as the invoker; statement-level triggers refresh the derived cache in the source transaction.';

revoke all privileges on table public.faction_atlas_members
  from public, anon, authenticated, service_role;
grant select on table public.faction_atlas_members
  to anon, authenticated, service_role;

notify pgrst, 'reload schema';

commit;
