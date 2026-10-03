'use server'

import { unstable_cache } from 'next/cache'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { selectAllPages } from '@feelandnote/shared/lib/paginate'
import { createStaticClient } from '@/lib/db/static'
import { STATIC_REVALIDATE } from '@/lib/cache'
import { getInfluenceRanking } from '@/actions/home/getCelebs'
import { getVirtualMonologueVoiceUrl } from '@/lib/game/voice/voiceUrl'

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
  profession: string | null
  nationality: string | null
  voice_v: number | null
  has_voice: boolean | null
  monologue_ko: boolean
  monologue_en: boolean
  voice_ko: boolean
  voice_en: boolean
}

export interface VirtualMonologueCeleb {
  id: string
  slug: string | null
  nickname: string
  searchNames: string
  title: string | null
  avatar_url: string | null
  profession: string | null
  nationality: string | null
  hasVoice: boolean
  voiceUrl: string | null
  voiceLocale: 'ko' | 'en'
  voiceV: number
}

async function fetchRows(): Promise<MonologueCelebRow[]> {
  const db = createStaticClient()
  type Identity = Omit<MonologueCelebRow, 'monologue_ko' | 'monologue_en' | 'voice_ko' | 'voice_en'>
  // 독백의 존재는 DB 필터로 확인한다. 수천 명의 본문·bio를 명단과 함께 읽지 않는다.
  const readLanguage = (column: 'virtual_monologue' | 'virtual_monologue_en') =>
    selectAllPages<Identity>((from, to) => db.from('celebs')
      .select('id, slug, nickname, nickname_en, title, title_en, avatar_url, profession, nationality, voice_v, has_voice')
      .eq('publication_status', 'active')
      .not(column, 'is', null).neq(column, '')
      .order('id').range(from, to))
  const [ko, en, { scoreMap }] = await Promise.all([
    readLanguage('virtual_monologue'), readLanguage('virtual_monologue_en'), getInfluenceRanking(),
  ])
  const byId = new Map<string, MonologueCelebRow>()
  for (const [language, identities] of [['ko', ko], ['en', en]] as const) {
    for (const identity of identities) {
      const row = byId.get(identity.id) ?? { ...identity, monologue_ko: false, monologue_en: false, voice_ko: false, voice_en: false }
      row[language === 'ko' ? 'monologue_ko' : 'monologue_en'] = true
      byId.set(row.id, row)
    }
  }
  const rows = [...byId.values()].sort((a, b) => (scoreMap[b.id] ?? 0) - (scoreMap[a.id] ?? 0))
  // has_voice에는 다른 음성도 포함된다. 후보만 실제 독백 mp3로 확인한다.
  const candidates = rows.filter(row => row.has_voice)
  for (let i = 0; i < candidates.length; i += VOICE_CHECK_BATCH) {
    await Promise.all(candidates.slice(i, i + VOICE_CHECK_BATCH).map(async row => {
      const [koVoice, enVoice] = await Promise.all([
        row.monologue_ko ? voiceExists(row.id, 'ko') : false,
        row.monologue_en ? voiceExists(row.id, 'en') : false,
      ])
      row.voice_ko = koVoice
      row.voice_en = enVoice
    }))
  }
  return rows
}

async function voiceExists(celebId: string, locale: 'ko' | 'en'): Promise<boolean> {
  if (!R2_PUBLIC_URL) return false
  try {
    const res = await fetch(`${R2_PUBLIC_URL}/celebs/${celebId}/voice/${locale}/vmonologue.mp3`, {
      method: 'HEAD', cache: 'no-store', signal: AbortSignal.timeout(VOICE_CHECK_TIMEOUT_MS),
    })
    await res.body?.cancel()
    return res.ok
  } catch (error) {
    console.error(`[가상독백 명단] 낭독 음원 확인 실패 ${celebId}/${locale}:`, error)
    return false
  }
}

// 인물이 늘어도 각 캐시 항목의 2MB 한도를 넘기지 않도록 나눈다.
const ROW_CACHE_SLICES = 4
let pendingRows: Promise<MonologueCelebRow[]> | null = null
function fetchRowsOnce(): Promise<MonologueCelebRow[]> {
  pendingRows ??= fetchRows().finally(() => { pendingRows = null })
  return pendingRows
}
const getCachedSlice = unstable_cache(
  async (slice: number) => (await fetchRowsOnce()).filter((_, index) => index % ROW_CACHE_SLICES === slice),
  ['virtual-monologue-celebs-v7'],
  { revalidate: STATIC_REVALIDATE, tags: [CACHE_TAGS.CELEBS] },
)
async function getCachedRows(): Promise<MonologueCelebRow[]> {
  const slices = await Promise.all(Array.from({ length: ROW_CACHE_SLICES }, (_, slice) => getCachedSlice(slice)))
  const rows: MonologueCelebRow[] = []
  slices.forEach((part, slice) => part.forEach((row, index) => { rows[index * ROW_CACHE_SLICES + slice] = row }))
  return rows
}

/** 독백이 있는 공개 인물 전체. 화면 언어의 글이 없으면 다른 언어의 글로 읽는다. */
export async function getVirtualMonologueCelebs(locale: string = 'ko'): Promise<VirtualMonologueCeleb[]> {
  const rows = await getCachedRows()
  const result: VirtualMonologueCeleb[] = []
  for (const row of rows) {
    const nickname = ((locale === 'en' && row.nickname_en?.trim()) || row.nickname?.trim() || row.nickname_en?.trim()) ?? ''
    if (!nickname) continue
    const useEn = locale === 'en' ? row.monologue_en : !row.monologue_ko
    const hasVoice = useEn ? row.voice_en : row.voice_ko
    const voiceLocale = useEn ? 'en' : 'ko'
    result.push({
      id: row.id, slug: row.slug, nickname,
      searchNames: `${row.nickname ?? ''} ${row.nickname_en ?? ''}`,
      title: ((locale === 'en' && row.title_en?.trim()) || row.title?.trim() || row.title_en?.trim()) || null,
      avatar_url: row.avatar_url, profession: row.profession, nationality: row.nationality,
      hasVoice, voiceLocale, voiceV: row.voice_v ?? 0,
      voiceUrl: hasVoice ? getVirtualMonologueVoiceUrl(row.id, voiceLocale, row.voice_v ?? 0) : null,
    })
  }
  // 낭독 인물을 먼저 보여주고, 같은 상태 안에서는 공용 영향력 순서를 유지한다.
  return result.sort((a, b) => Number(b.hasVoice) - Number(a.hasVoice))
}
