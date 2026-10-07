begin;

set local lock_timeout = '5s';

drop policy celeb_contents_select_published on public.celeb_contents;
drop policy celeb_metrics_select on public.celeb_metrics;
drop policy celebs_select_published on public.celebs;

drop view public.faction_member_rows;

alter table public.faction_members
  drop column short_desc,
  drop column short_desc_en;

create view public.faction_member_rows
with (security_invoker = true)
as
select
  m.lv2_id,
  m.lv3_id,
  m.celeb_id,
  m.long_desc,
  m.long_desc_en,
  m.image_url,
  m.hidden,
  m.sort_order,
  m.id as member_id,
  g.name as group_name,
  g.name_en as group_name_en,
  g.sort_order as group_position
from public.faction_members m
left join public.faction_lv3 g on g.id = m.lv3_id;

grant all on public.faction_member_rows to anon, authenticated, service_role;

create policy celeb_contents_select_published on public.celeb_contents
for select to anon, authenticated
using (
  public.is_admin()
  or exists (select 1 from public.celebs where celebs.id = celeb_contents.celeb_id and celebs.publication_status = 'active')
  or exists (select 1 from public.faction_member_rows where faction_member_rows.celeb_id = celeb_contents.celeb_id and not coalesce(faction_member_rows.hidden, false))
);

create policy celeb_metrics_select on public.celeb_metrics
for select to anon, authenticated
using (
  public.is_admin()
  or exists (select 1 from public.celebs where celebs.id = celeb_metrics.celeb_id and celebs.publication_status = 'active')
  or exists (select 1 from public.faction_member_rows where faction_member_rows.celeb_id = celeb_metrics.celeb_id and not coalesce(faction_member_rows.hidden, false))
);

create policy celebs_select_published on public.celebs
for select to anon, authenticated
using (
  publication_status = 'active'
  or public.is_admin()
  or exists (select 1 from public.faction_member_rows where faction_member_rows.celeb_id = celebs.id and not coalesce(faction_member_rows.hidden, false))
);

comment on view public.faction_member_rows is
  'Faction assignments and group names. Theme context uses long_desc and long_desc_en.';

notify pgrst, 'reload schema';

commit;
