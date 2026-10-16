export const VIDEO_CREDIT_LIMITS = { cast: 12, crew: 8, concurrency: 4 } as const
export type VideoCreditRole = 'cast' | 'director' | 'writer' | 'sourceAuthor' | 'characterCreator' | 'story' | 'creator'
export interface VideoCredit {
  id: number
  name: string
  character: string
  portrait: string | null
  roles: VideoCreditRole[]
  profile?: { id: string; slug: string; name: string; avatar: string | null }
}
interface RawPerson { id?: number; name?: string; profile_path?: string | null; character?: string; job?: string }
export interface RawVideoCredits { cast?: RawPerson[]; crew?: RawPerson[]; created_by?: RawPerson[] }

export function normalizeVideoCredits(raw: RawVideoCredits): VideoCredit[] {
  const people = new Map<number, VideoCredit>()
  const add = (person: RawPerson, role: VideoCreditRole) => {
    if (!Number.isSafeInteger(person.id) || person.id! <= 0 || !person.name?.trim()) return
    const existing = people.get(person.id!)
    if (existing) {
      if (!existing.roles.includes(role)) existing.roles.push(role)
      if (role === 'cast') existing.character = person.character ?? ''
      if (!existing.portrait && person.profile_path && /^\/[\w.-]+$/.test(person.profile_path)) existing.portrait = `https://image.tmdb.org/t/p/w185${person.profile_path}`
      return
    }
    people.set(person.id!, {
      id: person.id!, name: person.name.trim(), character: person.character ?? '', roles: [role],
      portrait: person.profile_path && /^\/[\w.-]+$/.test(person.profile_path)
        ? `https://image.tmdb.org/t/p/w185${person.profile_path}` : null,
    })
  }
  for (const person of (raw.created_by ?? []).slice(0, VIDEO_CREDIT_LIMITS.crew)) add(person, 'creator')
  const rolesByJob: Record<string, VideoCreditRole> = {
    Director: 'director', Screenplay: 'writer', Writer: 'writer', Story: 'story', 'Original Story': 'story',
    Novel: 'sourceAuthor', Book: 'sourceAuthor', 'Comic Book': 'sourceAuthor', Characters: 'characterCreator',
  }
  const crew = (raw.crew ?? []).filter(person => Object.hasOwn(rolesByJob, person.job ?? ''))
  // 감독을 먼저 확보하고, 동일 인물의 여러 직무는 한 칸에 모은다.
  crew.sort((a, b) => Number(b.job === 'Director') - Number(a.job === 'Director'))
  for (const person of crew) {
    if (!people.has(person.id!) && people.size >= VIDEO_CREDIT_LIMITS.crew) continue
    add(person, rolesByJob[person.job!])
  }
  for (const person of (raw.cast ?? []).slice(0, VIDEO_CREDIT_LIMITS.cast)) add(person, 'cast')
  return [...people.values()]
}

export interface VideoProfileRow {
  id: string
  wikidata_qid: string | null; slug: string | null; nickname: string | null
  nickname_en: string | null; avatar_url: string | null
}

/** 이름·배역명이 같다는 이유로 연결하지 않는다. 중복 QID도 자동 확정하지 않는다. */
export function connectVideoProfiles(people: VideoCredit[], identities: Record<number, string>, rows: VideoProfileRow[], locale: string): VideoCredit[] {
  return people.map(person => {
    const qid = identities[person.id]
    if (!qid) return person
    const matches = rows.filter(row => row.wikidata_qid === qid)
    if (matches.length !== 1 || !matches[0].slug) return person
    const row = matches[0]
    return { ...person, profile: { id: row.id, slug: row.slug!, name: (locale === 'en' ? row.nickname_en || row.nickname : row.nickname) || person.name, avatar: row.avatar_url } }
  })
}
