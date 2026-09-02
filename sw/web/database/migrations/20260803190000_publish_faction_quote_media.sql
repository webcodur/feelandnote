-- 팩션 개인 화보 출간을 대표사진 한 장에서 「대사 음성 + 화보 타임라인」 한 벌로 확장한다.
-- web_image_url은 기존 화면·도구 호환용 표지로 유지하고, 새 웹 재생기는 web_quote_media를 읽는다.

begin;

alter table public.faction_people
  add column if not exists web_quote_media jsonb;

alter table public.faction_people
  drop constraint if exists faction_people_web_quote_media_object;
alter table public.faction_people
  add constraint faction_people_web_quote_media_object
  check (web_quote_media is null or jsonb_typeof(web_quote_media) = 'object');

comment on column public.faction_people.web_quote_media is
  '출간된 팩션 대사 재생 묶음. {version,locale,audioUrl,playbackRate,duration,images:[{url,at,focus?:{x,y}}],captions:[{text,at}]}이며 at은 배속 반영 후 음성 시작 기준 초다.';

create or replace view public.faction_atlas_members as
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

comment on view public.faction_atlas_members is
  '세력도감 인물 공개 읽기 창구. 제작 직함·대사와 출간된 개인 화보 재생 묶음을 함께 제공하며 수동 행은 자체 웹 필드를 쓴다.';

revoke all privileges on table public.faction_atlas_members
  from public, anon, authenticated, service_role;
grant select on table public.faction_atlas_members
  to anon, authenticated, service_role;

notify pgrst, 'reload schema';

commit;
