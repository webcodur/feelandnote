-- 제작 유래 세력도감 인물의 한줄 문구는 직함 첫 항목으로 단일화한다.
-- web_short_desc(±en)는 이전 배포의 롤백을 위해 컬럼만 남기고 조회·편집·저장 경로에서 쓰지 않는다.

begin;

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
    fp.position as p_pos
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
  production.group_logo_url
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
  null::text as group_logo_url
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
  '세력도감 인물 공개 읽기 창구. 제작 행의 short_desc는 faction_people 직함 첫 항목(lines[1]) 고정이며 수동 행만 자체 short_desc를 쓴다.';

comment on column public.faction_people.web_short_desc is
  '폐기된 레거시 컬럼(26.08.03). 제작 세력도감 한줄은 lines[1]을 사용하며 이 값은 읽거나 쓰지 않는다.';

comment on column public.faction_people.web_short_desc_en is
  '폐기된 레거시 컬럼(26.08.03). 제작 세력도감 영문 한줄은 lines_en[1]을 사용하며 이 값은 읽거나 쓰지 않는다.';

revoke all privileges on table public.faction_atlas_members
  from public, anon, authenticated, service_role;
grant select on table public.faction_atlas_members
  to anon, authenticated, service_role;

notify pgrst, 'reload schema';

commit;
