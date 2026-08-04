/**
 * 하루 시드 게임의 날짜 키 유틸리티
 *
 * 모든 "일일 한 판 고정" 게임은 반드시 이 함수를 통해 날짜 키를 얻는다.
 * 기준 시간대: Asia/Seoul (KST, UTC+9).
 *
 * 왜 KST인가:
 * - 서비스의 주 이용자가 한국 사용자다.
 * - 서버(UTC)와 클라이언트(사용자 현지)가 다르면 자정 전후에
 *   문제가 바뀌었다 되돌아가는 현상이 생긴다.
 * - 단일 시간대로 통일하면 어디서 돌려도 같은 날짜 키가 나온다.
 *
 * 반환값: "YYYY-MM-DD" 형식 (예: "2026-07-31")
 */

/**
 * Asia/Seoul 기준으로 오늘의 날짜 키 YYYY-MM-DD를 반환한다.
 * 서버·클라이언트 모두 동일한 결과를 보장한다.
 */
export function getKSTDateKey(now: Date = new Date()): string {
  // Intl.DateTimeFormat으로 KST 기준의 연·월·일을 추출
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  // en-CA locale은 YYYY-MM-DD 형식을 반환한다
  return formatter.format(now);
}

/**
 * YYYY-MM-DD 문자열 → 결정론적 정수 시드.
 * mulberry32 등의 시드 난수 생성기에 입력하는 용도.
 */
export function dateKeyToSeed(dateKey: string): number {
  let hash = 0;
  for (let i = 0; i < dateKey.length; i++) {
    hash = (hash * 31 + dateKey.charCodeAt(i)) | 0;
  }
  return hash;
}
