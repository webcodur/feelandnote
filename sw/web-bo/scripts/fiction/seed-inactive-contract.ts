export type InactiveFictionSeedPerson = {
  nickname: string
  nickname_en: string
  bio: string
  identity:
    | { mode: 'new' }
    | { mode: 'existing'; celeb_id: string }
}

export type InactiveFictionSeedManifest = {
  tag_slug: string
  people: InactiveFictionSeedPerson[]
}

const normalizedIdentity = (value: string) => value.normalize('NFKC').trim().toLocaleLowerCase()
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function requiredText(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${field}이(가) 비어 있습니다.`)
  }
  return value.trim()
}

function parseIdentity(value: unknown, field: string): InactiveFictionSeedPerson['identity'] {
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

export function parseInactiveFictionSeedManifest(input: unknown): InactiveFictionSeedManifest {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('선등록 명세는 JSON 객체여야 합니다.')
  }

  const raw = input as Record<string, unknown>
  const tagSlug = requiredText(raw.tag_slug, 'tag_slug')
  if (!Array.isArray(raw.people) || raw.people.length === 0) {
    throw new Error('people이 비어 있습니다.')
  }

  const people = raw.people.map((value, index) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error(`people[${index}]는 객체여야 합니다.`)
    }
    const row = value as Record<string, unknown>
    const person = {
      nickname: requiredText(row.nickname, `people[${index}].nickname`),
      nickname_en: requiredText(row.nickname_en, `people[${index}].nickname_en`),
      bio: requiredText(row.bio, `people[${index}].bio`),
      identity: parseIdentity(row.identity, `people[${index}].identity`),
    }
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

  return { tag_slug: tagSlug, people }
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
