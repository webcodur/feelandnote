/**
 * 출간 이미지 저장소(R2) — 서버 전용.
 *
 * 업로드 자체는 이 앱에 이미 있는 `lib/r2.ts` 를 그대로 쓴다(같은 규격·같은 환경변수·1년 불변 캐시).
 * 여기에는 출간에만 필요한 두 가지만 둔다.
 *   ① `missingR2Env()` — 키 누락을 미리 알려 출간 결과에 사유로 실어 보낸다(조용한 폴백 금지).
 *   ② `publicUrl()` — 개인샷은 키가 고정이라 `?v=` 로 캐시를 끊고, 그룹샷은 키에 해시가 붙어 필요 없다.
 */

export { uploadToR2 } from '@/lib/r2'

const R2_ENV_KEYS = [
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET_NAME',
  'R2_PUBLIC_URL',
] as const

/** 비어 있는 R2 환경변수 목록 — 비어 있지 않으면 이미지 업로드를 시도하지 않는다 */
export function missingR2Env(): string[] {
  return R2_ENV_KEYS.filter(k => !process.env[k])
}

/**
 * 공개 주소.
 * @param versioned 개인샷은 키가 고정(덮어쓰기)이라 `?v=` 를 붙여 캐시를 끊는다.
 *   그룹샷은 키에 해시가 들어가 저절로 갈리므로 끈다.
 */
export function publicUrl(key: string, versioned = true): string {
  const base = `${process.env.R2_PUBLIC_URL}/${key}`
  return versioned ? `${base}?v=${Date.now()}` : base
}
