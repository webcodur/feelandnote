/**
 * 현재 연결된 ElevenLabs 계정 중 가장 낮은 eleven_v3 동시성 한도가 2(Free)다.
 * Gemini와 ElevenLabs가 섞여도 한 번에 두 건만 보내 공급자 제한 안에서 병렬 처리한다.
 */
export const CELEB_VOICE_BATCH_CONCURRENCY = 2

/** 입력 순서를 보존하면서 정해진 수만큼만 동시에 실행한다. 한 작업 실패가 나머지를 끊지 않는다. */
export async function runVoiceJobsWithConcurrency<Job, Result>(
  jobs: readonly Job[],
  run: (job: Job, index: number) => Promise<Result>,
  concurrency = CELEB_VOICE_BATCH_CONCURRENCY,
): Promise<PromiseSettledResult<Result>[]> {
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new Error(`voice concurrency must be a positive integer: ${concurrency}`)
  }

  const results = new Array<PromiseSettledResult<Result>>(jobs.length)
  let nextIndex = 0

  const worker = async () => {
    while (true) {
      const index = nextIndex
      nextIndex += 1
      if (index >= jobs.length) return

      try {
        results[index] = { status: 'fulfilled', value: await run(jobs[index]!, index) }
      } catch (reason) {
        results[index] = { status: 'rejected', reason }
      }
    }
  }

  const workerCount = Math.min(concurrency, jobs.length)
  await Promise.all(Array.from({ length: workerCount }, () => worker()))
  return results
}
