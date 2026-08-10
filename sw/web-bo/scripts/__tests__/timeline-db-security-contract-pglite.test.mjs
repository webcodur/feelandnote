import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { PGlite } from '@electric-sql/pglite'

import {
  EXPECTED_TIMELINE_SECURITY_CONTRACT,
  validateTimelineSecurityContract,
} from '../lib/timeline-direct-contract.mjs'

const migrationUrl = new URL(
  '../../../web/supabase/migrations/20260810004016_timeline_direct_db_security_contract.sql',
  import.meta.url,
)

const baselineSql = String.raw`
  create role anon nologin;
  create role authenticated nologin;
  create role authenticator login noinherit;
  create role cli_login_postgres login noinherit;
  create role service_role nologin bypassrls;
  create role supabase_storage_admin login noinherit createrole;
  create role supabase_admin nologin superuser;

  set role supabase_admin;
  grant service_role to authenticator with inherit false, set true;
  grant postgres to cli_login_postgres with inherit false, set true;
  grant authenticator to postgres with admin option, inherit true, set true;
  grant service_role to postgres with admin option, inherit true, set true;
  grant authenticator to supabase_storage_admin with inherit false, set true;
  set allow_system_table_mods = on;
  update pg_catalog.pg_auth_members
  set grantor = (select oid from pg_catalog.pg_roles where rolname = 'supabase_admin')
  where roleid in (
    select oid
    from pg_catalog.pg_roles
    where rolname in ('authenticator', 'postgres', 'service_role')
  )
    and member in (
      select oid
      from pg_catalog.pg_roles
      where rolname in ('authenticator', 'cli_login_postgres', 'postgres', 'supabase_storage_admin')
    );
  update pg_catalog.pg_authid
  set
    rolsuper = false,
    rolcanlogin = true,
    rolinherit = true,
    rolcreaterole = true,
    rolcreatedb = true,
    rolreplication = true,
    rolbypassrls = true
  where rolname = 'postgres';
  reset role;

  create table public.celeb_task_queue (id bigint primary key);
  create table public.celeb_timeline_events (id uuid primary key default gen_random_uuid());
  create table public.celeb_timeline_research_runs (id uuid primary key default gen_random_uuid());

  alter table public.celeb_timeline_research_runs enable row level security;
  alter table public.celeb_timeline_research_runs force row level security;

  revoke all on public.celeb_task_queue from public, anon, authenticated, service_role;
  grant select, insert, update, delete on public.celeb_task_queue to service_role;
  revoke all on public.celeb_timeline_events from public, anon, authenticated, service_role;
  grant select, insert, update, delete on public.celeb_timeline_events to service_role;
  revoke all on public.celeb_timeline_research_runs from public, anon, authenticated, service_role;
  grant select, insert on public.celeb_timeline_research_runs to service_role;

  create function public.enqueue_missing_celeb_timeline_backfill_jobs()
  returns jsonb language sql stable security definer set search_path = pg_catalog
  as $$ select '{}'::jsonb $$;

  create function public.claim_next_celeb_timeline_backfill(text, integer)
  returns jsonb language sql stable security definer set search_path = pg_catalog
  as $$ select '{}'::jsonb $$;

  create function public.renew_celeb_timeline_backfill_lease(uuid, text, uuid, integer)
  returns jsonb language sql stable security definer set search_path = pg_catalog
  as $$ select '{}'::jsonb $$;

  create function public.complete_celeb_timeline_backfill(uuid, text, uuid, jsonb, text, jsonb)
  returns jsonb language sql stable security definer set search_path = pg_catalog
  as $$ select '{}'::jsonb $$;

  create function public.correct_celeb_timeline_backfill(uuid, uuid, text, jsonb, text, jsonb, text)
  returns jsonb language sql stable security definer set search_path = pg_catalog
  as $$ select '{}'::jsonb $$;

  create function public.fail_celeb_timeline_backfill(uuid, text, uuid, text, boolean, jsonb, text, jsonb)
  returns jsonb language sql stable security definer set search_path = pg_catalog
  as $$ select '{}'::jsonb $$;

  create function public.requeue_celeb_timeline_backfill(uuid, text, boolean)
  returns jsonb language sql stable security definer set search_path = pg_catalog
  as $$ select '{}'::jsonb $$;

  create function public.get_celeb_timeline_backfill_status()
  returns jsonb language sql stable security definer set search_path = pg_catalog
  as $$ select '{}'::jsonb $$;
`

async function createDatabase() {
  const db = new PGlite()
  await db.exec(baselineSql)
  await db.exec(await readFile(migrationUrl, 'utf8'))
  return db
}

test('security migration returns the exact catalog contract and detects partial-column privilege drift', async () => {
  const db = await createDatabase()
  try {
    const result = await db.query(
      'select public.get_celeb_timeline_backfill_security_contract() as contract',
    )
    assert.deepEqual(result.rows[0].contract, EXPECTED_TIMELINE_SECURITY_CONTRACT)
    assert.deepEqual(validateTimelineSecurityContract(result.rows[0].contract), [])

    await db.exec('alter role authenticator inherit')
    const roleAttributeDrift = await db.query(
      'select public.get_celeb_timeline_backfill_security_contract() as contract',
    )
    assert.equal(
      roleAttributeDrift.rows[0].contract.serviceRoleAccess.roleMatrix
        .find((role) => role.name === 'authenticator').inherit,
      true,
    )
    assert.equal(validateTimelineSecurityContract(roleAttributeDrift.rows[0].contract).length, 1)
    await db.exec('alter role authenticator noinherit')

    await db.exec('grant service_role to anon with inherit false, set true')
    const directMembershipDrift = await db.query(
      'select public.get_celeb_timeline_backfill_security_contract() as contract',
    )
    assert.equal(
      directMembershipDrift.rows[0].contract.serviceRoleAccess.roleMatrix
        .find((role) => role.name === 'anon').set,
      true,
    )
    assert.equal(validateTimelineSecurityContract(directMembershipDrift.rows[0].contract).length, 1)
    await db.exec('revoke service_role from anon')

    await db.exec(String.raw`
      create role rogue_membership_role nologin noinherit;
      grant service_role to rogue_membership_role with inherit false, set true;
      grant rogue_membership_role to anon with inherit false, set true;
    `)
    const transitiveMembershipDrift = await db.query(
      'select public.get_celeb_timeline_backfill_security_contract() as contract',
    )
    assert.equal(
      transitiveMembershipDrift.rows[0].contract.serviceRoleAccess.roleMatrix
        .find((role) => role.name === 'anon').set,
      true,
    )
    assert.ok(
      transitiveMembershipDrift.rows[0].contract.serviceRoleAccess.membershipEdges
        .some((edge) => edge.member === 'anon' && edge.grantedRole === 'rogue_membership_role'),
    )
    assert.equal(validateTimelineSecurityContract(transitiveMembershipDrift.rows[0].contract).length, 1)
    await db.exec(String.raw`
      revoke rogue_membership_role from anon;
      revoke service_role from rogue_membership_role;
      drop role rogue_membership_role;
    `)

    await db.exec('alter role service_role nobypassrls')
    const noBypass = await db.query(
      'select public.get_celeb_timeline_backfill_security_contract() as contract',
    )
    assert.equal(noBypass.rows[0].contract.runs.serviceRole.bypassRls, false)
    assert.equal(validateTimelineSecurityContract(noBypass.rows[0].contract).length, 1)
    await db.exec('alter role service_role bypassrls')

    await db.exec(String.raw`
      grant execute on function public.get_celeb_timeline_backfill_status()
      to service_role with grant option;
    `)
    const grantOption = await db.query(
      'select public.get_celeb_timeline_backfill_security_contract() as contract',
    )
    assert.equal(
      grantOption.rows[0].contract.rpcs.get_celeb_timeline_backfill_status
        .executeAcl.find((entry) => entry.grantee === 'service_role').grantable,
      true,
    )
    assert.equal(validateTimelineSecurityContract(grantOption.rows[0].contract).length, 1)
    await db.exec(String.raw`
      revoke grant option for execute
      on function public.get_celeb_timeline_backfill_status()
      from service_role;
    `)

    await db.exec(String.raw`
      create role rogue_role nologin;
      grant select on public.celeb_timeline_research_runs to rogue_role;
    `)
    const rogue = await db.query(
      'select public.get_celeb_timeline_backfill_security_contract() as contract',
    )
    assert.ok(rogue.rows[0].contract.runs.acl.table.rogue_role)
    assert.equal(validateTimelineSecurityContract(rogue.rows[0].contract).length, 1)
    await db.exec('revoke select on public.celeb_timeline_research_runs from rogue_role')

    await db.exec(String.raw`
      revoke select on public.celeb_timeline_research_runs from service_role;
      grant select (id) on public.celeb_timeline_research_runs to service_role;
    `)
    const partial = await db.query(
      'select public.get_celeb_timeline_backfill_security_contract() as contract',
    )
    assert.equal(partial.rows[0].contract.runs.privileges.service_role.select, false)
    assert.notDeepEqual(partial.rows[0].contract.runs.acl.columns, [])
    assert.equal(validateTimelineSecurityContract(partial.rows[0].contract).length, 1)

    await db.exec(String.raw`
      revoke select (id) on public.celeb_timeline_research_runs from service_role;
      revoke insert on public.celeb_task_queue from service_role;
      grant insert (id) on public.celeb_task_queue to service_role;
    `)
    const dependencyPartial = await db.query(
      'select public.get_celeb_timeline_backfill_security_contract() as contract',
    )
    assert.equal(
      dependencyPartial.rows[0].contract.dependencies.celeb_task_queue.service_role.insert,
      false,
    )
    assert.equal(validateTimelineSecurityContract(dependencyPartial.rows[0].contract).length, 1)
  } finally {
    await db.close()
  }
})

test('security migration leaves shared queue/event grants untouched and pins all nine RPCs', async () => {
  const migration = await readFile(migrationUrl, 'utf8')
  assert.doesNotMatch(
    migration,
    /revoke\s+[^;]*\bon\s+(?:table\s+)?public\.(?:celeb_task_queue|celeb_timeline_events)/i,
  )
  assert.match(migration, /get_celeb_timeline_backfill_security_contract\(\)/)
  assert.equal(
    Object.keys(EXPECTED_TIMELINE_SECURITY_CONTRACT.rpcs).length,
    9,
  )
})

test('migration assertion rejects a dependency with only one-column INSERT', async () => {
  const db = new PGlite()
  try {
    await db.exec(baselineSql)
    await db.exec(String.raw`
      revoke insert on public.celeb_task_queue from service_role;
      grant insert (id) on public.celeb_task_queue to service_role;
    `)
    await assert.rejects(
      () => readFile(migrationUrl, 'utf8').then((migration) => db.exec(migration)),
      /timeline security contract mismatch/,
    )
  } finally {
    await db.close()
  }
})

test('migration assertion rejects an unexpected runs ACL grantee', async () => {
  const db = new PGlite()
  try {
    await db.exec(baselineSql)
    await db.exec(String.raw`
      create role rogue_role nologin;
      grant select on public.celeb_timeline_research_runs to rogue_role;
    `)
    await assert.rejects(
      () => readFile(migrationUrl, 'utf8').then((migration) => db.exec(migration)),
      /timeline security contract mismatch/,
    )
  } finally {
    await db.close()
  }
})

test('migration assertion rejects an anon-to-rogue-to-service_role SET chain', async () => {
  const db = new PGlite()
  try {
    await db.exec(baselineSql)
    await db.exec(String.raw`
      create role rogue_membership_role nologin noinherit;
      grant service_role to rogue_membership_role with inherit false, set true;
      grant rogue_membership_role to anon with inherit false, set true;
    `)
    await assert.rejects(
      () => readFile(migrationUrl, 'utf8').then((migration) => db.exec(migration)),
      /timeline security contract mismatch/,
    )
  } finally {
    await db.close()
  }
})
