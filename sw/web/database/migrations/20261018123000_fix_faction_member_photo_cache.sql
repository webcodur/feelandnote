-- Atlas member caches embed profile photos. Photo changes must expire them,
-- just as publication changes already do, without flushing person details.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

create or replace function public.web_revalidate_celebs_list()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $function$
declare
  v_changed boolean := true;
  v_faction_display_changed boolean := false;
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
      where (
        n.publication_status is distinct from o.publication_status
        or n.avatar_url is distinct from o.avatar_url
        or n.portrait_url is distinct from o.portrait_url
      )
        and exists (select 1 from public.faction_members m where m.celeb_id = n.id)
    ) into v_faction_display_changed;
  end if;

  if v_changed then
    perform public.web_revalidate_send(
      case when v_faction_display_changed
        then array['celebs', 'factions']::text[]
        else array['celebs']::text[]
      end
    );
  end if;
  return null;
end;
$function$;

-- CREATE OR REPLACE preserves the existing owner and EXECUTE restrictions.
commit;
