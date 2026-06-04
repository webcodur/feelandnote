/**
 * sectionKey rename 유틸 — 책/쇼츠 구간 reorder 또는 segment.id 편집 시 wav 파일·
 * 타이밍 데이터·voice-select slots 를 일괄 갱신하기 위한 API 호출 헬퍼.
 *
 * 책 키 패턴:  D{NN}a-title / D{NN}b-summary / D{NN}c-context / D{NN}d{2k+1}-quote / D{NN}d{2k+2}-after
 * 쇼츠 키 패턴: shorts-{idx}/S{NN}-{segId}
 */

export type RenamePair = { from: string; to: string }

/** 책 순서 재배치 시의 rename 페어 계산.
 *  newOrder[i] = 새 위치 i 에 들어갈 옛 idx. (예: [2,0,1] = 옛 2번 책이 첫 자리로) */
export function bookReorderRenames(
  newOrder: number[],
  books: Array<{ quotePairs?: unknown[] } | null | undefined>,
): RenamePair[] {
  const out: RenamePair[] = []
  for (let newI = 0; newI < newOrder.length; newI++) {
    const oldI = newOrder[newI]
    if (typeof oldI !== 'number' || oldI === newI) continue
    const book = books[oldI]
    const oldP = `D${String(oldI + 1).padStart(2, '0')}`
    const newP = `D${String(newI + 1).padStart(2, '0')}`
    out.push({ from: `${oldP}a-title`, to: `${newP}a-title` })
    out.push({ from: `${oldP}b-summary`, to: `${newP}b-summary` })
    out.push({ from: `${oldP}c-context`, to: `${newP}c-context` })
    const pairs = Array.isArray(book?.quotePairs) ? book!.quotePairs.length : 0
    for (let pi = 0; pi < pairs; pi++) {
      out.push({ from: `${oldP}d${pi * 2 + 1}-quote`, to: `${newP}d${pi * 2 + 1}-quote` })
      out.push({ from: `${oldP}d${pi * 2 + 2}-after`, to: `${newP}d${pi * 2 + 2}-after` })
    }
  }
  return out
}

/** 쇼츠 구간 순서 재배치 시의 rename 페어 계산. */
export function segmentReorderRenames(
  shortsIndex: number,
  newOrder: number[],
  segments: Array<{ id?: string } | null | undefined>,
): RenamePair[] {
  const out: RenamePair[] = []
  for (let newI = 0; newI < newOrder.length; newI++) {
    const oldI = newOrder[newI]
    if (typeof oldI !== 'number' || oldI === newI) continue
    const seg = segments[oldI]
    const segId = seg?.id ?? ''
    if (!segId) continue
    const oldKey = `shorts-${shortsIndex}/S${String(oldI + 1).padStart(2, '0')}-${segId}`
    const newKey = `shorts-${shortsIndex}/S${String(newI + 1).padStart(2, '0')}-${segId}`
    out.push({ from: oldKey, to: newKey })
  }
  return out
}

/** 쇼츠 구간을 atIdx 위치에 중간 삽입할 때의 rename 페어 계산.
 *  atIdx 이상의 기존 구간이 한 칸씩 뒤로 밀리므로(S{n}→S{n+1}) 그 wav·타이밍·slots 를 함께 옮긴다.
 *  segments 는 삽입 *전* 배열. atIdx >= segments.length(끝 추가)면 밀리는 구간이 없어 빈 배열. */
export function segmentInsertRenames(
  shortsIndex: number,
  atIdx: number,
  segments: Array<{ id?: string } | null | undefined>,
): RenamePair[] {
  const out: RenamePair[] = []
  for (let i = atIdx; i < segments.length; i++) {
    const segId = segments[i]?.id ?? ''
    if (!segId) continue
    const oldKey = `shorts-${shortsIndex}/S${String(i + 1).padStart(2, '0')}-${segId}`
    const newKey = `shorts-${shortsIndex}/S${String(i + 2).padStart(2, '0')}-${segId}`
    out.push({ from: oldKey, to: newKey })
  }
  return out
}

/** 쇼츠 구간 삭제 시의 rename 페어 계산. atIdx 이후 구간이 한 칸씩 당겨진다(S{n}→S{n-1}).
 *  삭제 구간의 wav 는 호출부에서 따로 제거하고, 그 빈 자리로 다음 구간이 옮겨온다.
 *  segments 는 삭제 *전* 배열. atIdx 가 마지막이면 당겨올 구간이 없어 빈 배열. */
export function segmentDeleteRenames(
  shortsIndex: number,
  atIdx: number,
  segments: Array<{ id?: string } | null | undefined>,
): RenamePair[] {
  const out: RenamePair[] = []
  for (let i = atIdx + 1; i < segments.length; i++) {
    const segId = segments[i]?.id ?? ''
    if (!segId) continue
    const oldKey = `shorts-${shortsIndex}/S${String(i + 1).padStart(2, '0')}-${segId}`
    const newKey = `shorts-${shortsIndex}/S${String(i).padStart(2, '0')}-${segId}`
    out.push({ from: oldKey, to: newKey })
  }
  return out
}

/** 단일 구간의 segId 변경. idx 는 0-based. */
export function segmentIdRename(
  shortsIndex: number,
  idx: number,
  oldSegId: string,
  newSegId: string,
): RenamePair {
  const prefix = `shorts-${shortsIndex}/S${String(idx + 1).padStart(2, '0')}`
  return { from: `${prefix}-${oldSegId}`, to: `${prefix}-${newSegId}` }
}

/** rename API 호출. 빈 배열이면 호출 자체를 건너뛴다. */
export async function callRenameApi(
  series: string,
  episode: string,
  renames: RenamePair[],
): Promise<{ moved: string[]; errors: string[] }> {
  if (!renames.length) return { moved: [], errors: [] }
  const res = await fetch(`/api/${series}/voice/rename`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ episode, renames }),
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    return { moved: [], errors: [`HTTP ${res.status}: ${txt}`] }
  }
  return res.json()
}
