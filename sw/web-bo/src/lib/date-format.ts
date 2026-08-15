const KST_OFFSET_MS = 9 * 60 * 60 * 1000

function twoDigits(value: number): string {
  return String(value).padStart(2, '0')
}

/**
 * 한국 관리자 화면에서 쓰는 고정 KST 날짜·시각 표시.
 *
 * SSR의 Node ICU와 브라우저 ICU가 `오후`/`PM`처럼 다른 문자열을 만들 수 있으므로
 * `toLocaleString`을 사용하지 않는다. KST는 DST 없이 UTC+9로 고정이다.
 */
export function formatKstDateTime(value: string | Date): string {
  const time = value instanceof Date ? value.getTime() : Date.parse(value)
  if (!Number.isFinite(time)) return '-'

  const kst = new Date(time + KST_OFFSET_MS)
  return `${kst.getUTCFullYear()}. ${kst.getUTCMonth() + 1}. ${kst.getUTCDate()}. ${twoDigits(kst.getUTCHours())}:${twoDigits(kst.getUTCMinutes())}:${twoDigits(kst.getUTCSeconds())}`
}
