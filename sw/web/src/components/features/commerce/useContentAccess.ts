'use client'

import { useEffect, useMemo, useState } from 'react'
import { ACCESS_CLIENT_CACHE_MS, ACCESS_STREAM_TIMEOUT_MS, accessSources, withAccessFallback, type AccessSource, type AccessSourceState, type AccessType, type ContentAccess } from '@/lib/commerce/contentAccess'
import { applyAccessEvent, readAccessStream } from '@/lib/commerce/accessStream'

const cache = new Map<string, { until: number; data: ContentAccess }>()
const keyOf = (id: string, source: AccessSource) => `${id}:${source}`
const initial = (id: string, sources: readonly AccessSource[], initialAccess?: ContentAccess) => Object.fromEntries(sources.map(source => {
  const saved = cache.get(keyOf(id, source))
  const data = saved && saved.until > Date.now() ? saved.data : undefined
  const fallback = withAccessFallback(data ?? { links: [] }, source, initialAccess)
  const state: AccessSourceState = data || fallback.links.length
    ? { status: 'ready', phase: 'identity', data: fallback } : { status: 'loading', phase: 'identity' }
  return [source, state]
})) as Partial<Record<AccessSource, AccessSourceState>>

/** API 요청 하나에서 판매처별 이벤트를 받는다. 재시도는 실패한 판매처만 다시 요청한다. */
export function useContentAccess(contentId: string, type: AccessType, initialAccess?: ContentAccess) {
  const sources = useMemo(() => accessSources(type, initialAccess), [type, initialAccess])
  const [states, setStates] = useState(() => initial(contentId, sources, initialAccess))
  const [retrySources, setRetrySources] = useState<AccessSource[] | null>(null)
  useEffect(() => {
    // Apple 차트의 확인된 곡·영화 링크는 DB 등록 없이 쓴다. Steam ID만 다른 플랫폼으로 정확히 역조회한다.
    if (initialAccess && type !== 'GAME') return
    const available = initial(contentId, sources)
    const requested = retrySources ?? sources.filter(source => available[source]?.status !== 'ready')
    if (!requested.length) return
    const controller = new AbortController()
    const pending = new Set(requested)
    const timer = setTimeout(() => controller.abort(), ACCESS_STREAM_TIMEOUT_MS)
    let alive = true
    const run = async () => {
      try {
        const response = await fetch(`/api/content-access/${contentId}?sources=${requested.join(',')}`, { signal: controller.signal, cache: 'no-store' })
        if (!response.ok || !response.body) throw new Error('Access response unavailable')
        await readAccessStream(response.body, event => {
          if (!alive || !requested.includes(event.source)) return
          if (event.kind !== 'progress') pending.delete(event.source)
          if (event.kind === 'result') {
            event = { ...event, data: withAccessFallback(event.data, event.source, initialAccess) }
            for (const [key, value] of cache) if (value.until <= Date.now()) cache.delete(key)
            if (cache.size >= 400) cache.delete(cache.keys().next().value!)
            cache.set(keyOf(contentId, event.source), { until: Date.now() + ACCESS_CLIENT_CACHE_MS, data: event.data })
          }
          setStates(previous => ({ ...previous, [event.source]: applyAccessEvent(previous[event.source] ?? { status: 'loading', phase: 'identity' }, event) }))
        })
      } catch { controller.abort() /* 아래에서 아직 대기 중인 판매처만 오류로 바꾼다. */ }
      finally {
        clearTimeout(timer)
        if (alive && pending.size) setStates(previous => ({ ...previous, ...Object.fromEntries([...pending].map(source => [source,
          applyAccessEvent(previous[source] ?? { status: 'loading', phase: 'identity' }, { kind: 'error', source })])) }))
      }
    }
    // 개발 모드의 mount → cleanup → mount에서도 취소된 첫 효과는 요청을 보내지 않는다.
    queueMicrotask(() => { if (alive) void run() })
    return () => { alive = false; clearTimeout(timer); controller.abort() }
  }, [contentId, type, sources, initialAccess, retrySources])
  const retry = () => {
    setStates(previous => Object.fromEntries(Object.entries(previous).map(([source, state]) => [source,
      state.status === 'error' ? { status: 'loading', phase: 'identity' } : state])))
    setRetrySources(sources.filter(source => states[source]?.status === 'error'))
  }
  return { states, sources, retry }
}
