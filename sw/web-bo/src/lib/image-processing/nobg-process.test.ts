import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { PassThrough } from 'node:stream'
import type { spawn } from 'node:child_process'
import test from 'node:test'
import { runNobg } from './nobg-process'

function fixture() {
  const child = Object.assign(new EventEmitter(), { stdout: new PassThrough(), stderr: new PassThrough(), pid: 123 })
  let killed = false
  return { child, options: {
    spawnProcess: (() => child) as unknown as typeof spawn,
    terminate: async () => { killed = true },
    timeoutMs: 100,
  }, killed: () => killed }
}

test('자원 여유 회복 뒤에는 실제 무응답 제한을 다시 적용한다', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const f = fixture()
  const result = runNobg('unused', 1, f.options)
  const failure = assert.rejects(result, /진척/)
  f.child.stdout.write('누끼 자원 대기(model): VRAM 부족\n')
  t.mock.timers.tick(1000)
  assert.equal(f.killed(), false)
  f.child.stdout.write('누끼 자원 여유 회복: model 단계 재개\n')
  t.mock.timers.tick(100)
  await failure
  assert.equal(f.killed(), true)
})

test('분리된 stdout chunk도 줄 단위로 대기를 판별한다', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const f = fixture()
  const messages: string[] = []
  const result = runNobg('unused', 1, { ...f.options, onProgress: (m) => messages.push(m) })
  f.child.stdout.write('누끼 자원 대')
  f.child.stdout.write('기(image): VRAM 부족\n')
  t.mock.timers.tick(1000)
  assert.equal(f.killed(), false)
  assert.deepEqual(messages, ['누끼 자원 대기(image): VRAM 부족'])
  f.child.emit('close', 0)
  await result
})

test('정상 장별 진척은 타이머를 갱신하고 성공 종료 후 타이머가 남지 않는다', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const f = fixture()
  const result = runNobg('unused', 2, f.options)
  t.mock.timers.tick(90)
  f.child.stdout.write('[1/2] 완료: first (1.0s)\n')
  t.mock.timers.tick(90)
  assert.equal(f.killed(), false)
  f.child.emit('close', 0)
  assert.match(await result, /완료/)
  t.mock.timers.tick(1000)
  assert.equal(f.killed(), false)
})

test('실제 GPU 추론 실패는 성공으로 바꾸지 않고 전달한다', async () => {
  const f = fixture()
  const result = runNobg('unused', 1, f.options)
  f.child.stderr.write('CUDA 메모리 부족')
  f.child.emit('close', 1)
  await assert.rejects(result, /CUDA 메모리 부족/)
})

for (const message of [
  '누끼 작업 대기: 다른 누끼 모델 프로세스가 실행 중입니다.',
  '누끼 자원 대기(model): VRAM 여유 1.20GiB < 7.00GiB',
  '누끼 자원 대기(image): VRAM 여유 1.20GiB < 1.50GiB',
]) {
  test(`중앙 도구의 대기 중에는 전체시간 제한으로 죽이지 않는다: ${message}`, async (t) => {
    t.mock.timers.enable({ apis: ['setTimeout'] })
    const f = fixture()
    const result = runNobg('unused', 1, f.options)
    void result.catch(() => {})
    f.child.stdout.write(message + '\n')
    t.mock.timers.tick(1000)
    await Promise.resolve()
    assert.equal(f.killed(), false)
    f.child.emit('close', 0)
    await result
  })
}
