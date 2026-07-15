import type { CacheTag } from '@feelandnote/shared/constants/cache-tags'

/**
 * web 앱의 캐시를 도메인 단위로 무효화한다.
 *
 * 저장한 데이터가 속한 도메인만 넘긴다. 여러 테이블을 건드리는 액션은 배열로 복수 전달한다.
 * 기본값을 두지 않는 이유: 인자를 빠뜨린 호출이 전역 퍼지로 되살아나지 않도록
 * 타입 에러로 잡기 위함이다(과거 전 캐시가 'celebs' 단일 태그를 공유해 퍼지 1회당 약 46MB 재조회).
 */
export async function revalidateWebCache(tag: CacheTag | CacheTag[]) {
  const webUrl = process.env.NEXT_PUBLIC_WEB_URL || 'https://feelandnote.com'
  const secret = process.env.CRON_SECRET

  if (!secret) {
    // 운영에는 설정돼 있다. 로컬·프리뷰에서 값이 없으면 무효화를 건너뛴다.
    console.warn('[revalidate] CRON_SECRET 없음 — 로컬 환경으로 간주해 캐시 무효화 생략')
    return
  }

  try {
    const res = await fetch(`${webUrl}/api/revalidate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // web의 /api/revalidate는 배열·단일 문자열 모두 수용한다.
      body: JSON.stringify({ tag, secret }),
    })

    if (!res.ok) {
      console.warn(`[revalidate] 실패: ${res.status}`)
    }
  } catch (e) {
    // 네트워크 오류 시 무시 — 1시간 후 자동 갱신
    console.warn('[revalidate] 연결 실패 — 자동 갱신 대기')
  }
}
