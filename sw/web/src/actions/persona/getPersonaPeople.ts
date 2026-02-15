'use server'

import { createClient } from '@/lib/supabase/server'

export interface PersonaPersonSummary {
  id: string
  nickname: string
  profession: string | null
  avatar_url: string | null
  title: string | null
}

interface PersonaJoinedProfileRow {
  nickname: string | null
  profession: string | null
  avatar_url: string | null
  title: string | null
}

interface PersonaPeopleRow {
  celeb_id: string
  profiles: PersonaJoinedProfileRow | PersonaJoinedProfileRow[] | null
}

const parseProfile = (row: PersonaPeopleRow): PersonaJoinedProfileRow | null =>
  (Array.isArray(row.profiles) ? row.profiles[0] : row.profiles) ?? null

export async function getPersonaPeople(limit: number = 200): Promise<PersonaPersonSummary[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('celeb_persona')
    .select(`
      celeb_id,
      profiles!celeb_persona_celeb_id_fkey (
        nickname,
        profession,
        avatar_url,
        title
      )
    `)
    .limit(limit)

  if (error || !data) {
    console.error('[getPersonaPeople] failed:', error?.message ?? 'unknown error')
    return []
  }

  return (data as PersonaPeopleRow[])
    .map((row) => {
      const profile = parseProfile(row)
      return {
        id: row.celeb_id,
        nickname: profile?.nickname ?? '',
        profession: profile?.profession ?? null,
        avatar_url: profile?.avatar_url ?? null,
        title: profile?.title ?? null,
      }
    })
    .filter((person) => person.nickname.length > 0)
    .sort((a, b) => a.nickname.localeCompare(b.nickname, 'ko'))
}
