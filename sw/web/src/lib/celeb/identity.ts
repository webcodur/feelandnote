import 'server-only'

import { cache } from 'react'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { cachedDetail, throwOnQueryError } from '@/lib/cache'
import { createStaticClient } from '@/lib/db/static'
import type { CelebBySlugProfile, PublicCelebBySlugData } from '@/actions/user/getCelebBySlug'

type IdentityRow = Omit<PublicCelebBySlugData['profile'], 'selected_title'>
export type CelebIdentity = Pick<CelebBySlugProfile,
  'id' | 'slug' | 'nickname' | 'nickname_en' | 'nickname_ko' | 'avatar_url' | 'bio' |
  'profession' | 'title' | 'title_en' | 'title_ko' | 'headline' | 'nationality' | 'birth_date' | 'death_date' |
  'celeb_tier' | 'celeb_reality' | 'photo_url' | 'photo_caption' | 'photo_caption_en' |
  'translationFallbacks'>

export function normalizeCelebSlug(raw: string): string {
  let value = raw
  try { value = decodeURIComponent(raw) } catch { /* Invalid escapes remain a missing slug. */ }
  return value.normalize('NFC')
}

const fetchIdentityRow = cache(async (slug: string): Promise<IdentityRow | null> => {
  return cachedDetail(CACHE_TAGS.CELEBS, slug, ['celeb-identity-v1', slug], async () => {
    const db = createStaticClient()
    const { data, error } = await db.from('celebs')
      .select('id,slug,nickname,nickname_en,aliases,avatar_url,bio,bio_en,profession,title,title_en,headline,headline_en,nationality,birth_date,death_date,is_verified,created_at,has_voice,voice_v,voice_speed,wikidata_qid,celeb_tier,celeb_reality,content_research_confirmed_empty_at,view_count,portrait_url,portrait_caption,portrait_caption_en,virtual_monologue,virtual_monologue_en')
      .eq('slug', slug).eq('publication_status', 'active').maybeSingle()
    throwOnQueryError('celeb-identity', error)
    return data as IdentityRow | null
  })
})

/** The full profile, layout and opening share one public identity query. */
export const getCelebIdentityRow = (slug: string) => fetchIdentityRow(normalizeCelebSlug(slug))

export async function getCelebIdentity(slug: string, locale: string): Promise<CelebIdentity | null> {
  const row = await getCelebIdentityRow(slug)
  if (!row) return null
  const translationFallbacks: string[] = []
  const localize = (field: string, en: string | null, ko: string | null) => {
    if (locale !== 'en') return ko
    if (en) return en
    if (ko) translationFallbacks.push(field)
    return ko
  }
  return {
    id: row.id, slug: row.slug,
    nickname: localize('nickname', row.nickname_en, row.nickname) || 'Unknown',
    nickname_en: row.nickname_en, nickname_ko: row.nickname || 'Unknown',
    avatar_url: row.avatar_url, bio: localize('bio', row.bio_en, row.bio),
    profession: row.profession, title: localize('title', row.title_en, row.title),
    title_en: row.title_en, title_ko: row.title,
    headline: localize('headline', row.headline_en, row.headline),
    nationality: row.nationality, birth_date: row.birth_date, death_date: row.death_date,
    celeb_tier: row.celeb_tier as CelebBySlugProfile['celeb_tier'],
    celeb_reality: row.celeb_reality as CelebBySlugProfile['celeb_reality'],
    photo_url: row.portrait_url, photo_caption: row.portrait_caption,
    photo_caption_en: row.portrait_caption_en, translationFallbacks,
  }
}
