import type { RankingScript } from '@/actions/admin/rankings/script'

export interface RankingCelebProfile {
  id: string
  slug: string | null
  nickname: string
  avatarUrl: string | null
  portraitUrl: string | null
  factionImageUrl: string | null
  publicationStatus: string | null
}

export interface RankingThemeOption {
  id: string
  slug: string
  name: string
}

export function rankingShotUrl(profile: RankingCelebProfile): string | undefined {
  return profile.factionImageUrl || profile.portraitUrl || undefined
}

export function syncScriptToCelebs(script: RankingScript, profiles: RankingCelebProfile[]): RankingScript {
  const byName = new Map(profiles.map(p => [p.nickname, p]))
  const bySlug = new Map(profiles.flatMap(p => p.slug ? [[p.slug, p] as const] : []))
  return {
    ...script,
    categories: script.categories.map(c => ({
      ...c,
      entries: c.entries.map(e => {
        const profile = (e.celebSlug && bySlug.get(e.celebSlug)) || byName.get(e.name)
        if (!profile) return e
        return {
          ...e,
          celebSlug: profile.slug ?? e.celebSlug,
          avatar: profile.avatarUrl || e.avatar,
          image: rankingShotUrl(profile) || e.image,
        }
      }),
    })),
  }
}
