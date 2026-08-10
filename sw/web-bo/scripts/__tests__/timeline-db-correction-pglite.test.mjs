import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { PGlite } from '@electric-sql/pglite'

const migrationUrl = new URL(
  '../../../web/supabase/migrations/20260809234727_timeline_direct_db_corrections.sql',
  import.meta.url,
)
const terminalLineageMigrationUrl = new URL(
  '../../../web/supabase/migrations/20260810020404_timeline_terminal_requeue_completion_lineage.sql',
  import.meta.url,
)

const celebId = '11111111-1111-1111-1111-111111111111'
const oldRunId = '22222222-2222-2222-2222-222222222222'
const oldFingerprint = 'a'.repeat(64)
const correctedFingerprint = 'b'.repeat(64)
const reason = 'Correct the malformed encoded source query delimiter.'

function profileSnapshot() {
  return {
    id: celebId,
    slug: 'correction-fixture',
    nickname: '교정 표본',
    nicknameEn: 'Correction Fixture',
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

function payload(sourceUrl) {
  const snapshot = profileSnapshot()
  const event = (year, kind, title) => ({
    eventType: 'life',
    year,
    yearEnd: null,
    month: null,
    day: null,
    title,
    titleEn: title,
    description: `${title}에 관한 첫 번째 검증 문장입니다. 같은 사건을 뒷받침하는 두 번째 검증 문장입니다.`,
    descriptionEn: `This is the first verified sentence about ${title}. This is the second supported sentence about the same event.`,
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
      url: sourceUrl,
      title: 'Authoritative evidence',
      publisher: 'Fixture Archive',
      accessedAt: '2026-08-10',
    }],
    researchStatus: 'complete',
    events: [
      event(1980, 'birth', '출생'),
      event(2000, 'work', '주요 활동'),
      event(2020, 'death', '사망'),
    ],
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
    celeb_id uuid not null,
    status text not null,
    priority integer not null default 0,
    payload jsonb not null default '{}'::jsonb,
    attempt_count integer not null default 0,
    claimed_by text,
    claimed_at timestamptz,
    lease_expires_at timestamptz,
    completed_at timestamptz,
    last_error text,
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

  create table public.celeb_timeline_research_runs (
    id uuid primary key default gen_random_uuid(),
    celeb_id uuid not null references public.celebs(id),
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
    unique (celeb_id, research_fingerprint)
  );

  alter table public.celeb_timeline_research_runs enable row level security;
  alter table public.celeb_timeline_research_runs force row level security;
  revoke all on public.celeb_timeline_research_runs from public, anon, authenticated, service_role;
  grant select, insert on public.celeb_timeline_research_runs to service_role;

  create function private.timeline_backfill_profile_snapshot(p_celeb_id uuid)
  returns jsonb language sql stable security invoker set search_path = pg_catalog as $$
    select jsonb_build_object(
      'id', celeb.id, 'slug', celeb.slug, 'nickname', celeb.nickname,
      'nicknameEn', celeb.nickname_en, 'title', celeb.title, 'titleEn', celeb.title_en,
      'profession', celeb.profession, 'nationality', celeb.nationality,
      'gender', celeb.gender, 'birthDate', celeb.birth_date, 'deathDate', celeb.death_date,
      'celebTier', celeb.celeb_tier, 'publicationStatus', celeb.publication_status,
      'wikidataQid', celeb.wikidata_qid
    ) from public.celebs as celeb where celeb.id = p_celeb_id
  $$;

  create function private.timeline_backfill_validate_sources(p_sources jsonb)
  returns void language plpgsql security invoker set search_path = pg_catalog as $$
  begin
    if jsonb_typeof(p_sources) is distinct from 'array' or jsonb_array_length(p_sources) = 0 then
      raise exception 'sources required';
    end if;
    if exists (
      select 1 from jsonb_array_elements(p_sources) as source_item(value)
      where btrim(source_item.value ->> 'url') !~* '^https?://[^[:space:]]+$'
    ) then raise exception 'invalid source URL'; end if;
  end $$;

  create function private.timeline_backfill_validate_evidence_refs(
    p_refs jsonb, p_sources jsonb, p_context text
  ) returns void language plpgsql security invoker set search_path = pg_catalog as $$
  begin
    if jsonb_typeof(p_refs) is distinct from 'array' or jsonb_array_length(p_refs) = 0
      or exists (
        select 1 from jsonb_array_elements_text(p_refs) as ref(value)
        where not exists (
          select 1 from jsonb_array_elements(p_sources) as source_item(value)
          where source_item.value ->> 'id' = ref.value
        )
      )
    then raise exception '% has invalid evidence refs', p_context; end if;
  end $$;

  create function private.timeline_backfill_validate_profile_conflicts(
    p_conflicts jsonb, p_profile_snapshot jsonb, p_sources jsonb
  ) returns text[] language sql security invoker set search_path = pg_catalog as $$
    select coalesce(array_agg(conflict.value ->> 'field'), '{}'::text[])
    from jsonb_array_elements(p_conflicts) as conflict(value)
  $$;

  create function private.timeline_backfill_exact_profile_date(p_value text)
  returns jsonb language plpgsql immutable security invoker set search_path = pg_catalog as $$
  begin
    if p_value is null or p_value !~ '^-?[0-9]+$' then return null; end if;
    return jsonb_build_object('year', p_value::integer, 'month', null, 'day', null);
  end $$;
`

async function fixtureDb() {
  const db = new PGlite()
  try {
    await db.exec(baselineSql)
  } catch (error) {
    throw new Error(`PGlite baseline failed: ${error.message}`, { cause: error })
  }
  try {
    await db.exec(await readFile(migrationUrl, 'utf8'))
    await db.exec(await readFile(terminalLineageMigrationUrl, 'utf8'))
  } catch (error) {
    throw new Error(
      `PGlite correction/terminal-lineage migration failed: ${error.message} position=${error.position ?? 'unknown'} detail=${error.detail ?? 'none'}`,
      { cause: error },
    )
  }
  const snapshot = profileSnapshot()
  const original = payload('https://archive.example/view?code=one%26level=two')
  const eventIds = [
    '30000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000002',
    '30000000-0000-0000-0000-000000000003',
  ]
  await db.query(
    `insert into public.celebs values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
    [
      celebId, snapshot.slug, snapshot.nickname, snapshot.nicknameEn, snapshot.title,
      snapshot.titleEn, snapshot.profession, snapshot.nationality, snapshot.gender,
      snapshot.birthDate, snapshot.deathDate, snapshot.publicationStatus,
      snapshot.celebTier, snapshot.wikidataQid,
    ],
  )
  for (const [index, event] of original.events.entries()) {
    await db.query(
      `insert into public.celeb_timeline_events (
        id,celeb_id,year,year_end,month,day,title,title_en,description,description_en,
        kind,source,source_url,sort_order
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'research',$12,$13)`,
      [
        eventIds[index], celebId, event.year, event.yearEnd, event.month, event.day,
        event.title, event.titleEn, event.description, event.descriptionEn, event.kind,
        original.sources[0].url, index,
      ],
    )
  }
  await db.query(
    `insert into public.celeb_task_queue (
      task_type,celeb_id,status,payload,attempt_count,completed_at
    ) values ('timeline_backfill_v1',$1,'completed',$2,1,now())`,
    [celebId, { lastRunId: oldRunId, lastResearchFingerprint: oldFingerprint, lastEventCount: 3 }],
  )
  await db.query(
    `insert into public.celeb_timeline_research_runs (
      id,celeb_id,research_status,timeline_mode,research_fingerprint,claim_token,claimed_by,
      attempt_count,profile_snapshot,sources,event_evidence,profile_conflicts,blocking_issues,
      research_payload,timeline_event_ids,event_count,started_at
    ) values ($1,$2,'complete','life',$3,$4,'lane-test',1,$5,$6,$7,'[]','[]',$8,$9,3,now())`,
    [
      oldRunId, celebId, oldFingerprint, '40000000-0000-0000-0000-000000000001',
      snapshot, original.sources,
      original.events.map((event, eventIndex) => ({ eventIndex, evidenceRefs: event.evidenceRefs })),
      original, eventIds,
    ],
  )
  return db
}

async function correct(db, correctedPayload = payload('https://archive.example/view?code=one&level=two'), fingerprint = correctedFingerprint) {
  const result = await db.query(
    `select public.correct_celeb_timeline_backfill($1,$2,$3,$4,$5,$6,$7) as result`,
    [celebId, oldRunId, oldFingerprint, profileSnapshot(), fingerprint, correctedPayload, reason],
  )
  return result.rows[0].result
}

test('PGlite correction atomically replaces events, retains lineage, and retries idempotently', async () => {
  const db = await fixtureDb()
  try {
    const first = await correct(db)
    assert.equal(first.status, 'corrected')
    assert.equal(first.supersedesRunId, oldRunId)
    assert.equal(first.eventCount, 3)

    const events = await db.query(`select source_url from public.celeb_timeline_events order by sort_order`)
    assert.deepEqual(events.rows.map((row) => row.source_url), [
      'https://archive.example/view?code=one&level=two',
      'https://archive.example/view?code=one&level=two',
      'https://archive.example/view?code=one&level=two',
    ])
    const runs = await db.query(`
      select id,supersedes_run_id,superseded_by_run_id,superseded_at,supersession_reason
      from public.celeb_timeline_research_runs order by created_at,id
    `)
    assert.equal(runs.rows.length, 2)
    const oldRun = runs.rows.find((row) => row.id === oldRunId)
    const newRun = runs.rows.find((row) => row.id === first.runId)
    assert.equal(oldRun.superseded_by_run_id, newRun.id)
    assert.equal(oldRun.supersession_reason, reason)
    assert.ok(oldRun.superseded_at)
    assert.equal(newRun.supersedes_run_id, oldRun.id)
    assert.equal(newRun.superseded_by_run_id, null)

    await db.exec(`update public.celebs set title = 'Profile changed after the committed correction' where id = '${celebId}'`)
    const retry = await correct(db)
    assert.equal(retry.status, 'already_corrected')
    assert.equal(retry.runId, first.runId)
    assert.equal((await db.query(`select count(*)::integer as count from public.celeb_timeline_research_runs`)).rows[0].count, 2)
  } finally {
    await db.close()
  }
})

test('PGlite correction rejects stale expected state and rolls the whole transaction back', async () => {
  const db = await fixtureDb()
  try {
    await assert.rejects(
      () => db.query(
        `select public.correct_celeb_timeline_backfill($1,$2,$3,$4,$5,$6,$7)`,
        [celebId, oldRunId, 'c'.repeat(64), profileSnapshot(), correctedFingerprint, payload('https://archive.example/correct'), reason],
      ),
      /expected run is not the current completed unsuperseded run/,
    )
    const state = await db.query(`
      select
        (select count(*)::integer from public.celeb_timeline_events) as events,
        (select count(*)::integer from public.celeb_timeline_research_runs) as runs,
        (select superseded_by_run_id from public.celeb_timeline_research_runs where id = $1) as successor,
        (select payload ->> 'lastRunId' from public.celeb_task_queue where celeb_id = $2) as queue_run
    `, [oldRunId, celebId])
    assert.deepEqual(state.rows[0], { events: 3, runs: 1, successor: null, queue_run: oldRunId })
  } finally {
    await db.close()
  }
})

test('PGlite correction restores deleted events when a later insert constraint fails', async () => {
  const db = await fixtureDb()
  try {
    await db.exec(`alter table public.celeb_timeline_events add constraint reject_forced_failure check (source_url not like '%force-fail%')`)
    await assert.rejects(
      () => correct(db, payload('https://archive.example/force-fail'), 'd'.repeat(64)),
      /reject_forced_failure/,
    )
    const state = await db.query(`
      select
        (select count(*)::integer from public.celeb_timeline_events) as events,
        (select count(*)::integer from public.celeb_timeline_research_runs) as runs,
        (select superseded_by_run_id from public.celeb_timeline_research_runs where id = $1) as successor,
        (select source_url from public.celeb_timeline_events order by sort_order limit 1) as source_url
    `, [oldRunId])
    assert.equal(state.rows[0].events, 3)
    assert.equal(state.rows[0].runs, 1)
    assert.equal(state.rows[0].successor, null)
    assert.equal(state.rows[0].source_url, 'https://archive.example/view?code=one%26level=two')
  } finally {
    await db.close()
  }
})
