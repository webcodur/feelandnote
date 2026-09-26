'use server'

import { unstable_cache } from 'next/cache'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { selectAllPages } from '@feelandnote/shared/lib/paginate'
import { createStaticClient } from '@/lib/db/static'
import { STATIC_REVALIDATE } from '@/lib/cache'
import { getInfluenceRanking } from '@/actions/home/getCelebs'
import { getVirtualMonologueVoiceUrl } from '@/lib/game/voice/voiceUrl'

/* ── 가상독백 낭독 인물 명부 ──
   /explore/monologue 전용. 화면은 음원이 있는 카드만 그리므로 후보(has_voice)만 읽고,
   R2의 vmonologue.mp3 존재를 HEAD로 재서 「낭독 보유」를 가른다.
   has_voice는 다른 음성도 포함하므로 후보만 좁히고, 낭독 판정은 실제 파일로 한다.
   캐시에는 독백 전문이 아니라 언어별 발췌만 둔다. */

const QUOTE_LIMIT = 90
const EXCERPT_LIMIT = 240
const VOICE_CHECK_BATCH = 64
const VOICE_CHECK_TIMEOUT_MS = 8_000

const R2_PUBLIC_URL = (process.env.NEXT_PUBLIC_R2_PUBLIC_URL || process.env.R2_PUBLIC_URL || '').replace(/\/$/, '')

interface MonologueCelebRow {
  id: string
  slug: string | null
  nickname: string | null
  nickname_en: string | null
  title: string | null
  title_en: string | null
  avatar_url: string | null
  voice_v: number | null
  voice_candidate: boolean
  /** 한영 첫 문장 — 텍스트 명부 카드의 발췌 */
  quote_ko: string | null
  quote_en: string | null
  /** 한영 첫 문단 — 낭독 카드의 발췌 */
  excerpt_ko: string | null
  excerpt_en: string | null
  /** R2 낭독 음원 존재 — 캐시 안에서 HEAD로 잰다 */
  voice_ko: boolean
  voice_en: boolean
}

export interface VirtualMonologueCeleb {
  id: string
  slug: string | null
  nickname: string
  title: string | null
  avatar_url: string | null
  /** 화면 언어 독백의 첫 문장 — 텍스트 명부 카드의 발췌 */
  quote: string
  /** 화면 언어 독백의 첫 문단 — 낭독 카드의 발췌 */
  excerpt: string
  /** 화면 언어 독백의 낭독 음원 존재 */
  hasVoice: boolean
  voiceUrl: string | null
  voiceLocale: 'ko' | 'en'
  voiceV: number
}

async function fetchRows(): Promise<MonologueCelebRow[]> {
  const db = createStaticClient()
  type CelebRow = {
    id: string
    slug: string | null
    nickname: string | null
    nickname_en: string | null
    title: string | null
    title_en: string | null
    avatar_url: string | null
    voice_v: number | null
    has_voice: boolean | null
    virtual_monologue: string | null
    virtual_monologue_en: string | null
  }
  // 화면은 낭독 카드만 그린다 — 음원 후보(has_voice)만 읽는다. 독백 인물 전원의 전문을
  // 당기면 3,814행·13MB가 되어 콜드 렌더가 수 초 걸렸다(26.09 실측). 후보만 읽으면
  // 92행·0.3MB로 끝나고, 후보가 아닌 인물은 어차피 hasVoice=false로 화면에 못 선다.
  const celebs = await selectAllPages<CelebRow>((from, to) => db
    .from('celebs')
    .select('id, slug, nickname, nickname_en, title, title_en, avatar_url, voice_v, has_voice, virtual_monologue, virtual_monologue_en')
    .eq('publication_status', 'active')
    .not('virtual_monologue', 'is', null)
    .eq('has_voice', true)
    .order('id')
    .range(from, to))
  if (celebs.length === 0) return []

  // 영향력순 — 공유 랭킹 캐시의 점수표로 정렬한다
  const { scoreMap } = await getInfluenceRanking()
  celebs.sort((a, b) => (scoreMap[b.id] ?? 0) - (scoreMap[a.id] ?? 0))

  // 낭독 음원 — 본문이 있는 언어의 mp3만 HEAD로 잰다. 음원은 읽기라 실패해도
  // false로 둘 뿐 명부 자체는 그대로 둔다 (보이스 인물이 글 명부로 내려감)
  const rows: MonologueCelebRow[] = celebs.map((row) => {
    const ko = row.virtual_monologue?.trim() || null
    const en = row.virtual_monologue_en?.trim() || null
    return {
      id: row.id,
      slug: row.slug,
      nickname: row.nickname,
      nickname_en: row.nickname_en,
      title: row.title,
      title_en: row.title_en,
      avatar_url: row.avatar_url,
      voice_v: row.voice_v,
      voice_candidate: row.has_voice === true,
      quote_ko: ko ? firstSentence(ko) : null,
      quote_en: en ? firstSentence(en) : null,
      excerpt_ko: ko ? firstParagraph(ko) : null,
      excerpt_en: en ? firstParagraph(en) : null,
      voice_ko: false,
      voice_en: false,
    }
  })
  for (let i = 0; i < rows.length; i += VOICE_CHECK_BATCH) {
    await Promise.all(rows.slice(i, i + VOICE_CHECK_BATCH).map(async (row) => {
      // 독백 음원 게시 경로는 has_voice도 세운다. 다른 음성도 이 플래그를 세우므로
      // 후보에 한해서 vmonologue.mp3를 확인해야 정확한 낭독 명부가 된다.
      if (!row.voice_candidate) return
      const [ko, en] = await Promise.all([
        row.quote_ko ? voiceExists(row.id, 'ko') : Promise.resolve(false),
        row.quote_en ? voiceExists(row.id, 'en') : Promise.resolve(false),
      ])
      row.voice_ko = ko
      row.voice_en = en
    }))
  }
  return rows
}

async function voiceExists(celebId: string, locale: 'ko' | 'en'): Promise<boolean> {
  if (!R2_PUBLIC_URL) return false
  try {
    const res = await fetch(`${R2_PUBLIC_URL}/celebs/${celebId}/voice/${locale}/vmonologue.mp3`, {
      method: 'HEAD',
      cache: 'no-store',
      signal: AbortSignal.timeout(VOICE_CHECK_TIMEOUT_MS),
    })
    await res.body?.cancel()
    return res.ok
  } catch (error) {
    console.error(`[가상독백 명부] 낭독 음원 확인 실패 ${celebId}/${locale}:`, error)
    return false
  }
}

/* ── 명부 캐시 — 조각 캐시 ──
   독백 전원 명부 시절 발췌만 담긴 캐시도 2MB 항목 상한을 넘은 적이 있다(26.09, 3.1MB 실측 —
   저장 실패로 매 요청 전량 재조회 + 서버 에러). 지금은 후보 수십~수백 행이라 여유가 있지만,
   음원 보급이 늘어 명부가 다시 커져도 한 항목이 상한을 넘지 않게 K조각으로 나눠 캐시한다.
   조각끼리 수명이 어긋나면 순서가 섞인 채로 캐시에 남으므로 spread 없이 같은 수명을 쓰고,
   동시 miss는 in-flight 공유로 실제 조회는 한 번만 돈다(조각 수만큼 명부를 읽지 않는다). */
const ROW_CACHE_SLICES = 4
let pendingRows: Promise<MonologueCelebRow[]> | null = null

function fetchRowsOnce(): Promise<MonologueCelebRow[]> {
  pendingRows ??= fetchRows().finally(() => { pendingRows = null })
  return pendingRows
}

const getCachedSlice = unstable_cache(
  async (slice: number) => (await fetchRowsOnce()).filter((_, index) => index % ROW_CACHE_SLICES === slice),
  ['virtual-monologue-celebs-v6'],
  { revalidate: STATIC_REVALIDATE, tags: [CACHE_TAGS.CELEBS] },
)

async function getCachedRows(): Promise<MonologueCelebRow[]> {
  const slices = await Promise.all(Array.from({ length: ROW_CACHE_SLICES }, (_, slice) => getCachedSlice(slice)))
  const rows: MonologueCelebRow[] = []
  slices.forEach((part, slice) => part.forEach((row, index) => { rows[index * ROW_CACHE_SLICES + slice] = row }))
  return rows
}

function firstSentence(text: string): string {
  const first = text.split(/\n\s*\n/, 1)[0].trim()
  const sentenceEnd = first.search(/[.!?…]["'”’」』〉》)\]]*(\s|$)/)
  const quote = sentenceEnd >= 0 ? first.slice(0, sentenceEnd + 1) : first
  return quote.length > QUOTE_LIMIT ? `${quote.slice(0, QUOTE_LIMIT)}…` : quote
}

function firstParagraph(text: string): string {
  const paragraphs = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
  // 첫 문단이 한 줄로 끝나면 다음 문단 머리를 이어 발췌가 허전하지 않게 한다
  let excerpt = paragraphs[0] ?? ''
  for (let i = 1; excerpt.length < 80 && i < paragraphs.length; i++) {
    excerpt = `${excerpt} ${paragraphs[i]}`
  }
  return excerpt.length > EXCERPT_LIMIT ? `${excerpt.slice(0, EXCERPT_LIMIT)}…` : excerpt
}

/** 화면 언어의 가상독백을 가진 인물 명부. 영문이 없으면 한국어 구절이 온다 */
export async function getVirtualMonologueCelebs(locale: string = 'ko'): Promise<VirtualMonologueCeleb[]> {
  const rows = await getCachedRows()
  return rows
    .map((row) => {
      const useEn = locale === 'en' && !!row.quote_en
      const quote = useEn ? row.quote_en : row.quote_ko
      const excerpt = (useEn ? row.excerpt_en : row.excerpt_ko) ?? quote
      const nickname = ((locale === 'en' && row.nickname_en?.trim()) || row.nickname?.trim()) ?? ''
      const title = ((locale === 'en' && row.title_en?.trim()) || row.title?.trim()) || null
      if (!quote || !nickname) return null
      return {
        id: row.id,
        slug: row.slug,
        nickname,
        title,
        avatar_url: row.avatar_url,
        quote,
        excerpt: excerpt ?? quote,
        hasVoice: useEn ? row.voice_en : row.voice_ko,
        voiceUrl: (useEn ? row.voice_en : row.voice_ko)
          ? getVirtualMonologueVoiceUrl(row.id, useEn ? 'en' : 'ko', row.voice_v ?? 0)
          : null,
        voiceLocale: useEn ? 'en' : 'ko',
        voiceV: row.voice_v ?? 0,
      }
    })
    .filter((row): row is VirtualMonologueCeleb => row !== null)
}
