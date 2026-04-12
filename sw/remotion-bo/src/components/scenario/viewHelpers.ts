/* ── view ↔ URL searchParam 동기화 ──
 *  ?view=long       → 롱폼
 *  ?view=short-1    → 첫 번째 쇼츠
 *  ?view=short-2    → 두 번째 쇼츠
 *  파라미터 없으면 'long' 디폴트.
 *  (locale = ko/en 은 기존대로 episode name suffix '-en' 으로 path에서 결정한다)
 */
export const VIEW_LONGFORM = 'longform'

export function parseViewParam(raw: string | null): string {
  if (!raw || raw === 'long' || raw === 'longform') return VIEW_LONGFORM
  const m = raw.match(/^short[-]?(\d+)$/)
  if (m) return `shorts-${parseInt(m[1], 10)}`
  return VIEW_LONGFORM
}

export function viewToParam(view: string): string {
  if (view === VIEW_LONGFORM) return 'long'
  const m = view.match(/^shorts-(\d+)$/)
  return m ? `short-${m[1]}` : 'long'
}
