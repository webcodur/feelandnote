/**
 * 시나리오 외부 JSON 입출력 — 롱폼 책 본문 · 쇼츠 구간.
 * 솔로 파서(SoloSectionView/utils)와 역할 분리. 이미지·BGM·음성 메타는 보존하고 텍스트 축만 다룬다.
 */

/* ── 롱폼 책 본문 ── */

export type BookTextPatch = {
  summary?: string
  summaryParts?: string[]
  contextMain?: string
  contextMainParts?: string[]
  quotePairs?: Array<{
    quote: string
    quoteSource?: string
    after?: string
    afterParts?: string[]
  }>
}

/** 책 객체 → 붙여넣기용 텍스트 JSON (이미지·BGM·화자 설정 제외). */
export function serializeBookText(book: Record<string, unknown> | null | undefined): string {
  const b = book ?? {}
  const out: Record<string, unknown> = {}
  if (typeof b.summary === 'string') out.summary = b.summary
  if (Array.isArray(b.summaryParts) && b.summaryParts.every(x => typeof x === 'string')) {
    out.summaryParts = b.summaryParts
  }
  if (typeof b.contextMain === 'string') out.contextMain = b.contextMain
  if (Array.isArray(b.contextMainParts) && b.contextMainParts.every(x => typeof x === 'string')) {
    out.contextMainParts = b.contextMainParts
  }
  if (Array.isArray(b.quotePairs)) {
    out.quotePairs = (b.quotePairs as Array<Record<string, unknown>>).map(p => {
      const q: Record<string, unknown> = {
        quote: typeof p.quote === 'string' ? p.quote : '',
      }
      if (typeof p.quoteSource === 'string' && p.quoteSource) q.quoteSource = p.quoteSource
      if (typeof p.after === 'string' && p.after) q.after = p.after
      if (Array.isArray(p.afterParts) && p.afterParts.length > 1 && p.afterParts.every(x => typeof x === 'string')) {
        q.afterParts = p.afterParts
      }
      return q
    })
  }
  return JSON.stringify(out, null, 2)
}

function cleanStringParts(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return null
  if (!raw.every(x => typeof x === 'string')) return null
  return (raw as string[]).map(s => s.trim()).filter(Boolean)
}

/**
 * 책 본문 JSON 파싱.
 * 허용: { summary?, contextMain?, summaryParts?, contextMainParts?, quotePairs? }
 * 최소 한 필드라도 있어야 한다.
 */
export function parseBookTextJson(
  raw: string,
): { ok: true; patch: BookTextPatch } | { ok: false; error: string } {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (e: unknown) {
    return { ok: false, error: 'JSON 파싱 오류: ' + (e instanceof Error ? e.message : String(e)) }
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, error: '객체 { summary, contextMain, quotePairs, ... } 형식이어야 합니다' }
  }
  const o = parsed as Record<string, unknown>
  const patch: BookTextPatch = {}

  if (o.summary !== undefined) {
    if (typeof o.summary !== 'string') return { ok: false, error: 'summary 는 문자열이어야 합니다' }
    patch.summary = o.summary
  }
  if (o.summaryParts !== undefined) {
    const parts = cleanStringParts(o.summaryParts)
    if (!parts) return { ok: false, error: 'summaryParts 는 문자열 배열이어야 합니다' }
    patch.summaryParts = parts
    if (patch.summary === undefined) patch.summary = parts.join('\n\n')
  }

  if (o.contextMain !== undefined) {
    if (typeof o.contextMain !== 'string') return { ok: false, error: 'contextMain 는 문자열이어야 합니다' }
    patch.contextMain = o.contextMain
  }
  if (o.contextMainParts !== undefined) {
    const parts = cleanStringParts(o.contextMainParts)
    if (!parts) return { ok: false, error: 'contextMainParts 는 문자열 배열이어야 합니다' }
    patch.contextMainParts = parts
    if (patch.contextMain === undefined) patch.contextMain = parts.join('\n\n')
  }

  if (o.quotePairs !== undefined) {
    if (!Array.isArray(o.quotePairs)) return { ok: false, error: 'quotePairs 는 배열이어야 합니다' }
    const pairs: BookTextPatch['quotePairs'] = []
    for (let i = 0; i < o.quotePairs.length; i++) {
      const item = o.quotePairs[i]
      if (!item || typeof item !== 'object') {
        return { ok: false, error: `quotePairs[${i}] 가 객체가 아닙니다` }
      }
      const p = item as Record<string, unknown>
      if (typeof p.quote !== 'string') {
        return { ok: false, error: `quotePairs[${i}].quote 가 필요합니다` }
      }
      const pair: NonNullable<BookTextPatch['quotePairs']>[number] = { quote: p.quote }
      if (typeof p.quoteSource === 'string') pair.quoteSource = p.quoteSource
      if (typeof p.after === 'string') pair.after = p.after
      if (p.afterParts !== undefined) {
        const ap = cleanStringParts(p.afterParts)
        if (!ap) return { ok: false, error: `quotePairs[${i}].afterParts 는 문자열 배열이어야 합니다` }
        if (ap.length > 1) pair.afterParts = ap
        if (pair.after === undefined && ap.length) pair.after = ap.join('\n\n')
      }
      pairs.push(pair)
    }
    patch.quotePairs = pairs
  }

  if (
    patch.summary === undefined
    && patch.contextMain === undefined
    && patch.quotePairs === undefined
    && patch.summaryParts === undefined
    && patch.contextMainParts === undefined
  ) {
    return { ok: false, error: 'summary / contextMain / quotePairs 중 하나 이상 필요합니다' }
  }

  return { ok: true, patch }
}

/**
 * 기존 책 객체에 텍스트 패치를 병합. 이미지·BGM·화자 등 비텍스트 필드는 유지.
 * summaryParts 가 오면 본문과 동기화하고, 본문만 오면 분할 키를 제거한다.
 */
export function mergeBookTextPatch(
  book: Record<string, unknown>,
  patch: BookTextPatch,
): Record<string, unknown> {
  const next: Record<string, unknown> = { ...book }

  if (patch.summaryParts !== undefined) {
    const clean = patch.summaryParts.map(s => s.trim()).filter(Boolean)
    if (clean.length > 0) {
      next.summary = clean.join('\n\n')
      if (clean.length > 1) next.summaryParts = clean
      else delete next.summaryParts
    }
  } else if (patch.summary !== undefined) {
    next.summary = patch.summary
    delete next.summaryParts
  }

  if (patch.contextMainParts !== undefined) {
    const clean = patch.contextMainParts.map(s => s.trim()).filter(Boolean)
    if (clean.length > 0) {
      next.contextMain = clean.join('\n\n')
      if (clean.length > 1) next.contextMainParts = clean
      else delete next.contextMainParts
    }
  } else if (patch.contextMain !== undefined) {
    next.contextMain = patch.contextMain
    delete next.contextMainParts
  }

  if (patch.quotePairs !== undefined) {
    next.quotePairs = patch.quotePairs.map(p => {
      const pair: Record<string, unknown> = { quote: p.quote }
      if (p.quoteSource) pair.quoteSource = p.quoteSource
      if (p.after) {
        pair.after = p.after
        if (p.afterParts && p.afterParts.length > 1) pair.afterParts = p.afterParts
      }
      return pair
    })
    if ((next.quotePairs as unknown[]).length === 0) delete next.quotePairs
  }

  return next
}

/* ── 쇼츠 구간 ── */

/** 쇼츠 segments → JSON 문자열. */
export function serializeShortsSegments(segments: unknown[]): string {
  return JSON.stringify({ segments }, null, 2)
}

/**
 * 쇼츠 segments JSON 파싱.
 * 허용: { "segments": [...] } 또는 배열.
 * 각 항목은 id·text 문자열 필수. 나머지 필드는 통째 보존.
 */
export function parseShortsSegmentsJson(
  raw: string,
): { ok: true; segments: Array<Record<string, unknown>> } | { ok: false; error: string } {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (e: unknown) {
    return { ok: false, error: 'JSON 파싱 오류: ' + (e instanceof Error ? e.message : String(e)) }
  }

  let list: unknown[]
  if (Array.isArray(parsed)) {
    list = parsed
  } else if (parsed && typeof parsed === 'object' && Array.isArray((parsed as { segments?: unknown }).segments)) {
    list = (parsed as { segments: unknown[] }).segments
  } else {
    return { ok: false, error: '{ "segments": [...] } 또는 배열 형식이어야 합니다' }
  }

  const segments: Array<Record<string, unknown>> = []
  const usedIds = new Set<string>()

  for (let i = 0; i < list.length; i++) {
    const item = list[i]
    if (!item || typeof item !== 'object') {
      return { ok: false, error: `${i + 1}번째 구간이 객체가 아닙니다` }
    }
    const o = item as Record<string, unknown>
    if (typeof o.id !== 'string' || !o.id.trim()) {
      return { ok: false, error: `${i + 1}번째 구간에 id(문자열)가 필요합니다` }
    }
    if (typeof o.text !== 'string') {
      return { ok: false, error: `${i + 1}번째 구간에 text(문자열)가 필요합니다` }
    }
    const id = o.id.trim()
    if (usedIds.has(id)) {
      return { ok: false, error: `구간 id 중복: ${id}` }
    }
    usedIds.add(id)
    segments.push({ ...o, id, text: o.text })
  }

  return { ok: true, segments }
}
