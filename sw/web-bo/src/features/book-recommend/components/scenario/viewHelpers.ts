/* ── view ↔ URL searchParam 동기화 ──
 *  ?view=meta      → 기본/기타 (인트로·메타)
 *  ?view=book-1    → 첫 번째 책
 *  ?view=book-2    → 두 번째 책
 *  파라미터 없으면 'meta' 디폴트.
 *  (locale = ko/en 은 기존대로 episode name suffix '-en' 으로 path 에서 결정한다)
 *
 *  하위호환: 옛 ?view=long / longform 도 메타로 매핑하고, VIEW_LONGFORM 상수를 reexport 한다.
 */
export const VIEW_META = 'meta'
export const VIEW_LONGFORM = VIEW_META  // 옛 import 호환

export function parseViewParam(raw: string | null): string {
  if (!raw || raw === 'meta' || raw === 'long' || raw === 'longform') return VIEW_META
  const m = raw.match(/^book-(\d+)$/)
  if (m) return `book-${parseInt(m[1], 10)}`
  return VIEW_META
}

export function viewToParam(view: string): string {
  if (view === VIEW_META) return 'meta'
  const m = view.match(/^book-(\d+)$/)
  return m ? `book-${m[1]}` : 'meta'
}

/** view 문자열이 'book-N' 이면 1-based 인덱스, 아니면 null 반환. */
export function viewToBookIndex(view: string): number | null {
  const m = view.match(/^book-(\d+)$/)
  return m ? parseInt(m[1], 10) : null
}
