import assert from 'node:assert/strict'
import { execFile, spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { promisify } from 'node:util'
import test from 'node:test'

const execFileAsync = promisify(execFile)
const tierGuardMigrationUrl = new URL(
  '../../../web/supabase/migrations/20260810123232_timeline_celeb_tier_position_guard.sql',
  import.meta.url,
)
const serializationMigrationUrl = new URL(
  '../../../web/supabase/migrations/20260810034422_timeline_event_position_guard_serialization.sql',
  import.meta.url,
)

function findPostgresBin() {
  const candidates = [
    process.env.TIMELINE_PG_BIN,
    'C:/Program Files/PostgreSQL/17/bin',
    '/usr/lib/postgresql/17/bin',
    '/usr/local/pgsql/bin',
  ].filter(Boolean)
  return candidates.find((candidate) => existsSync(join(candidate, process.platform === 'win32' ? 'psql.exe' : 'psql'))) ?? null
}

function executable(bin, name) {
  return join(bin, process.platform === 'win32' ? `${name}.exe` : name)
}

async function runWithoutInheritedPipes(command, args, timeoutMs = 35_000) {
  await new Promise((resolveRun, reject) => {
    let settled = false
    const child = spawn(command, args, {
      stdio: 'ignore',
      windowsHide: true,
    })
    const timeout = setTimeout(() => {
      if (settled) return
      settled = true
      child.kill('SIGKILL')
      reject(new Error(`${basename(command)} timed out after ${timeoutMs}ms; args=${JSON.stringify(args)}`))
    }, timeoutMs)
    child.once('error', (error) => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      reject(error)
    })
    child.once('exit', (code) => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      if (code === 0) resolveRun()
      else reject(new Error(`${basename(command)} exited with code ${code}`))
    })
  })
}

async function freePort() {
  const server = createServer()
  await new Promise((resolveListen, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolveListen)
  })
  const address = server.address()
  assert.ok(address && typeof address === 'object')
  const port = address.port
  await new Promise((resolveClose, reject) => server.close((error) => error ? reject(error) : resolveClose()))
  return port
}

function session(psql, connectionEnv, applicationName) {
  const child = spawn(psql, ['-X', '-q', '-v', 'ON_ERROR_STOP=1', '-At'], {
    env: { ...connectionEnv, PGAPPNAME: applicationName },
    stdio: ['pipe', 'pipe', 'pipe'],
    windowsHide: true,
  })
  let stdout = ''
  let stderr = ''
  const listeners = new Set()
  const publish = () => {
    for (const listener of listeners) listener()
  }
  child.stdout.setEncoding('utf8')
  child.stderr.setEncoding('utf8')
  child.stdout.on('data', (chunk) => {
    stdout += chunk
    publish()
  })
  child.stderr.on('data', (chunk) => {
    stderr += chunk
    publish()
  })
  child.on('exit', publish)

  return {
    child,
    write(sql) {
      child.stdin.write(`${sql}\n`)
    },
    async waitForText(text, timeoutMs = 10_000) {
      if (stdout.includes(text)) return
      await new Promise((resolveWait, reject) => {
        const timeout = setTimeout(() => {
          listeners.delete(check)
          reject(new Error(`psql ${applicationName} did not emit ${text}; stdout=${stdout}; stderr=${stderr}`))
        }, timeoutMs)
        const check = () => {
          if (stdout.includes(text)) {
            clearTimeout(timeout)
            listeners.delete(check)
            resolveWait()
          } else if (child.exitCode != null) {
            clearTimeout(timeout)
            listeners.delete(check)
            reject(new Error(`psql ${applicationName} exited before ${text}; stdout=${stdout}; stderr=${stderr}`))
          }
        }
        listeners.add(check)
        check()
      })
    },
    async waitForExit(timeoutMs = 10_000) {
      if (child.exitCode != null) return { code: child.exitCode, stdout, stderr }
      return new Promise((resolveExit, reject) => {
        const timeout = setTimeout(() => reject(new Error(`psql ${applicationName} did not exit`)), timeoutMs)
        child.once('exit', (code) => {
          clearTimeout(timeout)
          resolveExit({ code, stdout, stderr })
        })
      })
    },
    output() {
      return { stdout, stderr }
    },
  }
}

async function waitForDatabaseLock(query, applicationName) {
  const deadline = Date.now() + 10_000
  while (Date.now() < deadline) {
    const result = await query(`
      select coalesce(wait_event_type, '') || ':' || coalesce(wait_event, '')
      from pg_stat_activity
      where application_name = '${applicationName}' and state = 'active'
    `)
    if (result.trim().startsWith('Lock:')) return result.trim()
    await new Promise((resolveWait) => setTimeout(resolveWait, 25))
  }
  throw new Error(`${applicationName} never entered a real PostgreSQL lock wait`)
}

const postgresBin = findPostgresBin()

test('real PostgreSQL serializes event writes against celeb tier updates in both directions', {
  skip: postgresBin ? false : 'PostgreSQL 17 binaries are unavailable; set TIMELINE_PG_BIN to run this concurrency regression.',
  timeout: 120_000,
}, async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), 'timeline-serialization-'))
  const dataDir = join(tempRoot, 'data')
  const logPath = join(tempRoot, 'postgres.log')
  const port = await freePort()
  const initdb = executable(postgresBin, 'initdb')
  const pgCtl = executable(postgresBin, 'pg_ctl')
  const psql = executable(postgresBin, 'psql')
  const connectionEnv = {
    ...process.env,
    PGHOST: '127.0.0.1',
    PGPORT: String(port),
    PGDATABASE: 'postgres',
    PGUSER: 'postgres',
    PGCLIENTENCODING: 'UTF8',
  }
  const sessions = new Set()
  let started = false
  let startAttempted = false

  const run = async (sql, applicationName = 'serialization-setup') => {
    const { stdout } = await execFileAsync(psql, ['-X', '-q', '-v', 'ON_ERROR_STOP=1', '-At', '-c', sql], {
      env: { ...connectionEnv, PGAPPNAME: applicationName },
      windowsHide: true,
      timeout: 15_000,
      killSignal: 'SIGKILL',
      maxBuffer: 10 * 1024 * 1024,
    })
    return stdout
  }

  const open = (applicationName) => {
    const opened = session(psql, connectionEnv, applicationName)
    sessions.add(opened)
    opened.child.once('exit', () => sessions.delete(opened))
    return opened
  }

  try {
    await execFileAsync(initdb, ['-D', dataDir, '-A', 'trust', '-U', 'postgres', '--no-locale', '--encoding=UTF8'], {
      windowsHide: true,
      timeout: 30_000,
      killSignal: 'SIGKILL',
      maxBuffer: 10 * 1024 * 1024,
    })
    startAttempted = true
    await runWithoutInheritedPipes(
      pgCtl,
      ['-D', dataDir, '-l', logPath, '-w', '-t', '30', '-o', `-p ${port} -h 127.0.0.1`, 'start'],
    )
    started = true

    await run(`
      create role anon nologin;
      create role authenticated nologin;
      create role service_role nologin;
      create schema private;
      create table public.celebs (
        id uuid primary key,
        celeb_tier text not null,
        note text
      );
      create table public.celeb_timeline_events (
        id bigint generated always as identity primary key,
        celeb_id uuid not null references public.celebs(id),
        year integer,
        year_end integer,
        month smallint,
        day smallint,
        sequence_label text,
        sequence_label_en text,
        title text not null,
        kind text not null,
        sort_order integer not null
      );
      create or replace function private.timeline_event_position_guard()
      returns trigger language plpgsql security definer set search_path=pg_catalog as $$
      declare v_tier text;
      begin
        select celeb.celeb_tier into v_tier
        from public.celebs as celeb where celeb.id = new.celeb_id;
        if v_tier = 'fiction' then
          if new.year is not null or nullif(btrim(new.sequence_label), '') is null
            or nullif(btrim(new.sequence_label_en), '') is null then
            raise exception 'fiction timeline events require bilingual sequence labels and no calendar date';
          end if;
        elsif new.sequence_label is not null or new.sequence_label_en is not null
          or (new.year is null and (new.year_end is not null or new.month is not null or new.day is not null)) then
          raise exception 'life timeline events require null sequence labels and no date residue when undated';
        end if;
        return new;
      end;
      $$;
      create trigger trg_timeline_event_position_guard
      before insert or update of celeb_id,year,year_end,month,day,sequence_label,sequence_label_en
      on public.celeb_timeline_events for each row
      execute function private.timeline_event_position_guard();
    `)

    await run(await readFile(tierGuardMigrationUrl, 'utf8'))
    await run(await readFile(serializationMigrationUrl, 'utf8'))

    const lifeId = '11111111-1111-1111-1111-111111111111'
    await run(`insert into public.celebs(id,celeb_tier) values ('${lifeId}','full')`)
    const coordinatorOne = open('coordinator-one')
    coordinatorOne.write(`select pg_advisory_lock(91001); select 'COORDINATOR_ONE_READY';`)
    await coordinatorOne.waitForText('COORDINATOR_ONE_READY')

    const eventFirst = open('event-first-a')
    eventFirst.write(`
      begin;
      insert into public.celeb_timeline_events
        (celeb_id,year,year_end,month,day,sequence_label,sequence_label_en,title,kind,sort_order)
      values ('${lifeId}',null,null,null,null,null,null,'undated life event','other',0);
      select 'EVENT_FIRST_LOCKED';
      select pg_advisory_lock(91001);
      commit;
      select 'EVENT_FIRST_COMMITTED';
      \\q
    `)
    await eventFirst.waitForText('EVENT_FIRST_LOCKED')

    const tierSecond = open('tier-second-b')
    tierSecond.write(`
      begin;
      update public.celebs set celeb_tier='fiction' where id='${lifeId}';
      commit;
      select 'TIER_SECOND_COMMITTED';
      \\q
    `)
    assert.match(await waitForDatabaseLock(run, 'tier-second-b'), /^Lock:/)
    coordinatorOne.write(`select pg_advisory_unlock(91001); \\q`)

    const eventFirstExit = await eventFirst.waitForExit()
    const tierSecondExit = await tierSecond.waitForExit()
    assert.equal(eventFirstExit.code, 0, eventFirstExit.stderr)
    assert.match(eventFirstExit.stdout, /EVENT_FIRST_COMMITTED/)
    assert.notEqual(tierSecondExit.code, 0)
    assert.match(tierSecondExit.stderr, /celeb tier change would invalidate fiction timeline positions/)
    assert.equal((await run(`
      select celeb.celeb_tier || ':' || count(event.id)::text
      from public.celebs as celeb
      left join public.celeb_timeline_events as event on event.celeb_id=celeb.id
      where celeb.id='${lifeId}' group by celeb.celeb_tier
    `)).trim(), 'full:1')

    const fictionId = '22222222-2222-2222-2222-222222222222'
    await run(`insert into public.celebs(id,celeb_tier) values ('${fictionId}','fiction')`)
    const coordinatorTwo = open('coordinator-two')
    coordinatorTwo.write(`select pg_advisory_lock(91002); select 'COORDINATOR_TWO_READY';`)
    await coordinatorTwo.waitForText('COORDINATOR_TWO_READY')

    const tierFirst = open('tier-first-a')
    tierFirst.write(`
      begin;
      update public.celebs set celeb_tier='full' where id='${fictionId}';
      select 'TIER_FIRST_LOCKED';
      select pg_advisory_lock(91002);
      commit;
      select 'TIER_FIRST_COMMITTED';
      \\q
    `)
    await tierFirst.waitForText('TIER_FIRST_LOCKED')

    const eventSecond = open('event-second-b')
    eventSecond.write(`
      begin;
      insert into public.celeb_timeline_events
        (celeb_id,year,year_end,month,day,sequence_label,sequence_label_en,title,kind,sort_order)
      values ('${fictionId}',null,null,null,null,'Act 1','Act 1','fiction event','other',1);
      commit;
      select 'EVENT_SECOND_COMMITTED';
      \\q
    `)
    assert.match(await waitForDatabaseLock(run, 'event-second-b'), /^Lock:/)
    coordinatorTwo.write(`select pg_advisory_unlock(91002); \\q`)

    const tierFirstExit = await tierFirst.waitForExit()
    const eventSecondExit = await eventSecond.waitForExit()
    assert.equal(tierFirstExit.code, 0, tierFirstExit.stderr)
    assert.match(tierFirstExit.stdout, /TIER_FIRST_COMMITTED/)
    assert.notEqual(eventSecondExit.code, 0)
    assert.match(eventSecondExit.stderr, /life timeline events require null sequence labels/)
    assert.equal((await run(`
      select celeb.celeb_tier || ':' || count(event.id)::text
      from public.celebs as celeb
      left join public.celeb_timeline_events as event on event.celeb_id=celeb.id
      where celeb.id='${fictionId}' group by celeb.celeb_tier
    `)).trim(), 'full:0')

    const normalLifeId = '33333333-3333-3333-3333-333333333333'
    const normalFictionId = '44444444-4444-4444-4444-444444444444'
    await run(`
      insert into public.celebs(id,celeb_tier) values
        ('${normalLifeId}','full'),('${normalFictionId}','fiction');
      insert into public.celeb_timeline_events
        (celeb_id,year,year_end,month,day,sequence_label,sequence_label_en,title,kind,sort_order)
      values
        ('${normalLifeId}',null,null,null,null,null,null,'normal undated life','other',0),
        ('${normalFictionId}',null,null,null,null,'Act 1 KO','Act 1 EN','preserved fiction','other',1);
      update public.celebs set celeb_tier=celeb_tier, note='no tier change' where id='${normalFictionId}';
    `)
    assert.equal((await run(`
      select sequence_label || ':' || sequence_label_en || ':' || sort_order::text
      from public.celeb_timeline_events where celeb_id='${normalFictionId}'
    `)).trim(), 'Act 1 KO:Act 1 EN:1')
  } finally {
    const openSessions = [...sessions]
    for (const opened of openSessions) {
      if (opened.child.exitCode == null) {
        try {
          opened.child.stdin.end('\\q\n')
        } catch {
          // The psql process may have exited between the exitCode check and stdin close.
        }
        opened.child.kill()
      }
    }
    await Promise.all(openSessions.map(async (opened) => {
      if (opened.child.exitCode != null) return
      await opened.waitForExit(2_000).catch(() => {
        opened.child.kill('SIGKILL')
      })
    }))
    if (started || (startAttempted && existsSync(join(dataDir, 'postmaster.pid')))) {
      try {
        await execFileAsync(
          pgCtl,
          ['-D', dataDir, '-w', '-t', '30', '-m', 'immediate', 'stop'],
          {
            windowsHide: true,
            timeout: 35_000,
            killSignal: 'SIGKILL',
            maxBuffer: 10 * 1024 * 1024,
          },
        )
      } catch (error) {
        const children = openSessions.map((opened) => ({
          pid: opened.child.pid,
          exitCode: opened.child.exitCode,
          ...opened.output(),
        }))
        throw new Error(
          `isolated PostgreSQL cleanup failed; tempRoot=${tempRoot}; children=${JSON.stringify(children)}; cause=${error instanceof Error ? error.message : String(error)}`,
          { cause: error },
        )
      }
    }
    const resolvedTemp = resolve(tempRoot)
    assert.equal(dirname(resolvedTemp), resolve(tmpdir()))
    assert.match(basename(resolvedTemp), /^timeline-serialization-/)
    await rm(resolvedTemp, { recursive: true, force: true })
  }
})
