begin;

-- Timeline research is written directly to the database.  The queue is shared
-- with other celeb jobs, so every mutation below is scoped to this task type.
-- The full research document is retained here because celeb_timeline_events can
-- represent only one source URL per event.
create table public.celeb_timeline_research_runs (
  id uuid primary key default gen_random_uuid(),
  celeb_id uuid not null,
  pipeline text not null default 'timeline_backfill_v1',
  run_origin text not null default 'direct_pipeline',
  research_status text not null,
  timeline_mode text not null,
  research_fingerprint text not null,
  source_snapshot_id text,
  claim_token uuid,
  claimed_by text,
  attempt_count integer,
  profile_snapshot jsonb not null,
  sources jsonb not null default '[]'::jsonb,
  event_evidence jsonb not null default '[]'::jsonb,
  profile_conflicts jsonb not null default '[]'::jsonb,
  blocking_issues jsonb not null default '[]'::jsonb,
  research_payload jsonb not null,
  timeline_event_ids uuid[] not null default '{}'::uuid[],
  event_count integer not null default 0,
  started_at timestamptz,
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint celeb_timeline_research_runs_celeb_id_fkey
    foreign key (celeb_id) references public.celebs(id) on delete cascade,
  constraint celeb_timeline_research_runs_pipeline_check
    check (pipeline = 'timeline_backfill_v1'),
  constraint celeb_timeline_research_runs_origin_check
    check (run_origin in ('direct_pipeline', 'legacy_json_import')),
  constraint celeb_timeline_research_runs_status_check
    check (research_status in ('complete', 'blocked', 'failed', 'skipped')),
  constraint celeb_timeline_research_runs_mode_check
    check (timeline_mode in ('life', 'fiction')),
  constraint celeb_timeline_research_runs_fingerprint_check
    check (research_fingerprint ~ '^[0-9a-f]{64}$'),
  constraint celeb_timeline_research_runs_attempt_check
    check (attempt_count is null or attempt_count >= 0),
  constraint celeb_timeline_research_runs_event_count_check
    check (event_count >= 0 and event_count = cardinality(timeline_event_ids)),
  constraint celeb_timeline_research_runs_profile_snapshot_check
    check (jsonb_typeof(profile_snapshot) = 'object'),
  constraint celeb_timeline_research_runs_sources_check
    check (jsonb_typeof(sources) = 'array'),
  constraint celeb_timeline_research_runs_event_evidence_check
    check (jsonb_typeof(event_evidence) = 'array'),
  constraint celeb_timeline_research_runs_profile_conflicts_check
    check (jsonb_typeof(profile_conflicts) = 'array'),
  constraint celeb_timeline_research_runs_blocking_issues_check
    check (jsonb_typeof(blocking_issues) = 'array'),
  constraint celeb_timeline_research_runs_payload_check
    check (jsonb_typeof(research_payload) = 'object'),
  constraint celeb_timeline_research_runs_celeb_fingerprint_key
    unique (celeb_id, research_fingerprint)
);

create index celeb_timeline_research_runs_celeb_completed_idx
  on public.celeb_timeline_research_runs (celeb_id, completed_at desc);

comment on table public.celeb_timeline_research_runs is
  'Append-only API audit record for timeline_backfill_v1. Full sources, evidence links, conflicts, blocking issues, and the canonical research payload are retained here.';
comment on column public.celeb_timeline_research_runs.event_evidence is
  'Payload event order as [{"eventIndex":0,"evidenceRefs":["S1"]}, ...].';
comment on column public.celeb_timeline_research_runs.research_fingerprint is
  'Lowercase SHA-256 of the caller canonical research_payload JSON.';

alter table public.celeb_timeline_research_runs enable row level security;
alter table public.celeb_timeline_research_runs force row level security;

-- No anon/authenticated policy exists.  service_role bypasses RLS and receives
-- only the table operations needed by the direct pipeline and one-time legacy
-- evidence import.  UPDATE/DELETE remain unavailable through the Data API.
revoke all on table public.celeb_timeline_research_runs
  from public, anon, authenticated, service_role;
grant select, insert on table public.celeb_timeline_research_runs
  to service_role;

create or replace function private.timeline_backfill_profile_snapshot(
  p_celeb_id uuid
)
returns jsonb
language sql
stable
security invoker
set search_path = pg_catalog
as $$
  select jsonb_build_object(
    'id', celeb.id,
    'slug', celeb.slug,
    'nickname', celeb.nickname,
    'nicknameEn', celeb.nickname_en,
    'title', celeb.title,
    'titleEn', celeb.title_en,
    'profession', celeb.profession,
    'nationality', celeb.nationality,
    'gender', celeb.gender,
    'birthDate', nullif(btrim(celeb.birth_date), ''),
    'deathDate', nullif(btrim(celeb.death_date), ''),
    'celebTier', celeb.celeb_tier,
    'publicationStatus', celeb.publication_status,
    'wikidataQid', celeb.wikidata_qid
  )
  from public.celebs as celeb
  where celeb.id = p_celeb_id
$$;

revoke all on function private.timeline_backfill_profile_snapshot(uuid)
  from public, anon, authenticated, service_role;

create or replace function private.timeline_backfill_validate_sources(
  p_sources jsonb
)
returns void
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  if jsonb_typeof(p_sources) is distinct from 'array'
    or jsonb_array_length(p_sources) = 0
  then
    raise exception 'sources must be a non-empty JSON array';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_sources) as source_item(value)
    where jsonb_typeof(source_item.value) is distinct from 'object'
      or exists (
        select 1
        from jsonb_object_keys(
          case when jsonb_typeof(source_item.value) = 'object'
            then source_item.value
            else '{}'::jsonb
          end
        ) as source_key(value)
        where source_key.value not in ('id', 'url', 'title', 'publisher', 'accessedAt')
      )
      or jsonb_typeof(source_item.value -> 'id') is distinct from 'string'
      or nullif(btrim(source_item.value ->> 'id'), '') is null
      or jsonb_typeof(source_item.value -> 'url') is distinct from 'string'
      or nullif(btrim(source_item.value ->> 'url'), '') is null
      or btrim(source_item.value ->> 'url') !~* '^https?://[^[:space:]]+$'
      or jsonb_typeof(source_item.value -> 'title') is distinct from 'string'
      or nullif(btrim(source_item.value ->> 'title'), '') is null
      or (
        source_item.value ? 'publisher'
        and source_item.value -> 'publisher' <> 'null'::jsonb
        and (
          jsonb_typeof(source_item.value -> 'publisher') is distinct from 'string'
          or nullif(btrim(source_item.value ->> 'publisher'), '') is null
        )
      )
      or (
        source_item.value ? 'accessedAt'
        and source_item.value -> 'accessedAt' <> 'null'::jsonb
        and (
          jsonb_typeof(source_item.value -> 'accessedAt') is distinct from 'string'
          or coalesce(source_item.value ->> 'accessedAt', '') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
        )
      )
  ) then
    raise exception 'every source requires id, title, http(s) url, and valid optional metadata';
  end if;

  if (
    select count(*)
    from jsonb_array_elements(p_sources)
  ) <> (
    select count(distinct btrim(source_item.value ->> 'id'))
    from jsonb_array_elements(p_sources) as source_item(value)
  ) then
    raise exception 'source ids must be unique';
  end if;
end;
$$;

create or replace function private.timeline_backfill_validate_evidence_refs(
  p_refs jsonb,
  p_sources jsonb,
  p_context text
)
returns void
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  if jsonb_typeof(p_refs) is distinct from 'array'
    or jsonb_array_length(p_refs) = 0
  then
    raise exception '% requires a non-empty evidenceRefs array', p_context;
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_refs) as evidence_ref(value)
    where jsonb_typeof(evidence_ref.value) is distinct from 'string'
      or nullif(btrim(evidence_ref.value #>> '{}'), '') is null
  ) then
    raise exception '% evidenceRefs must contain non-empty source ids', p_context;
  end if;

  if (
    select count(*) from jsonb_array_elements(p_refs)
  ) <> (
    select count(distinct btrim(evidence_ref.value #>> '{}'))
    from jsonb_array_elements(p_refs) as evidence_ref(value)
  ) then
    raise exception '% evidenceRefs must be unique', p_context;
  end if;

  if exists (
    select 1
    from jsonb_array_elements_text(p_refs) as evidence_ref(value)
    where not exists (
      select 1
      from jsonb_array_elements(p_sources) as source_item(value)
      where btrim(source_item.value ->> 'id') = btrim(evidence_ref.value)
    )
  ) then
    raise exception '% evidenceRefs must resolve to sources', p_context;
  end if;
end;
$$;

create or replace function private.timeline_backfill_validate_profile_conflicts(
  p_conflicts jsonb,
  p_profile_snapshot jsonb,
  p_sources jsonb
)
returns text[]
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  v_conflicts jsonb := case
    when p_conflicts is null or p_conflicts = 'null'::jsonb then '[]'::jsonb
    else p_conflicts
  end;
  v_conflict jsonb;
  v_field text;
  v_snapshot_key text;
  v_manifest_value jsonb;
  v_snapshot_value jsonb;
  v_fields text[] := '{}'::text[];
begin
  if jsonb_typeof(v_conflicts) is distinct from 'array' then
    raise exception 'profileConflicts must be a JSON array or null';
  end if;

  for v_conflict in
    select conflict_item.value
    from jsonb_array_elements(v_conflicts) as conflict_item(value)
  loop
    if jsonb_typeof(v_conflict) is distinct from 'object' then
      raise exception 'every profileConflict must be an object';
    end if;

    v_field := nullif(btrim(v_conflict ->> 'field'), '');
    if v_field is null or v_field not in (
      'nickname', 'nicknameEn', 'celebTier', 'publicationStatus',
      'birthDate', 'deathDate', 'profession', 'nationality', 'wikidataQid'
    ) then
      raise exception 'unsupported profileConflict field: %', v_field;
    end if;
    if exists (
      select 1
      from jsonb_object_keys(v_conflict) as conflict_key(value)
      where conflict_key.value not in (
        'field', 'manifestValue', 'evidenceValue', 'message', 'messageEn', 'evidenceRefs'
      )
    ) then
      raise exception 'profileConflict % contains unsupported keys', v_field;
    end if;
    if v_field = any(v_fields) then
      raise exception 'duplicate profileConflict field: %', v_field;
    end if;

    if not (v_conflict ? 'manifestValue') then
      raise exception 'profileConflict %.manifestValue is required', v_field;
    end if;
    if not (v_conflict ? 'evidenceValue')
      or jsonb_typeof(v_conflict -> 'evidenceValue') is distinct from 'string'
      or nullif(btrim(v_conflict ->> 'evidenceValue'), '') is null
    then
      raise exception 'profileConflict %.evidenceValue is required', v_field;
    end if;
    if v_field = 'wikidataQid'
      and btrim(v_conflict ->> 'evidenceValue') !~ '^Q[0-9]+$'
    then
      raise exception 'profileConflict wikidataQid evidenceValue must be a QID';
    end if;
    if v_conflict -> 'evidenceValue' = v_conflict -> 'manifestValue' then
      raise exception 'profileConflict % evidenceValue must differ from manifestValue', v_field;
    end if;
    if jsonb_typeof(v_conflict -> 'message') is distinct from 'string'
      or jsonb_typeof(v_conflict -> 'messageEn') is distinct from 'string'
      or char_length(btrim(coalesce(v_conflict ->> 'message', ''))) < 20
      or char_length(btrim(coalesce(v_conflict ->> 'messageEn', ''))) < 20
    then
      raise exception 'profileConflict % requires message and messageEn', v_field;
    end if;

    v_snapshot_key := v_field;
    v_manifest_value := v_conflict -> 'manifestValue';
    v_snapshot_value := p_profile_snapshot -> v_snapshot_key;

    if v_manifest_value is distinct from v_snapshot_value then
      raise exception 'profileConflict % manifestValue does not match claimed snapshot', v_field;
    end if;

    perform private.timeline_backfill_validate_evidence_refs(
      v_conflict -> 'evidenceRefs',
      p_sources,
      'profileConflict ' || v_field
    );
    v_fields := array_append(v_fields, v_field);
  end loop;

  return v_fields;
end;
$$;

create or replace function private.timeline_backfill_validate_blocking_issues(
  p_blocking_issues jsonb,
  p_sources jsonb
)
returns void
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  v_issue jsonb;
  v_resolution jsonb;
  v_index integer := 0;
begin
  if jsonb_typeof(p_blocking_issues) is distinct from 'array'
    or jsonb_array_length(p_blocking_issues) = 0
  then
    raise exception 'blocked research requires a non-empty blockingIssues array';
  end if;

  for v_issue in
    select issue_item.value
    from jsonb_array_elements(p_blocking_issues) as issue_item(value)
  loop
    if jsonb_typeof(v_issue) is distinct from 'object'
      or exists (
        select 1
        from jsonb_object_keys(v_issue) as issue_key(value)
        where issue_key.value not in ('code', 'message', 'messageEn', 'evidenceRefs', 'resolution')
      )
      or jsonb_typeof(v_issue -> 'code') is distinct from 'string'
      or nullif(btrim(v_issue ->> 'code'), '') is null
      or jsonb_typeof(v_issue -> 'message') is distinct from 'string'
      or jsonb_typeof(v_issue -> 'messageEn') is distinct from 'string'
      or char_length(btrim(coalesce(v_issue ->> 'message', ''))) < 20
      or char_length(btrim(coalesce(v_issue ->> 'messageEn', ''))) < 20
    then
      raise exception 'every blockingIssue requires code, message, and messageEn';
    end if;
    perform private.timeline_backfill_validate_evidence_refs(
      v_issue -> 'evidenceRefs',
      p_sources,
      'blockingIssues[' || v_index || ']'
    );

    if v_issue ? 'resolution' then
      v_resolution := v_issue -> 'resolution';
      if jsonb_typeof(v_resolution) is distinct from 'object' then
        raise exception 'blockingIssues[%].resolution must be an object', v_index;
      end if;
      if (
        select count(*)
        from jsonb_object_keys(v_resolution)
      ) <> 9
        or exists (
          select 1
          from jsonb_object_keys(v_resolution) as resolution_key(value)
          where resolution_key.value not in (
            'status', 'action', 'proposedValue', 'precision', 'rationale',
            'rationaleEn', 'evidenceUrls', 'confidence', 'resolvedAt'
          )
        )
      then
        raise exception 'blockingIssues[%].resolution must contain the exact nine-key contract', v_index;
      end if;
      if v_resolution ->> 'status' is distinct from 'resolved'
        or v_resolution ->> 'action' is distinct from 'QUARANTINE_PROFILE'
        or v_resolution ->> 'proposedValue' is distinct from 'quarantined'
        or v_resolution ->> 'precision' is distinct from 'not-applicable'
        or v_resolution ->> 'confidence' is distinct from 'high'
        or char_length(btrim(coalesce(v_resolution ->> 'rationale', ''))) < 20
        or char_length(btrim(coalesce(v_resolution ->> 'rationaleEn', ''))) < 20
        or coalesce(v_resolution ->> 'resolvedAt', '')
          !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}([.][0-9]+)?(Z|[+-][0-9]{2}:[0-9]{2})$'
      then
        raise exception 'blockingIssues[%].resolution contains invalid fixed values or rationale/time', v_index;
      end if;
      if jsonb_typeof(v_resolution -> 'evidenceUrls') is distinct from 'array'
        or jsonb_array_length(v_resolution -> 'evidenceUrls') = 0
        or exists (
          select 1
          from jsonb_array_elements(v_resolution -> 'evidenceUrls') as evidence_url(value)
          where jsonb_typeof(evidence_url.value) is distinct from 'string'
            or btrim(evidence_url.value #>> '{}') !~* '^https?://[^[:space:]]+$'
        )
        or (
          select count(*) from jsonb_array_elements(v_resolution -> 'evidenceUrls')
        ) <> (
          select count(distinct btrim(evidence_url.value #>> '{}'))
          from jsonb_array_elements(v_resolution -> 'evidenceUrls') as evidence_url(value)
        )
      then
        raise exception 'blockingIssues[%].resolution evidenceUrls must be non-empty unique http(s) URLs', v_index;
      end if;
    end if;
    v_index := v_index + 1;
  end loop;
end;
$$;

create or replace function private.timeline_backfill_exact_profile_date(
  p_value text
)
returns jsonb
language plpgsql
immutable
security invoker
set search_path = pg_catalog
as $$
declare
  v_value text := nullif(btrim(p_value), '');
  v_match text[];
  v_year integer;
  v_month integer;
  v_day integer;
begin
  if v_value is null then
    return null;
  end if;
  v_match := regexp_match(
    v_value,
    '^(-?[0-9]{1,6})(-([0-9]{2})(-([0-9]{2}))?)?$'
  );
  if v_match is null then
    return null;
  end if;
  v_year := v_match[1]::integer;
  v_month := case when v_match[3] is null then null else v_match[3]::integer end;
  v_day := case when v_match[5] is null then null else v_match[5]::integer end;
  if (v_month is not null and v_month not between 1 and 12)
    or (v_day is not null and v_day not between 1 and 31)
  then
    return null;
  end if;
  return jsonb_build_object('year', v_year, 'month', v_month, 'day', v_day);
end;
$$;

revoke all on function
  private.timeline_backfill_validate_sources(jsonb),
  private.timeline_backfill_validate_evidence_refs(jsonb, jsonb, text),
  private.timeline_backfill_validate_profile_conflicts(jsonb, jsonb, jsonb),
  private.timeline_backfill_validate_blocking_issues(jsonb, jsonb),
  private.timeline_backfill_exact_profile_date(text)
from public, anon, authenticated, service_role;

create or replace function public.enqueue_missing_celeb_timeline_backfill_jobs()
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_eligible bigint;
  v_changed integer;
  v_active_lease_preserved bigint;
begin
  select count(*)
  into v_eligible
  from public.celebs as celeb
  where not exists (
    select 1
    from public.celeb_timeline_events as timeline
    where timeline.celeb_id = celeb.id
  );

  -- A losslessly recorded blocked/skipped research run is terminal.  This also
  -- reconciles a pending row created before the one-time legacy ledger import.
  -- Only the explicit requeue RPC may reopen such a celeb.
  update public.celeb_task_queue as queue
  set status = 'skipped',
      claimed_by = null,
      claimed_at = null,
      lease_expires_at = null,
      completed_at = coalesce(queue.completed_at, now()),
      last_error = coalesce(queue.last_error, 'terminal research run already recorded'),
      payload = (coalesce(queue.payload, '{}'::jsonb) - 'claimToken')
        || jsonb_build_object('terminalRunPreservedAt', now()),
      updated_at = now()
  where queue.task_type = 'timeline_backfill_v1'
    and coalesce(queue.payload ->> 'explicitRequeue', 'false') <> 'true'
    and (
      queue.status in ('pending', 'failed')
      or (
        queue.status = 'in_progress'
        and (queue.lease_expires_at is null or queue.lease_expires_at < now())
      )
    )
    and not exists (
      select 1
      from public.celeb_timeline_events as timeline
      where timeline.celeb_id = queue.celeb_id
    )
    and exists (
      select 1
      from public.celeb_timeline_research_runs as run
      where run.celeb_id = queue.celeb_id
        and run.pipeline = 'timeline_backfill_v1'
        and run.research_status in ('blocked', 'skipped')
        and run.event_count = 0
    );

  insert into public.celeb_task_queue (
    task_type,
    celeb_id,
    status,
    priority,
    payload,
    claimed_by,
    claimed_at,
    lease_expires_at,
    completed_at,
    last_error,
    updated_at
  )
  select
    'timeline_backfill_v1',
    celeb.id,
    'pending',
    0,
    jsonb_build_object(
      'schemaVersion', 1,
      'timelineMode', case when celeb.celeb_tier = 'fiction' then 'fiction' else 'life' end,
      'profileSnapshot', private.timeline_backfill_profile_snapshot(celeb.id),
      'enqueuedAt', now()
    ),
    null,
    null,
    null,
    null,
    null,
    now()
  from public.celebs as celeb
  where not exists (
    select 1
    from public.celeb_timeline_events as timeline
    where timeline.celeb_id = celeb.id
  )
    and (
      not exists (
        select 1
        from public.celeb_timeline_research_runs as run
        where run.celeb_id = celeb.id
          and run.pipeline = 'timeline_backfill_v1'
          and run.research_status in ('blocked', 'skipped')
          and run.event_count = 0
      )
      or exists (
        select 1
        from public.celeb_task_queue as existing_queue
        where existing_queue.task_type = 'timeline_backfill_v1'
          and existing_queue.celeb_id = celeb.id
          and existing_queue.payload ->> 'explicitRequeue' = 'true'
      )
    )
  on conflict (task_type, celeb_id) do update
  set status = 'pending',
      priority = excluded.priority,
      payload = case
        when public.celeb_task_queue.payload ->> 'explicitRequeue' = 'true'
          then excluded.payload || jsonb_build_object('explicitRequeue', true)
        else excluded.payload
      end,
      claimed_by = null,
      claimed_at = null,
      lease_expires_at = null,
      completed_at = null,
      last_error = null,
      updated_at = now()
  where public.celeb_task_queue.status = 'pending'
    or (
      public.celeb_task_queue.status = 'in_progress'
      and (
        public.celeb_task_queue.lease_expires_at is null
        or public.celeb_task_queue.lease_expires_at < now()
      )
    );

  get diagnostics v_changed = row_count;

  select count(*)::bigint
  into v_active_lease_preserved
  from public.celeb_task_queue as queue
  where queue.task_type = 'timeline_backfill_v1'
    and queue.status = 'in_progress'
    and queue.lease_expires_at is not null
    and queue.lease_expires_at >= now()
    and not exists (
      select 1
      from public.celeb_timeline_events as timeline
      where timeline.celeb_id = queue.celeb_id
    );

  return jsonb_build_object(
    'taskType', 'timeline_backfill_v1',
    'eligible', v_eligible,
    'insertedOrRequeued', v_changed,
    'activeLeasePreserved', v_active_lease_preserved,
    'terminalPreserved', v_eligible - v_changed - v_active_lease_preserved
  );
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
  ) then
    raise exception 'life events require valid dates and cannot use narrative labels';
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

create or replace function public.claim_next_celeb_timeline_backfill(
  p_worker text,
  p_lease_minutes integer default 60
)
returns table (
  celeb_id uuid,
  slug text,
  nickname text,
  nickname_en text,
  title text,
  title_en text,
  profession text,
  nationality text,
  gender boolean,
  birth_date text,
  death_date text,
  celeb_tier text,
  wikidata_qid text,
  timeline_mode text,
  priority integer,
  attempt_count integer,
  claim_token uuid,
  profile_snapshot jsonb,
  claimed_at timestamptz,
  lease_expires_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_worker text := btrim(coalesce(p_worker, ''));
  v_lease_minutes integer := greatest(1, least(coalesce(p_lease_minutes, 60), 1440));
begin
  if v_worker = '' then
    raise exception 'p_worker is required';
  end if;

  return query
  with candidate as (
    select queue.task_type, queue.celeb_id
    from public.celeb_task_queue as queue
    join public.celebs as celeb on celeb.id = queue.celeb_id
    where queue.task_type = 'timeline_backfill_v1'
      and (
        queue.status = 'pending'
        or (
        queue.status = 'in_progress'
          and (
            queue.lease_expires_at is null
            or queue.lease_expires_at < now()
          )
        )
      )
      and not exists (
        select 1
        from public.celeb_timeline_events as timeline
        where timeline.celeb_id = queue.celeb_id
      )
      and (
        queue.payload ->> 'explicitRequeue' = 'true'
        or not exists (
          select 1
          from public.celeb_timeline_research_runs as run
          where run.celeb_id = queue.celeb_id
            and run.pipeline = 'timeline_backfill_v1'
            and run.research_status in ('blocked', 'skipped')
            and run.event_count = 0
        )
      )
    order by queue.priority desc, queue.created_at, queue.celeb_id
    limit 1
    for update of queue skip locked
  ),
  claimed as (
    update public.celeb_task_queue as queue
    set status = 'in_progress',
        claimed_by = v_worker,
        claimed_at = now(),
        lease_expires_at = now() + make_interval(mins => v_lease_minutes),
        attempt_count = queue.attempt_count + 1,
        last_error = null,
        completed_at = null,
        payload = (coalesce(queue.payload, '{}'::jsonb)
          - 'claimToken'
          - 'profileSnapshot')
          || jsonb_build_object(
            'schemaVersion', 1,
            'claimToken', gen_random_uuid(),
            'timelineMode', case when celeb.celeb_tier = 'fiction' then 'fiction' else 'life' end,
            'profileSnapshot', private.timeline_backfill_profile_snapshot(celeb.id)
          ),
        updated_at = now()
    from candidate
    join public.celebs as celeb on celeb.id = candidate.celeb_id
    where queue.task_type = candidate.task_type
      and queue.celeb_id = candidate.celeb_id
    returning queue.celeb_id, queue.priority, queue.attempt_count,
      queue.payload, queue.claimed_at, queue.lease_expires_at
  )
  select
    celeb.id,
    celeb.slug,
    celeb.nickname,
    celeb.nickname_en,
    celeb.title,
    celeb.title_en,
    celeb.profession,
    celeb.nationality,
    celeb.gender,
    celeb.birth_date,
    celeb.death_date,
    celeb.celeb_tier,
    celeb.wikidata_qid,
    claimed.payload ->> 'timelineMode',
    claimed.priority,
    claimed.attempt_count,
    (claimed.payload ->> 'claimToken')::uuid,
    claimed.payload -> 'profileSnapshot',
    claimed.claimed_at,
    claimed.lease_expires_at
  from claimed
  join public.celebs as celeb on celeb.id = claimed.celeb_id;
end;
$$;

create or replace function public.renew_celeb_timeline_backfill_lease(
  p_celeb_id uuid,
  p_worker text,
  p_claim_token uuid,
  p_lease_minutes integer default 60
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_worker text := btrim(coalesce(p_worker, ''));
  v_lease_minutes integer := greatest(1, least(coalesce(p_lease_minutes, 60), 1440));
  v_lease_expires_at timestamptz;
begin
  if p_celeb_id is null or p_claim_token is null or v_worker = '' then
    raise exception 'p_celeb_id, p_worker, and p_claim_token are required';
  end if;

  update public.celeb_task_queue as queue
  set lease_expires_at = now() + make_interval(mins => v_lease_minutes),
      updated_at = now()
  where queue.task_type = 'timeline_backfill_v1'
    and queue.celeb_id = p_celeb_id
    and queue.status = 'in_progress'
    and queue.claimed_by = v_worker
    and queue.lease_expires_at is not null
    and queue.lease_expires_at >= now()
    and queue.payload ->> 'claimToken' = p_claim_token::text
  returning queue.lease_expires_at into v_lease_expires_at;

  if v_lease_expires_at is null then
    raise exception 'active timeline claim not owned or lease expired: celeb_id=%', p_celeb_id;
  end if;

  return jsonb_build_object(
    'status', 'in_progress',
    'celebId', p_celeb_id,
    'claimToken', p_claim_token,
    'leaseExpiresAt', v_lease_expires_at
  );
end;
$$;

create or replace function public.fail_celeb_timeline_backfill(
  p_celeb_id uuid,
  p_worker text,
  p_claim_token uuid,
  p_error text,
  p_skip boolean default false,
  p_profile_snapshot jsonb default null,
  p_research_fingerprint text default null,
  p_research_payload jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_worker text := btrim(coalesce(p_worker, ''));
  v_error text := btrim(coalesce(p_error, ''));
  v_skip boolean := coalesce(p_skip, false);
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
  v_has_quarantine_resolution boolean;
  v_run_id uuid;
  v_rows integer;
begin
  if p_celeb_id is null or p_claim_token is null or v_worker = '' then
    raise exception 'p_celeb_id, p_worker, and p_claim_token are required';
  end if;
  if v_error = '' then
    raise exception 'p_error is required';
  end if;

  if not v_skip then
    if p_profile_snapshot is not null
      or p_research_fingerprint is not null
      or p_research_payload is not null
    then
      raise exception 'retry failure must not include skip ledger arguments';
    end if;
    if exists (
      select 1
      from public.celeb_timeline_events as timeline
      where timeline.celeb_id = p_celeb_id
    ) then
      raise exception 'cannot retry a celeb that now has timeline events: celeb_id=%', p_celeb_id;
    end if;

    update public.celeb_task_queue as queue
    set status = 'pending',
        lease_expires_at = null,
        completed_at = null,
        last_error = v_error,
        claimed_by = null,
        claimed_at = null,
        payload = (coalesce(queue.payload, '{}'::jsonb) - 'claimToken')
          || jsonb_build_object(
            'lastFailureAt', now(),
            'lastFailureWorker', v_worker,
            'lastFailureSkipped', false
          ),
        updated_at = now()
    where queue.task_type = 'timeline_backfill_v1'
      and queue.celeb_id = p_celeb_id
      and queue.status = 'in_progress'
      and queue.claimed_by = v_worker
      and queue.lease_expires_at is not null
      and queue.lease_expires_at >= now()
      and queue.payload ->> 'claimToken' = p_claim_token::text;

    get diagnostics v_rows = row_count;
    if v_rows <> 1 then
      raise exception 'active timeline claim not owned or lease expired: celeb_id=%', p_celeb_id;
    end if;

    return jsonb_build_object(
      'status', 'pending',
      'celebId', p_celeb_id,
      'claimToken', p_claim_token,
      'error', v_error
    );
  end if;

  if jsonb_typeof(p_profile_snapshot) is distinct from 'object' then
    raise exception 'skip requires p_profile_snapshot JSON object';
  end if;
  if v_fingerprint !~ '^[0-9a-f]{64}$' then
    raise exception 'skip requires lowercase SHA-256 p_research_fingerprint';
  end if;
  if jsonb_typeof(p_research_payload) is distinct from 'object' then
    raise exception 'skip requires p_research_payload JSON object';
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
    raise exception 'blocked research payload contains unsupported top-level keys';
  end if;

  -- A post-commit network retry is accepted only when the immutable ledger and
  -- terminal queue pointer are still exact.  A same-hash/different-payload
  -- collision or token mismatch is rejected.
  select run.*
  into v_existing_run
  from public.celeb_timeline_research_runs as run
  where run.celeb_id = p_celeb_id
    and run.research_fingerprint = v_fingerprint;

  if found then
    if v_existing_run.run_origin <> 'direct_pipeline'
      or v_existing_run.research_status <> 'blocked'
      or v_existing_run.claim_token is distinct from p_claim_token
      or v_existing_run.claimed_by is distinct from v_worker
      or v_existing_run.profile_snapshot is distinct from p_profile_snapshot
      or v_existing_run.research_payload is distinct from p_research_payload
      or v_existing_run.event_count <> 0
      or cardinality(v_existing_run.timeline_event_ids) <> 0
    then
      raise exception 'blocked research fingerprint collision or claim mismatch: celeb_id=% fingerprint=%',
        p_celeb_id, v_fingerprint;
    end if;
    if exists (
      select 1
      from public.celeb_timeline_events as timeline
      where timeline.celeb_id = p_celeb_id
    ) then
      raise exception 'already-skipped timeline is no longer empty: celeb_id=%', p_celeb_id;
    end if;

    select queue.*
    into v_queue
    from public.celeb_task_queue as queue
    where queue.task_type = 'timeline_backfill_v1'
      and queue.celeb_id = p_celeb_id;

    if not found
      or v_queue.status <> 'skipped'
      or v_queue.payload ->> 'lastRunId' is distinct from v_existing_run.id::text
      or v_queue.payload ->> 'lastResearchFingerprint' is distinct from v_fingerprint
      or v_queue.payload ->> 'lastEventCount' is distinct from '0'
    then
      raise exception 'idempotent blocked queue readback mismatch: celeb_id=% run_id=%',
        p_celeb_id, v_existing_run.id;
    end if;

    return jsonb_build_object(
      'status', 'already_skipped',
      'celebId', p_celeb_id,
      'runId', v_existing_run.id,
      'eventCount', 0,
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
    raise exception 'cannot skip a celeb that now has timeline events: celeb_id=%', p_celeb_id;
  end if;

  if p_research_payload ->> 'celebId' is distinct from p_celeb_id::text then
    raise exception 'blocked research payload celebId mismatch: celeb_id=%', p_celeb_id;
  end if;
  if p_research_payload -> 'profileSnapshot' is distinct from p_profile_snapshot then
    raise exception 'blocked research payload profileSnapshot mismatch: celeb_id=%', p_celeb_id;
  end if;
  if p_research_payload ->> 'researchStatus' is distinct from 'blocked' then
    raise exception 'skip researchStatus must be blocked';
  end if;
  if p_research_payload ? 'applicationStatus'
    and p_research_payload ->> 'applicationStatus' is distinct from 'quarantined'
  then
    raise exception 'blocked applicationStatus, when present, must be quarantined';
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
  if jsonb_typeof(v_events) is distinct from 'array'
    or jsonb_array_length(v_events) <> 0
  then
    raise exception 'blocked research events must be an empty JSON array';
  end if;
  v_profile_conflict_fields := private.timeline_backfill_validate_profile_conflicts(
    v_profile_conflicts,
    p_profile_snapshot,
    v_sources
  );
  perform private.timeline_backfill_validate_blocking_issues(v_blocking_issues, v_sources);
  select exists (
    select 1
    from jsonb_array_elements(v_blocking_issues) as blocking_issue(value)
    where blocking_issue.value ? 'resolution'
  ) into v_has_quarantine_resolution;
  if coalesce(p_research_payload ->> 'applicationStatus' = 'quarantined', false)
    is distinct from v_has_quarantine_resolution
  then
    raise exception 'applicationStatus quarantined and QUARANTINE_PROFILE resolution must appear together';
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
    'blocked',
    v_mode,
    v_fingerprint,
    nullif(btrim(p_research_payload ->> 'sourceSnapshotId'), ''),
    p_claim_token,
    v_worker,
    v_queue.attempt_count,
    p_profile_snapshot,
    v_sources,
    '[]'::jsonb,
    v_profile_conflicts,
    v_blocking_issues,
    p_research_payload,
    '{}'::uuid[],
    0,
    v_queue.claimed_at,
    now()
  )
  returning id into v_run_id;

  update public.celeb_task_queue as queue
  set status = 'skipped',
      lease_expires_at = null,
      completed_at = now(),
      last_error = v_error,
      claimed_by = null,
      claimed_at = null,
      payload = (coalesce(queue.payload, '{}'::jsonb) - 'claimToken' - 'explicitRequeue')
        || jsonb_build_object(
          'lastFailureAt', now(),
          'lastFailureWorker', v_worker,
          'lastFailureSkipped', true,
          'lastRunId', v_run_id,
          'lastResearchFingerprint', v_fingerprint,
          'lastEventCount', 0
        ),
      updated_at = now()
  where queue.task_type = 'timeline_backfill_v1'
    and queue.celeb_id = p_celeb_id
    and queue.status = 'in_progress'
    and queue.claimed_by = v_worker
    and queue.lease_expires_at is not null
    and queue.lease_expires_at >= now()
    and queue.payload ->> 'claimToken' = p_claim_token::text;

  get diagnostics v_rows = row_count;
  if v_rows <> 1 then
    raise exception 'queue skip lost ownership: celeb_id=%', p_celeb_id;
  end if;

  return jsonb_build_object(
    'status', 'skipped',
    'celebId', p_celeb_id,
    'runId', v_run_id,
    'eventCount', 0,
    'researchFingerprint', v_fingerprint
  );
end;
$$;

create or replace function public.requeue_celeb_timeline_backfill(
  p_celeb_id uuid,
  p_reason text default null,
  p_reset_attempts boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_queue public.celeb_task_queue%rowtype;
  v_profile_snapshot jsonb;
  v_attempt_count integer;
begin
  if p_celeb_id is null then
    raise exception 'p_celeb_id is required';
  end if;

  -- Match complete/fail lock order.  The upsert WHERE below remains as a
  -- second race guard for a previously absent queue row.
  select queue.*
  into v_queue
  from public.celeb_task_queue as queue
  where queue.task_type = 'timeline_backfill_v1'
    and queue.celeb_id = p_celeb_id
  for update;

  if found
    and v_queue.status = 'in_progress'
    and v_queue.lease_expires_at is not null
    and v_queue.lease_expires_at >= now()
  then
    raise exception 'cannot requeue an active timeline lease: celeb_id=%', p_celeb_id;
  end if;

  select private.timeline_backfill_profile_snapshot(celeb.id)
  into v_profile_snapshot
  from public.celebs as celeb
  where celeb.id = p_celeb_id
  for update of celeb;

  if not found then
    raise exception 'celeb not found: celeb_id=%', p_celeb_id;
  end if;
  if exists (
    select 1
    from public.celeb_timeline_events as timeline
    where timeline.celeb_id = p_celeb_id
  ) then
    raise exception 'cannot requeue a celeb that has timeline events: celeb_id=%', p_celeb_id;
  end if;

  insert into public.celeb_task_queue (
    task_type,
    celeb_id,
    status,
    priority,
    payload,
    attempt_count,
    claimed_by,
    claimed_at,
    lease_expires_at,
    completed_at,
    last_error,
    updated_at
  ) values (
    'timeline_backfill_v1',
    p_celeb_id,
    'pending',
    0,
    jsonb_build_object(
      'schemaVersion', 1,
      'timelineMode', case
        when (v_profile_snapshot ->> 'celebTier') = 'fiction'
          then 'fiction'
        else 'life'
      end,
      'profileSnapshot', v_profile_snapshot,
      'requeuedAt', now(),
      'requeueReason', v_reason,
      'explicitRequeue', true
    ),
    0,
    null,
    null,
    null,
    null,
    null,
    now()
  )
  on conflict (task_type, celeb_id) do update
  set status = 'pending',
      payload = (coalesce(public.celeb_task_queue.payload, '{}'::jsonb)
        - 'claimToken'
        - 'lastRunId'
        - 'lastResearchFingerprint'
        - 'lastEventCount')
        || jsonb_build_object(
          'schemaVersion', 1,
          'timelineMode', case
            when (v_profile_snapshot ->> 'celebTier') = 'fiction'
              then 'fiction'
            else 'life'
          end,
          'profileSnapshot', v_profile_snapshot,
          'requeuedAt', now(),
          'requeueReason', v_reason,
          'explicitRequeue', true
        ),
      attempt_count = case
        when coalesce(p_reset_attempts, false) then 0
        else public.celeb_task_queue.attempt_count
      end,
      claimed_by = null,
      claimed_at = null,
      lease_expires_at = null,
      completed_at = null,
      last_error = null,
      updated_at = now()
  where not (
    public.celeb_task_queue.status = 'in_progress'
    and public.celeb_task_queue.lease_expires_at is not null
    and public.celeb_task_queue.lease_expires_at >= now()
  )
  returning public.celeb_task_queue.attempt_count into v_attempt_count;

  if not found then
    raise exception 'cannot requeue an active timeline lease: celeb_id=%', p_celeb_id;
  end if;

  return jsonb_build_object(
    'status', 'pending',
    'celebId', p_celeb_id,
    'attemptCount', v_attempt_count,
    'reason', v_reason
  );
end;
$$;

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

revoke all on function
  public.enqueue_missing_celeb_timeline_backfill_jobs(),
  public.claim_next_celeb_timeline_backfill(text, integer),
  public.renew_celeb_timeline_backfill_lease(uuid, text, uuid, integer),
  public.complete_celeb_timeline_backfill(uuid, text, uuid, jsonb, text, jsonb),
  public.fail_celeb_timeline_backfill(uuid, text, uuid, text, boolean, jsonb, text, jsonb),
  public.requeue_celeb_timeline_backfill(uuid, text, boolean),
  public.get_celeb_timeline_backfill_status()
from public, anon, authenticated, service_role;

grant execute on function
  public.enqueue_missing_celeb_timeline_backfill_jobs(),
  public.claim_next_celeb_timeline_backfill(text, integer),
  public.renew_celeb_timeline_backfill_lease(uuid, text, uuid, integer),
  public.complete_celeb_timeline_backfill(uuid, text, uuid, jsonb, text, jsonb),
  public.fail_celeb_timeline_backfill(uuid, text, uuid, text, boolean, jsonb, text, jsonb),
  public.requeue_celeb_timeline_backfill(uuid, text, boolean),
  public.get_celeb_timeline_backfill_status()
to service_role;

-- Migration-time contract checks.  These inspect catalog state only and do not
-- enqueue jobs or write timeline data.
do $$
declare
  v_function text;
begin
  if not exists (
    select 1
    from pg_class as relation
    join pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relname = 'celeb_timeline_research_runs'
      and relation.relrowsecurity
      and relation.relforcerowsecurity
  ) then
    raise exception 'timeline research run RLS contract missing';
  end if;

  if has_table_privilege('anon', 'public.celeb_timeline_research_runs', 'SELECT,INSERT,UPDATE,DELETE')
    or has_table_privilege('authenticated', 'public.celeb_timeline_research_runs', 'SELECT,INSERT,UPDATE,DELETE')
  then
    raise exception 'timeline research runs exposed to anon/authenticated';
  end if;
  if not has_table_privilege('service_role', 'public.celeb_timeline_research_runs', 'SELECT')
    or not has_table_privilege('service_role', 'public.celeb_timeline_research_runs', 'INSERT')
    or has_table_privilege('service_role', 'public.celeb_timeline_research_runs', 'UPDATE')
    or has_table_privilege('service_role', 'public.celeb_timeline_research_runs', 'DELETE')
  then
    raise exception 'timeline research run service_role grants are not exact';
  end if;

  foreach v_function in array array[
    'public.enqueue_missing_celeb_timeline_backfill_jobs()',
    'public.claim_next_celeb_timeline_backfill(text,integer)',
    'public.renew_celeb_timeline_backfill_lease(uuid,text,uuid,integer)',
    'public.complete_celeb_timeline_backfill(uuid,text,uuid,jsonb,text,jsonb)',
    'public.fail_celeb_timeline_backfill(uuid,text,uuid,text,boolean,jsonb,text,jsonb)',
    'public.requeue_celeb_timeline_backfill(uuid,text,boolean)',
    'public.get_celeb_timeline_backfill_status()'
  ] loop
    if to_regprocedure(v_function) is null then
      raise exception 'required timeline RPC missing: %', v_function;
    end if;
    if has_function_privilege('anon', v_function, 'EXECUTE')
      or has_function_privilege('authenticated', v_function, 'EXECUTE')
      or not has_function_privilege('service_role', v_function, 'EXECUTE')
    then
      raise exception 'timeline RPC grants are not service_role-only: %', v_function;
    end if;
  end loop;

  if not exists (
    select 1
    from pg_constraint as constraint_row
    where constraint_row.conrelid = 'public.celeb_task_queue'::regclass
      and constraint_row.contype in ('p', 'u')
      and (
        select array_agg(attribute.attname order by key_column.ordinality)
        from unnest(constraint_row.conkey) with ordinality as key_column(attnum, ordinality)
        join pg_attribute as attribute
          on attribute.attrelid = constraint_row.conrelid
         and attribute.attnum = key_column.attnum
      ) = array['task_type', 'celeb_id']::name[]
  ) then
    raise exception 'celeb_task_queue must uniquely identify (task_type, celeb_id)';
  end if;
end;
$$;

notify pgrst, 'reload schema';

commit;
