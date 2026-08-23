'use server'

import { requireAdmin } from '@/lib/admin-auth'
import {
  type RankingCelebProfile,
  type RankingThemeOption,
} from '@/lib/ranking-celeb'
import { createAdminClient } from '@/lib/supabase/admin'

export type { RankingCelebProfile, RankingThemeOption }

const MAX = 80

type CelebRow = {
  id: string
  slug: string | null
  nickname: string
  avatar_url: string | null
  portrait_url: string | null
  publication_status: string | null
}

function toProfile(row: CelebRow, shot?: string | null): RankingCelebProfile {
  return {
    id: row.id,
    slug: row.slug,
    nickname: row.nickname,
    avatarUrl: row.avatar_url,
    portraitUrl: row.portrait_url,
    factionImageUrl: shot ?? null,
    publicationStatus: row.publication_status,
  }
}

export async function listRankingThemes(): Promise<RankingThemeOption[]> {
  await requireAdmin()
  const db = createAdminClient()
  const { data, error } = await db
    .from('celeb_tags')
    .select('id, slug, name')
    .not('slug', 'is', null)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []).flatMap(row => row.slug ? [{ id: row.id, slug: row.slug, name: row.name }] : [])
}

export async function loadRankingThemeMembers(themeSlug: string): Promise<{
  theme: RankingThemeOption | null
  profiles: RankingCelebProfile[]
}> {
  await requireAdmin()
  const slug = themeSlug.trim()
  if (!slug) return { theme: null, profiles: [] }
  const db = createAdminClient()
  const { data: tag, error: tagErr } = await db
    .from('celeb_tags')
    .select('id, slug, name')
    .eq('slug', slug)
    .maybeSingle()
  if (tagErr) throw new Error(tagErr.message)
  if (!tag?.slug) return { theme: null, profiles: [] }

  const { data: members, error: memErr } = await db
    .from('faction_atlas_members')
    .select('celeb_id, faction_image_url, hidden')
    .eq('tag_id', tag.id)
    .order('sort_order', { ascending: true })
  if (memErr) throw new Error(memErr.message)

  const visible = (members ?? []).filter(m => m.hidden !== true && m.celeb_id)
  const ids = [...new Set(visible.map(m => m.celeb_id))]
  if (!ids.length) return { theme: { id: tag.id, slug: tag.slug, name: tag.name }, profiles: [] }

  const { data: celebs, error: celebErr } = await db
    .from('celebs')
    .select('id, slug, nickname, avatar_url, portrait_url, publication_status')
    .in('id', ids)
  if (celebErr) throw new Error(celebErr.message)
  const shotOf = new Map(visible.map(m => [m.celeb_id, m.faction_image_url]))
  const order = new Map(ids.map((id, i) => [id, i]))
  const profiles = (celebs ?? [])
    .map(row => toProfile(row, shotOf.get(row.id)))
    .toSorted((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
  return { theme: { id: tag.id, slug: tag.slug, name: tag.name }, profiles }
}

export async function loadRankingCelebProfiles(
  names: string[],
  slugs: string[] = [],
): Promise<RankingCelebProfile[]> {
  await requireAdmin()
  const nicknames = [...new Set(names.map(n => n.trim()).filter(Boolean))]
  const slugList = [...new Set(slugs.map(s => s.trim()).filter(Boolean))]
  if (nicknames.length + slugList.length > MAX) {
    throw new Error(`한 편에서 조회할 수 있는 인물은 최대 ${MAX}명이다`)
  }
  if (!nicknames.length && !slugList.length) return []

  const db = createAdminClient()
  const rows: CelebRow[] = []

  if (nicknames.length) {
    const { data, error } = await db
      .from('celebs')
      .select('id, slug, nickname, avatar_url, portrait_url, publication_status')
      .in('nickname', nicknames)
    if (error) throw new Error(error.message)
    rows.push(...(data ?? []))
  }
  if (slugList.length) {
    const have = new Set(rows.map(r => r.id))
    const { data, error } = await db
      .from('celebs')
      .select('id, slug, nickname, avatar_url, portrait_url, publication_status')
      .in('slug', slugList)
    if (error) throw new Error(error.message)
    for (const row of data ?? []) {
      if (!have.has(row.id)) rows.push(row)
    }
  }

  const ids = rows.map(r => r.id)
  const shotOf = new Map<string, string>()
  if (ids.length) {
    const { data, error } = await db
      .from('faction_atlas_members')
      .select('celeb_id, faction_image_url')
      .in('celeb_id', ids)
    if (error) throw new Error(error.message)
    for (const row of data ?? []) {
      if (row.celeb_id && row.faction_image_url && !shotOf.has(row.celeb_id)) {
        shotOf.set(row.celeb_id, row.faction_image_url)
      }
    }
  }

  return rows.map(row => toProfile(row, shotOf.get(row.id)))
}
