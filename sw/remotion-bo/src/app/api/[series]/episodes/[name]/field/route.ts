import { NextResponse } from 'next/server'
import { loadEpisode, saveEpisode } from '@/lib/server-utils'
import { isValidSeries } from '@/lib/series-registry'

/**
 * PATCH /api/[series]/episodes/[name]/field
 *
 * 롱폼 필드 단위 부분 저장. 디스크 최신 에피소드를 읽어 지정된 path만 교체 후 저장한다.
 * 다른 탭·세션이 바꾼 다른 필드는 보존된다.
 *
 * body: { path: (string|number)[], value: unknown }
 * 예: { path: ['narrator','serviceGreeting'], value: '안녕하세요' }
 *     { path: ['books', 0, 'summary'], value: '...' }
 *     { path: ['books', 0, 'quotePairs', 1, 'quote'], value: '...' }
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ series: string; name: string }> }) {
  const { series, name } = await params
  if (!isValidSeries(series)) return NextResponse.json({ error: 'invalid series' }, { status: 404 })
  try {
    const body = await req.json()
    const { path, value } = body as { path?: Array<string | number>; value?: unknown }
    if (!Array.isArray(path) || path.length === 0) {
      return NextResponse.json({ error: 'path(non-empty array) required' }, { status: 400 })
    }
    if (!path.every(k => typeof k === 'string' || typeof k === 'number')) {
      return NextResponse.json({ error: 'path entries must be string|number' }, { status: 400 })
    }

    const ep = await loadEpisode(series, name) as Record<string, unknown>
    const next = setDeep(ep, path, value)
    await saveEpisode(series, name, next)
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}

/** 중첩 경로에 값 세팅. 배열/객체 얕은 복사 체인으로 불변 갱신. */
function setDeep(obj: unknown, path: Array<string | number>, value: unknown): any {
  if (path.length === 0) return value
  const [head, ...rest] = path
  const isIdx = typeof head === 'number'
  if (isIdx) {
    const arr = Array.isArray(obj) ? [...obj] : []
    arr[head] = setDeep(arr[head], rest, value)
    return arr
  }
  const base = (obj && typeof obj === 'object' && !Array.isArray(obj)) ? { ...(obj as Record<string, unknown>) } : {}
  base[head] = setDeep(base[head], rest, value)
  return base
}
