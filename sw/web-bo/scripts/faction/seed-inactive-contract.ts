import { celebNameIssues, cleanCelebAliases } from '@feelandnote/shared/lib/celeb-identity'

/** 선등록이 넣을 수 있는 실존 축. 실존 인물(REAL)은 이 경로로 넣지 않는다. */
export const SEEDABLE_REALITIES = ['FICTION', 'BOTH'] as const
export type SeedableReality = (typeof SEEDABLE_REALITIES)[number]

export type InactiveSeedPerson = {
  nickname: string
  nickname_en: string
  /** 다른 이름(검색 전용). 적었을 때만 싣는다. 기준은 celeb-01-01-profile-facts.md 「다른 이름」 */
  aliases?: string[]
  bio: string
  /** 생략하면 FICTION이다. 건국 시조처럼 실존과 전승이 함께 다뤄지는 인물은 BOTH를 적는다. */
  celeb_reality: SeedableReality
  identity:
    | { mode: 'new' }
    | { mode: 'existing'; celeb_id: string }
}

export type InactiveSeedManifest = {
  faction_slug: string
  people: InactiveSeedPerson[]
}

const normalizedIdentity = (value: string) => value.normalize('NFKC').trim().toLocaleLowerCase()
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function requiredText(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${field}이(가) 비어 있습니다.`)
  }
  return value.trim()
}

function parseReality(value: unknown, field: string): SeedableReality {
  if (value === undefined || value === null) return 'FICTION'
  if (typeof value !== 'string' || !SEEDABLE_REALITIES.includes(value as SeedableReality)) {
    throw new Error(`${field}는 ${SEEDABLE_REALITIES.join(' 또는 ')}여야 합니다.`)
  }
  return value as SeedableReality
}

function parseAliases(
  value: unknown,
  field: string,
  own: { nickname: string; nickname_en: string },
): string[] {
  if (value === undefined || value === null) return []
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new Error(`${field}는 문자열 배열이어야 합니다.`)
  }
  return cleanCelebAliases(value as string[], own)
}

function parseIdentity(value: unknown, field: string): InactiveSeedPerson['identity'] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${field}는 객체여야 합니다.`)
  }
  const raw = value as Record<string, unknown>
  if (raw.mode === 'new') return { mode: 'new' }
  if (raw.mode !== 'existing') {
    throw new Error(`${field}.mode는 new 또는 existing이어야 합니다.`)
  }
  const celebId = requiredText(raw.celeb_id, `${field}.celeb_id`)
  if (!UUID_PATTERN.test(celebId)) {
    throw new Error(`${field}.celeb_id는 UUID여야 합니다.`)
  }
  return { mode: 'existing', celeb_id: celebId }
}

export function parseInactiveSeedManifest(input: unknown): InactiveSeedManifest {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('선등록 명세는 JSON 객체여야 합니다.')
  }

  const raw = input as Record<string, unknown>
  const factionSlug = requiredText(raw.faction_slug, 'faction_slug')
  if (!Array.isArray(raw.people) || raw.people.length === 0) {
    throw new Error('people이 비어 있습니다.')
  }

  const people = raw.people.map((value, index) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error(`people[${index}]는 객체여야 합니다.`)
    }
    const row = value as Record<string, unknown>
    const nickname = requiredText(row.nickname, `people[${index}].nickname`)
    const nicknameEn = requiredText(row.nickname_en, `people[${index}].nickname_en`)
    const aliases = parseAliases(row.aliases, `people[${index}].aliases`, { nickname, nickname_en: nicknameEn })
    const person: InactiveSeedPerson = {
      nickname,
      nickname_en: nicknameEn,
      ...(aliases.length ? { aliases } : {}),
      bio: requiredText(row.bio, `people[${index}].bio`),
      celeb_reality: parseReality(row.celeb_reality, `people[${index}].celeb_reality`),
      identity: parseIdentity(row.identity, `people[${index}].identity`),
    }
    const nameError = celebNameIssues(person).find((issue) => issue.level === 'error')
    if (nameError) throw new Error(`${person.nickname}: ${nameError.message}`)
    if (person.bio.length > 100) {
      throw new Error(`${person.nickname}: bio는 100자 이하여야 합니다.`)
    }
    return person
  })

  const identityKeys = new Set<string>()
  for (const person of people) {
    const identityKey = person.identity.mode === 'existing'
      ? `existing:${person.identity.celeb_id.toLowerCase()}`
      : `new:${normalizedIdentity(person.nickname)}\u0000${normalizedIdentity(person.nickname_en)}\u0000${normalizedIdentity(person.bio)}`
    if (identityKeys.has(identityKey)) throw new Error(`인물 중복: ${person.nickname}`)
    identityKeys.add(identityKey)
  }

  return { faction_slug: factionSlug, people }
}

export function reserveGeneratedSlug(
  baseSlug: string,
  occupiedSlugs: Set<string>,
): { slug: string; slugSuffix: string | null } {
  if (!occupiedSlugs.has(baseSlug)) {
    occupiedSlugs.add(baseSlug)
    return { slug: baseSlug, slugSuffix: null }
  }

  for (let suffix = 2; ; suffix += 1) {
    const slug = `${baseSlug}-${suffix}`
    if (occupiedSlugs.has(slug)) continue
    occupiedSlugs.add(slug)
    return { slug, slugSuffix: String(suffix) }
  }
}
