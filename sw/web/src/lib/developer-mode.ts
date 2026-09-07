/*
  파일명: /lib/developer-mode.ts
  기능: 개발자 전용 화면의 출입 판정
  책임: 작업실 화면(Lab 등)을 운영에서 닫고 로컬 개발 서버에서만 연다.
        `maintenance.ts`의 미리보기 판정과 같은 기준을 쓴다.
*/

export function isDeveloperMode() {
  return process.env.NODE_ENV === 'development'
}
