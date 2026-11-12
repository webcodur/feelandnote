// 요청이 끝난 뒤 다음 조회를 예약한다. 숨긴 탭과 떠난 화면에는 작업을 남기지 않는다.
export function createVisiblePoller(poll: (signal: AbortSignal) => Promise<boolean>, interval: number) {
  const page = document
  let disposed = false
  let timer: ReturnType<typeof setTimeout> | undefined
  let request: AbortController | undefined
  let refreshPending = false

  function clearTimer() {
    clearTimeout(timer)
    timer = undefined
  }

  function refresh() {
    clearTimer()
    if (disposed || page.hidden) return
    if (request) { refreshPending = true; return }
    refreshPending = false
    const controller = new AbortController()
    request = controller
    void (async () => {
      let again = true
      try { again = await poll(controller.signal) }
      catch { /* 일시적인 조회 실패는 다음 주기에 다시 확인한다. */ }
      finally {
        request = undefined
        if (!disposed && !page.hidden) {
          if (refreshPending) refresh()
          else if (again) timer = setTimeout(refresh, interval)
        }
      }
    })()
  }

  function onVisibilityChange() {
    if (page.hidden) { clearTimer(); request?.abort() }
    else refresh()
  }

  page.addEventListener('visibilitychange', onVisibilityChange)
  refresh()
  return {
    refresh,
    dispose() {
      disposed = true
      clearTimer()
      request?.abort()
      page.removeEventListener('visibilitychange', onVisibilityChange)
    },
  }
}
