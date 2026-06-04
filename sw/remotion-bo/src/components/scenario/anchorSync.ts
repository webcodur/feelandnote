/**
 * 본문 편집 시 이미지 앵커(구절)를 살아있게 유지하는 동기화 유틸.
 *
 * 배경: 이미지 앵커는 본문 안의 짧은 구절(text)을 저장하고, 렌더·편집기가 indexOf 로 위치를 찾는다.
 * 유저가 그 구절 자체를 고치면 indexOf 가 실패해 앵커가 풀린다(이미지가 엉뚱한 위치로 가거나 폴백).
 *
 * 해결: 본문 커밋 시 옛 본문과 새 본문을 비교해 "문자 위치 매핑"을 만들고,
 * 각 앵커의 옛 시작 오프셋을 새 본문 오프셋으로 옮긴 뒤, 그 위치에서 시작하는
 * 짧은 고유 구절을 새 앵커 text 로 재추출한다. 즉 앵커는 "위치"로 살아남고 text 는 표시·매칭용으로 갱신된다.
 *
 * 변화 추적 방식(diff-match-patch 미사용 — JS 의존성에 없음):
 *   공통 prefix 길이 P, 공통 suffix 길이 S 를 구해 옛/새 본문을 [prefix][중간][suffix] 세 토막으로 본다.
 *   편집은 가운데 한 구간의 치환(삽입·삭제·교체)으로 모델링한다. 한 번의 커밋은 보통 한 곳의 편집이므로 충분하다.
 */

/** 옛 오프셋 → 새 오프셋 매핑에 필요한 편집 구간 정보. */
interface EditSpan {
  /** 공통 prefix 길이 — 이 위치 전까지는 옛/새 동일. */
  prefix: number
  /** 옛 본문에서 편집 구간 끝(이 위치부터 suffix). oldMid = old.slice(prefix, oldEnd) */
  oldEnd: number
  /** 새 본문에서 편집 구간 끝(이 위치부터 suffix). newMid = next.slice(prefix, newEnd) */
  newEnd: number
  /** 새 본문 길이 변화량(newMid.length - oldMid.length). */
  delta: number
}

/** 옛/새 본문의 공통 prefix·suffix 로 단일 편집 구간을 계산한다. */
function computeEditSpan(oldText: string, newText: string): EditSpan {
  const oldLen = oldText.length
  const newLen = newText.length
  // 공통 prefix
  let prefix = 0
  const maxPrefix = Math.min(oldLen, newLen)
  while (prefix < maxPrefix && oldText[prefix] === newText[prefix]) prefix++
  // 공통 suffix (prefix 와 겹치지 않는 범위까지만)
  let suffix = 0
  const maxSuffix = Math.min(oldLen, newLen) - prefix
  while (
    suffix < maxSuffix &&
    oldText[oldLen - 1 - suffix] === newText[newLen - 1 - suffix]
  ) suffix++
  const oldEnd = oldLen - suffix
  const newEnd = newLen - suffix
  return { prefix, oldEnd, newEnd, delta: newEnd - (oldEnd - prefix) - prefix }
}

/**
 * 옛 본문 오프셋을 새 본문 오프셋으로 옮긴다.
 *   - prefix 이전(앞쪽 공통 구간): 그대로.
 *   - suffix 이후(뒤쪽 공통 구간): delta 만큼 이동.
 *   - 편집 구간 한가운데: 새 편집 구간 시작(prefix)으로 모은다(가장 가까운 살아남은 경계).
 */
function mapOffset(off: number, span: EditSpan): number {
  if (off <= span.prefix) return off
  if (off >= span.oldEnd) return off + span.delta
  // 편집 구간 내부 — 새 편집 구간 시작으로 보낸다.
  return span.prefix
}

/** 공백류(스페이스·줄바꿈·탭 등) 판정. 어절 경계 탐색용. */
function isSpace(ch: string): boolean {
  return /\s/.test(ch)
}

/**
 * 새 본문의 start 위치에서 시작하는 "짧은 고유 구절"을 만든다.
 *   - 어절 단위로 1개씩 확장하며 본문에서 유일(indexOf === start 이고 다음 occurrence 없음)해지는 최소 구절을 찾는다.
 *   - 최대 maxWords 어절까지 확장해도 유일하지 않으면 그 구절을 그대로 쓴다(렌더 indexOf 는 첫 매칭을 쓰므로 위치는 보존).
 *   - start 가 본문 끝이면 빈 문자열 반환(앵커 소실 신호).
 */
function uniquePhraseFrom(text: string, start: number, maxWords = 4): string {
  if (start >= text.length) return ''
  // 시작점이 공백이면 다음 비공백으로 당긴다.
  let s = start
  while (s < text.length && isSpace(text[s])) s++
  if (s >= text.length) return ''

  let end = s
  let words = 0
  while (words < maxWords && end < text.length) {
    // 한 어절 전진: 비공백 묶음 + 뒤따르는 공백 묶음
    while (end < text.length && !isSpace(text[end])) end++
    const phrase = text.slice(s, end).trim()
    if (phrase.length >= 2 && isUnique(text, phrase, s)) return phrase
    // 다음 어절을 붙이기 위해 공백 건너뛰기
    while (end < text.length && isSpace(text[end])) end++
    words++
  }
  const phrase = text.slice(s, end).trim()
  return phrase
}

/** phrase 가 text 안에서 expectedStart(>=0) 위치에서만 등장하는지(유일 식별) 판정.
 *  expectedStart 가 음수(미존재)면 항상 false — 없는 구절을 unique 로 오판하지 않게 한다. */
function isUnique(text: string, phrase: string, expectedStart: number): boolean {
  if (expectedStart < 0 || !phrase) return false
  const first = text.indexOf(phrase)
  if (first !== expectedStart) return false
  return text.indexOf(phrase, first + 1) < 0
}

/** 한 앵커의 동기화 결과. */
export type AnchorRemapResult =
  | { kind: 'kept'; text: string }       // text 무변(본문 안에 그대로 있음)
  | { kind: 'remapped'; text: string }   // 위치 이전 후 새 구절로 갱신
  | { kind: 'lost' }                     // 가리키던 구간이 통째로 사라짐

/**
 * 한 앵커 구절을 옛→새 본문으로 이전한다.
 *
 *   1) 옛 구절이 새 본문에 그대로 있고 유일하면 그대로 유지(kept).
 *   2) 아니면 옛 본문 내 앵커 시작 오프셋을 새 본문 오프셋으로 매핑하고,
 *      그 위치에서 짧은 고유 구절을 재추출해 갱신(remapped).
 *   3) 매핑 위치가 본문 끝을 넘거나 추출 구절이 비면 소실(lost).
 */
export function remapAnchor(oldText: string, newText: string, anchor: string): AnchorRemapResult {
  // 옛 본문에서 앵커 위치 — 못 찾으면 이전 불가(이미 깨진 앵커). 위치 기준 매핑 포기, 본문에 있으면 유지.
  const oldStart = oldText.indexOf(anchor)
  if (oldStart < 0) {
    // 옛 본문에서도 못 찾던 앵커. 새 본문에 있으면 그대로 두고, 없으면 소실.
    return newText.includes(anchor) ? { kind: 'kept', text: anchor } : { kind: 'lost' }
  }

  const span = computeEditSpan(oldText, newText)

  // 앵커 전 구간이 편집과 무관(앵커 끝이 prefix 이하) → 위치·구절 모두 그대로.
  const oldEndOfAnchor = oldStart + anchor.length
  if (oldEndOfAnchor <= span.prefix) {
    return newText.includes(anchor) ? { kind: 'kept', text: anchor } : { kind: 'remapped', text: anchor }
  }

  // 앵커가 편집 구간보다 뒤(앵커 시작이 oldEnd 이상) → 위치만 delta 이동, 구절 동일.
  if (oldStart >= span.oldEnd) {
    return newText.includes(anchor) ? { kind: 'kept', text: anchor } : { kind: 'remapped', text: anchor }
  }

  // 앵커가 편집 구간에 걸침 — 옛 구절이 새 본문에 그대로 유일하게 남아있으면 유지.
  if (isUnique(newText, anchor, newText.indexOf(anchor))) return { kind: 'kept', text: anchor }

  // 위치 이전: 옛 시작 오프셋 → 새 오프셋.
  const newStart = mapOffset(oldStart, span)
  if (newStart >= newText.length) return { kind: 'lost' }

  const phrase = uniquePhraseFrom(newText, newStart)
  if (!phrase) return { kind: 'lost' }
  return { kind: 'remapped', text: phrase }
}

/**
 * 한 필드 본문만 바뀐 경우의 부분 재매핑 — 옛 필드 본문(oldText)에 실제로 들어있는 앵커만 이전 대상으로 본다.
 *
 * 롱폼은 한 책의 모든 앵커가 book.images[] 한 배열에 모여 있고(요약·배경·인용 공용 풀),
 * 한 번의 편집은 한 필드 본문(summary | contextMain | quote | after)만 바꾼다.
 * 다른 필드에 속한 앵커는 oldText 안에 없으므로 건드리지 않고 그대로 통과시킨다(회귀 방지).
 */
export function remapAnchorsInField<T extends { text?: string; file?: string }>(
  oldText: string,
  newText: string,
  images: T[],
  onLog?: (msg: string) => void,
): T[] {
  if (oldText === newText) return images
  return images.map(img => {
    // 이 필드 본문 안에 있던 앵커만 재매핑 — 그 외(다른 필드 소속·빈 앵커)는 그대로 둔다.
    if (!img.text || oldText.indexOf(img.text) < 0) return img
    const r = remapAnchor(oldText, newText, img.text)
    if (r.kind === 'kept') return img
    if (r.kind === 'remapped') {
      if (r.text !== img.text) onLog?.(`[앵커 이전] "${img.text}" → "${r.text}"`)
      return { ...img, text: r.text }
    }
    // 소실 — 이미지가 붙어 있으면 슬롯은 살리고 앵커만 떼고, 빈 앵커 슬롯이면 그대로 둔다(롱폼은 슬롯 제거를 호출부가 안 함).
    onLog?.(`[앵커 소실] "${img.text}" 가리키던 구간 삭제됨 — 앵커 해제`)
    const rest = { ...img }
    delete (rest as { text?: string }).text
    return rest
  })
}

/** 이미지 배열의 각 앵커 text 를 옛→새 본문으로 재매핑한 새 배열을 만든다.
 *  소실된 앵커의 file 이 비어 있으면 그 슬롯을 제거하고, 이미지가 붙어 있으면 슬롯은 두되 앵커만 떼서 보존한다.
 *  변경·소실 내역은 onLog 로 알린다(무음 소실 금지). */
export function remapImageAnchors<T extends { text?: string; file?: string }>(
  oldText: string,
  newText: string,
  images: T[],
  onLog?: (msg: string) => void,
): T[] {
  if (oldText === newText) return images
  const result: T[] = []
  for (const img of images) {
    if (!img.text) { result.push(img); continue }
    const r = remapAnchor(oldText, newText, img.text)
    if (r.kind === 'kept') {
      result.push(img)
    } else if (r.kind === 'remapped') {
      if (r.text !== img.text) onLog?.(`[앵커 이전] "${img.text}" → "${r.text}"`)
      result.push({ ...img, text: r.text })
    } else {
      // 소실 — 이미지 파일이 있으면 슬롯은 살리고 앵커만 떼고, 없으면 슬롯 제거.
      if (img.file) {
        onLog?.(`[앵커 소실] "${img.text}" 가리키던 구간 삭제됨 — 이미지 슬롯은 유지(앵커 해제)`)
        const { ...rest } = img
        delete (rest as { text?: string }).text
        result.push(rest)
      } else {
        onLog?.(`[앵커 제거] "${img.text}" 가리키던 구간 삭제됨 — 빈 슬롯 제거`)
      }
    }
  }
  return result
}

/** 쇼츠 imageChangeAt 항목({t, image, text}) 배열의 text 앵커를 옛→새 본문으로 재매핑한다.
 *  소실 시 image(파일 경로)가 있으면 슬롯은 살리고 text 만 떼고, 비어 있으면 슬롯을 제거한다.
 *  segToimages/mediaPath 변환 없이 imageChangeAt 원형을 그대로 다뤄 풀 경로를 보존한다. */
export function remapChangeAnchors<T extends { text?: string; image?: string }>(
  oldText: string,
  newText: string,
  changes: T[],
  onLog?: (msg: string) => void,
): T[] {
  if (oldText === newText) return changes
  const result: T[] = []
  for (const c of changes) {
    if (!c.text) { result.push(c); continue }
    const r = remapAnchor(oldText, newText, c.text)
    if (r.kind === 'kept') {
      result.push(c)
    } else if (r.kind === 'remapped') {
      if (r.text !== c.text) onLog?.(`[앵커 이전] "${c.text}" → "${r.text}"`)
      result.push({ ...c, text: r.text })
    } else if (c.image) {
      onLog?.(`[앵커 소실] "${c.text}" 가리키던 구간 삭제됨 — 이미지 슬롯은 유지(앵커 해제)`)
      const rest = { ...c }
      delete (rest as { text?: string }).text
      result.push(rest)
    } else {
      onLog?.(`[앵커 제거] "${c.text}" 가리키던 구간 삭제됨 — 빈 슬롯 제거`)
    }
  }
  return result
}
