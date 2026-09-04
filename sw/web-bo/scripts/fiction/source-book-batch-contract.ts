import { createHash, randomUUID } from 'node:crypto'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { basename, dirname, resolve, win32 } from 'node:path'

export const FICTION_SOURCE_BOOK_EDITION_KINDS = [
  'full',
  'abridged',
  'retelling',
  'adaptation',
  'selection',
  'volume',
] as const

export type FictionSourceBookEditionKind = typeof FICTION_SOURCE_BOOK_EDITION_KINDS[number]
export type BookMetadataSource = 'kakao_book' | 'openlibrary'

export type FictionSourceBookManifest = {
  work: {
    identity: string
    title: string
    creator: string
    titleAliases: string[]
    creatorAliases: string[]
  }
  edition: {
    kind: FictionSourceBookEditionKind
    scope: string
  }
  reuseContentId?: string
  reviewedDistinctContentIds?: string[]
  ko:
    | {
        translationStatus: 'published'
        isbn: string
      }
    | {
        translationStatus: 'verified_unavailable'
        creator: string
        evidenceUrls: string[]
      }
  en?: {
    isbn: string
  }
}

export type ExternalBookEdition = {
  source: BookMetadataSource
  isbn: string
  title: string
  creator: string
  thumbnailUrl: string
  publisher: string
  description: string | null
  sourceUrl: string
  descriptionSourceUrl: string | null
  releaseDate: string | null
  sourceMetadata: Record<string, unknown>
}

export type AffiliateLink = { platform: string; url: string }

export type ContentLocaleMaterial = {
  content_id: string
  locale: 'ko' | 'en'
  title: string
  creator: string
  description: string | null
  isbn: string
  publisher: string
  thumbnail_url: string
  affiliate_url: AffiliateLink[] | null
  sources: Record<string, unknown>
  verified: boolean
}

export type ContentLocaleReadbackMaterial = {
  content_id: string
  locale: string
  title: string | null
  creator: string | null
  description: string | null
  isbn: string | null
  publisher: string | null
  thumbnail_url: string | null
  affiliate_url: unknown
  sources: unknown
  verified: boolean | null
}

export type StoredContentRow = {
  id: string
  type: string
  subtype: string | null
  external_source: string | null
  external_id: string | null
  release_date: string | null
  metadata: Record<string, unknown> | null
  member_count: number
  celeb_count: number
  record_count: number
  created_at: string
}

export type StoredContentLocaleRow = ContentLocaleReadbackMaterial & {
  created_at: string | null
  updated_at: string | null
}

export type BookCatalogSnapshot = {
  contents: StoredContentRow[]
  locales: StoredContentLocaleRow[]
}

export type ExactContentSnapshot = {
  content: StoredContentRow | null
  locales: StoredContentLocaleRow[]
}

export type ResolvedSourceBookRegistration = {
  representativeExternalSource: BookMetadataSource
  representativeExternalId: string
  releaseDate: string | null
  metadata: Record<string, unknown>
  locales: Omit<ContentLocaleMaterial, 'content_id'>[]
}

export type LocalePlanChange = {
  kind: 'insert' | 'update' | 'unchanged'
  locale: 'ko' | 'en'
  before: StoredContentLocaleRow | null
  after: ContentLocaleReadbackMaterial
}

export type FictionSourceBookPlan = {
  action: 'insert' | 'reuse' | 'conflict'
  contentId: string
  scopeKey: string
  conflicts: string[]
  candidateContentIds: string[]
  candidateReasons: Record<string, string[]>
  reviewedDistinctContentIds: string[]
  reviewedDistinctCandidateFingerprints: Array<{
    id: string
    external_id: string | null
    fictionSource: {
      workIdentity: string | null
      editionKind: string | null
      textScope: string | null
    }
    locales: Array<{
      locale: string
      title: string | null
      creator: string | null
      isbn: string | null
    }>
  }>
  before: ExactContentSnapshot
  contentInsert: Omit<StoredContentRow, 'created_at'> | null
  contentUpdate: { id: string; metadata: Record<string, unknown> } | null
  localeChanges: LocalePlanChange[]
  expectedAfterMaterial: {
    content: Omit<StoredContentRow, 'created_at'>
    locales: ContentLocaleReadbackMaterial[]
  } | null
  duplicateMatchers: {
    workIdentity: string
    editionKind: FictionSourceBookEditionKind
    textScope: string
    isbns: string[]
    normalizedTitles: string[]
    normalizedCreators: string[]
  }
}

const IDENTITY_PATTERN = /^[a-z0-9]+(?:[._:/-][a-z0-9]+)*$/u
const SCOPE_PATTERN = /^[a-z0-9]+(?:[._:/-][a-z0-9]+)*$/u
const EDITION_KIND_SET = new Set<string>(FICTION_SOURCE_BOOK_EDITION_KINDS)

const MANIFEST_KEYS = new Set([
  'work',
  'edition',
  'reuseContentId',
  'reviewedDistinctContentIds',
  'ko',
  'en',
])
const WORK_KEYS = new Set(['identity', 'title', 'creator', 'titleAliases', 'creatorAliases'])
const EDITION_KEYS = new Set(['kind', 'scope'])
const KO_PUBLISHED_KEYS = new Set(['translationStatus', 'isbn'])
const KO_UNAVAILABLE_KEYS = new Set(['translationStatus', 'creator', 'evidenceUrls'])
const EN_KEYS = new Set(['isbn'])

function recordOf(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${field} must be a JSON object`)
  }
  return value as Record<string, unknown>
}

function rejectUnknownKeys(value: Record<string, unknown>, allowed: Set<string>, field: string): void {
  const unknown = Object.keys(value).filter((key) => !allowed.has(key))
  if (unknown.length > 0) throw new Error(`${field} has unsupported key(s): ${unknown.join(', ')}`)
}

function requiredText(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${field} must be a non-blank string`)
  return value.trim()
}

function textArray(value: unknown, field: string): string[] {
  if (value === undefined) return []
  if (!Array.isArray(value)) throw new Error(`${field} must be an array`)
  const values = value.map((item, index) => requiredText(item, `${field}[${index}]`))
  const normalized = new Set<string>()
  for (const item of values) {
    const key = normalizeIdentityText(item)
    if (normalized.has(key)) throw new Error(`${field} contains a duplicate value: ${item}`)
    normalized.add(key)
  }
  return values
}

function httpsUrl(value: unknown, field: string): string {
  const raw = requiredText(value, field)
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new Error(`${field} must be a URL`)
  }
  if (url.protocol !== 'https:') throw new Error(`${field} must use HTTPS`)
  url.hash = ''
  return url.toString()
}

function isbn13(value: unknown, field: string): string {
  const isbn = requiredText(value, field).replace(/[^0-9]/gu, '')
  if (!/^97[89]\d{10}$/u.test(isbn)) throw new Error(`${field} must be an ISBN-13`)
  const total = [...isbn.slice(0, 12)].reduce(
    (sum, digit, index) => sum + Number(digit) * (index % 2 === 0 ? 1 : 3),
    0,
  )
  const check = (10 - (total % 10)) % 10
  if (check !== Number(isbn[12])) throw new Error(`${field} has an invalid ISBN-13 checksum`)
  return isbn
}

function contentIdText(value: unknown, field: string): string {
  const id = requiredText(value, field)
  if (id.length > 512 || /[\u0000-\u001f\u007f]/u.test(id)) {
    throw new Error(`${field} must be a valid text content ID`)
  }
  return id
}

function contentIdArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value)) throw new Error(`${field} must be an array`)
  if (value.length === 0) throw new Error(`${field} must contain at least one reviewed candidate ID`)
  const ids = value.map((item, index) => contentIdText(item, `${field}[${index}]`))
  if (new Set(ids).size !== ids.length) throw new Error(`${field} contains a duplicate content ID`)
  return ids
}

export function parseFictionSourceBookManifest(input: unknown): FictionSourceBookManifest {
  const raw = recordOf(input, 'manifest')
  rejectUnknownKeys(raw, MANIFEST_KEYS, 'manifest')

  const workRaw = recordOf(raw.work, 'work')
  rejectUnknownKeys(workRaw, WORK_KEYS, 'work')
  const identity = requiredText(workRaw.identity, 'work.identity').toLowerCase()
  if (!IDENTITY_PATTERN.test(identity)) {
    throw new Error('work.identity must be a stable lowercase key (letters, digits, ._:/- only)')
  }
  const title = requiredText(workRaw.title, 'work.title')
  const creator = requiredText(workRaw.creator, 'work.creator')
  const titleAliases = textArray(workRaw.titleAliases, 'work.titleAliases')
  const creatorAliases = textArray(workRaw.creatorAliases, 'work.creatorAliases')

  const editionRaw = recordOf(raw.edition, 'edition')
  rejectUnknownKeys(editionRaw, EDITION_KEYS, 'edition')
  const kind = requiredText(editionRaw.kind, 'edition.kind')
  if (!EDITION_KIND_SET.has(kind)) {
    throw new Error(`edition.kind must be one of: ${FICTION_SOURCE_BOOK_EDITION_KINDS.join(', ')}`)
  }
  const scope = requiredText(editionRaw.scope, 'edition.scope').toLowerCase()
  if (!SCOPE_PATTERN.test(scope)) throw new Error('edition.scope must be a stable lowercase key')
  if (kind === 'full' && scope !== 'complete') {
    throw new Error('edition.scope must be "complete" when edition.kind is "full"')
  }

  const reuseContentId = raw.reuseContentId === undefined
    ? undefined
    : contentIdText(raw.reuseContentId, 'reuseContentId')
  const reviewedDistinctContentIds = raw.reviewedDistinctContentIds === undefined
    ? undefined
    : contentIdArray(raw.reviewedDistinctContentIds, 'reviewedDistinctContentIds')
  if (reuseContentId && reviewedDistinctContentIds) {
    throw new Error('reuseContentId and reviewedDistinctContentIds cannot be used together')
  }

  const koRaw = recordOf(raw.ko, 'ko')
  const translationStatus = requiredText(koRaw.translationStatus, 'ko.translationStatus')
  let ko: FictionSourceBookManifest['ko']
  if (translationStatus === 'published') {
    rejectUnknownKeys(koRaw, KO_PUBLISHED_KEYS, 'ko')
    ko = {
      translationStatus,
      isbn: isbn13(koRaw.isbn, 'ko.isbn'),
    }
  } else if (translationStatus === 'verified_unavailable') {
    rejectUnknownKeys(koRaw, KO_UNAVAILABLE_KEYS, 'ko')
    const evidenceUrls = textArray(koRaw.evidenceUrls, 'ko.evidenceUrls')
      .map((url, index) => httpsUrl(url, `ko.evidenceUrls[${index}]`))
    if (evidenceUrls.length === 0) {
      throw new Error('ko.evidenceUrls must identify the check behind verified_unavailable')
    }
    ko = {
      translationStatus,
      creator: requiredText(koRaw.creator, 'ko.creator'),
      evidenceUrls,
    }
  } else {
    throw new Error('ko.translationStatus must be published or verified_unavailable')
  }

  let en: FictionSourceBookManifest['en']
  if (raw.en !== undefined) {
    const enRaw = recordOf(raw.en, 'en')
    rejectUnknownKeys(enRaw, EN_KEYS, 'en')
    en = {
      isbn: isbn13(enRaw.isbn, 'en.isbn'),
    }
  }
  if (ko.translationStatus === 'verified_unavailable' && !en) {
    throw new Error('en is required when the Korean translation is verified unavailable')
  }

  return {
    work: { identity, title, creator, titleAliases, creatorAliases },
    edition: { kind: kind as FictionSourceBookEditionKind, scope },
    ...(reuseContentId ? { reuseContentId } : {}),
    ...(reviewedDistinctContentIds ? { reviewedDistinctContentIds } : {}),
    ko,
    ...(en ? { en } : {}),
  }
}

export function normalizeIdentityText(value: string): string {
  return value.normalize('NFKC').toLocaleLowerCase('en-US').replace(/[^\p{L}\p{N}]+/gu, '')
}

function assertEdition(value: ExternalBookEdition | undefined, source: BookMetadataSource, isbn: string, field: string): ExternalBookEdition {
  if (!value) throw new Error(`${field} metadata was not resolved`)
  if (value.source !== source) throw new Error(`${field} metadata source must be ${source}`)
  if (value.isbn !== isbn) throw new Error(`${field} metadata ISBN does not match the selected edition`)
  for (const key of ['title', 'creator', 'thumbnailUrl', 'publisher', 'sourceUrl'] as const) {
    if (!value[key]?.trim()) throw new Error(`${field}.${key} is missing for the selected edition`)
  }
  return value
}

function localeSources(edition: ExternalBookEdition): Record<string, unknown> {
  return {
    primary: edition.source,
    title: edition.sourceUrl,
    creator: edition.sourceUrl,
    isbn: edition.sourceUrl,
    publisher: edition.sourceUrl,
    thumbnail: edition.sourceUrl,
    description: edition.descriptionSourceUrl ?? 'confirmed_unavailable',
  }
}

export function buildResolvedSourceBookRegistration(
  manifest: FictionSourceBookManifest,
  editions: { ko?: ExternalBookEdition; en?: ExternalBookEdition },
): ResolvedSourceBookRegistration {
  const enEdition = manifest.en
    ? assertEdition(editions.en, 'openlibrary', manifest.en.isbn, 'en')
    : undefined

  const knownTitles = new Set([manifest.work.title, ...manifest.work.titleAliases].map(normalizeIdentityText))
  const knownCreators = new Set([manifest.work.creator, ...manifest.work.creatorAliases].map(normalizeIdentityText))
  for (const [locale, selected] of Object.entries(editions)) {
    if (!selected) continue
    if (!knownTitles.has(normalizeIdentityText(selected.title))) {
      throw new Error(`${locale} edition title is not declared in work.title or work.titleAliases: ${selected.title}`)
    }
    if (!knownCreators.has(normalizeIdentityText(selected.creator))) {
      throw new Error(`${locale} edition creator is not declared in work.creator or work.creatorAliases: ${selected.creator}`)
    }
  }

  let representative: ExternalBookEdition
  let koLocale: Omit<ContentLocaleMaterial, 'content_id'>
  if (manifest.ko.translationStatus === 'published') {
    const koEdition = assertEdition(editions.ko, 'kakao_book', manifest.ko.isbn, 'ko')
    representative = koEdition
    koLocale = {
      locale: 'ko',
      title: koEdition.title,
      creator: koEdition.creator,
      description: koEdition.description,
      isbn: koEdition.isbn,
      publisher: koEdition.publisher,
      thumbnail_url: koEdition.thumbnailUrl,
      affiliate_url: null,
      sources: localeSources(koEdition),
      verified: true,
    }
  } else {
    if (!enEdition) throw new Error('The untranslated-book exception requires a resolved English edition')
    representative = enEdition
    koLocale = {
      locale: 'ko',
      title: enEdition.title,
      creator: manifest.ko.creator,
      description: null,
      isbn: enEdition.isbn,
      publisher: enEdition.publisher,
      thumbnail_url: enEdition.thumbnailUrl,
      affiliate_url: null,
      sources: {
        ...localeSources(enEdition),
        creator: 'verified_korean_transliteration',
        description: 'confirmed_unavailable',
        translation: 'verified_unavailable',
        translationEvidence: manifest.ko.evidenceUrls,
      },
      verified: true,
    }
  }

  const locales: Omit<ContentLocaleMaterial, 'content_id'>[] = [koLocale]
  if (enEdition && manifest.en) {
    locales.push({
      locale: 'en',
      title: enEdition.title,
      creator: enEdition.creator,
      description: enEdition.description,
      isbn: enEdition.isbn,
      publisher: enEdition.publisher,
      thumbnail_url: enEdition.thumbnailUrl,
      affiliate_url: null,
      sources: localeSources(enEdition),
      verified: true,
    })
  }

  if (manifest.ko.translationStatus === 'verified_unavailable') {
    const ko = locales.find((row) => row.locale === 'ko')!
    const en = locales.find((row) => row.locale === 'en')!
    if (ko.title !== en.title || ko.thumbnail_url !== en.thumbnail_url || ko.isbn !== en.isbn) {
      throw new Error('The untranslated-book exception must reuse the exact English title, cover, and ISBN')
    }
  }

  return {
    representativeExternalSource: representative.source,
    representativeExternalId: representative.isbn,
    releaseDate: representative.releaseDate,
    metadata: {
      ...representative.sourceMetadata,
      isbn: representative.isbn,
      publisher: representative.publisher,
      fictionSource: {
        workIdentity: manifest.work.identity,
        workTitle: manifest.work.title,
        workCreator: manifest.work.creator,
        koTranslationStatus: manifest.ko.translationStatus,
        ...(manifest.ko.translationStatus === 'verified_unavailable'
          ? { translationEvidenceUrls: manifest.ko.evidenceUrls }
          : {}),
      },
    },
    locales,
  }
}

function fictionIdentity(content: StoredContentRow): {
  workIdentity?: string
  editionKind?: string
  textScope?: string
} {
  const source = content.metadata?.fictionSource
  if (!source || typeof source !== 'object' || Array.isArray(source)) return {}
  const row = source as Record<string, unknown>
  return {
    workIdentity: typeof row.workIdentity === 'string' ? row.workIdentity : undefined,
    editionKind: typeof row.editionKind === 'string' ? row.editionKind : undefined,
    textScope: typeof row.textScope === 'string' ? row.textScope : undefined,
  }
}

function deterministicContentId(name: string): string {
  const namespace = Buffer.from('9a1debef9d5f5d9a82918e8ef3822e97', 'hex')
  const digest = createHash('sha1').update(namespace).update(name, 'utf8').digest().subarray(0, 16)
  digest[6] = (digest[6] & 0x0f) | 0x50
  digest[8] = (digest[8] & 0x3f) | 0x80
  const hex = digest.toString('hex')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

function contentWithoutCreatedAt(row: StoredContentRow): Omit<StoredContentRow, 'created_at'> {
  return {
    id: row.id,
    type: row.type,
    subtype: row.subtype,
    external_source: row.external_source,
    external_id: row.external_id,
    release_date: row.release_date,
    metadata: row.metadata,
    member_count: row.member_count,
    celeb_count: row.celeb_count,
    record_count: row.record_count,
  }
}

function materialLocale(row: StoredContentLocaleRow): ContentLocaleReadbackMaterial {
  return {
    content_id: row.content_id,
    locale: row.locale,
    title: row.title,
    creator: row.creator,
    description: row.description,
    isbn: row.isbn,
    publisher: row.publisher,
    thumbnail_url: row.thumbnail_url,
    affiliate_url: row.affiliate_url,
    sources: row.sources,
    verified: row.verified,
  }
}

function comparableText(value: string | null): string {
  return value?.normalize('NFKC').replace(/\s+/gu, ' ').trim() ?? ''
}

function mergeObject(
  before: Record<string, unknown>,
  incoming: Record<string, unknown>,
  conflicts: string[],
  field: string,
  allowLegacySourceMarkerUpgrade = false,
): Record<string, unknown> {
  const merged = { ...before }
  for (const [key, value] of Object.entries(incoming)) {
    if (!(key in merged) || merged[key] === null || merged[key] === '') merged[key] = value
    else if (
      allowLegacySourceMarkerUpgrade
      && key !== 'primary'
      && typeof merged[key] === 'string'
      && merged[key] === before.primary
      && typeof value === 'string'
      && value.startsWith('https://')
    ) merged[key] = value
    else if (JSON.stringify(merged[key]) !== JSON.stringify(value)) {
      conflicts.push(`${field}.${key} differs from the selected edition`)
    }
  }
  return merged
}

function mergeLocale(
  existing: StoredContentLocaleRow,
  desired: ContentLocaleMaterial,
  explicitReuse: boolean,
): { row: ContentLocaleReadbackMaterial; conflicts: string[] } {
  const conflicts: string[] = []
  const row = materialLocale(existing)
  const beforeMaterial = materialLocale(existing)
  const identityFields = ['title', 'creator', 'isbn', 'publisher', 'thumbnail_url'] as const
  for (const field of identityFields) {
    const before = field === 'isbn'
      ? (row[field] ?? '').replace(/[^0-9]/gu, '')
      : comparableText(row[field])
    const after = field === 'isbn'
      ? desired[field].replace(/[^0-9]/gu, '')
      : comparableText(desired[field])
    if (!before) row[field] = desired[field]
    else if (before !== after) conflicts.push(`${existing.locale}.${field} belongs to a different edition`)
  }

  if (!comparableText(row.description)) row.description = desired.description
  else if (desired.description && comparableText(row.description) !== comparableText(desired.description)) {
    conflicts.push(`${existing.locale}.description differs from the selected edition`)
  }

  const storedAffiliate = row.affiliate_url
  const storedAffiliateIsLinkArray = Array.isArray(storedAffiliate)
    && storedAffiliate.every((item) => item !== null
      && typeof item === 'object'
      && !Array.isArray(item)
      && typeof (item as Record<string, unknown>).platform === 'string'
      && typeof (item as Record<string, unknown>).url === 'string')
  if (storedAffiliate === null || storedAffiliateIsLinkArray) {
    // Keep valid stored link objects verbatim, including any legacy extra keys.
    const links = storedAffiliateIsLinkArray
      ? [...storedAffiliate as Array<AffiliateLink & Record<string, unknown>>]
      : []
    for (const link of desired.affiliate_url ?? []) {
      const current = links.find((item) => item.platform === link.platform)
      if (!current) links.push(link)
      else if (current.url !== link.url) conflicts.push(`${existing.locale}.${link.platform} URL differs`)
    }
    row.affiliate_url = links.length > 0 ? links : null
  } else if (explicitReuse) {
    // Explicit reuse identifies the exact locale whose malformed legacy purchase-link value may be replaced.
    row.affiliate_url = desired.affiliate_url
  } else {
    row.affiliate_url = storedAffiliate
    conflicts.push(`${existing.locale}.affiliate_url is legacy non-link-array JSON; set reuseContentId before replacing it`)
  }
  row.verified = true

  const storedSources = row.sources
  const storedSourcesAreObject = storedSources !== null
    && typeof storedSources === 'object'
    && !Array.isArray(storedSources)
  if (storedSourcesAreObject) {
    row.sources = mergeObject(
      storedSources as Record<string, unknown>,
      desired.sources,
      conflicts,
      `${existing.locale}.sources`,
      explicitReuse,
    )
  } else {
    // Legacy array/scalar/null sources are readback data, not an invitation to normalize them.
    // If another locale field needs a write, require an explicit target and preserve sources verbatim.
    row.sources = storedSources
    const withoutSources = (value: ContentLocaleReadbackMaterial) => ({ ...value, sources: null })
    const needsOtherUpdate = stableJson(withoutSources(beforeMaterial)) !== stableJson(withoutSources(row))
    if (needsOtherUpdate && !explicitReuse) {
      conflicts.push(`${existing.locale}.sources is legacy non-object JSON; set reuseContentId before updating this locale`)
    }
  }
  return { row, conflicts }
}

function localeMaterialEqual(left: ContentLocaleReadbackMaterial, right: ContentLocaleReadbackMaterial): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

function explicitReuseMetadata(
  existing: Record<string, unknown> | null,
  desired: Record<string, unknown>,
): { metadata: Record<string, unknown>; changed: boolean; conflicts: string[] } {
  const desiredSource = desired.fictionSource
  if (!desiredSource || typeof desiredSource !== 'object' || Array.isArray(desiredSource)) {
    throw new Error('resolved metadata has no fictionSource identity')
  }
  const metadata = { ...(existing ?? {}) }
  const currentSource = metadata.fictionSource
  if (currentSource !== undefined && currentSource !== null
      && (typeof currentSource !== 'object' || Array.isArray(currentSource))) {
    return {
      metadata,
      changed: false,
      conflicts: ['contents.metadata.fictionSource is non-null and not an object'],
    }
  }

  const mergedSource = { ...((currentSource as Record<string, unknown> | null) ?? {}) }
  const conflicts: string[] = []
  let changed = currentSource === undefined || currentSource === null
  for (const [key, value] of Object.entries(desiredSource as Record<string, unknown>)) {
    const current = mergedSource[key]
    if (current === undefined || current === null || current === '') {
      mergedSource[key] = value
      changed = true
    } else if (stableJson(current) !== stableJson(value)) {
      conflicts.push(`contents.metadata.fictionSource.${key} conflicts with explicit reuse`)
    }
  }
  if (conflicts.length === 0 && changed) metadata.fictionSource = mergedSource
  return { metadata, changed: changed && conflicts.length === 0, conflicts }
}

function reviewedDeterministicTargetConflicts(
  target: StoredContentRow,
  targetLocales: StoredContentLocaleRow[],
  manifest: FictionSourceBookManifest,
  resolved: ResolvedSourceBookRegistration,
): string[] {
  const conflicts: string[] = []
  const identity = fictionIdentity(target)
  if (target.type !== 'BOOK'
      || identity.workIdentity !== manifest.work.identity) {
    conflicts.push(`deterministic target ${target.id} does not have the requested fictionSource work identity`)
  }
  if (target.subtype !== null
      || target.external_source !== resolved.representativeExternalSource
      || target.external_id !== resolved.representativeExternalId
      || target.release_date !== resolved.releaseDate) {
    conflicts.push(`deterministic target ${target.id} bibliographic material changed after insertion`)
  }

  const sortedTargetLocales = [...targetLocales].sort((left, right) => left.locale.localeCompare(right.locale))
  const desiredLocales = resolved.locales
    .map((locale): ContentLocaleMaterial => ({ ...locale, content_id: target.id }))
    .sort((left, right) => left.locale.localeCompare(right.locale))
  if (stableJson(sortedTargetLocales.map((locale) => locale.locale))
      !== stableJson(desiredLocales.map((locale) => locale.locale))) {
    conflicts.push(`deterministic target ${target.id} locale set changed after insertion`)
  }
  for (const desired of desiredLocales) {
    const stored = sortedTargetLocales.find((locale) => locale.locale === desired.locale)
    if (!stored) continue
    if ((stored.isbn ?? '').replace(/[^0-9]/gu, '') !== desired.isbn) {
      conflicts.push(`deterministic target ${target.id}/${desired.locale} ISBN differs from the requested edition`)
    }
    if (stableJson(materialLocale(stored)) !== stableJson(desired)) {
      conflicts.push(`deterministic target ${target.id}/${desired.locale} material changed after insertion`)
    }
  }
  return conflicts
}

export function buildFictionSourceBookPlan(
  manifest: FictionSourceBookManifest,
  resolved: ResolvedSourceBookRegistration,
  catalog: BookCatalogSnapshot,
): FictionSourceBookPlan {
  const scopeKey = manifest.work.identity
  const deterministicTargetId = deterministicContentId(`fiction-source-work:${scopeKey}`)
  const contentsById = new Map(catalog.contents.map((row) => [row.id, row]))
  const localesByContent = new Map<string, StoredContentLocaleRow[]>()
  for (const locale of catalog.locales) {
    const rows = localesByContent.get(locale.content_id) ?? []
    if (rows.some((row) => row.locale === locale.locale)) {
      throw new Error(`catalog has duplicate locale row: ${locale.content_id}/${locale.locale}`)
    }
    rows.push(locale)
    localesByContent.set(locale.content_id, rows)
  }

  const titleSet = new Set([
    manifest.work.title,
    ...manifest.work.titleAliases,
    ...resolved.locales.map((row) => row.title),
  ].map(normalizeIdentityText))
  const creatorSet = new Set([
    manifest.work.creator,
    ...manifest.work.creatorAliases,
    ...resolved.locales.map((row) => row.creator),
  ].map(normalizeIdentityText))
  const isbnSet = new Set(resolved.locales.map((row) => row.isbn))
  const candidateReasons = new Map<string, Set<string>>()
  const addReason = (contentId: string, reason: string) => {
    const reasons = candidateReasons.get(contentId) ?? new Set<string>()
    reasons.add(reason)
    candidateReasons.set(contentId, reasons)
  }

  for (const content of catalog.contents) {
    if (content.type !== 'BOOK') continue
    const identity = fictionIdentity(content)
    const sameWork = identity.workIdentity === manifest.work.identity
    if (sameWork) addReason(content.id, 'work_identity')
    if (content.external_id && isbnSet.has(content.external_id.replace(/[^0-9]/gu, ''))) {
      addReason(content.id, 'contents.external_id')
    }
    for (const locale of localesByContent.get(content.id) ?? []) {
      if (isbnSet.has((locale.isbn ?? '').replace(/[^0-9]/gu, ''))) addReason(content.id, `${locale.locale}.isbn`)
      if (titleSet.has(normalizeIdentityText(locale.title ?? ''))
          && creatorSet.has(normalizeIdentityText(locale.creator ?? ''))) {
        addReason(content.id, `${locale.locale}.title+creator`)
      }
    }
  }

  if (manifest.reuseContentId) addReason(manifest.reuseContentId, 'explicit_reuseContentId')
  const candidateContentIds = [...candidateReasons.keys()].sort()
  const reviewedDistinctContentIds = [...(manifest.reviewedDistinctContentIds ?? [])]
  const reviewedDistinctCandidateFingerprints = reviewedDistinctContentIds
    .map((id) => contentsById.get(id))
    .filter((content): content is StoredContentRow => content !== undefined)
    .map((content) => {
      const identity = fictionIdentity(content)
      return {
        id: content.id,
        external_id: content.external_id,
        fictionSource: {
          workIdentity: identity.workIdentity ?? null,
          editionKind: identity.editionKind ?? null,
          textScope: identity.textScope ?? null,
        },
        locales: [...(localesByContent.get(content.id) ?? [])]
          .sort((left, right) => left.locale.localeCompare(right.locale))
          .map((locale) => ({
            locale: locale.locale,
            title: locale.title,
            creator: locale.creator,
            isbn: locale.isbn,
          })),
      }
    })
    .sort((left, right) => left.id.localeCompare(right.id))
  const conflicts: string[] = []
  let selectedId: string | undefined

  if (manifest.reuseContentId) {
    const selected = contentsById.get(manifest.reuseContentId)
    if (!selected) conflicts.push(`reuseContentId does not exist: ${manifest.reuseContentId}`)
    else if (selected.type !== 'BOOK') conflicts.push(`reuseContentId is not BOOK: ${manifest.reuseContentId}`)
    const others = candidateContentIds.filter((id) => id !== manifest.reuseContentId)
    if (others.length > 0) conflicts.push(`other work/ISBN candidates exist: ${others.join(', ')}`)
    selectedId = manifest.reuseContentId
  } else if (reviewedDistinctContentIds.length > 0) {
    const deterministicTarget = contentsById.get(deterministicTargetId)
    const reviewableCandidateContentIds = candidateContentIds.filter((id) => id !== deterministicTargetId)
    const candidateSet = new Set(reviewableCandidateContentIds)
    const reviewedSet = new Set(reviewedDistinctContentIds)
    const unmatched = reviewedDistinctContentIds.filter((id) => !candidateSet.has(id))
    const unreviewed = reviewableCandidateContentIds.filter((id) => !reviewedSet.has(id))
    if (unmatched.length > 0) {
      conflicts.push(`reviewedDistinctContentIds are not current candidates: ${unmatched.join(', ')}`)
    }
    if (unreviewed.length > 0) {
      conflicts.push(`current candidates were not reviewed as distinct editions: ${unreviewed.join(', ')}`)
    }
    for (const contentId of reviewedDistinctContentIds.filter((id) => candidateSet.has(id))) {
      const reasons = candidateReasons.get(contentId) ?? new Set<string>()
      if (reasons.has('work_identity')) {
        conflicts.push(`reviewed candidate ${contentId} has the same fictionSource work identity`)
      }
      if ([...reasons].some((reason) => reason === 'contents.external_id' || reason.endsWith('.isbn'))) {
        conflicts.push(`reviewed candidate ${contentId} has an ISBN matching the requested edition`)
      }
      if ([...reasons].some((reason) => reason.endsWith('.title+creator'))) {
        conflicts.push(`reviewed candidate ${contentId} matches the same logical work; choose reuseContentId and register the ISBN as another edition`)
      }
      if ([...reasons].some((reason) => !reason.endsWith('.title+creator')
          && reason !== 'work_identity'
          && reason !== 'contents.external_id'
          && !reason.endsWith('.isbn'))) {
        conflicts.push(`reviewed candidate ${contentId} has an unsupported duplicate reason`)
      }
    }
    if (deterministicTarget) {
      selectedId = deterministicTargetId
      conflicts.push(...reviewedDeterministicTargetConflicts(
        deterministicTarget,
        localesByContent.get(deterministicTargetId) ?? [],
        manifest,
        resolved,
      ))
    }
  } else if (candidateContentIds.length > 1) {
    conflicts.push(`multiple existing BOOK candidates: ${candidateContentIds.join(', ')}`)
  } else if (candidateContentIds.length === 1) {
    selectedId = candidateContentIds[0]
  }

  if (selectedId) {
    const selected = contentsById.get(selectedId)
    if (selected) {
      const identity = fictionIdentity(selected)
      if (identity.workIdentity && identity.workIdentity !== manifest.work.identity) {
        conflicts.push(`selected content ${selectedId} has a different stored work identity`)
      }
      const reasons = candidateReasons.get(selectedId) ?? new Set<string>()
      const identityKnown = reasons.has('work_identity')
      const isbnKnown = [...reasons].some((reason) => reason.endsWith('isbn') || reason === 'contents.external_id')
      if (!manifest.reuseContentId && !identityKnown && !isbnKnown) {
        conflicts.push(`selected legacy content ${selectedId} has no stored work identity; set reuseContentId after review`)
      }
    }
  }

  const contentId = selectedId ?? deterministicTargetId
  const existingContent = contentsById.get(contentId) ?? null
  if (!selectedId && existingContent) conflicts.push(`derived content ID is already occupied: ${contentId}`)
  const beforeLocales = [...(localesByContent.get(contentId) ?? [])].sort((a, b) => a.locale.localeCompare(b.locale))
  const before: ExactContentSnapshot = { content: existingContent, locales: beforeLocales }

  const desiredLocales = resolved.locales.map((row): ContentLocaleMaterial => ({ ...row, content_id: contentId }))
  const localeChanges: LocalePlanChange[] = []
  const expectedLocaleMap = new Map<string, ContentLocaleReadbackMaterial>(
    beforeLocales.map((row) => [row.locale, materialLocale(row)]),
  )
  for (const desired of desiredLocales) {
    const existing = beforeLocales.find((row) => row.locale === desired.locale)
    if (!existing) {
      localeChanges.push({ kind: 'insert', locale: desired.locale, before: null, after: desired })
      expectedLocaleMap.set(desired.locale, desired)
      continue
    }
    const merged = mergeLocale(existing, desired, manifest.reuseContentId === contentId)
    conflicts.push(...merged.conflicts)
    const beforeMaterial = materialLocale(existing)
    localeChanges.push({
      kind: localeMaterialEqual(beforeMaterial, merged.row) ? 'unchanged' : 'update',
      locale: desired.locale,
      before: existing,
      after: merged.row,
    })
    expectedLocaleMap.set(desired.locale, merged.row)
  }

  const contentInsert = existingContent ? null : {
    id: contentId,
    type: 'BOOK',
    subtype: null,
    external_source: resolved.representativeExternalSource,
    external_id: resolved.representativeExternalId,
    release_date: resolved.releaseDate,
    metadata: resolved.metadata,
    member_count: 0,
    celeb_count: 0,
    record_count: 0,
  }
  let contentUpdate: FictionSourceBookPlan['contentUpdate'] = null
  if (existingContent && manifest.reuseContentId === contentId) {
    const merged = explicitReuseMetadata(existingContent.metadata, resolved.metadata)
    conflicts.push(...merged.conflicts)
    if (merged.changed) contentUpdate = { id: contentId, metadata: merged.metadata }
  }
  const expectedContent = existingContent
    ? {
        ...contentWithoutCreatedAt(existingContent),
        ...(contentUpdate ? { metadata: contentUpdate.metadata } : {}),
      }
    : contentInsert
  const action = conflicts.length > 0 ? 'conflict' : existingContent ? 'reuse' : 'insert'

  return {
    action,
    contentId,
    scopeKey,
    conflicts,
    candidateContentIds,
    candidateReasons: Object.fromEntries(
      [...candidateReasons.entries()].map(([id, reasons]) => [id, [...reasons].sort()]),
    ),
    reviewedDistinctContentIds,
    reviewedDistinctCandidateFingerprints,
    before,
    contentInsert,
    contentUpdate,
    localeChanges,
    expectedAfterMaterial: conflicts.length > 0 || !expectedContent ? null : {
      content: expectedContent,
      locales: [...expectedLocaleMap.values()].sort((a, b) => a.locale.localeCompare(b.locale)),
    },
    duplicateMatchers: {
      workIdentity: manifest.work.identity,
      editionKind: manifest.edition.kind,
      textScope: manifest.edition.scope,
      isbns: [...isbnSet].sort(),
      normalizedTitles: [...titleSet].sort(),
      normalizedCreators: [...creatorSet].sort(),
    },
  }
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`
  if (value && typeof value === 'object') {
    const row = value as Record<string, unknown>
    return `{${Object.keys(row).sort().map((key) => `${JSON.stringify(key)}:${stableJson(row[key])}`).join(',')}}`
  }
  return JSON.stringify(value)
}

function snapshotMaterial(snapshot: ExactContentSnapshot): FictionSourceBookPlan['expectedAfterMaterial'] {
  if (!snapshot.content) return null
  return {
    content: contentWithoutCreatedAt(snapshot.content),
    locales: snapshot.locales
      .map(materialLocale)
      .sort((left, right) => left.locale.localeCompare(right.locale)),
  }
}

export type SourceBookApplyRecoveryStatus = 'applied-after-recovery' | 'rolled-back' | 'commit-unknown'
export type SourceBookApplyRecoveryEvidence = {
  rollbackConfirmed: boolean
}

export function classifySourceBookApplyRecovery(
  plan: FictionSourceBookPlan,
  live: ExactContentSnapshot,
  evidence: SourceBookApplyRecoveryEvidence,
): SourceBookApplyRecoveryStatus {
  if (plan.expectedAfterMaterial
      && stableJson(snapshotMaterial(live)) === stableJson(plan.expectedAfterMaterial)) {
    return 'applied-after-recovery'
  }
  if (evidence.rollbackConfirmed && stableJson(live) === stableJson(plan.before)) return 'rolled-back'
  return 'commit-unknown'
}

function windowsPathKey(file: string): string {
  return win32.normalize(resolve(file)).toLocaleLowerCase('en-US')
}

export function assertDistinctManifestReceiptPaths(manifestPath: string, receiptPath: string): void {
  const manifest = resolve(manifestPath)
  const receipt = resolve(receiptPath)
  if (windowsPathKey(manifest) === windowsPathKey(receipt)) {
    throw new Error('Receipt path must differ from the manifest path')
  }
  if (!existsSync(manifest) || !existsSync(receipt)) return

  const manifestReal = realpathSync(manifest)
  const receiptReal = realpathSync(receipt)
  if (windowsPathKey(manifestReal) === windowsPathKey(receiptReal)) {
    throw new Error('Receipt path resolves to the manifest file')
  }
  const manifestStat = statSync(manifest)
  const receiptStat = statSync(receipt)
  if (manifestStat.dev === receiptStat.dev
      && manifestStat.ino !== 0
      && manifestStat.ino === receiptStat.ino) {
    throw new Error('Receipt path refers to the same file as the manifest')
  }
}

export function terminalSourceBookReceiptStatus(value: unknown): 'applied' | 'applied-after-recovery' | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const status = (value as Record<string, unknown>).status
  return status === 'applied' || status === 'applied-after-recovery' ? status : null
}

export function assertSourceBookReceiptIsWritable(file: string): void {
  if (!existsSync(file)) return
  let existing: unknown
  try {
    existing = JSON.parse(readFileSync(file, 'utf8'))
  } catch {
    return
  }
  const terminalStatus = terminalSourceBookReceiptStatus(existing)
  if (terminalStatus) {
    throw new Error(
      `Receipt already records terminal success (${terminalStatus}); pass --receipt with a new path`,
    )
  }
}

export function writeSourceBookReceiptAtomically(file: string, receipt: Record<string, unknown>): void {
  const directory = dirname(file)
  mkdirSync(directory, { recursive: true })
  const temporary = resolve(directory, `.${basename(file)}.${process.pid}.${randomUUID()}.tmp`)
  try {
    writeFileSync(temporary, `${JSON.stringify(receipt, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' })
    renameSync(temporary, file)
  } finally {
    rmSync(temporary, { force: true })
  }
}

export function planSha256(plan: FictionSourceBookPlan): string {
  return createHash('sha256').update(stableJson(plan), 'utf8').digest('hex')
}

function jsonbLiteral(value: unknown): string {
  const base64 = Buffer.from(JSON.stringify(value), 'utf8').toString('base64')
  return `convert_from(decode('${base64}', 'base64'), 'utf8')::jsonb`
}

export function buildAtomicSourceBookApplySql(plan: FictionSourceBookPlan): string {
  if (plan.action === 'conflict' || !plan.expectedAfterMaterial) {
    throw new Error('Cannot build apply SQL for a conflicting plan')
  }
  const sha256 = planSha256(plan)
  const payload = {
    planSha256: sha256,
    contentId: plan.contentId,
    expectedCandidateIds: plan.candidateContentIds,
    reviewedDistinctContentIds: plan.reviewedDistinctContentIds,
    reviewedDistinctCandidateFingerprints: plan.reviewedDistinctCandidateFingerprints,
    duplicateMatchers: plan.duplicateMatchers,
    expectedBefore: plan.before,
    contentInsert: plan.contentInsert,
    contentUpdate: plan.contentUpdate,
    localeWrites: plan.localeChanges.filter((change) => change.kind !== 'unchanged').map((change) => change.after),
    editionWrites: plan.localeChanges.map((change, index) => ({
      ...change.after,
      edition_kind: plan.duplicateMatchers.editionKind,
      text_scope: plan.duplicateMatchers.textScope,
      sort_order: index,
    })),
    expectedAfterMaterial: plan.expectedAfterMaterial,
  }

  return String.raw`\set ON_ERROR_STOP on
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
SET LOCAL idle_in_transaction_session_timeout = '45s';
SET LOCAL ROLE service_role;
LOCK TABLE public.contents, public.content_locales, public.figure_book_contents,
  public.figure_book_editions IN SHARE ROW EXCLUSIVE MODE;

CREATE TEMP TABLE source_book_batch (payload jsonb NOT NULL) ON COMMIT DROP;
INSERT INTO source_book_batch VALUES (${jsonbLiteral(payload)});

CREATE TEMP TABLE source_book_candidates (id text PRIMARY KEY) ON COMMIT DROP;
INSERT INTO source_book_candidates (id)
SELECT DISTINCT content.id
FROM public.contents AS content
CROSS JOIN source_book_batch AS batch
LEFT JOIN public.content_locales AS locale ON locale.content_id = content.id
WHERE content.type = 'BOOK'
  AND (
    content.id = batch.payload ->> 'contentId'
    OR
    content.metadata #>> '{fictionSource,workIdentity}' = batch.payload #>> '{duplicateMatchers,workIdentity}'
    OR regexp_replace(coalesce(content.external_id, ''), '[^0-9]', '', 'g') IN (
      SELECT jsonb_array_elements_text(batch.payload #> '{duplicateMatchers,isbns}')
    )
    OR regexp_replace(coalesce(locale.isbn, ''), '[^0-9]', '', 'g') IN (
      SELECT jsonb_array_elements_text(batch.payload #> '{duplicateMatchers,isbns}')
    )
    OR (
      lower(regexp_replace(coalesce(locale.title, ''), '[^[:alnum:]가-힣一-龥ぁ-んァ-ヶ]', '', 'g')) IN (
        SELECT jsonb_array_elements_text(batch.payload #> '{duplicateMatchers,normalizedTitles}')
      )
      AND lower(regexp_replace(coalesce(locale.creator, ''), '[^[:alnum:]가-힣一-龥ぁ-んァ-ヶ]', '', 'g')) IN (
        SELECT jsonb_array_elements_text(batch.payload #> '{duplicateMatchers,normalizedCreators}')
      )
    )
  );

CREATE TEMP TABLE source_book_reviewed_distinct_before (snapshot jsonb NOT NULL) ON COMMIT DROP;
INSERT INTO source_book_reviewed_distinct_before
SELECT coalesce(jsonb_agg(jsonb_build_object(
  'id', content.id,
  'external_id', content.external_id,
  'fictionSource', jsonb_build_object(
    'workIdentity', content.metadata #>> '{fictionSource,workIdentity}',
    'editionKind', content.metadata #>> '{fictionSource,editionKind}',
    'textScope', content.metadata #>> '{fictionSource,textScope}'
  ),
  'locales', coalesce((
    SELECT jsonb_agg(jsonb_build_object(
      'locale', locale.locale,
      'title', locale.title,
      'creator', locale.creator,
      'isbn', locale.isbn
    ) ORDER BY locale.locale)
    FROM public.content_locales AS locale
    WHERE locale.content_id = content.id
  ), '[]'::jsonb)
) ORDER BY content.id), '[]'::jsonb)
FROM public.contents AS content
CROSS JOIN source_book_batch AS batch
WHERE content.id IN (
  SELECT jsonb_array_elements_text(batch.payload -> 'reviewedDistinctContentIds')
);

CREATE TEMP TABLE source_book_before (snapshot jsonb NOT NULL) ON COMMIT DROP;
INSERT INTO source_book_before
SELECT jsonb_build_object(
  'content', (
    SELECT jsonb_build_object(
      'id', content.id,
      'type', content.type,
      'subtype', content.subtype,
      'external_source', content.external_source,
      'external_id', content.external_id,
      'release_date', content.release_date,
      'metadata', content.metadata,
      'member_count', content.member_count,
      'celeb_count', content.celeb_count,
      'record_count', content.record_count,
      'created_at', content.created_at
    )
    FROM public.contents AS content
    WHERE content.id = batch.payload ->> 'contentId'
  ),
  'locales', coalesce((
    SELECT jsonb_agg(jsonb_build_object(
      'content_id', locale.content_id,
      'locale', locale.locale,
      'title', locale.title,
      'creator', locale.creator,
      'description', locale.description,
      'isbn', locale.isbn,
      'publisher', locale.publisher,
      'thumbnail_url', locale.thumbnail_url,
      'affiliate_url', locale.affiliate_url,
      'sources', locale.sources,
      'verified', locale.verified,
      'created_at', locale.created_at,
      'updated_at', locale.updated_at
    ) ORDER BY locale.locale)
    FROM public.content_locales AS locale
    WHERE locale.content_id = batch.payload ->> 'contentId'
  ), '[]'::jsonb)
)
FROM source_book_batch AS batch;

DO $guards$
DECLARE
  batch jsonb;
  actual_candidates jsonb;
  actual_reviewed_distinct jsonb;
  actual_before jsonb;
BEGIN
  SELECT payload INTO STRICT batch FROM source_book_batch;
  SELECT coalesce(jsonb_agg(id::text ORDER BY id::text), '[]'::jsonb)
    INTO actual_candidates FROM source_book_candidates;
  SELECT snapshot INTO STRICT actual_reviewed_distinct FROM source_book_reviewed_distinct_before;
  SELECT snapshot INTO STRICT actual_before FROM source_book_before;
  IF actual_candidates IS DISTINCT FROM batch -> 'expectedCandidateIds' THEN
    RAISE EXCEPTION 'fiction source BOOK candidates changed after preflight';
  END IF;
  IF actual_reviewed_distinct IS DISTINCT FROM batch -> 'reviewedDistinctCandidateFingerprints' THEN
    RAISE EXCEPTION 'fiction source BOOK reviewed distinct candidates changed after preflight';
  END IF;
  IF actual_before IS DISTINCT FROM batch -> 'expectedBefore' THEN
    RAISE EXCEPTION 'fiction source BOOK target changed after preflight';
  END IF;
END;
$guards$;

INSERT INTO public.contents (
  id, type, subtype, external_source, external_id, release_date, metadata,
  member_count, celeb_count, record_count
)
SELECT
  row ->> 'id',
  row ->> 'type',
  row ->> 'subtype',
  row ->> 'external_source',
  row ->> 'external_id',
  nullif(row ->> 'release_date', '')::date,
  row -> 'metadata',
  (row ->> 'member_count')::integer,
  (row ->> 'celeb_count')::integer,
  (row ->> 'record_count')::integer
FROM source_book_batch AS batch
CROSS JOIN LATERAL (SELECT batch.payload -> 'contentInsert' AS row) AS input
WHERE jsonb_typeof(row) = 'object';

UPDATE public.contents AS content
SET metadata = row -> 'metadata'
FROM source_book_batch AS batch
CROSS JOIN LATERAL (SELECT batch.payload -> 'contentUpdate' AS row) AS input
WHERE jsonb_typeof(row) = 'object'
  AND content.id = row ->> 'id';

INSERT INTO public.content_locales (
  content_id, locale, title, creator, description, isbn, publisher,
  thumbnail_url, affiliate_url, sources, verified
)
SELECT
  row.content_id,
  row.locale,
  row.title,
  row.creator,
  row.description,
  row.isbn,
  row.publisher,
  row.thumbnail_url,
  row.affiliate_url,
  row.sources,
  row.verified
FROM source_book_batch AS batch
CROSS JOIN LATERAL jsonb_to_recordset(batch.payload -> 'localeWrites') AS row(
  content_id text,
  locale text,
  title text,
  creator text,
  description text,
  isbn text,
  publisher text,
  thumbnail_url text,
  affiliate_url jsonb,
  sources jsonb,
  verified boolean
)
ON CONFLICT (content_id, locale) DO UPDATE SET
  title = excluded.title,
  creator = excluded.creator,
  description = excluded.description,
  isbn = excluded.isbn,
  publisher = excluded.publisher,
  thumbnail_url = excluded.thumbnail_url,
  affiliate_url = excluded.affiliate_url,
  sources = excluded.sources,
  verified = excluded.verified,
  updated_at = now();

INSERT INTO public.figure_book_contents (content_id)
SELECT batch.payload ->> 'contentId'
FROM source_book_batch AS batch
ON CONFLICT (content_id) DO NOTHING;

INSERT INTO public.figure_book_editions (
  content_id, locale, title, creator, description, isbn, publisher,
  thumbnail_url, release_date, edition_kind, text_scope, sort_order,
  verified, sources
)
SELECT
  row.content_id,
  row.locale,
  row.title,
  row.creator,
  row.description,
  row.isbn,
  row.publisher,
  row.thumbnail_url,
  CASE
    WHEN content.release_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}'
      THEN left(content.release_date, 10)::date
    ELSE NULL
  END,
  row.edition_kind,
  row.text_scope,
  row.sort_order,
  row.verified,
  row.sources
FROM source_book_batch AS batch
CROSS JOIN LATERAL jsonb_to_recordset(batch.payload -> 'editionWrites') AS row(
  content_id text,
  locale text,
  title text,
  creator text,
  description text,
  isbn text,
  publisher text,
  thumbnail_url text,
  edition_kind text,
  text_scope text,
  sort_order integer,
  verified boolean,
  sources jsonb
)
JOIN public.contents AS content ON content.id = row.content_id
ON CONFLICT (content_id, locale, isbn) WHERE isbn IS NOT NULL DO UPDATE SET
  title = excluded.title,
  creator = excluded.creator,
  description = excluded.description,
  publisher = excluded.publisher,
  thumbnail_url = excluded.thumbnail_url,
  release_date = excluded.release_date,
  edition_kind = excluded.edition_kind,
  text_scope = excluded.text_scope,
  sort_order = excluded.sort_order,
  verified = excluded.verified,
  sources = excluded.sources;

DO $readback$
DECLARE
  batch jsonb;
  actual jsonb;
BEGIN
  SELECT payload INTO STRICT batch FROM source_book_batch;
  SELECT jsonb_build_object(
    'content', (
      SELECT jsonb_build_object(
        'id', content.id,
        'type', content.type,
        'subtype', content.subtype,
        'external_source', content.external_source,
        'external_id', content.external_id,
        'release_date', content.release_date,
        'metadata', content.metadata,
        'member_count', content.member_count,
        'celeb_count', content.celeb_count,
        'record_count', content.record_count
      )
      FROM public.contents AS content
      WHERE content.id = batch ->> 'contentId'
    ),
    'locales', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'content_id', locale.content_id,
        'locale', locale.locale,
        'title', locale.title,
        'creator', locale.creator,
        'description', locale.description,
        'isbn', locale.isbn,
        'publisher', locale.publisher,
        'thumbnail_url', locale.thumbnail_url,
        'affiliate_url', locale.affiliate_url,
        'sources', locale.sources,
        'verified', locale.verified
      ) ORDER BY locale.locale)
      FROM public.content_locales AS locale
      WHERE locale.content_id = batch ->> 'contentId'
    ), '[]'::jsonb)
  ) INTO actual;
  IF actual IS DISTINCT FROM batch -> 'expectedAfterMaterial' THEN
    RAISE EXCEPTION 'fiction source BOOK material readback mismatch';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.figure_book_contents
    WHERE content_id = batch ->> 'contentId'
  ) THEN
    RAISE EXCEPTION 'fiction source work marker readback mismatch';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM jsonb_to_recordset(batch -> 'editionWrites') AS expected(
      content_id text,
      locale text,
      isbn text,
      edition_kind text,
      text_scope text
    )
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.figure_book_editions AS edition
      WHERE edition.content_id = expected.content_id
        AND edition.locale = expected.locale
        AND edition.isbn = expected.isbn
        AND edition.edition_kind = expected.edition_kind
        AND edition.text_scope = expected.text_scope
    )
  ) THEN
    RAISE EXCEPTION 'fiction source edition readback mismatch';
  END IF;
END;
$readback$;

SELECT jsonb_build_object(
  'status', 'applied',
  'readback', 'all_columns_match',
  'plan_sha256', batch.payload ->> 'planSha256',
  'before', before.snapshot,
  'after', jsonb_build_object(
    'content', (
      SELECT to_jsonb(content)
      FROM (
        SELECT id, type, subtype, external_source, external_id, release_date, metadata,
               member_count, celeb_count, record_count, created_at
        FROM public.contents
        WHERE id = batch.payload ->> 'contentId'
      ) AS content
    ),
    'locales', coalesce((
      SELECT jsonb_agg(to_jsonb(locale) ORDER BY locale.locale)
      FROM (
        SELECT content_id, locale, title, creator, description, isbn, publisher,
               thumbnail_url, affiliate_url, sources, verified, created_at, updated_at
        FROM public.content_locales
        WHERE content_id = batch.payload ->> 'contentId'
      ) AS locale
    ), '[]'::jsonb)
  )
)::text
FROM source_book_batch AS batch
CROSS JOIN source_book_before AS before;

COMMIT;
`
}

export function assertExactSourceBookReadback(
  expected: ExactContentSnapshot,
  actual: ExactContentSnapshot,
): void {
  if (stableJson(expected) !== stableJson(actual)) {
    throw new Error('post-commit fiction source BOOK readback differs from the transaction readback')
  }
}
