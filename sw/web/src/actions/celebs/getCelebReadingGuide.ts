'use server'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { createStaticClient } from '@/lib/db/static'
import { cachedDetail } from '@/lib/cache'

/* ── 인물 안내 ──
   인물 안내 본문(celeb_explanations.plain_text·_en). 인물 상세 「읽어보기」 밖에서도
   — 세력도감 인물 모달, 신화의 세계 인물 상세 — 읽을 수 있도록 인물 한 명 몫만 따로 읽는다.
   낭독 음원(reading.mp3)이 이 본문을 읽는다 — 단추의 초록 표시와 모달 낭독이 이 텍스트를 기준으로 한다.
   명단 캐시(getFeaturedFactions)에 싣지 않는 이유는 긴 소개와 같다: 명단이 캐시 상한 2MB를 넘는다. */

interface GuideRow {
  plain_text: string | null
  plain_text_en: string | null
}

async function fetchGuide(celebId: string): Promise<GuideRow | null> {
  const db = createStaticClient()
  const { data, error } = await db
    .from('celeb_explanations')
    .select('plain_text, plain_text_en')
    .eq('profile_id', celebId)
    .not('published_at', 'is', null)
    .maybeSingle<GuideRow>()

  // 조용한 폴백 금지 — 조회가 깨지면 「안내 없음」으로 캐시되지 않게 드러낸다
  if (error) throw new Error(`celeb_explanations 조회 실패: ${error.message}`)
  return data
}

/** 화면 언어의 인물 안내. 영문이 없으면 한국어가 온다 — locale은 본문이 실제로 쓰인 언어라 낭독 음원을 고를 때 쓴다. 없으면 null */
export async function getCelebReadingGuide(celebId: string, locale: string = 'ko'): Promise<{ text: string; locale: 'ko' | 'en' } | null> {
  const row = await cachedDetail(CACHE_TAGS.CELEBS, celebId, ['celeb-reading-guide', celebId], () =>
    fetchGuide(celebId),
  )
  const en = row?.plain_text_en?.trim()
  const ko = row?.plain_text?.trim()
  if (locale === 'en' && en) return { text: en, locale: 'en' }
  return ko ? { text: ko, locale: 'ko' } : null
}
