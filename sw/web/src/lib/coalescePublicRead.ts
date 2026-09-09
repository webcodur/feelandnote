type PublicReadArgument = string | number | boolean | null | readonly (string | number | boolean | null)[]

/**
 * 동일 인자의 공개 DB 조회가 실행 중일 때만 결과를 공유한다.
 * unstable_cache의 콜백 안에 사용해 요청별 태그·재검증 처리는 Next에 남긴다.
 * cookies/auth/request signal에 의존하는 조회에는 사용하지 않는다.
 */
export function coalescePublicRead<Args extends PublicReadArgument[], Result>(
  read: (...args: Args) => Promise<Result>,
): (...args: Args) => Promise<Result> {
  const inFlight = new Map<string, Promise<Result>>()
  return (...args) => {
    const key = JSON.stringify(args)
    const existing = inFlight.get(key)
    if (existing) return existing

    const pending = Promise.resolve()
      .then(() => read(...args))
      .finally(() => { inFlight.delete(key) })
    inFlight.set(key, pending)
    return pending
  }
}
