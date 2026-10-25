import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import test from 'node:test'
import ts from 'typescript'

const require = createRequire(import.meta.url)

async function loadModule(file, dependencies, globals = {}) {
  const code = ts.transpileModule(await readFile(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText
  const exports = {}
  const context = vm.createContext({
    exports, module: { exports }, console, setTimeout, clearTimeout,
    require: (id) => Object.hasOwn(dependencies, id) ? dependencies[id] : require(id),
    ...globals,
  })
  vm.runInContext(code, context, { filename: file.pathname })
  return exports
}

async function until(predicate) {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (await predicate()) return
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
  assert.fail('저장 큐의 재개·완료 진척이 없습니다.')
}

test('서버 시작이 중단된 작업부터 복구하고 10장 이하 단일 배치로 큐를 비운다', async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'feelandnote-queue-recovery-'))
  t.after(async () => {
    assert.ok(path.resolve(directory).startsWith(path.resolve(os.tmpdir()) + path.sep))
    await rm(directory, { recursive: true })
  })
  const queueFile = path.join(directory, '.tmp/image-processing/queue.json')
  await mkdir(path.dirname(queueFile), { recursive: true })
  const createdAt = '2026-10-23T11:00:00.000Z'
  const originalJobs = Array.from({ length: 13 }, (_, index) => ({
    id: `job-${index}`, celebId: `celeb-${index}`, type: 'nobg-avatar-only',
    status: index === 0 ? 'running' : 'queued', createdAt,
    ...(index === 0 ? { startedAt: createdAt } : {}),
  }))
  const completed = { id: 'already-done', celebId: 'old', status: 'done', createdAt, resultUrl: 'existing' }
  await writeFile(queueFile, JSON.stringify({
    jobs: [...originalJobs, completed], pendingIds: originalJobs.slice(1).map((job) => job.id),
  }))

  const batches = []
  let active = 0
  let peak = 0
  let releaseFirst
  const firstBatch = new Promise((resolve) => { releaseFirst = resolve })
  const queue = await loadModule(new URL('./queue.ts', import.meta.url), {
    './nobg-avatar': {
      processNobgAvatars: async (ids, onResult) => {
        batches.push([...ids])
        peak = Math.max(peak, ++active)
        if (batches.length === 1) await firstBatch
        for (const id of ids) onResult(id, { url: `cutout:${id}` })
        active--
      },
    },
  }, { process: { cwd: () => directory, pid: process.pid } })

  const startup = await loadModule(new URL('../../instrumentation.ts', import.meta.url), {
    './lib/image-processing/queue': queue,
  }, { process: { env: { NEXT_RUNTIME: 'nodejs' } } })
  await Promise.all([startup.register(), startup.register()])
  await until(() => batches.length === 1)
  assert.deepEqual(batches[0], originalJobs.slice(0, 10).map((job) => job.celebId))
  const working = JSON.parse(await readFile(queueFile, 'utf8'))
  assert.equal(working.pendingIds.length, 3)
  releaseFirst()
  await until(async () => {
    const state = JSON.parse(await readFile(queueFile, 'utf8'))
    return state.jobs.every((job) => job.status === 'done') && state.pendingIds.length === 0
  })
  assert.equal(peak, 1)
  assert.deepEqual(batches.map((batch) => batch.length), [10, 3])
  const done = JSON.parse(await readFile(queueFile, 'utf8'))
  assert.deepEqual(done.jobs.find((job) => job.id === 'already-done'), completed)
})

test('Edge 시작에서는 로컬 누끼 큐를 불러오지 않는다', async () => {
  let imports = 0
  const startup = await loadModule(new URL('../../instrumentation.ts', import.meta.url), {
    get './lib/image-processing/queue'() { imports++; return {} },
  }, { process: { env: { NEXT_RUNTIME: 'edge' } } })
  await startup.register()
  assert.equal(imports, 0)
})
