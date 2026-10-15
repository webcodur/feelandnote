// 실행 중인 요청 하나와 마지막 대기 요청 하나만 유지한다. 중간 조건은 전송하지 않는다.
export function createLatestRequestRunner<Input, Result>(read: (input: Input) => Promise<Result>) {
  type Job = { input: Input; resolve: (value: Result | undefined) => void; reject: (error: unknown) => void }
  let running = false
  let waiting: Job | undefined
  function start(job: Job) {
    running = true
    void Promise.resolve().then(() => read(job.input)).then(job.resolve, job.reject).finally(() => {
      running = false
      const next = waiting
      waiting = undefined
      if (next) start(next)
    })
  }
  const run = (input: Input): Promise<Result | undefined> => new Promise((resolve, reject) => {
    const job = { input, resolve, reject }
    if (running) { waiting?.resolve(undefined); waiting = job }
    else start(job)
  })
  run.clearPending = () => { waiting?.resolve(undefined); waiting = undefined }
  return run
}
