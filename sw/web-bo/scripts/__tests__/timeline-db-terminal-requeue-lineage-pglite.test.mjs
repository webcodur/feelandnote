import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { PGlite } from '@electric-sql/pglite'
import { researchFingerprint } from '../lib/timeline-direct-contract.mjs'

const pipelineMigrationUrl = new URL(
  '../../../web/supabase/migrations/20260809212156_timeline_direct_db_pipeline.sql',
  import.meta.url,
)
const correctionMigrationUrl = new URL(
  '../../../web/supabase/migrations/20260809234727_timeline_direct_db_corrections.sql',
  import.meta.url,
)
const lineageMigrationUrl = new URL(
  '../../../web/supabase/migrations/20260810020404_timeline_terminal_requeue_completion_lineage.sql',
  import.meta.url,
)

const celebId = '11111111-1111-1111-1111-111111111111'
const oldRunId = '22222222-2222-2222-2222-222222222222'
const worker = 'lineage-pglite'
const requeueReason = 'The terminal identity decision was wrong and has now been resolved.'

function profileSnapshot() {
  return {
    id: celebId,
    slug: 'terminal-requeue-fixture',
    nickname: '재조사 표본',
    nicknameEn: 'Terminal Requeue Fixture',
    title: null,
    titleEn: null,
    profession: 'researcher',
    nationality: 'KR',
    gender: true,
    birthDate: '1980',
    deathDate: '2020',
    celebTier: 'full',
    publicationStatus: 'active',
    wikidataQid: null,
  }
}

function completePayload(snapshot = profileSnapshot()) {
  const event = (year, kind, title, titleEn) => ({
    eventType: 'life',
    year,
    yearEnd: null,
    month: null,
    day: null,
    title,
    titleEn,
    description: `${title}에 관한 첫 번째 검증 문장입니다. 같은 사건을 뒷받침하는 두 번째 검증 문장입니다.`,
    descriptionEn: `This is the first verified sentence about ${titleEn}. This is the second supported sentence about the same event.`,
    kind,
    placeName: null,
    placeNameEn: null,
    placeQuery: null,
    placeCountry: null,
    evidenceRefs: ['S1'],
  })
  return {
    celebId,
    slug: snapshot.slug,
    nickname: snapshot.nickname,
    nicknameEn: snapshot.nicknameEn,
    timelineMode: 'life',
    profileSnapshot: snapshot,
    sources: [{
      id: 'S1',
      url: 'https://archive.example/terminal-requeue?record=verified&locale=en',
      title: 'Authoritative terminal requeue evidence',
      publisher: 'Fixture Archive',
      accessedAt: '2026-08-10',
    }],
    researchStatus: 'complete',
    events: [
      event(1980, 'birth', '출생', 'Birth'),
      event(2000, 'work', '주요 활동', 'Major work'),
      event(2020, 'death', '사망', 'Death'),
    ],
  }
}

function blockedPayload(snapshot = profileSnapshot()) {
  return {
    celebId,
    slug: snapshot.slug,
    nickname: snapshot.nickname,
    nicknameEn: snapshot.nicknameEn,
    timelineMode: 'life',
    profileSnapshot: snapshot,
    sources: [{
      id: 'S0',
      url: 'https://archive.example/terminal-block',
      title: 'Original terminal evidence',
      publisher: 'Fixture Archive',
      accessedAt: '2026-08-09',
    }],
    researchStatus: 'blocked',
    events: [],
    blockingIssues: [{
      code: 'IDENTITY_NOT_VERIFIED',
      message: '당시에는 동일 인물 여부를 확정하지 못해 조사를 중단했습니다.',
      messageEn: 'The earlier research could not establish that the records referred to the same person.',
      evidenceRefs: ['S0'],
    }],
  }
}

const baselineSql = String.raw`
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin;
  create schema private;

  create table public.celebs (
    id uuid primary key,
    slug text not null,
    nickname text not null,
    nickname_en text,
    title text,
    title_en text,
    profession text,
    nationality text,
    gender boolean,
    birth_date text,
    death_date text,
    publication_status text,
    celeb_tier text,
    wikidata_qid text
  );

  create table public.celeb_task_queue (
    task_type text not null,
    celeb_id uuid not null references public.celebs(id),
    status text not null,
    priority integer not null default 0,
    payload jsonb not null default '{}'::jsonb,
    attempt_count integer not null default 0,
    claimed_by text,
    claimed_at timestamptz,
    lease_expires_at timestamptz,
    completed_at timestamptz,
    last_error text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    primary key (task_type, celeb_id)
  );

  create table public.celeb_timeline_events (
    id uuid primary key default gen_random_uuid(),
    celeb_id uuid not null references public.celebs(id),
    year integer,
    year_end integer,
    month smallint,
    day smallint,
    sequence_label text,
    sequence_label_en text,
    title text not null,
    title_en text,
    description text,
    description_en text,
    kind text not null,
    place_name text,
    place_name_en text,
    lat double precision,
    lng double precision,
    place_qid text,
    source text,
    source_url text,
    sort_order integer not null
  );
`

async function applyMigration(db, url, label) {
  try {
    await db.exec(await readFile(url, 'utf8'))
  } catch (error) {
    throw new Error(
      `${label} failed: ${error.message} position=${error.position ?? 'unknown'} detail=${error.detail ?? 'none'}`,
      { cause: error },
    )
  }
}

async function fixtureDb({ applyLineage = true } = {}) {
  const db = new PGlite()
  await db.exec(baselineSql)
  await applyMigration(db, pipelineMigrationUrl, 'pipeline migration')
  await applyMigration(db, correctionMigrationUrl, 'correction migration')
  if (applyLineage) await applyMigration(db, lineageMigrationUrl, 'terminal lineage migration')
  const snapshot = profileSnapshot()
  await db.query(
    `insert into public.celebs values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
    [
      snapshot.id, snapshot.slug, snapshot.nickname, snapshot.nicknameEn,
      snapshot.title, snapshot.titleEn, snapshot.profession, snapshot.nationality,
      snapshot.gender, snapshot.birthDate, snapshot.deathDate,
      snapshot.publicationStatus, snapshot.celebTier, snapshot.wikidataQid,
    ],
  )
  return db
}

async function seedTerminalRun(db, { queueHasPointer = true, queueStatus = 'skipped' } = {}) {
  const snapshot = profileSnapshot()
  const oldPayload = blockedPayload(snapshot)
  const oldFingerprint = researchFingerprint(oldPayload)
  await db.query(
    `insert into public.celeb_timeline_research_runs (
      id,celeb_id,research_status,timeline_mode,research_fingerprint,claim_token,claimed_by,
      attempt_count,profile_snapshot,sources,event_evidence,profile_conflicts,blocking_issues,
      research_payload,timeline_event_ids,event_count,started_at
    ) values ($1,$2,'blocked','life',$3,$4,'old-worker',1,$5,$6,'[]','[]',$7,$8,'{}',0,now())`,
    [
      oldRunId, celebId, oldFingerprint,
      '40000000-0000-0000-0000-000000000001', snapshot, oldPayload.sources,
      oldPayload.blockingIssues, oldPayload,
    ],
  )
  const pointer = queueHasPointer
    ? { lastRunId: oldRunId, lastResearchFingerprint: oldFingerprint, lastEventCount: 0 }
    : {}
  const activeClaim = queueStatus === 'in_progress'
    ? {
        claimToken: '50000000-0000-0000-0000-000000000001',
        profileSnapshot: snapshot,
      }
    : {}
  await db.query(
    `insert into public.celeb_task_queue (
      task_type,celeb_id,status,payload,attempt_count,claimed_by,claimed_at,lease_expires_at,
      completed_at,last_error
    ) values ('timeline_backfill_v1',$1,$2,$3,1,$4,$5,$6,$7,$8)`,
    [
      celebId,
      queueStatus,
      { schemaVersion: 1, timelineMode: 'life', explicitRequeue: queueStatus === 'in_progress', ...pointer, ...activeClaim },
      queueStatus === 'in_progress' ? worker : null,
      queueStatus === 'in_progress' ? new Date().toISOString() : null,
      queueStatus === 'in_progress' ? new Date(Date.now() + 3_600_000).toISOString() : null,
      queueStatus === 'skipped' ? new Date().toISOString() : null,
      queueStatus === 'skipped' ? 'original terminal block' : null,
    ],
  )
  return { oldPayload, oldFingerprint }
}

async function requeueAndClaim(db) {
  await db.query(
    `select public.requeue_celeb_timeline_backfill($1,$2,false) as result`,
    [celebId, requeueReason],
  )
  const preserved = await db.query(
    `select payload from public.celeb_task_queue where task_type='timeline_backfill_v1' and celeb_id=$1`,
    [celebId],
  )
  assert.equal(preserved.rows[0].payload.lastRunId, oldRunId)
  assert.equal(preserved.rows[0].payload.lastEventCount, 0)

  const claim = await db.query(
    `select * from public.claim_next_celeb_timeline_backfill($1,120)`,
    [worker],
  )
  assert.equal(claim.rows.length, 1)
  return claim.rows[0]
}

async function complete(db, claim, payload = completePayload(claim.profile_snapshot)) {
  const fingerprint = researchFingerprint(payload)
  const response = await db.query(
    `select public.complete_celeb_timeline_backfill($1,$2,$3,$4,$5,$6) as result`,
    [celebId, worker, claim.claim_token, claim.profile_snapshot, fingerprint, payload],
  )
  return { result: response.rows[0].result, fingerprint, payload }
}

async function seedNormalCompletion(db) {
  await db.query(
    `insert into public.celeb_task_queue (task_type,celeb_id,status,payload)
     values ('timeline_backfill_v1',$1,'pending',$2)`,
    [celebId, { schemaVersion: 1, timelineMode: 'life', profileSnapshot: profileSnapshot() }],
  )
  const claimResult = await db.query(
    `select * from public.claim_next_celeb_timeline_backfill($1,120)`,
    [worker],
  )
  assert.equal(claimResult.rows.length, 1)
  return complete(db, claimResult.rows[0])
}

async function correct(db, original, correctedPayload, correctedFingerprint = researchFingerprint(correctedPayload)) {
  const response = await db.query(
    `select public.correct_celeb_timeline_backfill($1,$2,$3,$4,$5,$6,$7) as result`,
    [
      celebId,
      original.result.runId,
      original.fingerprint,
      correctedPayload.profileSnapshot,
      correctedFingerprint,
      correctedPayload,
      'Correct the source after authoritative evidence review.',
    ],
  )
  return response.rows[0].result
}

test('PGlite explicit terminal requeue completes with reciprocal lineage and retries idempotently', async () => {
  const db = await fixtureDb()
  try {
    const { oldPayload, oldFingerprint } = await seedTerminalRun(db)
    const claim = await requeueAndClaim(db)
    const first = await complete(db, claim)
    assert.equal(first.result.status, 'completed')
    assert.equal(first.result.eventCount, 3)

    const runs = await db.query(`
      select * from public.celeb_timeline_research_runs order by created_at,id
    `)
    assert.equal(runs.rows.length, 2)
    const oldRun = runs.rows.find((run) => run.id === oldRunId)
    const newRun = runs.rows.find((run) => run.id === first.result.runId)
    assert.equal(oldRun.superseded_by_run_id, newRun.id)
    assert.ok(oldRun.superseded_at)
    assert.match(oldRun.supersession_reason, /Explicit requeue replaced terminal blocked/)
    assert.equal(newRun.supersedes_run_id, oldRun.id)
    assert.equal(newRun.superseded_by_run_id, null)
    assert.deepEqual(oldRun.research_payload, oldPayload)
    assert.equal(oldRun.research_fingerprint, oldFingerprint)

    const queue = await db.query(`
      select status,payload from public.celeb_task_queue
      where task_type='timeline_backfill_v1' and celeb_id=$1
    `, [celebId])
    assert.equal(queue.rows[0].status, 'completed')
    assert.equal(queue.rows[0].payload.lastRunId, newRun.id)
    assert.equal(queue.rows[0].payload.lastResearchFingerprint, first.fingerprint)
    assert.equal(queue.rows[0].payload.lastEventCount, 3)
    assert.equal(queue.rows[0].payload.explicitRequeue, undefined)

    await db.exec(`update public.celebs set title='Profile drift after response loss' where id='${celebId}'`)
    const retry = await complete(db, claim, first.payload)
    assert.equal(retry.result.status, 'already_completed')
    assert.equal(retry.result.runId, first.result.runId)
    assert.equal((await db.query(`select count(*)::integer as count from public.celeb_timeline_research_runs`)).rows[0].count, 2)
  } finally {
    await db.close()
  }
})

test('PGlite migration repairs a pre-existing claimed explicit requeue pointer exactly', async () => {
  const db = await fixtureDb({ applyLineage: false })
  try {
    const { oldFingerprint } = await seedTerminalRun(db, {
      queueHasPointer: false,
      queueStatus: 'in_progress',
    })
    await applyMigration(db, lineageMigrationUrl, 'terminal lineage migration')
    const queue = await db.query(`select payload from public.celeb_task_queue where celeb_id=$1`, [celebId])
    assert.equal(queue.rows[0].payload.lastRunId, oldRunId)
    assert.equal(queue.rows[0].payload.lastResearchFingerprint, oldFingerprint)
    assert.equal(queue.rows[0].payload.lastEventCount, 0)
    assert.equal(queue.rows[0].payload.claimToken, '50000000-0000-0000-0000-000000000001')
  } finally {
    await db.close()
  }
})

test('PGlite full migration stack preserves correct RPC success and idempotent retry', async () => {
  const db = await fixtureDb()
  try {
    const original = await seedNormalCompletion(db)
    const correctedPayload = structuredClone(original.payload)
    correctedPayload.sources[0].url = 'https://archive.example/corrected?record=verified&locale=en'
    const first = await correct(db, original, correctedPayload)
    assert.equal(first.status, 'corrected')
    assert.equal(first.supersedesRunId, original.result.runId)
    assert.equal(first.eventCount, 3)

    await db.exec(`update public.celebs set title='Profile drift after correction response loss' where id='${celebId}'`)
    const retry = await correct(db, original, correctedPayload)
    assert.equal(retry.status, 'already_corrected')
    assert.equal(retry.runId, first.runId)
    assert.equal((await db.query(`select count(*)::integer as count from public.celeb_timeline_research_runs`)).rows[0].count, 2)
  } finally {
    await db.close()
  }
})

test('PGlite full migration stack keeps correct RPC stale and late-failure rollback exact', async () => {
  const staleDb = await fixtureDb()
  try {
    const original = await seedNormalCompletion(staleDb)
    const correctedPayload = structuredClone(original.payload)
    correctedPayload.sources[0].url = 'https://archive.example/stale-correction'
    await assert.rejects(
      () => correct(staleDb, { ...original, fingerprint: 'c'.repeat(64) }, correctedPayload),
      /expected run is not the current completed unsuperseded run/,
    )
    const state = await staleDb.query(`
      select
        (select count(*)::integer from public.celeb_timeline_events) as events,
        (select count(*)::integer from public.celeb_timeline_research_runs) as runs,
        (select superseded_by_run_id from public.celeb_timeline_research_runs where id=$1) as successor,
        (select payload ->> 'lastRunId' from public.celeb_task_queue where celeb_id=$2) as queue_run
    `, [original.result.runId, celebId])
    assert.deepEqual(state.rows[0], {
      events: 3,
      runs: 1,
      successor: null,
      queue_run: original.result.runId,
    })
  } finally {
    await staleDb.close()
  }

  const lateDb = await fixtureDb()
  try {
    const original = await seedNormalCompletion(lateDb)
    await lateDb.exec(`
      alter table public.celeb_timeline_events
      add constraint reject_forced_correction_failure
      check (source_url not like '%force-fail%')
    `)
    const correctedPayload = structuredClone(original.payload)
    correctedPayload.sources[0].url = 'https://archive.example/force-fail'
    await assert.rejects(
      () => correct(lateDb, original, correctedPayload),
      /reject_forced_correction_failure/,
    )
    const state = await lateDb.query(`
      select
        (select count(*)::integer from public.celeb_timeline_events) as events,
        (select count(*)::integer from public.celeb_timeline_research_runs) as runs,
        (select superseded_by_run_id from public.celeb_timeline_research_runs where id=$1) as successor,
        (select source_url from public.celeb_timeline_events order by sort_order limit 1) as source_url,
        (select payload ->> 'lastRunId' from public.celeb_task_queue where celeb_id=$2) as queue_run
    `, [original.result.runId, celebId])
    assert.deepEqual(state.rows[0], {
      events: 3,
      runs: 1,
      successor: null,
      source_url: original.payload.sources[0].url,
      queue_run: original.result.runId,
    })
  } finally {
    await lateDb.close()
  }
})

test('PGlite rejects stale or ambiguous terminal predecessors without partial writes', async () => {
  const db = await fixtureDb()
  try {
    await seedTerminalRun(db)
    const claim = await requeueAndClaim(db)
    await db.query(`
      update public.celeb_task_queue
      set payload=jsonb_set(payload,'{lastRunId}',to_jsonb($1::text),true)
      where celeb_id=$2
    `, ['99999999-9999-9999-9999-999999999999', celebId])
    await assert.rejects(() => complete(db, claim), /predecessor is not one active zero-event terminal run/)
    const state = await db.query(`
      select
        (select count(*)::integer from public.celeb_timeline_events) as events,
        (select count(*)::integer from public.celeb_timeline_research_runs) as runs,
        (select superseded_by_run_id from public.celeb_timeline_research_runs where id=$1) as successor
    `, [oldRunId])
    assert.deepEqual(state.rows[0], { events: 0, runs: 1, successor: null })
  } finally {
    await db.close()
  }

  const ambiguousDb = await fixtureDb()
  try {
    await seedTerminalRun(ambiguousDb)
    await ambiguousDb.query(`
      insert into public.celeb_timeline_research_runs (
        id,celeb_id,research_status,timeline_mode,research_fingerprint,profile_snapshot,
        research_payload,timeline_event_ids,event_count
      ) values ($1,$2,'blocked','life',$3,$4,$5,'{}',0)
    `, [
      '66666666-6666-6666-6666-666666666666', celebId, 'c'.repeat(64),
      profileSnapshot(), blockedPayload(),
    ])
    const claim = await requeueAndClaim(ambiguousDb)
    await assert.rejects(() => complete(ambiguousDb, claim), /exactly one active terminal predecessor/)
    assert.equal((await ambiguousDb.query(`select count(*)::integer as count from public.celeb_timeline_events`)).rows[0].count, 0)
    assert.equal((await ambiguousDb.query(`select superseded_by_run_id from public.celeb_timeline_research_runs where id=$1`, [oldRunId])).rows[0].superseded_by_run_id, null)
  } finally {
    await ambiguousDb.close()
  }
})

test('PGlite rejects an active terminal completion when explicitRequeue is missing with zero partial writes', async () => {
  const db = await fixtureDb()
  try {
    await seedTerminalRun(db)
    const claim = await requeueAndClaim(db)
    await db.query(`
      update public.celeb_task_queue
      set payload=payload-'explicitRequeue'
      where task_type='timeline_backfill_v1' and celeb_id=$1
    `, [celebId])

    await assert.rejects(
      () => complete(db, claim),
      /terminal timeline run requires explicit requeue lineage/,
    )
    const state = await db.query(`
      select
        (select count(*)::integer from public.celeb_timeline_events) as events,
        (select count(*)::integer from public.celeb_timeline_research_runs) as runs,
        (select superseded_by_run_id from public.celeb_timeline_research_runs where id=$1) as successor,
        (select status from public.celeb_task_queue where celeb_id=$2) as queue_status,
        (select payload ->> 'lastRunId' from public.celeb_task_queue where celeb_id=$2) as queue_run
    `, [oldRunId, celebId])
    assert.deepEqual(state.rows[0], {
      events: 0,
      runs: 1,
      successor: null,
      queue_status: 'in_progress',
      queue_run: oldRunId,
    })
  } finally {
    await db.close()
  }
})

test('PGlite late queue failure rolls events, new run, and predecessor lineage back atomically', async () => {
  const db = await fixtureDb()
  try {
    await seedTerminalRun(db)
    const claim = await requeueAndClaim(db)
    await db.exec(String.raw`
      create function private.reject_completed_queue_for_test()
      returns trigger language plpgsql as $$
      begin
        if new.status = 'completed' then raise exception 'forced late queue failure'; end if;
        return new;
      end $$;
      create trigger reject_completed_queue_for_test
      before update on public.celeb_task_queue
      for each row execute function private.reject_completed_queue_for_test();
    `)
    await assert.rejects(() => complete(db, claim), /forced late queue failure/)
    const state = await db.query(`
      select
        (select count(*)::integer from public.celeb_timeline_events) as events,
        (select count(*)::integer from public.celeb_timeline_research_runs) as runs,
        (select superseded_by_run_id from public.celeb_timeline_research_runs where id=$1) as successor,
        (select status from public.celeb_task_queue where celeb_id=$2) as queue_status
    `, [oldRunId, celebId])
    assert.deepEqual(state.rows[0], {
      events: 0,
      runs: 1,
      successor: null,
      queue_status: 'in_progress',
    })
  } finally {
    await db.close()
  }
})

test('PGlite normal pending completion and fail --skip remain outside replacement lineage', async () => {
  const completeDb = await fixtureDb()
  try {
    await completeDb.query(
      `insert into public.celeb_task_queue (task_type,celeb_id,status,payload)
       values ('timeline_backfill_v1',$1,'pending',$2)`,
      [celebId, { schemaVersion: 1, timelineMode: 'life', profileSnapshot: profileSnapshot() }],
    )
    const claimResult = await completeDb.query(
      `select * from public.claim_next_celeb_timeline_backfill($1,120)`,
      [worker],
    )
    const done = await complete(completeDb, claimResult.rows[0])
    assert.equal(done.result.status, 'completed')
    const run = await completeDb.query(`select supersedes_run_id from public.celeb_timeline_research_runs`)
    assert.equal(run.rows[0].supersedes_run_id, null)
  } finally {
    await completeDb.close()
  }

  const skipDb = await fixtureDb()
  try {
    await skipDb.query(
      `insert into public.celeb_task_queue (task_type,celeb_id,status,payload)
       values ('timeline_backfill_v1',$1,'pending',$2)`,
      [celebId, { schemaVersion: 1, timelineMode: 'life', profileSnapshot: profileSnapshot() }],
    )
    const claimResult = await skipDb.query(
      `select * from public.claim_next_celeb_timeline_backfill($1,120)`,
      [worker],
    )
    const claim = claimResult.rows[0]
    const payload = blockedPayload(claim.profile_snapshot)
    const fingerprint = researchFingerprint(payload)
    const failed = await skipDb.query(
      `select public.fail_celeb_timeline_backfill($1,$2,$3,$4,true,$5,$6,$7) as result`,
      [celebId, worker, claim.claim_token, 'identity remains blocked', claim.profile_snapshot, fingerprint, payload],
    )
    assert.equal(failed.rows[0].result.status, 'skipped')
    const run = await skipDb.query(`select research_status,supersedes_run_id,superseded_by_run_id from public.celeb_timeline_research_runs`)
    assert.deepEqual(run.rows[0], {
      research_status: 'blocked',
      supersedes_run_id: null,
      superseded_by_run_id: null,
    })
  } finally {
    await skipDb.close()
  }
})
