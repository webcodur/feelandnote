/** DB에는 소개 본문 대신 확인한 외부 출처를 기록한다. 브라우저에서도 사용하는 계약. */
export const BOOK_INTRODUCTION_SOURCES = ['KAKAO', 'DAUM', 'OPEN'] as const

// 기본값은 꺼 둔다. source-aware 웹을 운영에 배포한 뒤 실행 환경에서만 true로 켠다.
export const BOOK_INTRODUCTION_SOURCE_WRITES_ENABLED: boolean =
  process.env.BOOK_INTRODUCTION_SOURCE_WRITES_ENABLED === 'true'

export type BookIntroductionSource = typeof BOOK_INTRODUCTION_SOURCES[number]

export function isBookIntroductionSource(value: unknown): value is BookIntroductionSource {
  return typeof value === 'string' && (BOOK_INTRODUCTION_SOURCES as readonly string[]).includes(value)
}
