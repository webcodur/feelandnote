-- Prevent celeb_tier changes from invalidating the tier-specific timeline union.
-- The event-row guard cannot observe a parent tier update, so the parent needs
-- its own fail-closed trigger.

begin;

do $$
begin
  if exists (
    select 1
    from public.celebs as celeb
    join public.celeb_timeline_events as event on event.celeb_id = celeb.id
    where (
      celeb.celeb_tier = 'fiction'
      and (
        event.year is not null
        or event.year_end is not null
        or event.month is not null
        or event.day is not null
        or nullif(btrim(event.sequence_label), '') is null
        or nullif(btrim(event.sequence_label_en), '') is null
      )
    ) or (
      celeb.celeb_tier is distinct from 'fiction'
      and (
        event.sequence_label is not null
        or event.sequence_label_en is not null
        or (
          event.year is null
          and (event.year_end is not null or event.month is not null or event.day is not null)
        )
      )
    )
  ) then
    raise exception 'existing celeb timeline positions do not match celeb tiers';
  end if;
end;
$$;

create or replace function private.timeline_celeb_tier_position_guard()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if new.celeb_tier is not distinct from old.celeb_tier then
    return new;
  end if;

  if new.celeb_tier = 'fiction' and exists (
    select 1
    from public.celeb_timeline_events as event
    where event.celeb_id = new.id
      and (
        event.year is not null
        or event.year_end is not null
        or event.month is not null
        or event.day is not null
        or nullif(btrim(event.sequence_label), '') is null
        or nullif(btrim(event.sequence_label_en), '') is null
      )
  ) then
    raise exception 'celeb tier change would invalidate fiction timeline positions';
  elsif new.celeb_tier is distinct from 'fiction' and exists (
    select 1
    from public.celeb_timeline_events as event
    where event.celeb_id = new.id
      and (
        event.sequence_label is not null
        or event.sequence_label_en is not null
        or (
          event.year is null
          and (event.year_end is not null or event.month is not null or event.day is not null)
        )
      )
  ) then
    raise exception 'celeb tier change would invalidate life timeline positions';
  end if;

  return new;
end;
$$;

revoke all on function private.timeline_celeb_tier_position_guard()
  from public, anon, authenticated, service_role;
grant execute on function private.timeline_celeb_tier_position_guard() to postgres;

drop trigger if exists trg_timeline_celeb_tier_position_guard on public.celebs;
create trigger trg_timeline_celeb_tier_position_guard
before update of celeb_tier on public.celebs
for each row execute function private.timeline_celeb_tier_position_guard();

do $$
begin
  if to_regprocedure('private.timeline_celeb_tier_position_guard()') is null
    or not exists (
      select 1
      from pg_trigger
      where tgrelid = 'public.celebs'::regclass
        and tgname = 'trg_timeline_celeb_tier_position_guard'
        and tgenabled = 'O'
        and not tgisinternal
    )
    or exists (
      select 1
      from pg_proc as proc
      join pg_namespace as namespace on namespace.oid = proc.pronamespace
      where namespace.nspname = 'private'
        and proc.proname = 'timeline_celeb_tier_position_guard'
        and (
          not proc.prosecdef
          or proc.proconfig is distinct from array['search_path=pg_catalog']::text[]
          or has_function_privilege('anon', proc.oid, 'EXECUTE')
          or has_function_privilege('authenticated', proc.oid, 'EXECUTE')
          or has_function_privilege('service_role', proc.oid, 'EXECUTE')
        )
    )
  then
    raise exception 'timeline celeb tier position guard contract mismatch';
  end if;
end;
$$;

commit;
