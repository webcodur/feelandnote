-- Public atlas membership requires both approvals. Admins retain draft access.
begin;
set local lock_timeout = '5s';

-- Remove the faction exception before membership starts consulting celebs.
-- Keeping that exception would create recursive RLS queries.
alter policy celebs_select_published on public.celebs
  using (publication_status = 'active' or public.is_admin());

alter policy faction_members_select_all on public.faction_members
  using (
    public.is_admin()
    or (
      hidden = false
      and exists (
        select 1 from public.celebs c
        where c.id = faction_members.celeb_id and c.publication_status = 'active'
      )
    )
  );

alter policy celeb_contents_select_published on public.celeb_contents
  using (
    public.is_admin()
    or exists (
      select 1 from public.celebs c
      where c.id = celeb_contents.celeb_id and c.publication_status = 'active'
    )
  );

alter policy celeb_metrics_select on public.celeb_metrics
  using (
    public.is_admin()
    or exists (
      select 1 from public.celebs c
      where c.id = celeb_metrics.celeb_id and c.publication_status = 'active'
    )
  );

-- Existing statement-level triggers call this function after celebs changes.
-- Status changes must also expire atlas lists, captions and profile modals.
create or replace function public.web_revalidate_celebs_list()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $function$
declare
  v_changed boolean := true;
  v_faction_status_changed boolean := false;
begin
  if tg_op = 'UPDATE' then
    select exists (
      select 1 from new_rows n
      where not exists (
        select 1 from old_rows o
        where n.id = o.id
          and (pg_catalog.to_jsonb(n) - 'view_count' - 'updated_at')
            is not distinct from
              (pg_catalog.to_jsonb(o) - 'view_count' - 'updated_at')
      )
      union all
      select 1 from old_rows o
      where not exists (
        select 1 from new_rows n
        where n.id = o.id
          and (pg_catalog.to_jsonb(n) - 'view_count' - 'updated_at')
            is not distinct from
              (pg_catalog.to_jsonb(o) - 'view_count' - 'updated_at')
      )
    ) into v_changed;

    select exists (
      select 1 from new_rows n join old_rows o on o.id = n.id
      where n.publication_status is distinct from o.publication_status
        and exists (select 1 from public.faction_members m where m.celeb_id = n.id)
    ) into v_faction_status_changed;
  end if;

  if v_changed then
    perform public.web_revalidate_send(
      case when v_faction_status_changed
        then array['celebs', 'factions']::text[]
        else array['celebs']::text[]
      end
    );
  end if;
  return null;
end;
$function$;

-- CREATE OR REPLACE preserves the existing owner and EXECUTE restrictions.
notify pgrst, 'reload schema';
commit;
