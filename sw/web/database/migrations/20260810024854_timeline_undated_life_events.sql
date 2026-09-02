begin;

-- This migration changes validation only. It deliberately performs no UPDATE:
-- existing fiction labels and every existing sort_order remain byte-for-byte unchanged.
do $$
begin
  if exists (
    select 1
    from public.celeb_timeline_events as event
    left join public.celebs as celeb on celeb.id = event.celeb_id
    where celeb.id is null
      or (
        celeb.celeb_tier = 'fiction'
        and (
          event.year is not null
          or event.year_end is not null
          or event.month is not null
          or event.day is not null
          or nullif(btrim(event.sequence_label), '') is null
          or nullif(btrim(event.sequence_label_en), '') is null
        )
      )
      or (
        celeb.celeb_tier is distinct from 'fiction'
        and (
          event.sequence_label is not null
          or event.sequence_label_en is not null
          or (
            event.year is null
            and (
              event.year_end is not null
              or event.month is not null
              or event.day is not null
            )
          )
        )
      )
  ) then
    raise exception 'existing timeline rows violate the tier-specific position contract';
  end if;
end;
$$;

alter table public.celeb_timeline_events
  drop constraint if exists chk_timeline_position;

alter table public.celeb_timeline_events
  add constraint chk_timeline_position
  check (
    (
      year is not null
      and sequence_label is null
      and sequence_label_en is null
    )
    or (
      year is null
      and year_end is null
      and month is null
      and day is null
      and (
        (sequence_label is null and sequence_label_en is null)
        or (
          nullif(btrim(sequence_label), '') is not null
          and nullif(btrim(sequence_label_en), '') is not null
        )
      )
    )
  );

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
  where celeb.id = new.celeb_id;

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

revoke all on function private.timeline_event_position_guard() from public, anon, authenticated, service_role;
grant execute on function private.timeline_event_position_guard() to postgres;

drop trigger if exists trg_timeline_event_position_guard on public.celeb_timeline_events;
create trigger trg_timeline_event_position_guard
before insert or update of celeb_id, year, year_end, month, day, sequence_label, sequence_label_en
on public.celeb_timeline_events
for each row execute function private.timeline_event_position_guard();

comment on column public.celeb_timeline_events.year is
  'Life-event calendar year. NULL means unknown date for a non-fiction event, or narrative position for fiction.';
comment on column public.celeb_timeline_events.sequence_label is
  'Fiction-only Korean narrative position. Always NULL for non-fiction events, including undated ones.';
comment on column public.celeb_timeline_events.sequence_label_en is
  'Fiction-only English narrative position. Always NULL for non-fiction events, including undated ones.';
comment on column public.celeb_timeline_events.sort_order is
  'Deterministic display order. Direct life payloads use zero-based array index; fiction retains its existing one-based contract.';


create or replace function private.timeline_backfill_validate_complete_payload(
  p_celeb_id uuid,
  p_profile_snapshot jsonb,
  p_research_payload jsonb
)
returns void
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  v_mode text;
  v_sources jsonb;
  v_events jsonb;
  v_profile_conflicts jsonb;
  v_blocking_issues jsonb;
  v_profile_conflict_fields text[];
  v_event jsonb;
  v_event_index integer := 0;
  v_event_count integer;
  v_birth_text text;
  v_death_text text;
  v_birth_date jsonb;
  v_death_date jsonb;
begin
  if p_celeb_id is null
    or jsonb_typeof(p_profile_snapshot) is distinct from 'object'
    or jsonb_typeof(p_research_payload) is distinct from 'object'
  then
    raise exception 'complete correction requires celeb, profile snapshot, and payload objects';
  end if;
  if exists (
    select 1
    from jsonb_object_keys(p_research_payload) as payload_key(value)
    where payload_key.value not in (
      'celebId', 'slug', 'nickname', 'nicknameEn', 'timelineMode', 'laneId',
      'sourceSnapshotId', 'profileSnapshot', 'sources', 'researchStatus',
      'events', 'profileConflicts', 'blockingIssues', 'applicationStatus'
    )
  ) then
    raise exception 'corrected research payload contains unsupported top-level keys';
  end if;
  if p_research_payload ->> 'celebId' is distinct from p_celeb_id::text
    or p_research_payload -> 'profileSnapshot' is distinct from p_profile_snapshot
  then
    raise exception 'corrected research payload identity or profile snapshot mismatch';
  end if;
  if p_research_payload ->> 'researchStatus' is distinct from 'complete'
    or p_research_payload ? 'applicationStatus'
  then
    raise exception 'corrected research must be a complete non-quarantined payload';
  end if;

  v_mode := p_research_payload ->> 'timelineMode';
  if v_mode not in ('life', 'fiction')
    or v_mode <> (case
      when p_profile_snapshot ->> 'celebTier' = 'fiction' then 'fiction'
      else 'life'
    end)
  then
    raise exception 'corrected timelineMode is invalid for the profile tier';
  end if;

  v_sources := p_research_payload -> 'sources';
  v_events := p_research_payload -> 'events';
  v_profile_conflicts := case
    when not (p_research_payload ? 'profileConflicts')
      or p_research_payload -> 'profileConflicts' = 'null'::jsonb
      then '[]'::jsonb
    else p_research_payload -> 'profileConflicts'
  end;
  v_blocking_issues := case
    when not (p_research_payload ? 'blockingIssues')
      or p_research_payload -> 'blockingIssues' = 'null'::jsonb
      then '[]'::jsonb
    else p_research_payload -> 'blockingIssues'
  end;

  perform private.timeline_backfill_validate_sources(v_sources);
  if jsonb_typeof(v_events) is distinct from 'array' then
    raise exception 'corrected events must be a JSON array';
  end if;
  v_profile_conflict_fields := private.timeline_backfill_validate_profile_conflicts(
    v_profile_conflicts,
    p_profile_snapshot,
    v_sources
  );
  if jsonb_typeof(v_blocking_issues) is distinct from 'array'
    or jsonb_array_length(v_blocking_issues) <> 0
  then
    raise exception 'complete corrected research cannot contain blockingIssues';
  end if;

  v_event_count := jsonb_array_length(v_events);
  if (v_mode = 'life' and v_event_count not between 3 and 30)
    or (v_mode = 'fiction' and v_event_count not between 6 and 12)
  then
    raise exception 'invalid corrected % event count: %', v_mode, v_event_count;
  end if;

  for v_event in
    select event_item.value
    from jsonb_array_elements(v_events) as event_item(value)
  loop
    if jsonb_typeof(v_event) is distinct from 'object'
      or exists (
        select 1
        from jsonb_object_keys(v_event) as event_key(value)
        where (
          v_mode = 'life'
          and event_key.value not in (
            'eventType', 'title', 'titleEn', 'description', 'descriptionEn', 'kind',
            'placeName', 'placeNameEn', 'placeQuery', 'placeCountry', 'evidenceRefs',
            'year', 'yearEnd', 'month', 'day', 'sequenceLabel', 'sequenceLabelEn'
          )
        ) or (
          v_mode = 'fiction'
          and event_key.value not in (
            'eventType', 'title', 'titleEn', 'description', 'descriptionEn', 'kind',
            'placeName', 'placeNameEn', 'placeQuery', 'placeCountry', 'evidenceRefs',
            'sequenceLabel', 'sequenceLabelEn', 'sortOrder'
          )
        )
      )
    then
      raise exception 'corrected events[%] violates the exact % event keys', v_event_index, v_mode;
    end if;
    if v_event ->> 'eventType' is distinct from v_mode
      or coalesce(v_event ->> 'kind', '') not in (
        'birth', 'death', 'education', 'work', 'publish',
        'battle', 'travel', 'office', 'meeting', 'other'
      )
      or jsonb_typeof(v_event -> 'title') is distinct from 'string'
      or nullif(btrim(v_event ->> 'title'), '') is null
      or jsonb_typeof(v_event -> 'titleEn') is distinct from 'string'
      or nullif(btrim(v_event ->> 'titleEn'), '') is null
      or jsonb_typeof(v_event -> 'description') is distinct from 'string'
      or char_length(btrim(coalesce(v_event ->> 'description', ''))) < 20
      or jsonb_typeof(v_event -> 'descriptionEn') is distinct from 'string'
      or char_length(btrim(coalesce(v_event ->> 'descriptionEn', ''))) < 20
    then
      raise exception 'corrected events[%] requires mode, kind, and substantive bilingual text', v_event_index;
    end if;
    if exists (
      select 1
      from unnest(array['placeName', 'placeNameEn', 'placeQuery', 'placeCountry'])
        as optional_key(value)
      where v_event ? optional_key.value
        and v_event -> optional_key.value <> 'null'::jsonb
        and (
          jsonb_typeof(v_event -> optional_key.value) is distinct from 'string'
          or nullif(btrim(v_event ->> optional_key.value), '') is null
        )
    ) then
      raise exception 'corrected events[%] has an invalid optional place field', v_event_index;
    end if;
    perform private.timeline_backfill_validate_evidence_refs(
      v_event -> 'evidenceRefs',
      v_sources,
      'corrected events[' || v_event_index || ']'
    );
    if v_mode = 'fiction' and (
      jsonb_typeof(v_event -> 'sequenceLabel') is distinct from 'string'
      or nullif(btrim(v_event ->> 'sequenceLabel'), '') is null
      or jsonb_typeof(v_event -> 'sequenceLabelEn') is distinct from 'string'
      or nullif(btrim(v_event ->> 'sequenceLabelEn'), '') is null
      or jsonb_typeof(v_event -> 'sortOrder') is distinct from 'number'
      or coalesce(v_event ->> 'sortOrder', '') !~ '^[0-9]+$'
      or (v_event ->> 'sortOrder')::integer <> v_event_index + 1
    ) then
      raise exception 'corrected fiction events[%] has invalid sequence ordering', v_event_index;
    end if;
    v_event_index := v_event_index + 1;
  end loop;

  if v_mode = 'life' and exists (
    select 1
    from jsonb_array_elements(v_events) as event_item(value)
    where not (event_item.value ? 'year')
      or (
        jsonb_typeof(event_item.value -> 'year') is distinct from 'number'
        and event_item.value -> 'year' is distinct from 'null'::jsonb
      )
      or (
        jsonb_typeof(event_item.value -> 'year') = 'number'
        and coalesce(event_item.value ->> 'year', '') !~ '^-?[0-9]+$'
      )
      or (
        event_item.value ->> 'yearEnd' is not null
        and (
          jsonb_typeof(event_item.value -> 'yearEnd') is distinct from 'number'
          or event_item.value ->> 'yearEnd' !~ '^-?[0-9]+$'
        )
      )
      or (
        event_item.value ->> 'month' is not null
        and (
          jsonb_typeof(event_item.value -> 'month') is distinct from 'number'
          or event_item.value ->> 'month' !~ '^[0-9]+$'
        )
      )
      or (
        event_item.value ->> 'day' is not null
        and (
          jsonb_typeof(event_item.value -> 'day') is distinct from 'number'
          or event_item.value ->> 'day' !~ '^[0-9]+$'
        )
      )
  ) then
    raise exception 'corrected life event dates must be integer JSON values';
  end if;

  if v_mode = 'life' and exists (
    with ordered as (
      select
        event_item.ordinality,
        (event_item.value ->> 'year')::integer as event_year,
        coalesce((event_item.value ->> 'month')::integer, 0) as event_month,
        coalesce((event_item.value ->> 'day')::integer, 0) as event_day,
        lag((event_item.value ->> 'year')::integer)
          over (order by event_item.ordinality) as previous_year,
        lag(coalesce((event_item.value ->> 'month')::integer, 0))
          over (order by event_item.ordinality) as previous_month,
        lag(coalesce((event_item.value ->> 'day')::integer, 0))
          over (order by event_item.ordinality) as previous_day
      from jsonb_array_elements(v_events) with ordinality as event_item(value, ordinality)
      where jsonb_typeof(event_item.value -> 'year') = 'number'
    )
    select 1
    from ordered
    where previous_year is not null
      and (
        event_year < previous_year
        or (event_year = previous_year and event_month < previous_month)
        or (
          event_year = previous_year
          and event_month = previous_month
          and event_day < previous_day
        )
      )
  ) then
    raise exception 'corrected life events must be chronologically ordered';
  end if;

  if v_mode = 'life' and exists (
    select 1
    from jsonb_array_elements(v_events) as event_item(value)
    group by (event_item.value ->> 'year')::integer, btrim(event_item.value ->> 'title')
    having count(*) > 1
  ) then
    raise exception 'corrected life events cannot duplicate year and title';
  end if;

  if v_mode = 'life' and exists (
    select 1
    from jsonb_array_elements(v_events) as event_item(value)
    where (
        event_item.value ->> 'yearEnd' is not null
        and (event_item.value ->> 'yearEnd')::integer < (event_item.value ->> 'year')::integer
      )
      or (
        event_item.value ->> 'month' is not null
        and (event_item.value ->> 'month')::integer not between 1 and 12
      )
      or (
        event_item.value ->> 'day' is not null
        and (event_item.value ->> 'day')::integer not between 1 and 31
      )
      or (event_item.value ->> 'day' is not null and event_item.value ->> 'month' is null)
      or event_item.value ->> 'sequenceLabel' is not null
      or event_item.value ->> 'sequenceLabelEn' is not null
      or (
        event_item.value -> 'year' = 'null'::jsonb
        and (
          event_item.value ->> 'yearEnd' is not null
          or event_item.value ->> 'month' is not null
          or event_item.value ->> 'day' is not null
        )
      )
  ) then
    raise exception 'corrected life events require integer-or-null year, null narrative labels, and no date residue when undated';
  end if;

  if v_mode = 'life' then
    v_birth_text := p_profile_snapshot ->> 'birthDate';
    v_death_text := p_profile_snapshot ->> 'deathDate';
    v_birth_date := private.timeline_backfill_exact_profile_date(v_birth_text);
    v_death_date := private.timeline_backfill_exact_profile_date(v_death_text);

    if not ('birthDate' = any(v_profile_conflict_fields)) then
      if v_birth_date is not null then
        if (
          select count(*)
          from jsonb_array_elements(v_events) as event_item(value)
          where event_item.value ->> 'kind' = 'birth'
        ) <> 1
          or v_events -> 0 ->> 'kind' is distinct from 'birth'
          or (v_events -> 0 ->> 'year')::integer
            is distinct from (v_birth_date ->> 'year')::integer
          or (
            v_birth_date ->> 'month' is not null
            and (v_events -> 0 ->> 'month')::integer
              is distinct from (v_birth_date ->> 'month')::integer
          )
          or (
            v_birth_date ->> 'day' is not null
            and (v_events -> 0 ->> 'day')::integer
              is distinct from (v_birth_date ->> 'day')::integer
          )
        then
          raise exception 'corrected first event must match the exact birth boundary';
        end if;
      elsif v_birth_text is null and exists (
        select 1 from jsonb_array_elements(v_events) as event_item(value)
        where event_item.value ->> 'kind' = 'birth'
      ) then
        raise exception 'corrected birth event is forbidden for a null birthDate';
      end if;
    end if;

    if not ('deathDate' = any(v_profile_conflict_fields)) then
      if v_death_date is not null then
        if (
          select count(*)
          from jsonb_array_elements(v_events) as event_item(value)
          where event_item.value ->> 'kind' = 'death'
        ) <> 1
          or v_events -> (v_event_count - 1) ->> 'kind' is distinct from 'death'
          or (v_events -> (v_event_count - 1) ->> 'year')::integer
            is distinct from (v_death_date ->> 'year')::integer
          or (
            v_death_date ->> 'month' is not null
            and (v_events -> (v_event_count - 1) ->> 'month')::integer
              is distinct from (v_death_date ->> 'month')::integer
          )
          or (
            v_death_date ->> 'day' is not null
            and (v_events -> (v_event_count - 1) ->> 'day')::integer
              is distinct from (v_death_date ->> 'day')::integer
          )
        then
          raise exception 'corrected last event must match the exact death boundary';
        end if;
      elsif v_death_text is null and exists (
        select 1 from jsonb_array_elements(v_events) as event_item(value)
        where event_item.value ->> 'kind' = 'death'
      ) then
        raise exception 'corrected death event is forbidden for a null deathDate';
      end if;
    end if;
  end if;

  if v_mode = 'fiction' and exists (
    select 1
    from jsonb_array_elements(v_events) as event_item(value)
    where nullif(btrim(event_item.value ->> 'sequenceLabel'), '') is null
      or event_item.value ->> 'year' is not null
      or event_item.value ->> 'yearEnd' is not null
      or event_item.value ->> 'month' is not null
      or event_item.value ->> 'day' is not null
  ) then
    raise exception 'corrected fiction events require labels and forbid calendar dates';
  end if;
end;
$$;

create or replace function public.complete_celeb_timeline_backfill(
  p_celeb_id uuid,
  p_worker text,
  p_claim_token uuid,
  p_profile_snapshot jsonb,
  p_research_fingerprint text,
  p_research_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_worker text := btrim(coalesce(p_worker, ''));
  v_fingerprint text := btrim(coalesce(p_research_fingerprint, ''));
  v_queue public.celeb_task_queue%rowtype;
  v_existing_run public.celeb_timeline_research_runs%rowtype;
  v_current_snapshot jsonb;
  v_mode text;
  v_sources jsonb;
  v_events jsonb;
  v_profile_conflicts jsonb;
  v_blocking_issues jsonb;
  v_profile_conflict_fields text[];
  v_event_evidence jsonb;
  v_event jsonb;
  v_event_index integer := 0;
  v_event_count integer;
  v_event_ids uuid[];
  v_inserted integer;
  v_exact_count integer;
  v_total_count integer;
  v_expected_events jsonb;
  v_actual_events jsonb;
  v_run_id uuid;
  v_rows integer;
  v_birth_text text;
  v_death_text text;
  v_birth_date jsonb;
  v_death_date jsonb;
begin
  if p_celeb_id is null or p_claim_token is null or v_worker = '' then
    raise exception 'p_celeb_id, p_worker, and p_claim_token are required';
  end if;
  if v_fingerprint !~ '^[0-9a-f]{64}$' then
    raise exception 'p_research_fingerprint must be lowercase SHA-256 hex';
  end if;
  if jsonb_typeof(p_profile_snapshot) is distinct from 'object' then
    raise exception 'p_profile_snapshot must be a JSON object';
  end if;
  if jsonb_typeof(p_research_payload) is distinct from 'object' then
    raise exception 'p_research_payload must be a JSON object';
  end if;
  if exists (
    select 1
    from jsonb_object_keys(p_research_payload) as payload_key(value)
    where payload_key.value not in (
      'celebId', 'slug', 'nickname', 'nicknameEn', 'timelineMode', 'laneId',
      'sourceSnapshotId', 'profileSnapshot', 'sources', 'researchStatus',
      'events', 'profileConflicts', 'blockingIssues', 'applicationStatus'
    )
  ) then
    raise exception 'research payload contains unsupported top-level keys';
  end if;

  -- A network retry after commit is harmless.  It succeeds only when the
  -- immutable audit row and every event id still match the first commit.
  select run.*
  into v_existing_run
  from public.celeb_timeline_research_runs as run
  where run.celeb_id = p_celeb_id
    and run.research_fingerprint = v_fingerprint;

  if found then
    if v_existing_run.run_origin <> 'direct_pipeline'
      or v_existing_run.research_status <> 'complete'
      or v_existing_run.claim_token is distinct from p_claim_token
      or v_existing_run.claimed_by is distinct from v_worker
      or v_existing_run.profile_snapshot is distinct from p_profile_snapshot
      or v_existing_run.research_payload is distinct from p_research_payload
    then
      raise exception 'research fingerprint collision or claim mismatch: celeb_id=% fingerprint=%',
        p_celeb_id, v_fingerprint;
    end if;

    select count(*)::integer
    into v_exact_count
    from public.celeb_timeline_events as timeline
    where timeline.celeb_id = p_celeb_id
      and timeline.id = any(v_existing_run.timeline_event_ids);

    select count(*)::integer
    into v_total_count
    from public.celeb_timeline_events as timeline
    where timeline.celeb_id = p_celeb_id;

    if v_exact_count <> v_existing_run.event_count
      or v_total_count <> v_existing_run.event_count
      or v_existing_run.event_count <> cardinality(v_existing_run.timeline_event_ids)
    then
      raise exception 'idempotent readback mismatch: celeb_id=% run_id=%',
        p_celeb_id, v_existing_run.id;
    end if;

    v_mode := v_existing_run.timeline_mode;
    v_sources := v_existing_run.research_payload -> 'sources';
    v_events := v_existing_run.research_payload -> 'events';
    select jsonb_agg(
      jsonb_build_object(
        'year', case when v_mode = 'life' then (event_item.value ->> 'year')::integer else null end,
        'yearEnd', case when v_mode = 'life' then (event_item.value ->> 'yearEnd')::integer else null end,
        'month', case when v_mode = 'life' then (event_item.value ->> 'month')::integer else null end,
        'day', case when v_mode = 'life' then (event_item.value ->> 'day')::integer else null end,
        'sequenceLabel', case when v_mode = 'fiction' then nullif(btrim(event_item.value ->> 'sequenceLabel'), '') else null end,
        'sequenceLabelEn', case when v_mode = 'fiction' then nullif(btrim(event_item.value ->> 'sequenceLabelEn'), '') else null end,
        'title', btrim(event_item.value ->> 'title'),
        'titleEn', nullif(btrim(event_item.value ->> 'titleEn'), ''),
        'description', nullif(btrim(event_item.value ->> 'description'), ''),
        'descriptionEn', nullif(btrim(event_item.value ->> 'descriptionEn'), ''),
        'kind', event_item.value ->> 'kind',
        'placeName', nullif(btrim(event_item.value ->> 'placeName'), ''),
        'placeNameEn', nullif(btrim(event_item.value ->> 'placeNameEn'), ''),
        'lat', null,
        'lng', null,
        'placeQid', null,
        'source', 'research',
        'sourceUrl', btrim(source_item.value ->> 'url'),
        'sortOrder', case when v_mode = 'fiction'
          then event_item.ordinality::integer
          else (event_item.ordinality - 1)::integer
        end
      )
      order by event_item.ordinality
    )
    into v_expected_events
    from jsonb_array_elements(v_events) with ordinality as event_item(value, ordinality)
    join lateral (
      select source_row.value
      from jsonb_array_elements(v_sources) as source_row(value)
      where btrim(source_row.value ->> 'id') = btrim(event_item.value -> 'evidenceRefs' ->> 0)
      limit 1
    ) as source_item on true;

    select jsonb_agg(
      jsonb_build_object(
        'year', timeline.year,
        'yearEnd', timeline.year_end,
        'month', timeline.month,
        'day', timeline.day,
        'sequenceLabel', timeline.sequence_label,
        'sequenceLabelEn', timeline.sequence_label_en,
        'title', timeline.title,
        'titleEn', timeline.title_en,
        'description', timeline.description,
        'descriptionEn', timeline.description_en,
        'kind', timeline.kind,
        'placeName', timeline.place_name,
        'placeNameEn', timeline.place_name_en,
        'lat', timeline.lat,
        'lng', timeline.lng,
        'placeQid', timeline.place_qid,
        'source', timeline.source,
        'sourceUrl', timeline.source_url,
        'sortOrder', timeline.sort_order
      )
      order by timeline.sort_order
    )
    into v_actual_events
    from public.celeb_timeline_events as timeline
    where timeline.celeb_id = p_celeb_id
      and timeline.id = any(v_existing_run.timeline_event_ids);

    if v_actual_events is distinct from v_expected_events then
      raise exception 'idempotent exact timeline content mismatch: celeb_id=% run_id=%',
        p_celeb_id, v_existing_run.id;
    end if;

    select queue.*
    into v_queue
    from public.celeb_task_queue as queue
    where queue.task_type = 'timeline_backfill_v1'
      and queue.celeb_id = p_celeb_id;

    if not found
      or v_queue.status <> 'completed'
      or v_queue.payload ->> 'lastRunId' is distinct from v_existing_run.id::text
      or v_queue.payload ->> 'lastResearchFingerprint' is distinct from v_fingerprint
      or v_queue.payload ->> 'lastEventCount' is distinct from v_existing_run.event_count::text
    then
      raise exception 'idempotent completed queue readback mismatch: celeb_id=% run_id=%',
        p_celeb_id, v_existing_run.id;
    end if;

    return jsonb_build_object(
      'status', 'already_completed',
      'celebId', p_celeb_id,
      'runId', v_existing_run.id,
      'eventCount', v_existing_run.event_count,
      'researchFingerprint', v_fingerprint
    );
  end if;

  select queue.*
  into v_queue
  from public.celeb_task_queue as queue
  where queue.task_type = 'timeline_backfill_v1'
    and queue.celeb_id = p_celeb_id
  for update;

  if not found
    or v_queue.status <> 'in_progress'
    or v_queue.claimed_by is distinct from v_worker
    or v_queue.payload ->> 'claimToken' is distinct from p_claim_token::text
  then
    raise exception 'timeline claim is not owned: celeb_id=%', p_celeb_id;
  end if;
  if v_queue.lease_expires_at is null or v_queue.lease_expires_at < now() then
    raise exception 'timeline claim lease expired: celeb_id=%', p_celeb_id;
  end if;

  if v_queue.payload -> 'profileSnapshot' is distinct from p_profile_snapshot then
    raise exception 'submitted profile snapshot differs from claimed snapshot: celeb_id=%', p_celeb_id;
  end if;

  -- Locking the parent celeb row serializes profile updates and FK-backed
  -- timeline inserts for this celeb through the zero-row check and commit.
  select private.timeline_backfill_profile_snapshot(celeb.id)
  into v_current_snapshot
  from public.celebs as celeb
  where celeb.id = p_celeb_id
  for update of celeb;

  if not found then
    raise exception 'celeb no longer exists: celeb_id=%', p_celeb_id;
  end if;
  if v_current_snapshot is distinct from p_profile_snapshot then
    raise exception 'celeb profile drifted after claim: celeb_id=%', p_celeb_id;
  end if;

  if exists (
    select 1
    from public.celeb_timeline_events as timeline
    where timeline.celeb_id = p_celeb_id
  ) then
    raise exception 'timeline is no longer empty: celeb_id=%', p_celeb_id;
  end if;

  if p_research_payload ->> 'celebId' is distinct from p_celeb_id::text then
    raise exception 'research payload celebId mismatch: celeb_id=%', p_celeb_id;
  end if;
  if p_research_payload -> 'profileSnapshot' is distinct from p_profile_snapshot then
    raise exception 'research payload profileSnapshot mismatch: celeb_id=%', p_celeb_id;
  end if;
  if p_research_payload ->> 'researchStatus' is distinct from 'complete' then
    raise exception 'researchStatus must be complete';
  end if;
  if p_research_payload ? 'applicationStatus' then
    raise exception 'applicationStatus is allowed only for blocked research';
  end if;

  v_mode := p_research_payload ->> 'timelineMode';
  if v_mode not in ('life', 'fiction') then
    raise exception 'timelineMode must be life or fiction';
  end if;
  if v_mode <> (case
      when p_profile_snapshot ->> 'celebTier' = 'fiction' then 'fiction'
      else 'life'
    end)
  then
    raise exception 'timelineMode does not match claimed celeb tier';
  end if;

  v_sources := p_research_payload -> 'sources';
  v_events := p_research_payload -> 'events';
  v_profile_conflicts := case
    when not (p_research_payload ? 'profileConflicts')
      or p_research_payload -> 'profileConflicts' = 'null'::jsonb
      then '[]'::jsonb
    else p_research_payload -> 'profileConflicts'
  end;
  v_blocking_issues := case
    when not (p_research_payload ? 'blockingIssues')
      or p_research_payload -> 'blockingIssues' = 'null'::jsonb
      then '[]'::jsonb
    else p_research_payload -> 'blockingIssues'
  end;
  perform private.timeline_backfill_validate_sources(v_sources);
  if jsonb_typeof(v_events) is distinct from 'array' then
    raise exception 'events must be a JSON array';
  end if;
  v_profile_conflict_fields := private.timeline_backfill_validate_profile_conflicts(
    v_profile_conflicts,
    p_profile_snapshot,
    v_sources
  );
  if jsonb_typeof(v_blocking_issues) is distinct from 'array' then
    raise exception 'blockingIssues must be a JSON array';
  end if;
  if jsonb_array_length(v_blocking_issues) <> 0 then
    raise exception 'complete research cannot contain blockingIssues';
  end if;

  v_event_count := jsonb_array_length(v_events);
  if (v_mode = 'life' and (v_event_count < 3 or v_event_count > 30))
    or (v_mode = 'fiction' and (v_event_count < 6 or v_event_count > 12))
  then
    raise exception 'invalid % event count: %', v_mode, v_event_count;
  end if;

  if exists (
    select 1
    from jsonb_array_elements(v_events) as event_item(value)
    where jsonb_typeof(event_item.value) is distinct from 'object'
      or nullif(btrim(event_item.value ->> 'title'), '') is null
      or coalesce(event_item.value ->> 'eventType', '') <> v_mode
      or coalesce(event_item.value ->> 'kind', '') not in (
        'birth', 'death', 'education', 'work', 'publish',
        'battle', 'travel', 'office', 'meeting', 'other'
      )
  ) then
    raise exception 'each event requires mode, title, and a supported kind';
  end if;

  for v_event in
    select event_item.value
    from jsonb_array_elements(v_events) as event_item(value)
  loop
    if exists (
      select 1
      from jsonb_object_keys(v_event) as event_key(value)
      where (
        v_mode = 'life'
        and event_key.value not in (
          'eventType', 'title', 'titleEn', 'description', 'descriptionEn', 'kind',
          'placeName', 'placeNameEn', 'placeQuery', 'placeCountry', 'evidenceRefs',
          'year', 'yearEnd', 'month', 'day', 'sequenceLabel', 'sequenceLabelEn'
        )
      ) or (
        v_mode = 'fiction'
        and event_key.value not in (
          'eventType', 'title', 'titleEn', 'description', 'descriptionEn', 'kind',
          'placeName', 'placeNameEn', 'placeQuery', 'placeCountry', 'evidenceRefs',
          'sequenceLabel', 'sequenceLabelEn', 'sortOrder'
        )
      )
    ) then
      raise exception 'events[%] contains keys outside the % event contract', v_event_index, v_mode;
    end if;
    if jsonb_typeof(v_event -> 'title') is distinct from 'string'
      or nullif(btrim(v_event ->> 'title'), '') is null
      or jsonb_typeof(v_event -> 'titleEn') is distinct from 'string'
      or nullif(btrim(v_event ->> 'titleEn'), '') is null
      or jsonb_typeof(v_event -> 'description') is distinct from 'string'
      or char_length(btrim(coalesce(v_event ->> 'description', ''))) < 20
      or jsonb_typeof(v_event -> 'descriptionEn') is distinct from 'string'
      or char_length(btrim(coalesce(v_event ->> 'descriptionEn', ''))) < 20
    then
      raise exception 'events[%] requires bilingual titles and substantive bilingual descriptions', v_event_index;
    end if;
    if exists (
      select 1
      from unnest(array['placeName', 'placeNameEn', 'placeQuery', 'placeCountry']) as optional_key(value)
      where v_event ? optional_key.value
        and v_event -> optional_key.value <> 'null'::jsonb
        and (
          jsonb_typeof(v_event -> optional_key.value) is distinct from 'string'
          or nullif(btrim(v_event ->> optional_key.value), '') is null
        )
    ) then
      raise exception 'events[%] optional place fields must be non-empty strings or null', v_event_index;
    end if;
    if v_mode = 'fiction' and (
      jsonb_typeof(v_event -> 'sequenceLabel') is distinct from 'string'
      or nullif(btrim(v_event ->> 'sequenceLabel'), '') is null
      or jsonb_typeof(v_event -> 'sequenceLabelEn') is distinct from 'string'
      or nullif(btrim(v_event ->> 'sequenceLabelEn'), '') is null
      or jsonb_typeof(v_event -> 'sortOrder') is distinct from 'number'
      or coalesce(v_event ->> 'sortOrder', '') !~ '^[0-9]+$'
      or (v_event ->> 'sortOrder')::integer <> v_event_index + 1
    ) then
      raise exception 'fiction events[%] requires bilingual sequence labels and contiguous sortOrder', v_event_index;
    end if;
    perform private.timeline_backfill_validate_evidence_refs(
      v_event -> 'evidenceRefs',
      v_sources,
      'events[' || v_event_index || ']'
    );
    v_event_index := v_event_index + 1;
  end loop;

  if v_mode = 'life' and exists (
    select 1
    from jsonb_array_elements(v_events) as event_item(value)
    where not (event_item.value ? 'year')
      or (
        jsonb_typeof(event_item.value -> 'year') is distinct from 'number'
        and event_item.value -> 'year' is distinct from 'null'::jsonb
      )
      or (
        jsonb_typeof(event_item.value -> 'year') = 'number'
        and coalesce(event_item.value ->> 'year', '') !~ '^-?[0-9]+$'
      )
      or (
        event_item.value ->> 'yearEnd' is not null
        and (
          jsonb_typeof(event_item.value -> 'yearEnd') is distinct from 'number'
          or event_item.value ->> 'yearEnd' !~ '^-?[0-9]+$'
        )
      )
      or (
        event_item.value ->> 'month' is not null
        and (
          jsonb_typeof(event_item.value -> 'month') is distinct from 'number'
          or event_item.value ->> 'month' !~ '^[0-9]+$'
        )
      )
      or (
        event_item.value ->> 'day' is not null
        and (
          jsonb_typeof(event_item.value -> 'day') is distinct from 'number'
          or event_item.value ->> 'day' !~ '^[0-9]+$'
        )
      )
  ) then
    raise exception 'life event dates must be integer JSON values';
  end if;

  if v_mode = 'life' and exists (
    with ordered as (
      select
        event_item.ordinality,
        (event_item.value ->> 'year')::integer as event_year,
        coalesce((event_item.value ->> 'month')::integer, 0) as event_month,
        coalesce((event_item.value ->> 'day')::integer, 0) as event_day,
        lag((event_item.value ->> 'year')::integer)
          over (order by event_item.ordinality) as previous_year,
        lag(coalesce((event_item.value ->> 'month')::integer, 0))
          over (order by event_item.ordinality) as previous_month,
        lag(coalesce((event_item.value ->> 'day')::integer, 0))
          over (order by event_item.ordinality) as previous_day
      from jsonb_array_elements(v_events) with ordinality as event_item(value, ordinality)
      where jsonb_typeof(event_item.value -> 'year') = 'number'
    )
    select 1
    from ordered
    where previous_year is not null
      and (
        event_year < previous_year
        or (event_year = previous_year and event_month < previous_month)
        or (
          event_year = previous_year
          and event_month = previous_month
          and event_day < previous_day
        )
      )
  ) then
    raise exception 'life events must be ordered by year, month, and day';
  end if;

  if v_mode = 'life' and exists (
    select 1
    from jsonb_array_elements(v_events) as event_item(value)
    group by (event_item.value ->> 'year')::integer, btrim(event_item.value ->> 'title')
    having count(*) > 1
  ) then
    raise exception 'life events cannot duplicate year and title';
  end if;

  -- Numeric casts are deliberately separated from the lexical validation
  -- above so malformed model output cannot surface as an uncontrolled cast
  -- error before the contract error.
  if v_mode = 'life' and exists (
    select 1
    from jsonb_array_elements(v_events) as event_item(value)
    where (
        event_item.value ->> 'yearEnd' is not null
        and (event_item.value ->> 'yearEnd')::integer < (event_item.value ->> 'year')::integer
      )
      or (
        event_item.value ->> 'month' is not null
        and (event_item.value ->> 'month')::integer not between 1 and 12
      )
      or (
        event_item.value ->> 'day' is not null
        and (event_item.value ->> 'day')::integer not between 1 and 31
      )
      or (
        event_item.value ->> 'day' is not null
        and event_item.value ->> 'month' is null
      )
      or event_item.value ->> 'sequenceLabel' is not null
      or event_item.value ->> 'sequenceLabelEn' is not null
      or (
        event_item.value -> 'year' = 'null'::jsonb
        and (
          event_item.value ->> 'yearEnd' is not null
          or event_item.value ->> 'month' is not null
          or event_item.value ->> 'day' is not null
        )
      )
  ) then
    raise exception 'life events require integer-or-null year, null narrative labels, and no date residue when undated';
  end if;

  if v_mode = 'life' then
    v_birth_text := p_profile_snapshot ->> 'birthDate';
    v_death_text := p_profile_snapshot ->> 'deathDate';
    v_birth_date := private.timeline_backfill_exact_profile_date(v_birth_text);
    v_death_date := private.timeline_backfill_exact_profile_date(v_death_text);

    if not ('birthDate' = any(v_profile_conflict_fields)) then
      if v_birth_date is not null then
        if (
          select count(*)
          from jsonb_array_elements(v_events) as event_item(value)
          where event_item.value ->> 'kind' = 'birth'
        ) <> 1
          or v_events -> 0 ->> 'kind' is distinct from 'birth'
          or (v_events -> 0 ->> 'year')::integer
            is distinct from (v_birth_date ->> 'year')::integer
          or (
            v_birth_date ->> 'month' is not null
            and (v_events -> 0 ->> 'month')::integer
              is distinct from (v_birth_date ->> 'month')::integer
          )
          or (
            v_birth_date ->> 'day' is not null
            and (v_events -> 0 ->> 'day')::integer
              is distinct from (v_birth_date ->> 'day')::integer
          )
        then
          raise exception 'first event must be the exact claimed birth boundary';
        end if;
      elsif v_birth_text is null and exists (
        select 1
        from jsonb_array_elements(v_events) as event_item(value)
        where event_item.value ->> 'kind' = 'birth'
      ) then
        raise exception 'birth event is forbidden when claimed birthDate is null';
      end if;
    end if;

    if not ('deathDate' = any(v_profile_conflict_fields)) then
      if v_death_date is not null then
        if (
          select count(*)
          from jsonb_array_elements(v_events) as event_item(value)
          where event_item.value ->> 'kind' = 'death'
        ) <> 1
          or v_events -> (v_event_count - 1) ->> 'kind' is distinct from 'death'
          or (v_events -> (v_event_count - 1) ->> 'year')::integer
            is distinct from (v_death_date ->> 'year')::integer
          or (
            v_death_date ->> 'month' is not null
            and (v_events -> (v_event_count - 1) ->> 'month')::integer
              is distinct from (v_death_date ->> 'month')::integer
          )
          or (
            v_death_date ->> 'day' is not null
            and (v_events -> (v_event_count - 1) ->> 'day')::integer
              is distinct from (v_death_date ->> 'day')::integer
          )
        then
          raise exception 'last event must be the exact claimed death boundary';
        end if;
      elsif v_death_text is null and exists (
        select 1
        from jsonb_array_elements(v_events) as event_item(value)
        where event_item.value ->> 'kind' = 'death'
      ) then
        raise exception 'death event is forbidden when claimed deathDate is null';
      end if;
    end if;
  end if;

  if v_mode = 'fiction' and exists (
    select 1
    from jsonb_array_elements(v_events) as event_item(value)
    where nullif(btrim(event_item.value ->> 'sequenceLabel'), '') is null
      or event_item.value ->> 'year' is not null
      or event_item.value ->> 'yearEnd' is not null
      or event_item.value ->> 'month' is not null
      or event_item.value ->> 'day' is not null
  ) then
    raise exception 'fiction events require sequenceLabel and cannot use calendar dates';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'eventIndex', event_item.ordinality - 1,
        'evidenceRefs', event_item.value -> 'evidenceRefs'
      )
      order by event_item.ordinality
    ),
    '[]'::jsonb
  )
  into v_event_evidence
  from jsonb_array_elements(v_events) with ordinality as event_item(value, ordinality);

  with inserted as (
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
      case when v_mode = 'life' then (event_item.value ->> 'year')::integer else null end,
      case when v_mode = 'life' then (event_item.value ->> 'yearEnd')::integer else null end,
      case when v_mode = 'life' then (event_item.value ->> 'month')::smallint else null end,
      case when v_mode = 'life' then (event_item.value ->> 'day')::smallint else null end,
      case when v_mode = 'fiction' then nullif(btrim(event_item.value ->> 'sequenceLabel'), '') else null end,
      case when v_mode = 'fiction' then nullif(btrim(event_item.value ->> 'sequenceLabelEn'), '') else null end,
      btrim(event_item.value ->> 'title'),
      nullif(btrim(event_item.value ->> 'titleEn'), ''),
      nullif(btrim(event_item.value ->> 'description'), ''),
      nullif(btrim(event_item.value ->> 'descriptionEn'), ''),
      event_item.value ->> 'kind',
      nullif(btrim(event_item.value ->> 'placeName'), ''),
      nullif(btrim(event_item.value ->> 'placeNameEn'), ''),
      null,
      null,
      null,
      'research',
      btrim(source_item.value ->> 'url'),
      case when v_mode = 'fiction'
        then event_item.ordinality::integer
        else (event_item.ordinality - 1)::integer
      end
    from jsonb_array_elements(v_events) with ordinality as event_item(value, ordinality)
    join lateral (
      select source_row.value
      from jsonb_array_elements(v_sources) as source_row(value)
      where btrim(source_row.value ->> 'id') = btrim(event_item.value -> 'evidenceRefs' ->> 0)
      limit 1
    ) as source_item on true
    returning id, sort_order
  )
  select array_agg(inserted.id order by inserted.sort_order), count(*)::integer
  into v_event_ids, v_inserted
  from inserted;

  if v_inserted <> v_event_count
    or cardinality(v_event_ids) <> v_event_count
  then
    raise exception 'timeline insert count mismatch: expected=% actual=%', v_event_count, v_inserted;
  end if;

  select count(*)::integer
  into v_total_count
  from public.celeb_timeline_events as timeline
  where timeline.celeb_id = p_celeb_id;

  if v_total_count <> v_event_count then
    raise exception 'timeline owner row count mismatch: expected=% actual=%',
      v_event_count, v_total_count;
  end if;

  select jsonb_agg(
    jsonb_build_object(
      'year', case when v_mode = 'life' then (event_item.value ->> 'year')::integer else null end,
      'yearEnd', case when v_mode = 'life' then (event_item.value ->> 'yearEnd')::integer else null end,
      'month', case when v_mode = 'life' then (event_item.value ->> 'month')::integer else null end,
      'day', case when v_mode = 'life' then (event_item.value ->> 'day')::integer else null end,
      'sequenceLabel', case when v_mode = 'fiction' then nullif(btrim(event_item.value ->> 'sequenceLabel'), '') else null end,
      'sequenceLabelEn', case when v_mode = 'fiction' then nullif(btrim(event_item.value ->> 'sequenceLabelEn'), '') else null end,
      'title', btrim(event_item.value ->> 'title'),
      'titleEn', nullif(btrim(event_item.value ->> 'titleEn'), ''),
      'description', nullif(btrim(event_item.value ->> 'description'), ''),
      'descriptionEn', nullif(btrim(event_item.value ->> 'descriptionEn'), ''),
      'kind', event_item.value ->> 'kind',
      'placeName', nullif(btrim(event_item.value ->> 'placeName'), ''),
      'placeNameEn', nullif(btrim(event_item.value ->> 'placeNameEn'), ''),
      'lat', null,
      'lng', null,
      'placeQid', null,
      'source', 'research',
      'sourceUrl', btrim(source_item.value ->> 'url'),
      'sortOrder', case when v_mode = 'fiction'
        then event_item.ordinality::integer
        else (event_item.ordinality - 1)::integer
      end
    )
    order by event_item.ordinality
  )
  into v_expected_events
  from jsonb_array_elements(v_events) with ordinality as event_item(value, ordinality)
  join lateral (
    select source_row.value
    from jsonb_array_elements(v_sources) as source_row(value)
    where btrim(source_row.value ->> 'id') = btrim(event_item.value -> 'evidenceRefs' ->> 0)
    limit 1
  ) as source_item on true;

  select jsonb_agg(
    jsonb_build_object(
      'year', timeline.year,
      'yearEnd', timeline.year_end,
      'month', timeline.month,
      'day', timeline.day,
      'sequenceLabel', timeline.sequence_label,
      'sequenceLabelEn', timeline.sequence_label_en,
      'title', timeline.title,
      'titleEn', timeline.title_en,
      'description', timeline.description,
      'descriptionEn', timeline.description_en,
      'kind', timeline.kind,
      'placeName', timeline.place_name,
      'placeNameEn', timeline.place_name_en,
      'lat', timeline.lat,
      'lng', timeline.lng,
      'placeQid', timeline.place_qid,
      'source', timeline.source,
      'sourceUrl', timeline.source_url,
      'sortOrder', timeline.sort_order
    )
    order by timeline.sort_order
  )
  into v_actual_events
  from public.celeb_timeline_events as timeline
  where timeline.celeb_id = p_celeb_id
    and timeline.id = any(v_event_ids);

  if v_actual_events is distinct from v_expected_events then
    raise exception 'exact timeline readback mismatch: celeb_id=%', p_celeb_id;
  end if;

  insert into public.celeb_timeline_research_runs (
    celeb_id,
    pipeline,
    run_origin,
    research_status,
    timeline_mode,
    research_fingerprint,
    source_snapshot_id,
    claim_token,
    claimed_by,
    attempt_count,
    profile_snapshot,
    sources,
    event_evidence,
    profile_conflicts,
    blocking_issues,
    research_payload,
    timeline_event_ids,
    event_count,
    started_at,
    completed_at
  ) values (
    p_celeb_id,
    'timeline_backfill_v1',
    'direct_pipeline',
    'complete',
    v_mode,
    v_fingerprint,
    nullif(btrim(p_research_payload ->> 'sourceSnapshotId'), ''),
    p_claim_token,
    v_worker,
    v_queue.attempt_count,
    p_profile_snapshot,
    v_sources,
    v_event_evidence,
    v_profile_conflicts,
    v_blocking_issues,
    p_research_payload,
    v_event_ids,
    v_event_count,
    v_queue.claimed_at,
    now()
  )
  returning id into v_run_id;

  update public.celeb_task_queue as queue
  set status = 'completed',
      completed_at = now(),
      lease_expires_at = null,
      last_error = null,
      payload = (coalesce(queue.payload, '{}'::jsonb) - 'claimToken' - 'explicitRequeue')
        || jsonb_build_object(
          'lastRunId', v_run_id,
          'lastResearchFingerprint', v_fingerprint,
          'lastEventCount', v_event_count
        ),
      updated_at = now()
  where queue.task_type = 'timeline_backfill_v1'
    and queue.celeb_id = p_celeb_id
    and queue.status = 'in_progress'
    and queue.claimed_by = v_worker
    and queue.payload ->> 'claimToken' = p_claim_token::text;

  get diagnostics v_rows = row_count;
  if v_rows <> 1 then
    raise exception 'queue completion lost ownership: celeb_id=%', p_celeb_id;
  end if;

  return jsonb_build_object(
    'status', 'completed',
    'celebId', p_celeb_id,
    'runId', v_run_id,
    'eventCount', v_event_count,
    'researchFingerprint', v_fingerprint
  );
end;
$$;



do $$
declare
  v_constraint_definition text;
begin
  select pg_get_constraintdef(constraint_row.oid, true)
  into v_constraint_definition
  from pg_constraint as constraint_row
  where constraint_row.conrelid = 'public.celeb_timeline_events'::regclass
    and constraint_row.conname = 'chk_timeline_position'
    and constraint_row.contype = 'c'
    and constraint_row.convalidated;

  if v_constraint_definition is null
    or v_constraint_definition not like '%sequence_label_en%'
    or v_constraint_definition not like '%year_end IS NULL%'
  then
    raise exception 'timeline physical position union mismatch';
  end if;

  if to_regprocedure('private.timeline_event_position_guard()') is null
    or not exists (
      select 1
      from pg_trigger
      where tgrelid = 'public.celeb_timeline_events'::regclass
        and tgname = 'trg_timeline_event_position_guard'
        and tgenabled = 'O'
        and not tgisinternal
    )
  then
    raise exception 'timeline tier-specific position trigger mismatch';
  end if;

  if to_regprocedure('public.complete_celeb_timeline_backfill(uuid,text,uuid,jsonb,text,jsonb)') is null
    or to_regprocedure('public.correct_celeb_timeline_backfill(uuid,uuid,text,jsonb,text,jsonb,text)') is null
    or to_regprocedure('private.timeline_backfill_validate_complete_payload(uuid,jsonb,jsonb)') is null
  then
    raise exception 'timeline undated-life function signature contract mismatch';
  end if;

  if exists (
    select 1
    from pg_proc as proc
    join pg_namespace as namespace on namespace.oid = proc.pronamespace
    where (
        namespace.nspname = 'public'
        and proc.proname in (
          'complete_celeb_timeline_backfill',
          'correct_celeb_timeline_backfill'
        )
        and (
          not proc.prosecdef
          or proc.proconfig is distinct from array['search_path=pg_catalog']::text[]
          or pg_get_userbyid(proc.proowner) <> 'postgres'
        )
      )
      or (
        namespace.nspname = 'private'
        and proc.proname = 'timeline_backfill_validate_complete_payload'
        and (
          proc.prosecdef
          or proc.proconfig is distinct from array['search_path=pg_catalog']::text[]
          or pg_get_userbyid(proc.proowner) <> 'postgres'
        )
      )
      or (
        namespace.nspname = 'private'
        and proc.proname = 'timeline_event_position_guard'
        and (
          not proc.prosecdef
          or proc.proconfig is distinct from array['search_path=pg_catalog']::text[]
          or pg_get_userbyid(proc.proowner) <> 'postgres'
        )
      )
  ) then
    raise exception 'timeline undated-life function security contract mismatch';
  end if;
end;
$$;

commit;
