'use server'

import { unstable_cache } from 'next/cache'
import { NO_ROWS_CODE, STATIC_REVALIDATE, throwOnQueryError } from '@/lib/cache'
import { createStaticClient } from '@/lib/db/static'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function fetchProfileShowcase(userId: string): Promise<string[]> {
  // 회원 주소 자리에는 어떤 문자열이든 들어온다. id 컬럼은 UUID라 모양이 다르면 두드리지 않는다 —
  // 형식 오류를 아래에서 장애로 던지지 않기 위해서다(getCelebSlugById와 같은 규칙).
  if (!UUID_PATTERN.test(userId)) return []

  const db = createStaticClient()
  const { data, error } = await db
    .from('member_profiles')
    .select('showcase_titles')
    .eq('id', userId)
    .single()

  // 「회원 없음」만 빈 진열로 두고 그 밖의 실패는 던져 캐시에 남기지 않는다
  throwOnQueryError('칭호 진열 조회', error, { ignoreCodes: [NO_ROWS_CODE] })

  return ((data?.showcase_titles as string[]) || [])
}

export const getProfileShowcase = unstable_cache(
  fetchProfileShowcase,
  ['profile-showcase'],
  // 사용자가 직접 고른 칭호 진열이다. BO에 수정 액션이 없어 태그를 두지 않는다.
  { revalidate: STATIC_REVALIDATE }
)
