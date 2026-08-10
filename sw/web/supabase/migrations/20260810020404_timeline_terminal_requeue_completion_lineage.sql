begin;

-- Explicit requeue deliberately keeps the immutable terminal-run pointer until
-- a replacement completion commits.  The original requeue RPC predates run
-- lineage and removes these three fields; this narrow trigger preserves them
-- without changing the public RPC signature or its response contract.
create or replace function private.timeline_backfill_preserve_requeue_predecessor()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if new.task_type <> 'timeline_backfill_v1'
    or coalesce(new.payload ->> 'explicitRequeue', 'false') <> 'true'
    or tg_op <> 'UPDATE'
  then
    return new;
  end if;

  if not (new.payload ? 'lastRunId') and old.payload ? 'lastRunId' then
    new.payload := jsonb_set(new.payload, '{lastRunId}', old.payload -> 'lastRunId', true);
  end if;
  if not (new.payload ? 'lastResearchFingerprint')
    and old.payload ? 'lastResearchFingerprint'
  then
    new.payload := jsonb_set(
      new.payload,
      '{lastResearchFingerprint}',
      old.payload -> 'lastResearchFingerprint',
      true
    );
  end if;
  if not (new.payload ? 'lastEventCount') and old.payload ? 'lastEventCount' then
    new.payload := jsonb_set(
      new.payload,
      '{lastEventCount}',
      old.payload -> 'lastEventCount',
      true
    );
  end if;

  return new;
end;
$$;

alter function private.timeline_backfill_preserve_requeue_predecessor()
  owner to postgres;
revoke all on function private.timeline_backfill_preserve_requeue_predecessor()
  from public, anon, authenticated, service_role;

create trigger timeline_backfill_preserve_requeue_predecessor
before update on public.celeb_task_queue
for each row
execute function private.timeline_backfill_preserve_requeue_predecessor();

-- Repair explicit requeues that were opened before this migration, when the
-- old RPC had already removed the pointer.  Only one exact active zero-event
-- terminal ledger is eligible; ambiguous history aborts the whole migration.
do $$
begin
  if exists (
    select 1
    from public.celeb_task_queue as queue
    where queue.task_type = 'timeline_backfill_v1'
      and queue.payload ->> 'explicitRequeue' = 'true'
      and not (queue.payload ? 'lastRunId')
      and (
        select count(*)
        from public.celeb_timeline_research_runs as terminal_run
        where terminal_run.celeb_id = queue.celeb_id
          and terminal_run.pipeline = 'timeline_backfill_v1'
          and terminal_run.run_origin = 'direct_pipeline'
          and terminal_run.research_status in ('blocked', 'skipped')
          and terminal_run.event_count = 0
          and cardinality(terminal_run.timeline_event_ids) = 0
          and terminal_run.superseded_by_run_id is null
          and terminal_run.superseded_at is null
          and terminal_run.supersession_reason is null
      ) > 1
  ) then
    raise exception 'ambiguous terminal lineage exists for an explicit timeline requeue';
  end if;

  update public.celeb_task_queue as queue
  set payload = queue.payload || jsonb_build_object(
        'lastRunId', terminal_run.id,
        'lastResearchFingerprint', terminal_run.research_fingerprint,
        'lastEventCount', terminal_run.event_count
      ),
      updated_at = now()
  from public.celeb_timeline_research_runs as terminal_run
  where queue.task_type = 'timeline_backfill_v1'
    and queue.payload ->> 'explicitRequeue' = 'true'
    and not (queue.payload ? 'lastRunId')
    and terminal_run.celeb_id = queue.celeb_id
    and terminal_run.pipeline = 'timeline_backfill_v1'
    and terminal_run.run_origin = 'direct_pipeline'
    and terminal_run.research_status in ('blocked', 'skipped')
    and terminal_run.event_count = 0
    and cardinality(terminal_run.timeline_event_ids) = 0
    and terminal_run.superseded_by_run_id is null
    and terminal_run.superseded_at is null
    and terminal_run.supersession_reason is null;
end;
$$;

-- complete_celeb_timeline_backfill already owns the queue and celeb locks and
-- inserts the event set before it appends the run ledger.  This BEFORE INSERT
-- hook extends that same transaction: it re-locks in queue -> celeb -> old-run
-- order, verifies the preserved predecessor pointer, marks the zero-event
-- terminal run as superseded, and assigns the reciprocal predecessor id to the
-- new complete run.  Any later run insert or queue-update failure rolls the
-- event insert and both lineage mutations back together.
create or replace function private.timeline_backfill_link_requeued_completion()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_queue public.celeb_task_queue%rowtype;
  v_old_run public.celeb_timeline_research_runs%rowtype;
  v_old_run_id uuid;
  v_active_terminal_count integer;
  v_exact_event_count integer;
  v_total_event_count integer;
  v_reason text;
  v_rows integer;
begin
  if new.pipeline <> 'timeline_backfill_v1'
    or new.run_origin <> 'direct_pipeline'
    or new.research_status <> 'complete'
  then
    return new;
  end if;

  -- Corrections already establish their own queue lock, full exact readback,
  -- and reciprocal lineage inside correct_celeb_timeline_backfill.
  if new.supersedes_run_id is not null then
    return new;
  end if;

  select queue.*
  into v_queue
  from public.celeb_task_queue as queue
  where queue.task_type = 'timeline_backfill_v1'
    and queue.celeb_id = new.celeb_id
  for update;

  if not found then
    raise exception 'completion lineage queue is missing: celeb_id=%', new.celeb_id;
  end if;

  if coalesce(v_queue.payload ->> 'explicitRequeue', 'false') <> 'true' then
    if exists (
      select 1
      from public.celeb_timeline_research_runs as active_terminal
      where active_terminal.celeb_id = new.celeb_id
        and active_terminal.pipeline = 'timeline_backfill_v1'
        and active_terminal.run_origin = 'direct_pipeline'
        and active_terminal.research_status in ('blocked', 'skipped')
        and active_terminal.superseded_by_run_id is null
        and active_terminal.superseded_at is null
        and active_terminal.supersession_reason is null
    ) then
      raise exception 'terminal timeline run requires explicit requeue lineage: celeb_id=%',
        new.celeb_id;
    end if;
    return new;
  end if;

  if v_queue.status <> 'in_progress'
    or v_queue.payload ->> 'claimToken' is distinct from new.claim_token::text
    or v_queue.claimed_by is distinct from new.claimed_by
  then
    raise exception 'explicit requeue completion lost queue ownership: celeb_id=%', new.celeb_id;
  end if;
  if coalesce(v_queue.payload ->> 'lastRunId', '')
    !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  then
    select count(*)::integer
    into v_active_terminal_count
    from public.celeb_timeline_research_runs as active_terminal
    where active_terminal.celeb_id = new.celeb_id
      and active_terminal.pipeline = 'timeline_backfill_v1'
      and active_terminal.run_origin = 'direct_pipeline'
      and active_terminal.research_status in ('blocked', 'skipped')
      and active_terminal.superseded_by_run_id is null
      and active_terminal.superseded_at is null
      and active_terminal.supersession_reason is null;

    -- Explicitly requeueing an ordinary pending/failed attempt has no ledger
    -- predecessor and remains a normal completion.
    if v_active_terminal_count = 0 then
      return new;
    end if;
    raise exception 'explicit requeue predecessor run id is missing or invalid: celeb_id=% active_terminal_count=%',
      new.celeb_id, v_active_terminal_count;
  end if;
  v_old_run_id := (v_queue.payload ->> 'lastRunId')::uuid;

  -- Lock order is intentionally the same as the public mutation RPCs.
  perform 1
  from public.celebs as celeb
  where celeb.id = new.celeb_id
  for update of celeb;
  if not found then
    raise exception 'completion lineage celeb is missing: celeb_id=%', new.celeb_id;
  end if;

  select run.*
  into v_old_run
  from public.celeb_timeline_research_runs as run
  where run.id = v_old_run_id
  for update;

  if not found
    or v_old_run.celeb_id is distinct from new.celeb_id
    or v_old_run.pipeline <> 'timeline_backfill_v1'
    or v_old_run.run_origin <> 'direct_pipeline'
    or v_old_run.research_status not in ('blocked', 'skipped')
    or v_old_run.event_count <> 0
    or cardinality(v_old_run.timeline_event_ids) <> 0
    or v_old_run.superseded_by_run_id is not null
    or v_old_run.superseded_at is not null
    or v_old_run.supersession_reason is not null
  then
    raise exception 'explicit requeue predecessor is not one active zero-event terminal run: celeb_id=% run_id=%',
      new.celeb_id, v_old_run_id;
  end if;

  if v_queue.payload ->> 'lastResearchFingerprint'
      is distinct from v_old_run.research_fingerprint
    or v_queue.payload ->> 'lastEventCount' is distinct from '0'
  then
    raise exception 'explicit requeue predecessor queue fingerprint/count mismatch: celeb_id=% run_id=%',
      new.celeb_id, v_old_run_id;
  end if;
  if new.research_fingerprint = v_old_run.research_fingerprint then
    raise exception 'replacement completion must have a distinct research fingerprint: celeb_id=% run_id=%',
      new.celeb_id, v_old_run_id;
  end if;
  if new.superseded_by_run_id is not null
    or new.superseded_at is not null
    or new.supersession_reason is not null
  then
    raise exception 'new replacement completion contains successor metadata: celeb_id=%', new.celeb_id;
  end if;

  select count(*)::integer
  into v_active_terminal_count
  from public.celeb_timeline_research_runs as active_terminal
  where active_terminal.celeb_id = new.celeb_id
    and active_terminal.pipeline = 'timeline_backfill_v1'
    and active_terminal.run_origin = 'direct_pipeline'
    and active_terminal.research_status in ('blocked', 'skipped')
    and active_terminal.superseded_by_run_id is null
    and active_terminal.superseded_at is null
    and active_terminal.supersession_reason is null;

  if v_active_terminal_count <> 1 then
    raise exception 'explicit requeue requires exactly one active terminal predecessor: celeb_id=% count=%',
      new.celeb_id, v_active_terminal_count;
  end if;
  if exists (
    select 1
    from public.celeb_timeline_research_runs as successor
    where successor.supersedes_run_id = v_old_run.id
  ) then
    raise exception 'explicit requeue predecessor already has a successor: run_id=%', v_old_run.id;
  end if;

  select count(*)::integer
  into v_exact_event_count
  from public.celeb_timeline_events as timeline
  where timeline.celeb_id = new.celeb_id
    and timeline.id = any(new.timeline_event_ids);

  select count(*)::integer
  into v_total_event_count
  from public.celeb_timeline_events as timeline
  where timeline.celeb_id = new.celeb_id;

  if new.event_count <= 0
    or cardinality(new.timeline_event_ids) <> new.event_count
    or v_exact_event_count <> new.event_count
    or v_total_event_count <> new.event_count
  then
    raise exception 'replacement completion live event set is not exact: celeb_id=%', new.celeb_id;
  end if;

  v_reason := 'Explicit requeue replaced terminal '
    || v_old_run.research_status
    || ' timeline research run';
  if nullif(btrim(v_queue.payload ->> 'requeueReason'), '') is not null then
    v_reason := v_reason || ': ' || btrim(v_queue.payload ->> 'requeueReason');
  end if;
  v_reason := left(v_reason, 1200);

  -- superseded_by_run_id is a deferred FK.  NEW.id has already received the
  -- table default, so the predecessor may leave the active set before NEW is
  -- physically inserted.
  update public.celeb_timeline_research_runs as run
  set superseded_by_run_id = new.id,
      superseded_at = now(),
      supersession_reason = v_reason
  where run.id = v_old_run.id
    and run.superseded_by_run_id is null
    and run.superseded_at is null
    and run.supersession_reason is null;

  get diagnostics v_rows = row_count;
  if v_rows <> 1 then
    raise exception 'explicit requeue predecessor lost active status: run_id=%', v_old_run.id;
  end if;

  new.supersedes_run_id := v_old_run.id;
  return new;
end;
$$;

alter function private.timeline_backfill_link_requeued_completion()
  owner to postgres;
revoke all on function private.timeline_backfill_link_requeued_completion()
  from public, anon, authenticated, service_role;

create trigger timeline_backfill_link_requeued_completion
before insert on public.celeb_timeline_research_runs
for each row
execute function private.timeline_backfill_link_requeued_completion();

do $$
declare
  v_trigger_count integer;
begin
  select count(*)::integer
  into v_trigger_count
  from pg_trigger as trigger_row
  join pg_class as relation on relation.oid = trigger_row.tgrelid
  join pg_namespace as namespace on namespace.oid = relation.relnamespace
  where not trigger_row.tgisinternal
    and (
      (
        namespace.nspname = 'public'
        and relation.relname = 'celeb_task_queue'
        and trigger_row.tgname = 'timeline_backfill_preserve_requeue_predecessor'
      )
      or (
        namespace.nspname = 'public'
        and relation.relname = 'celeb_timeline_research_runs'
        and trigger_row.tgname = 'timeline_backfill_link_requeued_completion'
      )
    );

  if v_trigger_count <> 2 then
    raise exception 'timeline terminal requeue lineage trigger contract mismatch';
  end if;

  if exists (
    select 1
    from pg_proc as proc
    join pg_namespace as namespace on namespace.oid = proc.pronamespace
    where namespace.nspname = 'private'
      and proc.proname in (
        'timeline_backfill_preserve_requeue_predecessor',
        'timeline_backfill_link_requeued_completion'
      )
      and (
        not proc.prosecdef
        or proc.proconfig is distinct from array['search_path=pg_catalog']::text[]
        or pg_get_userbyid(proc.proowner) <> 'postgres'
      )
  ) then
    raise exception 'timeline terminal requeue lineage function security contract mismatch';
  end if;

  if exists (
    select 1
    from pg_proc as proc
    join pg_namespace as namespace on namespace.oid = proc.pronamespace
    cross join lateral aclexplode(coalesce(proc.proacl, acldefault('f', proc.proowner))) as acl
    where namespace.nspname = 'private'
      and proc.proname in (
        'timeline_backfill_preserve_requeue_predecessor',
        'timeline_backfill_link_requeued_completion'
      )
      and acl.grantee <> proc.proowner
      and acl.privilege_type = 'EXECUTE'
  ) then
    raise exception 'timeline terminal requeue lineage function execute ACL mismatch';
  end if;
end;
$$;

commit;
