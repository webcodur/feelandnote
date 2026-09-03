/**
 * 목록 항목과 우리 서재·서점 책이 같은 작품인지 재는 규칙 한 벌
 *
 * 적재(`titles-apply.ts`)와 진단(`why-kakao-failed.ts`)이 같은 자를 써야 한다.
 * 각자 복사해 두면 한쪽만 고쳐져 「진단은 통과인데 적재는 실패」가 난다.
 */

/** 제목 정규화 — 괄호와 부제(콜론 뒤)를 떼고 글자만 남긴다 */
export function normTitle(s: string): string {
  return s
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[:：].*$/, ' ')
    .replace(/\b(the|a|an)\b/g, ' ')
    .replace(/[^\p{L}\p{N}]/gu, '')
}

/** 부제까지 남긴 정규화 — 「전집 1: 백의민족」처럼 뒤쪽에 진짜 제목이 오는 표기를 잡는다 */
export function normTitleFull(s: string): string {
  return s
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\b(the|a|an)\b/g, ' ')
    .replace(/[^\p{L}\p{N}]/gu, '')
}

export function normCreator(s: string): string {
  return s
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^\p{L}\p{N}]/gu, '')
}

/**
 * 이름을 토막으로 쪼갠다. 한 글자짜리는 가운뎃이름 이니셜이라 버린다.
 * 「토머스 S. 쿤」 → [토머스, 쿤] · 「G. W. F. 헤겔」 → [헤겔]
 */
export function creatorTokens(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .split(/[\s.,·^&/;|]+/)
    .map((t) => t.replace(/[^\p{L}\p{N}]/gu, ''))
    .filter((t) => t.length >= 2)
}

/** 편집 거리 1 이하인지 — 「프로이트」와 「프로이드」 같은 음역 차이를 넘기 위한 것이다 */
function nearlySame(a: string, b: string): boolean {
  if (a === b) return true
  if (a.length < 3 || b.length < 3) return false
  if (Math.abs(a.length - b.length) > 1) return false
  let i = 0
  let j = 0
  let diff = 0
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++
      j++
      continue
    }
    if (++diff > 1) return false
    if (a.length === b.length) {
      i++
      j++
    } else if (a.length > b.length) i++
    else j++
  }
  return diff + (a.length - i) + (b.length - j) <= 1
}

/**
 * 같은 사람인가.
 *
 * 🔴 문자열 포함 검사만으로는 이니셜·가운뎃이름 차이를 못 넘는다. 「토머스 S. 쿤」과
 * 「토머스 쿤」이 서로를 포함하지 않아 서재에 있는 『과학혁명의 구조』를 못 찾고
 * 「없는 책」으로 떨어뜨렸다(26.09.03). 그래서 토막 단위 비교를 함께 쓴다.
 * 음역 차이(프로이트/프로이드)는 토막마다 편집 거리 1까지 봐준다.
 */
export function creatorMatches(want: string | null, got: string | null): boolean {
  if (!want || !got) return false
  const a = normCreator(want)
  const b = normCreator(got)
  if (!a || !b) return false
  if (a === b) return true
  // 여러 저자를 ^ 나 , 로 이어 붙인 표기
  for (const part of got.split(/[\^,·&]/)) {
    const p = normCreator(part)
    if (p && (p === a || (p.length >= 2 && a.includes(p)) || (a.length >= 2 && p.includes(a)))) return true
  }
  const A = creatorTokens(want)
  const B = creatorTokens(got)
  if (A.length > 0 && B.length > 0) {
    const [short, long] = A.length <= B.length ? [A, B] : [B, A]
    if (short.every((t) => long.some((u) => nearlySame(t, u)))) return true
  }
  return a.includes(b) || b.includes(a)
}

/** 같은 작품인가. `creator` 를 넘기면 저자가 맞을 때만 느슨한 판정을 허용한다 */
export function titleMatches(want: string, got: string, creatorOk = false): boolean {
  const a = normTitle(want)
  const b = normTitle(got)
  if (!a || !b) return false
  if (a === b) return true
  // 「파운데이션」과 「파운데이션 1」처럼 권수만 붙은 경우
  if ((a.length >= 2 && b.startsWith(a)) || (b.length >= 2 && a.startsWith(b))) return true
  // 「송기숙 중단편전집 1: 백의민족」처럼 뒤쪽에 진짜 제목이 오는 표기.
  // 저자가 맞을 때만 인정한다 — 아니면 부제에 흔한 낱말이 걸려 엉뚱한 책을 문다
  if (creatorOk && a.length >= 3 && normTitleFull(got).includes(a)) return true
  return false
}

/**
 * 도서관 표기가 두 작품을 한 항목에 묶어 둔 경우의 대체 검색어.
 * 「등대로, 자기만의 방」·「안티고네, 필록테테스」는 그런 책이 없어 검색이 0건으로 떨어진다.
 * 쉼표와 빗금만 가른다. 「와/과」로 가르면 『전쟁과 평화』가 『전쟁』이 된다.
 */
export function titleAlternatives(koTitle: string): string[] {
  const out: string[] = []
  const parts = koTitle.split(/\s*[,/]\s*/).map((s) => s.trim()).filter((s) => s.length >= 2)
  if (parts.length > 1) out.push(parts[0])
  const noSub = koTitle.replace(/[:：].*$/, '').trim()
  if (noSub && noSub !== koTitle && noSub.length >= 2) out.push(noSub)
  return [...new Set(out)].filter((s) => s !== koTitle)
}
