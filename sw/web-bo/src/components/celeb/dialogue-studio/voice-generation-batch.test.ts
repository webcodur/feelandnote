import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CELEB_VOICE_BATCH_CONCURRENCY,
  runVoiceJobsWithConcurrency,
} from './voice-generation-batch'

test('음성 일괄 생성은 두 건을 병렬 처리하고 공급자 한도를 넘기지 않는다', async () => {
  let active = 0
  let maxActive = 0
  const started: number[] = []

  const results = await runVoiceJobsWithConcurrency([1, 2, 3, 4], async job => {
    active += 1
    maxActive = Math.max(maxActive, active)
    started.push(job)
    await new Promise(resolve => setTimeout(resolve, 15))
    active -= 1
    return job * 10
  })

  assert.equal(CELEB_VOICE_BATCH_CONCURRENCY, 2)
  assert.equal(maxActive, 2)
  assert.deepEqual(started.slice(0, 2).sort(), [1, 2])
  assert.deepEqual(results, [
    { status: 'fulfilled', value: 10 },
    { status: 'fulfilled', value: 20 },
    { status: 'fulfilled', value: 30 },
    { status: 'fulfilled', value: 40 },
  ])
})

test('한 작업이 실패해도 나머지 음성 작업을 끝까지 처리한다', async () => {
  const completed: number[] = []
  const results = await runVoiceJobsWithConcurrency([1, 2, 3], async job => {
    if (job === 2) throw new Error('provider failure')
    completed.push(job)
    return job
  })

  assert.deepEqual(completed.sort(), [1, 3])
  assert.equal(results[1]?.status, 'rejected')
})
