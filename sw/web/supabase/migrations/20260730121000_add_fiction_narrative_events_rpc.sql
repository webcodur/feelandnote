begin;

create or replace function public.set_fiction_narrative_events(
  p_celeb_id uuid,
  p_events jsonb
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inserted integer;
begin
  if not exists (
    select 1
    from public.profiles
    where id = p_celeb_id
      and profile_type = 'CELEB'
      and celeb_tier = 'fiction'
      and status = 'active'
  ) then
    raise exception 'active fiction profile not found: %', p_celeb_id;
  end if;

  if jsonb_typeof(p_events) <> 'array' or jsonb_array_length(p_events) = 0 then
    raise exception 'p_events must be a non-empty JSON array';
  end if;

  delete from public.celeb_timeline_events
  where celeb_id = p_celeb_id
    and year is null;

  insert into public.celeb_timeline_events (
    celeb_id,
    year,
    year_end,
    month,
    day,
    sequence_label,
    sequence_label_en,
    title,
    title_en,
    description,
    description_en,
    kind,
    place_name,
    place_name_en,
    lat,
    lng,
    place_qid,
    source,
    source_url,
    sort_order
  )
  select
    p_celeb_id,
    null,
    null,
    null,
    null,
    nullif(btrim(event.sequence_label), ''),
    nullif(btrim(event.sequence_label_en), ''),
    btrim(event.title),
    nullif(btrim(event.title_en), ''),
    nullif(btrim(event.description), ''),
    nullif(btrim(event.description_en), ''),
    coalesce(nullif(btrim(event.kind), ''), 'other'),
    nullif(btrim(event.place_name), ''),
    nullif(btrim(event.place_name_en), ''),
    null,
    null,
    null,
    'manual',
    nullif(btrim(event.source_url), ''),
    event.sort_order
  from jsonb_to_recordset(p_events) as event (
    sequence_label text,
    sequence_label_en text,
    title text,
    title_en text,
    description text,
    description_en text,
    kind text,
    place_name text,
    place_name_en text,
    source_url text,
    sort_order integer
  );

  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$$;

revoke all on function public.set_fiction_narrative_events(uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.set_fiction_narrative_events(uuid, jsonb)
  to service_role;

notify pgrst, 'reload schema';

commit;
