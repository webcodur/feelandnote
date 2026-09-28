import 'server-only'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { cachedDetail, throwOnQueryError, withQueryFallback } from '@/lib/cache'
import { createStaticClient } from '@/lib/db/static'
import type { RecordType } from '@/lib/celeb/meta'

/* ─────────────────────────────────────────────
 * 인물의 대표 감상작 — 검색 설명문에 싣는 작품 몇 개
 *
 * 한 분야 안에서 다른 인물도 많이 감상한 작품(contents.celeb_count)부터 고른다.
 * 널리 알려진 작품일수록 「인물 + 작품」 검색과 맞고, 읽는 사람도 알아본다.
 * 고정·추천 표시는 대부분 비어 있어(빌 게이츠 268건 전부) 기준으로 쓰지 않는다.
 * ───────────────────────────────────────────── */

interface SignatureWorkRow {
  id: string
  content_locales: { locale: string; title: string | null }[] | null
}

// 요청 언어 제목이 없는 작품을 건너뛸 여유분까지 받는다.
const FETCH_LIMIT = 8
// 부제까지 실으면 설명문 한 줄을 작품 하나가 차지한다.
const SUBTITLE_CUT_LENGTH = 24

function shortTitle(title: string): string {
  const cleaned = title.replace(/\s+/g, ' ').trim()
  if (cleaned.length <= SUBTITLE_CUT_LENGTH) return cleaned
  const cut = cleaned.search(/\s*[:：]\s|\s+[-–—]\s+/)
  return cut > 0 ? cleaned.slice(0, cut).trim() : cleaned
}

function pickTitle(row: SignatureWorkRow, locale: string): string | null {
  const locales = row.content_locales ?? []
  const exact = locales.find((item) => item.locale === locale)?.title?.trim()
  if (exact) return exact
  // 영문 화면에는 한국어 제목을 싣지 않는다. 한국어 화면은 원서·원곡 제목을 그대로 쓴다.
  if (locale === 'en') return null
  return locales.find((item) => item.title?.trim())?.title?.trim() ?? null
}

async function fetchSignatureWorks(celebId: string, type: RecordType, locale: string, limit: number): Promise<string[]> {
  const { data, error } = await createStaticClient()
    .from('contents')
    .select('id, content_locales(locale, title), celeb_contents!inner(celeb_id)')
    .eq('celeb_contents.celeb_id', celebId)
    .eq('celeb_contents.visibility', 'public')
    .eq('type', type)
    .order('celeb_count', { ascending: false })
    .order('id', { ascending: true })
    .limit(FETCH_LIMIT)
    .overrideTypes<SignatureWorkRow[], { merge: false }>()
  throwOnQueryError('getCelebSignatureWorks', error)

  const titles: string[] = []
  for (const row of data ?? []) {
    const title = pickTitle(row, locale)
    if (!title) continue
    const short = shortTitle(title)
    if (!titles.includes(short)) titles.push(short)
    if (titles.length >= limit) break
  }
  return titles
}

/** 설명문용. 실패하면 이번 요청만 작품 없이 설명을 만든다 — 인물 화면을 막을 자료가 아니다. */
export async function getCelebSignatureWorks(
  celebId: string,
  type: RecordType,
  locale: string,
  limit = 3,
): Promise<string[]> {
  return withQueryFallback(
    'getCelebSignatureWorks',
    () => cachedDetail(
      CACHE_TAGS.CELEBS,
      celebId,
      ['celeb-signature-works-v1', celebId, type, locale, String(limit)],
      () => fetchSignatureWorks(celebId, type, locale, limit),
      { extraTags: [CACHE_TAGS.CONTENTS] },
    ),
    [],
  )
}
