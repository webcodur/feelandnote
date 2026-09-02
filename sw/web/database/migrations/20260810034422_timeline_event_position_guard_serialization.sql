begin;

-- Serialize child event validation with parent celeb_tier updates. A plain
-- SELECT is insufficient because UPDATE's NO KEY UPDATE row lock is compatible
-- with the foreign-key KEY SHARE lock acquired later by the child insert.
create or replace function private.timeline_event_position_guard()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_tier text;
begin
  select celeb.celeb_tier
  into v_tier
  from public.celebs as celeb
  where celeb.id = new.celeb_id
  for update;

  if not found then
    raise exception 'timeline event celeb does not exist';
  end if;

  if v_tier = 'fiction' then
    if new.year is not null
      or new.year_end is not null
      or new.month is not null
      or new.day is not null
      or nullif(btrim(new.sequence_label), '') is null
      or nullif(btrim(new.sequence_label_en), '') is null
    then
      raise exception 'fiction timeline events require bilingual sequence labels and no calendar date';
    end if;
  elsif new.sequence_label is not null
    or new.sequence_label_en is not null
    or (
      new.year is null
      and (new.year_end is not null or new.month is not null or new.day is not null)
    )
  then
    raise exception 'life timeline events require null sequence labels and no date residue when undated';
  end if;

  return new;
end;
$$;

revoke all on function private.timeline_event_position_guard()
  from public, anon, authenticated, service_role;
grant execute on function private.timeline_event_position_guard() to postgres;

do $$
declare
  v_function oid := to_regprocedure('private.timeline_event_position_guard()');
begin
  if v_function is null
    or not exists (
      select 1
      from pg_proc as proc
      where proc.oid = v_function
        and proc.prosecdef
        and proc.proconfig = array['search_path=pg_catalog']::text[]
        and pg_get_userbyid(proc.proowner) = 'postgres'
        and proc.prosrc ~* 'from[[:space:]]+public[.]celebs[[:space:]]+as[[:space:]]+celeb[[:space:]]+where[[:space:]]+celeb[.]id[[:space:]]*=[[:space:]]*new[.]celeb_id[[:space:]]+for[[:space:]]+update'
    )
    or has_function_privilege('anon', v_function, 'EXECUTE')
    or has_function_privilege('authenticated', v_function, 'EXECUTE')
    or has_function_privilege('service_role', v_function, 'EXECUTE')
    or not has_function_privilege('postgres', v_function, 'EXECUTE')
    or not exists (
      select 1
      from pg_trigger
      where tgrelid = 'public.celeb_timeline_events'::regclass
        and tgname = 'trg_timeline_event_position_guard'
        and tgenabled = 'O'
        and not tgisinternal
        and tgfoid = v_function
    )
  then
    raise exception 'timeline event position serialization contract mismatch';
  end if;
end;
$$;

commit;
