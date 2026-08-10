begin;

-- A completed direct run is immutable evidence. Corrections therefore append a
-- replacement run and mark the previous run as superseded instead of editing its
-- payload in place. The service role still has no table UPDATE/DELETE grant; only
-- the SECURITY DEFINER RPC below may establish this lineage.
alter table public.celeb_timeline_research_runs
  add column supersedes_run_id uuid,
  add column superseded_by_run_id uuid,
  add column superseded_at timestamptz,
  add column supersession_reason text,
  add constraint celeb_timeline_research_runs_supersedes_fkey
    foreign key (supersedes_run_id)
    references public.celeb_timeline_research_runs(id)
    on delete restrict,
  add constraint celeb_timeline_research_runs_superseded_by_fkey
    foreign key (superseded_by_run_id)
    references public.celeb_timeline_research_runs(id)
    on delete restrict
    deferrable initially deferred,
  add constraint celeb_timeline_research_runs_no_self_lineage_check
    check (
      (supersedes_run_id is null or supersedes_run_id <> id)
      and (superseded_by_run_id is null or superseded_by_run_id <> id)
    ),
  add constraint celeb_timeline_research_runs_supersession_state_check
    check (
      (
        superseded_by_run_id is null
        and superseded_at is null
        and supersession_reason is null
      )
      or (
        superseded_by_run_id is not null
        and superseded_at is not null
        and char_length(btrim(supersession_reason)) between 20 and 1200
      )
    );

create unique index celeb_timeline_research_runs_one_successor_idx
  on public.celeb_timeline_research_runs (supersedes_run_id)
  where supersedes_run_id is not null;

create unique index celeb_timeline_research_runs_active_complete_idx
  on public.celeb_timeline_research_runs (celeb_id)
  where pipeline = 'timeline_backfill_v1'
    and research_status = 'complete'
    and superseded_by_run_id is null
    and superseded_at is null;

comment on column public.celeb_timeline_research_runs.supersedes_run_id is
  'Immediate predecessor replaced by this immutable correction run.';
comment on column public.celeb_timeline_research_runs.superseded_by_run_id is
  'Immediate correction run that replaced this immutable run.';
comment on column public.celeb_timeline_research_runs.superseded_at is
  'Transaction time at which a correction superseded this run.';
comment on column public.celeb_timeline_research_runs.supersession_reason is
  'Required operator reason retained on the superseded run.';

-- All ledger mutations now flow through SECURITY DEFINER RPCs. The service
-- role retains readback access but loses the direct INSERT route created by the
-- initial pipeline migration.
revoke insert on table public.celeb_timeline_research_runs from service_role;

create or replace function private.timeline_backfill_expected_events(
  p_celeb_id uuid,
  p_research_payload jsonb
)
returns jsonb
language sql
stable
security invoker
set search_path = pg_catalog
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'celebId', p_celeb_id,
        'year', case when p_research_payload ->> 'timelineMode' = 'life'
          then (event_item.value ->> 'year')::integer else null end,
        'yearEnd', case when p_research_payload ->> 'timelineMode' = 'life'
          then (event_item.value ->> 'yearEnd')::integer else null end,
        'month', case when p_research_payload ->> 'timelineMode' = 'life'
          then (event_item.value ->> 'month')::integer else null end,
        'day', case when p_research_payload ->> 'timelineMode' = 'life'
          then (event_item.value ->> 'day')::integer else null end,
        'sequenceLabel', case when p_research_payload ->> 'timelineMode' = 'fiction'
          then nullif(btrim(event_item.value ->> 'sequenceLabel'), '') else null end,
        'sequenceLabelEn', case when p_research_payload ->> 'timelineMode' = 'fiction'
          then nullif(btrim(event_item.value ->> 'sequenceLabelEn'), '') else null end,
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
        'sortOrder', case when p_research_payload ->> 'timelineMode' = 'fiction'
          then event_item.ordinality::integer
          else (event_item.ordinality - 1)::integer
        end
      )
      order by event_item.ordinality
    ),
    '[]'::jsonb
  )
  from jsonb_array_elements(p_research_payload -> 'events')
    with ordinality as event_item(value, ordinality)
  join lateral (
    select source_row.value
    from jsonb_array_elements(p_research_payload -> 'sources') as source_row(value)
    where btrim(source_row.value ->> 'id')
      = btrim(event_item.value -> 'evidenceRefs' ->> 0)
    limit 1
  ) as source_item on true
$$;

create or replace function private.timeline_backfill_live_events(
  p_celeb_id uuid,
  p_event_ids uuid[]
)
returns jsonb
language sql
stable
security invoker
set search_path = pg_catalog
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'celebId', timeline.celeb_id,
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
    ),
    '[]'::jsonb
  )
  from public.celeb_timeline_events as timeline
  where timeline.celeb_id = p_celeb_id
    and timeline.id = any(p_event_ids)
$$;

revoke all on function
  private.timeline_backfill_expected_events(uuid, jsonb),
  private.timeline_backfill_live_events(uuid, uuid[])
from public, anon, authenticated, service_role;

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
            'year', 'yearEnd', 'month', 'day'
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
    where jsonb_typeof(event_item.value -> 'year') is distinct from 'number'
      or coalesce(event_item.value ->> 'year', '') !~ '^-?[0-9]+$'
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
  ) then
    raise exception 'corrected life events contain invalid dates or narrative labels';
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

revoke all on function
  private.timeline_backfill_validate_complete_payload(uuid, jsonb, jsonb)
from public, anon, authenticated, service_role;

create or replace function public.correct_celeb_timeline_backfill(
  p_celeb_id uuid,
  p_expected_run_id uuid,
  p_expected_research_fingerprint text,
  p_corrected_profile_snapshot jsonb,
  p_corrected_research_fingerprint text,
  p_corrected_research_payload jsonb,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_expected_fingerprint text := btrim(coalesce(p_expected_research_fingerprint, ''));
  v_corrected_fingerprint text := btrim(coalesce(p_corrected_research_fingerprint, ''));
  v_reason text := btrim(coalesce(p_reason, ''));
  v_queue public.celeb_task_queue%rowtype;
  v_current_snapshot jsonb;
  v_current_run public.celeb_timeline_research_runs%rowtype;
  v_corrected_run public.celeb_timeline_research_runs%rowtype;
  v_mode text;
  v_sources jsonb;
  v_events jsonb;
  v_profile_conflicts jsonb;
  v_blocking_issues jsonb;
  v_event_evidence jsonb;
  v_expected_events jsonb;
  v_actual_events jsonb;
  v_event_ids uuid[];
  v_event_count integer;
  v_rows integer;
  v_total_count integer;
  v_run_id uuid := gen_random_uuid();
  v_now timestamptz := now();
begin
  if p_celeb_id is null or p_expected_run_id is null then
    raise exception 'p_celeb_id and p_expected_run_id are required';
  end if;
  if v_expected_fingerprint !~ '^[0-9a-f]{64}$'
    or v_corrected_fingerprint !~ '^[0-9a-f]{64}$'
  then
    raise exception 'expected and corrected fingerprints must be lowercase SHA-256 hex';
  end if;
  if v_corrected_fingerprint = v_expected_fingerprint then
    raise exception 'corrected fingerprint must differ from the expected current fingerprint';
  end if;
  if char_length(v_reason) not between 20 and 1200 then
    raise exception 'p_reason must contain 20 through 1200 characters';
  end if;

  -- Lock the queue before either the idempotent lineage or the new-correction
  -- path. A retry deliberately does not depend on the mutable live profile.
  select queue.*
  into v_queue
  from public.celeb_task_queue as queue
  where queue.task_type = 'timeline_backfill_v1'
    and queue.celeb_id = p_celeb_id
  for update;

  if not found then
    raise exception 'timeline correction queue row not found: celeb_id=%', p_celeb_id;
  end if;

  -- The same post-commit request is idempotent only when every lineage, payload,
  -- queue pointer, and live event is still exactly the first correction result.
  select run.*
  into v_corrected_run
  from public.celeb_timeline_research_runs as run
  where run.celeb_id = p_celeb_id
    and run.research_fingerprint = v_corrected_fingerprint
  for update;

  if found then
    select run.*
    into v_current_run
    from public.celeb_timeline_research_runs as run
    where run.id = p_expected_run_id
      and run.celeb_id = p_celeb_id
    for update;

    if not found
      or v_current_run.research_fingerprint is distinct from v_expected_fingerprint
      or v_current_run.superseded_by_run_id is distinct from v_corrected_run.id
      or v_current_run.superseded_at is null
      or v_current_run.supersession_reason is distinct from v_reason
      or v_corrected_run.supersedes_run_id is distinct from v_current_run.id
      or v_corrected_run.superseded_by_run_id is not null
      or v_corrected_run.superseded_at is not null
      or v_corrected_run.supersession_reason is not null
      or v_corrected_run.research_status <> 'complete'
      or v_corrected_run.profile_snapshot is distinct from p_corrected_profile_snapshot
      or v_corrected_run.research_payload is distinct from p_corrected_research_payload
      or v_corrected_run.event_count
        <> jsonb_array_length(v_corrected_run.research_payload -> 'events')
      or cardinality(v_corrected_run.timeline_event_ids) <> v_corrected_run.event_count
    then
      raise exception 'correction fingerprint collision or idempotent lineage mismatch: celeb_id=%', p_celeb_id;
    end if;
    v_event_count := v_corrected_run.event_count;
    v_expected_events := private.timeline_backfill_expected_events(
      p_celeb_id,
      v_corrected_run.research_payload
    );
    if v_queue.status <> 'completed'
      or v_queue.payload ->> 'lastRunId' is distinct from v_corrected_run.id::text
      or v_queue.payload ->> 'lastResearchFingerprint' is distinct from v_corrected_fingerprint
      or v_queue.payload ->> 'lastEventCount' is distinct from v_event_count::text
    then
      raise exception 'idempotent correction queue readback mismatch: celeb_id=%', p_celeb_id;
    end if;
    v_actual_events := private.timeline_backfill_live_events(
      p_celeb_id,
      v_corrected_run.timeline_event_ids
    );
    select count(*)::integer
    into v_total_count
    from public.celeb_timeline_events as timeline
    where timeline.celeb_id = p_celeb_id;
    if v_actual_events is distinct from v_expected_events
      or v_total_count <> v_event_count
    then
      raise exception 'idempotent correction event readback mismatch: celeb_id=%', p_celeb_id;
    end if;

    return jsonb_build_object(
      'status', 'already_corrected',
      'celebId', p_celeb_id,
      'runId', v_corrected_run.id,
      'supersedesRunId', v_current_run.id,
      'eventCount', v_event_count,
      'researchFingerprint', v_corrected_fingerprint
    );
  end if;

  -- A new correction matches the direct commit lock order: queue first, parent
  -- celeb second. The locked live profile must match the corrected snapshot.
  select private.timeline_backfill_profile_snapshot(celeb.id)
  into v_current_snapshot
  from public.celebs as celeb
  where celeb.id = p_celeb_id
  for update of celeb;

  if not found then
    raise exception 'timeline correction celeb not found: celeb_id=%', p_celeb_id;
  end if;
  if v_current_snapshot is distinct from p_corrected_profile_snapshot then
    raise exception 'corrected profile snapshot differs from the locked live profile: celeb_id=%', p_celeb_id;
  end if;

  perform private.timeline_backfill_validate_complete_payload(
    p_celeb_id,
    p_corrected_profile_snapshot,
    p_corrected_research_payload
  );
  v_mode := p_corrected_research_payload ->> 'timelineMode';
  v_sources := p_corrected_research_payload -> 'sources';
  v_events := p_corrected_research_payload -> 'events';
  v_profile_conflicts := case
    when not (p_corrected_research_payload ? 'profileConflicts')
      or p_corrected_research_payload -> 'profileConflicts' = 'null'::jsonb
      then '[]'::jsonb
    else p_corrected_research_payload -> 'profileConflicts'
  end;
  v_blocking_issues := case
    when not (p_corrected_research_payload ? 'blockingIssues')
      or p_corrected_research_payload -> 'blockingIssues' = 'null'::jsonb
      then '[]'::jsonb
    else p_corrected_research_payload -> 'blockingIssues'
  end;
  v_event_count := jsonb_array_length(v_events);
  v_expected_events := private.timeline_backfill_expected_events(
    p_celeb_id,
    p_corrected_research_payload
  );
  if jsonb_array_length(v_expected_events) <> v_event_count then
    raise exception 'corrected event evidence graph did not map every event';
  end if;

  select run.*
  into v_current_run
  from public.celeb_timeline_research_runs as run
  where run.id = p_expected_run_id
    and run.celeb_id = p_celeb_id
  for update;

  if not found
    or v_current_run.pipeline <> 'timeline_backfill_v1'
    or v_current_run.run_origin <> 'direct_pipeline'
    or v_current_run.research_status <> 'complete'
    or v_current_run.research_fingerprint is distinct from v_expected_fingerprint
    or v_current_run.superseded_by_run_id is not null
    or v_current_run.superseded_at is not null
    or v_current_run.supersession_reason is not null
  then
    raise exception 'expected run is not the current completed unsuperseded run: celeb_id=%', p_celeb_id;
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
  from jsonb_array_elements(v_current_run.research_payload -> 'events')
    with ordinality as event_item(value, ordinality);
  if v_current_run.profile_snapshot is distinct from v_current_run.research_payload -> 'profileSnapshot'
    or v_current_run.sources is distinct from v_current_run.research_payload -> 'sources'
    or v_current_run.timeline_mode is distinct from v_current_run.research_payload ->> 'timelineMode'
    or v_current_run.event_evidence is distinct from v_event_evidence
    or v_current_run.profile_conflicts is distinct from (case
      when not (v_current_run.research_payload ? 'profileConflicts')
        or v_current_run.research_payload -> 'profileConflicts' = 'null'::jsonb
        then '[]'::jsonb
      else v_current_run.research_payload -> 'profileConflicts'
    end)
    or v_current_run.blocking_issues is distinct from (case
      when not (v_current_run.research_payload ? 'blockingIssues')
        or v_current_run.research_payload -> 'blockingIssues' = 'null'::jsonb
        then '[]'::jsonb
      else v_current_run.research_payload -> 'blockingIssues'
    end)
    or v_current_run.event_count <> cardinality(v_current_run.timeline_event_ids)
    or v_current_run.event_count <> jsonb_array_length(v_current_run.research_payload -> 'events')
  then
    raise exception 'expected run ledger is internally inconsistent: run_id=%', v_current_run.id;
  end if;
  if v_queue.status <> 'completed'
    or v_queue.payload ->> 'lastRunId' is distinct from v_current_run.id::text
    or v_queue.payload ->> 'lastResearchFingerprint' is distinct from v_expected_fingerprint
    or v_queue.payload ->> 'lastEventCount' is distinct from v_current_run.event_count::text
  then
    raise exception 'queue does not point at the expected current run: celeb_id=%', p_celeb_id;
  end if;

  v_expected_events := private.timeline_backfill_expected_events(
    p_celeb_id,
    v_current_run.research_payload
  );
  v_actual_events := private.timeline_backfill_live_events(
    p_celeb_id,
    v_current_run.timeline_event_ids
  );
  select count(*)::integer
  into v_total_count
  from public.celeb_timeline_events as timeline
  where timeline.celeb_id = p_celeb_id;
  if jsonb_array_length(v_expected_events) <> v_current_run.event_count
    or v_actual_events is distinct from v_expected_events
    or v_total_count <> v_current_run.event_count
  then
    raise exception 'current live timeline is not an exact readback of the expected run: run_id=%', v_current_run.id;
  end if;

  delete from public.celeb_timeline_events as timeline
  where timeline.celeb_id = p_celeb_id
    and timeline.id = any(v_current_run.timeline_event_ids);
  get diagnostics v_rows = row_count;
  if v_rows <> v_current_run.event_count then
    raise exception 'correction delete count mismatch: expected=% actual=%', v_current_run.event_count, v_rows;
  end if;

  with inserted as (
    insert into public.celeb_timeline_events (
      celeb_id, year, year_end, month, day, sequence_label, sequence_label_en,
      title, title_en, description, description_en, kind, place_name, place_name_en,
      lat, lng, place_qid, source, source_url, sort_order
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
      where btrim(source_row.value ->> 'id')
        = btrim(event_item.value -> 'evidenceRefs' ->> 0)
      limit 1
    ) as source_item on true
    returning id, sort_order
  )
  select array_agg(inserted.id order by inserted.sort_order), count(*)::integer
  into v_event_ids, v_rows
  from inserted;

  if v_rows <> v_event_count or cardinality(v_event_ids) <> v_event_count then
    raise exception 'correction insert count mismatch: expected=% actual=%', v_event_count, v_rows;
  end if;
  v_expected_events := private.timeline_backfill_expected_events(
    p_celeb_id,
    p_corrected_research_payload
  );
  v_actual_events := private.timeline_backfill_live_events(p_celeb_id, v_event_ids);
  select count(*)::integer
  into v_total_count
  from public.celeb_timeline_events as timeline
  where timeline.celeb_id = p_celeb_id;
  if v_actual_events is distinct from v_expected_events or v_total_count <> v_event_count then
    raise exception 'corrected live timeline exact readback mismatch: celeb_id=%', p_celeb_id;
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

  -- superseded_by_run_id is a deferred FK so the predecessor can leave the
  -- active partial index before the preallocated correction id is inserted.
  update public.celeb_timeline_research_runs as run
  set superseded_by_run_id = v_run_id,
      superseded_at = v_now,
      supersession_reason = v_reason
  where run.id = v_current_run.id
    and run.superseded_by_run_id is null
    and run.superseded_at is null
    and run.supersession_reason is null;
  get diagnostics v_rows = row_count;
  if v_rows <> 1 then
    raise exception 'expected run lost current status during correction: run_id=%', v_current_run.id;
  end if;

  insert into public.celeb_timeline_research_runs (
    id, celeb_id, pipeline, run_origin, research_status, timeline_mode,
    research_fingerprint, source_snapshot_id, claim_token, claimed_by,
    attempt_count, profile_snapshot, sources, event_evidence, profile_conflicts,
    blocking_issues, research_payload, timeline_event_ids, event_count,
    started_at, completed_at, supersedes_run_id
  ) values (
    v_run_id, p_celeb_id, 'timeline_backfill_v1', 'direct_pipeline', 'complete', v_mode,
    v_corrected_fingerprint,
    nullif(btrim(p_corrected_research_payload ->> 'sourceSnapshotId'), ''),
    v_current_run.claim_token, v_current_run.claimed_by, v_current_run.attempt_count,
    p_corrected_profile_snapshot, v_sources, v_event_evidence, v_profile_conflicts,
    v_blocking_issues, p_corrected_research_payload, v_event_ids, v_event_count,
    v_current_run.started_at, v_now, v_current_run.id
  );

  update public.celeb_task_queue as queue
  set status = 'completed',
      completed_at = v_now,
      lease_expires_at = null,
      last_error = null,
      payload = (coalesce(queue.payload, '{}'::jsonb)
        - 'claimToken' - 'explicitRequeue')
        || jsonb_build_object(
          'lastRunId', v_run_id,
          'lastResearchFingerprint', v_corrected_fingerprint,
          'lastEventCount', v_event_count,
          'lastCorrectionAt', v_now,
          'lastCorrectionReason', v_reason,
          'lastSupersededRunId', v_current_run.id
        ),
      updated_at = v_now
  where queue.task_type = 'timeline_backfill_v1'
    and queue.celeb_id = p_celeb_id
    and queue.status = 'completed'
    and queue.payload ->> 'lastRunId' = v_current_run.id::text
    and queue.payload ->> 'lastResearchFingerprint' = v_expected_fingerprint;
  get diagnostics v_rows = row_count;
  if v_rows <> 1 then
    raise exception 'queue pointer update lost the expected run: celeb_id=%', p_celeb_id;
  end if;

  select run.*
  into v_corrected_run
  from public.celeb_timeline_research_runs as run
  where run.id = v_run_id;
  v_actual_events := private.timeline_backfill_live_events(
    p_celeb_id,
    v_corrected_run.timeline_event_ids
  );
  if v_corrected_run.supersedes_run_id is distinct from v_current_run.id
    or v_corrected_run.research_fingerprint is distinct from v_corrected_fingerprint
    or v_corrected_run.research_payload is distinct from p_corrected_research_payload
    or v_actual_events is distinct from v_expected_events
  then
    raise exception 'correction final exact readback mismatch: celeb_id=%', p_celeb_id;
  end if;

  return jsonb_build_object(
    'status', 'corrected',
    'celebId', p_celeb_id,
    'runId', v_run_id,
    'supersedesRunId', v_current_run.id,
    'eventCount', v_event_count,
    'researchFingerprint', v_corrected_fingerprint
  );
end;
$$;

revoke all on function public.correct_celeb_timeline_backfill(
  uuid, uuid, text, jsonb, text, jsonb, text
) from public, anon, authenticated, service_role;

grant execute on function public.correct_celeb_timeline_backfill(
  uuid, uuid, text, jsonb, text, jsonb, text
) to service_role;

-- Operational totals describe active evidence only. Superseded runs remain
-- queryable in the ledger but no longer inflate completed event totals.
create or replace function public.get_celeb_timeline_backfill_status()
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog
as $$
  with
  celeb_counts as (
    select
      count(*)::bigint as total,
      count(*) filter (
        where exists (
          select 1
          from public.celeb_timeline_events as timeline
          where timeline.celeb_id = celeb.id
        )
      )::bigint as with_timeline
    from public.celebs as celeb
  ),
  queue_counts as (
    select coalesce(
      jsonb_object_agg(grouped.status, grouped.job_count order by grouped.status),
      '{}'::jsonb
    ) as counts
    from (
      select queue.status, count(*)::bigint as job_count
      from public.celeb_task_queue as queue
      where queue.task_type = 'timeline_backfill_v1'
      group by queue.status
    ) as grouped
  ),
  run_counts as (
    select
      count(*)::bigint as total_runs,
      count(distinct run.celeb_id)::bigint as researched_celebs,
      coalesce(sum(run.event_count), 0)::bigint as recorded_events
    from public.celeb_timeline_research_runs as run
    where run.pipeline = 'timeline_backfill_v1'
      and run.superseded_by_run_id is null
      and run.superseded_at is null
  )
  select jsonb_build_object(
    'taskType', 'timeline_backfill_v1',
    'celebs', jsonb_build_object(
      'total', celeb_counts.total,
      'withTimeline', celeb_counts.with_timeline,
      'missingTimeline', celeb_counts.total - celeb_counts.with_timeline
    ),
    'queue', queue_counts.counts,
    'researchRuns', jsonb_build_object(
      'total', run_counts.total_runs,
      'celebs', run_counts.researched_celebs,
      'recordedEvents', run_counts.recorded_events
    )
  )
  from celeb_counts
  cross join queue_counts
  cross join run_counts
$$;

revoke all on function public.get_celeb_timeline_backfill_status()
from public, anon, authenticated, service_role;
grant execute on function public.get_celeb_timeline_backfill_status()
to service_role;

do $$
declare
  v_rpc constant text := 'public.correct_celeb_timeline_backfill(uuid,uuid,text,jsonb,text,jsonb,text)';
begin
  if to_regprocedure(v_rpc) is null then
    raise exception 'timeline correction RPC is missing';
  end if;
  if has_function_privilege('anon', v_rpc, 'EXECUTE')
    or has_function_privilege('authenticated', v_rpc, 'EXECUTE')
    or not has_function_privilege('service_role', v_rpc, 'EXECUTE')
  then
    raise exception 'timeline correction RPC grants are not service-role-only';
  end if;
  if not has_table_privilege(
      'service_role',
      'public.celeb_timeline_research_runs',
      'SELECT'
    )
    or has_table_privilege(
      'service_role',
      'public.celeb_timeline_research_runs',
      'INSERT,UPDATE,DELETE'
    )
  then
    raise exception 'timeline research ledger service_role grant must be SELECT only';
  end if;
  if has_table_privilege(
      'anon',
      'public.celeb_timeline_research_runs',
      'SELECT,INSERT,UPDATE,DELETE'
    )
    or has_table_privilege(
      'authenticated',
      'public.celeb_timeline_research_runs',
      'SELECT,INSERT,UPDATE,DELETE'
    )
  then
    raise exception 'timeline research ledger is exposed outside service_role readback';
  end if;
  if exists (
    select 1
    from pg_class as relation
    cross join lateral aclexplode(
      coalesce(relation.relacl, acldefault('r', relation.relowner))
    ) as privilege_row
    where relation.oid = 'public.celeb_timeline_research_runs'::regclass
      and privilege_row.grantee = 0
      and privilege_row.privilege_type in ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
  ) then
    raise exception 'timeline research ledger has PUBLIC table privileges';
  end if;
  if not exists (
    select 1
    from pg_index as index_row
    join pg_class as relation on relation.oid = index_row.indexrelid
    where relation.relname = 'celeb_timeline_research_runs_active_complete_idx'
      and index_row.indisunique
  ) then
    raise exception 'active complete timeline run unique index is missing';
  end if;
end;
$$;

notify pgrst, 'reload schema';

commit;
