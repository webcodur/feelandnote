import { NextRequest } from 'next/server'
import { revalidateTag } from 'next/cache'
import { purgeCloudflareByTags } from '@/lib/cloudflarePurge'
import { createRevalidationHandler } from './handler'

const handleRevalidation = createRevalidationHandler({
  expireTag: (tag) => revalidateTag(tag, { expire: 0 }),
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
 * **한 건을 고쳤으면 「도메인:식별자」를 보내라.** 도메인만 보내면 그 종류 전부가
 * 낡은 것으로 처리되고, 그 뒤 방문·크롤링마다 재생성이 쌓인다. 도메인 전체 비우기는
 * 대량 작업이나 구조 변경처럼 정말 전부 바뀐 때만 쓴다.
 */
export async function POST(request: NextRequest) {
  return handleRevalidation(request)
}
