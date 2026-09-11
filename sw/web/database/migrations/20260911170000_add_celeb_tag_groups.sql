-- 세력도감 테마 안의 인물 그룹을 웹이 소유한다.
-- 영상층을 떼어 내는 절차(docs/todo/faction-video-stop.md 「웹 원천 분리」)의 0단계 결정이다(26.09.11 사용자 승인).
-- 그룹 이름은 인물마다 문자열로 적지 않고 표 한 곳에 둔다 — 오타 하나로 그룹이 갈라지지 않게 한다.
-- 웹 전용 배정에는 대사 음성·화보 전환 묶음(quote_media) 칸도 둔다. 영상 행을 옮겨도 대사 재생을 잃지 않게 한다.
-- 그룹의 부제·색·로고는 옮기지 않는다.

begin;

create table public.celeb_tag_groups (
  id uuid primary key default gen_random_uuid(),
  tag_id uuid not null references public.celeb_tags(id) on delete cascade,
  name text not null check (btrim(name) <> ''),
  name_en text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- 배정이 (group_id, tag_id)로 묶어 다른 테마의 그룹을 가리키지 못하게 한다
  constraint celeb_tag_groups_id_tag_key unique (id, tag_id),
  constraint celeb_tag_groups_tag_name_key unique (tag_id, name)
);

create index celeb_tag_groups_tag_sort_idx
  on public.celeb_tag_groups (tag_id, sort_order);

comment on table public.celeb_tag_groups is
  'Web-owned member groups inside a faction-atlas theme. celeb_tag_assignments.group_id points here.';

alter table public.celeb_tag_groups enable row level security;

create policy celeb_tag_groups_select_all
  on public.celeb_tag_groups for select
  using (true);
create policy celeb_tag_groups_admin_insert
  on public.celeb_tag_groups for insert
  with check ((select public.is_admin()));
create policy celeb_tag_groups_admin_update
  on public.celeb_tag_groups for update
  using ((select public.is_admin()))
  with check ((select public.is_admin()));
create policy celeb_tag_groups_admin_delete
  on public.celeb_tag_groups for delete
  using ((select public.is_admin()));

grant all on table public.celeb_tag_groups to anon, authenticated, service_role;

alter table public.celeb_tag_assignments
  add column group_id uuid,
  add column quote_media jsonb,
  add constraint celeb_tag_assignments_group_fkey
    foreign key (group_id, tag_id)
    references public.celeb_tag_groups (id, tag_id)
    on delete set null (group_id);

create index idx_celeb_tag_assignments_group_id
  on public.celeb_tag_assignments (group_id)
  where group_id is not null;

-- 웹 전용 배정 갈래가 그룹(이름·영문 이름·순서)과 대사 음성을 제 칸에서 읽는다.
-- 제작 갈래는 그대로다. 테마를 웹으로 넘길 때는 faction_groups.tag_id를 끊어 제작 갈래를 뺀다.
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
  wg.name as group_label,
  wg.name_en as group_label_en,
  wg.sort_order as group_position,
  null::text as group_subtitle,
  null::text as group_subtitle_en,
  null::text as group_color,
  null::text as group_logo_url,
  a.quote_media as faction_quote_media
from public.celeb_tag_assignments a
left join public.celeb_tag_groups wg on wg.id = a.group_id
where not exists (
  select 1
  from public.faction_people fp
  join public.faction_clusters c on c.id = fp.cluster_id
  join public.faction_groups g on g.id = c.group_id
  where g.tag_id = a.tag_id
    and fp.celeb_id = a.celeb_id
    and coalesce(fp.disabled, false) = false
);

-- 그룹 표가 바뀌어도 공개 사본과 웹 캐시가 따라온다
create trigger trg_refresh_faction_atlas_from_tag_groups
after insert or update or delete or truncate
on public.celeb_tag_groups
for each statement
execute function private.refresh_faction_atlas_members_cache();

create trigger web_reval_ins
after insert on public.celeb_tag_groups
referencing new table as new_rows
for each statement
execute function public.web_revalidate_trigger('array[''tags'']', 'updated_at', 'n.id = o.id');

create trigger web_reval_upd
after update on public.celeb_tag_groups
referencing old table as old_rows new table as new_rows
for each statement
execute function public.web_revalidate_trigger('array[''tags'']', 'updated_at', 'n.id = o.id');

create trigger web_reval_del
after delete on public.celeb_tag_groups
referencing old table as old_rows
for each statement
execute function public.web_revalidate_trigger('array[''tags'']', 'updated_at', 'n.id = o.id');

notify pgrst, 'reload schema';

commit;
