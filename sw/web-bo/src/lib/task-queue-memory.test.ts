import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'
import type { Task } from '@feelandnote/shared/bo/task-queue'

const code = ts.transpileModule(readFileSync(new URL('../../../../packages/shared/src/bo/task-queue.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText

function loadQueue(tasks = new Map<string, Task>()) {
  const child = Object.assign(new EventEmitter(), { stdout: new EventEmitter(), stderr: new EventEmitter() })
  const exports = {}
  vm.runInNewContext(code, {
    exports, __tasks: tasks, process: { platform: 'win32' },
    require: (name: string) => {
      if (name === 'child_process') return { spawn: () => child }
      if (name === './remotion-root') return { REMOTION_ROOT: 'unused-test-directory' }
      throw new Error(`Unexpected dependency: ${name}`)
    },
  })
  return { queue: exports as typeof import('@feelandnote/shared/bo/task-queue'), tasks, child }
}

test('오래된 완료 작업을 정리하고 실행·대기 중인 작업은 모두 보존한다', () => {
  const tasks = new Map<string, Task>()
  for (let index = 0; index < 250; index++) {
    const id = String(index)
    tasks.set(id, { id, type: 'render', series: 'book-recommend', episode: id, status: 'done', log: [], startedAt: String(index).padStart(5, '0') })
  }
  for (let index = 0; index < 24; index++) {
    const id = `active-${index}`
    tasks.set(id, { id, type: 'render', series: 'book-recommend', episode: id, status: index % 2 ? 'queued' : 'running', log: [], startedAt: '00000' })
  }
  const { queue } = loadQueue(tasks)
  const visible = queue.getTasks()
  assert.ok(tasks.size < 274, '화면에서 사라진 완료 작업을 계속 메모리에 보관하면 안 된다')
  for (let index = 0; index < 24; index++) {
    assert.ok(queue.getTask(`active-${index}`))
    assert.ok(visible.some(task => task.id === `active-${index}`))
  }
  assert.ok(queue.getTask('249'), '최근 완료 작업은 보존한다')
})

test('실행 로그가 계속 나와도 메모리가 늘지 않고 마지막 로그를 보존한다', () => {
  const { queue, child } = loadQueue()
  const task = queue.runTask('render', 'book-recommend', 'test', ['test-only'])
  child.stdout.emit('data', Buffer.from(Array.from({ length: 10000 }, (_, i) => `first-${i}`).join('\n')))
  const retained = task.log.length
  assert.ok(retained > 20 && retained < 10000)
  child.stderr.emit('data', Buffer.from(Array.from({ length: 10000 }, (_, i) => `second-${i}`).join('\n')))
  assert.equal(task.log.length, retained)
  assert.equal(task.log.at(-1), 'second-9999')
})
