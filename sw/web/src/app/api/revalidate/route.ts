import { NextRequest } from 'next/server'
import { revalidateTag } from 'next/cache'
import { purgeCloudflareByTags } from '@/lib/cloudflarePurge'
import { createRevalidationHandler } from './handler'

const handleRevalidation = createRevalidationHandler({
  expireTag: (tag, profile) => revalidateTag(tag, profile),
  purgeByTags: purgeCloudflareByTags,
}, 'targeted')

/**
 * 캐시 무효화 API — web-bo 등 외부에서 호출
 * POST /api/revalidate (targeted only; bulk는 /api/revalidate/v2)
 * Body: { tag: "celebs" | "celebs:<id>" | ["contents:<id>", "contents"], secret: "..." }
 *
 * tag는 단일 문자열·배열 모두 받는다. BO의 한 저장이 여러 도메인에 걸칠 때
 * (예: 셀럽 프로필+대사 동시 수정) 한 번의 호출로 해당 도메인만 비우기 위함이다.
 *
 * 개별 「도메인:식별자」는 즉시 만료한다. 함께 오는 도메인 목록 태그는 기존 값을
 * 제공하면서 백그라운드 갱신한다. 명시적 대량 만료는 /api/revalidate/v2를 쓴다.
 */
export async function POST(request: NextRequest) {
  return handleRevalidation(request)
}
