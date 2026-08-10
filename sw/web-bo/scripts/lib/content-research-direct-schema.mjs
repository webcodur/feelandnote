export const CONTENT_RESEARCH_TYPES = Object.freeze(['BOOK', 'VIDEO', 'GAME', 'MUSIC'])
export const CONTENT_RESEARCH_SOURCE_KINDS = Object.freeze([
  'direct_statement', 'interview', 'official_profile', 'social_post',
  'transcript', 'archive', 'article', 'other',
])
export const CONTENT_RESEARCH_ACCESS_STATUSES = Object.freeze([
  'accessible', 'bot_blocked', 'archived', 'unavailable',
])

const PROFILE_KEYS = [
  'id', 'slug', 'nickname', 'nicknameEn', 'profession', 'nationality', 'birthDate',
  'deathDate', 'wikidataQid', 'publicationStatus', 'celebTier',
]
const PAYLOAD_KEYS = ['profileSnapshot', 'nameVariants', 'homonymNotes', 'summary', 'scopes']
const SCOPE_KEYS = ['contentType', 'status', 'searchNotes', 'scopeSources', 'candidates']
const SOURCE_KEYS = [
  'url', 'sourceTier', 'sourceKind', 'accessStatus', 'supportsCandidate',
  'title', 'notes', 'checkedAt',
]
const CANDIDATE_KEYS = [
  'candidateKey', 'decision', 'title', 'creator', 'evidenceSummary',
  'rejectionReason', 'content', 'sources',
]
const CONTENT_KEYS = [
  'type', 'externalSource', 'externalId', 'subtype', 'releaseDate',
  'metadata', 'locales',
]
const LOCALE_KEYS = [
  'locale', 'title', 'creator', 'thumbnailUrl', 'description', 'isbn',
  'publisher', 'verified', 'sources',
]
const PROVIDERS = Object.freeze({
  BOOK: new Set(['kakao_book', 'openlibrary']),
  VIDEO: new Set(['tmdb']),
  GAME: new Set(['igdb']),
  MUSIC: new Set(['itunes']),
})
const REQUIRED_PROVIDER_LOCALE = Object.freeze({ kakao_book: 'ko', openlibrary: 'en' })
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ASCII_OBJECT_KEY = /^[\x20-\x7E]{1,128}$/
const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/
const SECRET_VALUE = /(?:\bBearer\s+[A-Za-z0-9._~+\/-]+|\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b|\bsk_[A-Za-z0-9_-]{8,}\b|\bsb_secret_[A-Za-z0-9_-]{8,}\b|\b(?:client[_-]?secret|access[_-]?token|refresh[_-]?token|id[_-]?token|api[_-]?token|auth[_-]?token|bearer|credentials?|service[_-]?role(?:[_-]?key)?|private[_-]?key|password|cookie|authorization|jwt|api[_-]?key)\s*[=:]\s*[^\s,;]+|\bpostgres(?:ql)?:\/\/[^\s/:]+:[^\s@]+@)/i

function normalizedSecretKey(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]/g, '')
}

function isSecretKey(value) {
  return /(?:secret|accesstoken|refreshtoken|idtoken|apitoken|authtoken|bearer|credential|servicerole|privatekey|password|cookie|authorization|jwt|apikey)/.test(normalizedSecretKey(value))
}

function compactIsbn(value) {
  if (typeof value !== 'string') return null
  const compact = value.replace(/[\s-]/g, '').toUpperCase()
  return /^(?:\d{9}[\dX]|\d{13})$/.test(compact) ? compact : null
}

function validIsbn10(value) {
  if (!/^\d{9}[\dX]$/.test(value)) return false
  const sum = [...value].reduce((total, digit, index) => (
    total + (digit === 'X' ? 10 : Number(digit)) * (10 - index)
  ), 0)
  return sum % 11 === 0
}

function validIsbn13(value) {
  if (!/^97[89]\d{10}$/.test(value)) return false
  const sum = [...value.slice(0, 12)].reduce((total, digit, index) => (
    total + Number(digit) * (index % 2 === 0 ? 1 : 3)
  ), 0)
  return Number(value[12]) === (10 - (sum % 10)) % 10
}

export function canonicalContentResearchIsbn(value) {
  const compact = compactIsbn(value)
  if (!compact) return null
  if (compact.length === 13) return validIsbn13(compact) ? compact : null
  if (!validIsbn10(compact)) return null
  const firstTwelve = `978${compact.slice(0, 9)}`
  const sum = [...firstTwelve].reduce((total, digit, index) => (
    total + Number(digit) * (index % 2 === 0 ? 1 : 3)
  ), 0)
  return `${firstTwelve}${(10 - (sum % 10)) % 10}`
}

function issue(issues, path, code, message) {
  issues.push({ path, code, message })
}

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function stableJsonValue(value) {
  if (Array.isArray(value)) return value.map(stableJsonValue)
  if (isObject(value)) {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableJsonValue(value[key])]))
  }
  return value
}

function jsonValuesEqual(left, right) {
  return JSON.stringify(stableJsonValue(left)) === JSON.stringify(stableJsonValue(right))
}

function exactKeys(issues, value, expected, path) {
  if (!isObject(value)) {
    issue(issues, path, 'OBJECT', 'must be an object')
    return false
  }
  const actual = Object.keys(value).sort()
  const wanted = [...expected].sort()
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    issue(issues, path, 'EXACT_KEYS', `keys must be exactly: ${wanted.join(', ')}`)
  }
  return true
}

function nonblank(issues, value, path, code = 'TEXT', minimum = 1) {
  if (typeof value !== 'string' || value.trim().length < minimum) {
    issue(issues, path, code, `must be nonblank text with at least ${minimum} characters`)
    return false
  }
  return true
}

function nullableText(issues, value, path) {
  if (value != null && typeof value !== 'string') issue(issues, path, 'NULLABLE_TEXT', 'must be text or null')
}

function validateNoSecrets(issues, value, path = '$', seen = new Set()) {
  if (typeof value === 'string') {
    if (SECRET_VALUE.test(value)) issue(issues, path, 'SECRET_VALUE', 'secret-bearing values are forbidden in research payloads')
    return
  }
  if (value == null || typeof value !== 'object') return
  if (seen.has(value)) {
    issue(issues, path, 'JSON_CYCLE', 'must not contain a cyclic value')
    return
  }
  seen.add(value)
  if (Array.isArray(value)) {
    value.forEach((child, index) => validateNoSecrets(issues, child, `${path}[${index}]`, seen))
  } else {
    for (const [key, child] of Object.entries(value)) {
      if (!ASCII_OBJECT_KEY.test(key)) {
        issue(issues, `${path}.${key}`, 'OBJECT_KEY_ASCII', 'object keys must be 1..128 printable ASCII characters')
      }
      if (isSecretKey(key)) issue(issues, `${path}.${key}`, 'SECRET_KEY', 'secret-bearing keys are forbidden in research payloads')
      validateNoSecrets(issues, child, `${path}.${key}`, seen)
    }
  }
  seen.delete(value)
}

function validateJsonObject(issues, value, path) {
  if (!isObject(value)) issue(issues, path, 'JSON_OBJECT', 'must be a JSON object')
}

function validateProfileSnapshot(issues, profile, expectedProfileSnapshot) {
  if (!exactKeys(issues, profile, PROFILE_KEYS, '$.profileSnapshot')) return
  if (typeof profile.id !== 'string' || !UUID.test(profile.id)) issue(issues, '$.profileSnapshot.id', 'UUID', 'must be a UUID')
  nonblank(issues, profile.nickname, '$.profileSnapshot.nickname')
  for (const key of PROFILE_KEYS.filter((key) => !['id', 'nickname'].includes(key))) {
    nullableText(issues, profile[key], `$.profileSnapshot.${key}`)
  }
  nonblank(issues, profile.publicationStatus, '$.profileSnapshot.publicationStatus')
  nonblank(issues, profile.celebTier, '$.profileSnapshot.celebTier')
  if (expectedProfileSnapshot && !jsonValuesEqual(profile, expectedProfileSnapshot)) {
    issue(issues, '$.profileSnapshot', 'PROFILE_SNAPSHOT_MISMATCH', 'must exactly match the claimed profile snapshot')
  }
}

function sourceUrlError(value) {
  if (typeof value !== 'string' || value.trim().length === 0) return 'must be nonblank text'
  if (value.length > 4_096) return 'must be at most 4096 characters'
  if (/[\x00-\x1F\x7F]|\s/u.test(value)) return 'must not contain whitespace or control characters'
  const authorityMatch = /^https:\/\/([^/?#]+)/i.exec(value)
  if (!authorityMatch) return 'must use HTTPS'
  const authority = authorityMatch[1]
  if (authority.includes('@')) return 'must not contain URL userinfo'
  if (authority.startsWith('[') || (authority.match(/:/g) ?? []).length > 1) return 'must use an ASCII FQDN rather than an IP literal'
  const colon = authority.lastIndexOf(':')
  const hostname = colon >= 0 ? authority.slice(0, colon) : authority
  const port = colon >= 0 ? authority.slice(colon + 1) : null
  if (port !== null && (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65_535)) {
    return 'port must be a decimal integer from 1 through 65535'
  }
  if (hostname.length < 1 || hostname.length > 253 || !/^[\x00-\x7F]+$/.test(hostname)) {
    return 'hostname must be a 1..253 character ASCII FQDN'
  }
  const labels = hostname.split('.')
  const validLabel = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/
  if (labels.length < 2 || labels.some((label) => !validLabel.test(label))) {
    return 'hostname must contain at least two valid DNS labels'
  }
  if (!/^[A-Za-z]/.test(labels.at(-1))) return 'final hostname label must start with an ASCII letter'
  try {
    const parsed = new URL(value)
    if (parsed.protocol !== 'https:') return 'must use HTTPS'
  } catch {
    return 'must be a valid URL'
  }
  return null
}

function validateSource(issues, source, path) {
  if (!exactKeys(issues, source, SOURCE_KEYS, path)) return
  const urlError = sourceUrlError(source.url)
  if (urlError) issue(issues, `${path}.url`, 'SOURCE_URL', urlError)
  if (!['primary', 'secondary'].includes(source.sourceTier)) issue(issues, `${path}.sourceTier`, 'SOURCE_TIER', 'must be primary or secondary')
  if (!CONTENT_RESEARCH_SOURCE_KINDS.includes(source.sourceKind)) issue(issues, `${path}.sourceKind`, 'SOURCE_KIND', 'is not allowed')
  if (!CONTENT_RESEARCH_ACCESS_STATUSES.includes(source.accessStatus)) issue(issues, `${path}.accessStatus`, 'ACCESS_STATUS', 'is not allowed')
  if (typeof source.supportsCandidate !== 'boolean') issue(issues, `${path}.supportsCandidate`, 'BOOLEAN', 'must be boolean')
  nullableText(issues, source.title, `${path}.title`)
  nullableText(issues, source.notes, `${path}.notes`)
  if (typeof source.checkedAt !== 'string' || !ISO_TIMESTAMP.test(source.checkedAt) || !Number.isFinite(Date.parse(source.checkedAt))) {
    issue(issues, `${path}.checkedAt`, 'TIMESTAMP', 'must be an ISO timestamp')
  }
}

function expectedLocaleProvider(contentType, localeName) {
  if (contentType === 'BOOK') return localeName === 'ko' ? 'kakao_book' : localeName === 'en' ? 'openlibrary' : null
  return { VIDEO: 'tmdb', GAME: 'igdb', MUSIC: 'itunes' }[contentType] ?? null
}

function validateLocale(issues, locale, path, contentType) {
  if (!exactKeys(issues, locale, LOCALE_KEYS, path)) return
  if (!['ko', 'en'].includes(locale.locale)) issue(issues, `${path}.locale`, 'LOCALE', 'must be ko or en')
  nonblank(issues, locale.title, `${path}.title`)
  for (const key of ['creator', 'thumbnailUrl', 'description', 'isbn', 'publisher']) {
    nullableText(issues, locale[key], `${path}.${key}`)
  }
  if (locale.verified !== true) issue(issues, `${path}.verified`, 'LOCALE_VERIFIED', 'must be true for eligible provider metadata')
  if (!isObject(locale.sources) || Object.keys(locale.sources).length === 0) {
    issue(issues, `${path}.sources`, 'LOCALE_SOURCES', 'must be a nonempty JSON object')
  } else {
    const expectedProvider = expectedLocaleProvider(contentType, locale.locale)
    if (locale.sources.primary !== expectedProvider) {
      issue(issues, `${path}.sources.primary`, 'LOCALE_PRIMARY_SOURCE', `must be ${expectedProvider ?? 'a supported provider'} for ${contentType} ${locale.locale}`)
    }
  }
}

function validateExternalId(issues, content, path) {
  const value = content.externalId
  if (!nonblank(issues, value, `${path}.externalId`, 'EXTERNAL_ID')) return
  const valid = content.type === 'BOOK'
    ? canonicalContentResearchIsbn(value) !== null
    : content.type === 'VIDEO'
      ? /^tmdb-(?:movie|tv)-\d+$/.test(value)
      : content.type === 'GAME'
        ? /^igdb-\d+$/.test(value)
        : content.type === 'MUSIC'
          ? /^itunes-\d+$/.test(value)
          : false
  if (!valid) issue(issues, `${path}.externalId`, 'EXTERNAL_ID_FORMAT', `does not match ${content.type} external ID policy`)
}

function validateContent(issues, content, path, scopeType) {
  if (!exactKeys(issues, content, CONTENT_KEYS, path)) return
  if (content.type !== scopeType) issue(issues, `${path}.type`, 'CONTENT_TYPE_MISMATCH', 'must match its scope contentType')
  if (!PROVIDERS[scopeType]?.has(content.externalSource)) {
    issue(issues, `${path}.externalSource`, 'EXTERNAL_SOURCE', `must use ${[...(PROVIDERS[scopeType] ?? [])].join(' or ')}`)
  }
  validateExternalId(issues, content, path)
  nullableText(issues, content.subtype, `${path}.subtype`)
  nullableText(issues, content.releaseDate, `${path}.releaseDate`)
  validateJsonObject(issues, content.metadata, `${path}.metadata`)
  if (content.externalSource === 'openlibrary') {
    if (!Array.isArray(content.metadata?.languages) || !content.metadata.languages.includes('eng')) {
      issue(issues, `${path}.metadata.languages`, 'OPENLIBRARY_LANGUAGE', 'must contain eng for OpenLibrary metadata')
    }
  }
  if (!Array.isArray(content.locales) || content.locales.length === 0) {
    issue(issues, `${path}.locales`, 'LOCALES', 'must be a nonempty array')
    return
  }
  const localeNames = content.locales.map((locale) => locale?.locale)
  if (new Set(localeNames).size !== localeNames.length) issue(issues, `${path}.locales`, 'LOCALE_DUPLICATE', 'must not repeat a locale')
  content.locales.forEach((locale, index) => validateLocale(issues, locale, `${path}.locales[${index}]`, scopeType))
  const requiredLocale = REQUIRED_PROVIDER_LOCALE[content.externalSource]
  if (requiredLocale) {
    const metadataLocale = content.locales.find((locale) => locale?.locale === requiredLocale)
    if (!metadataLocale) issue(issues, `${path}.locales`, 'PROVIDER_LOCALE', `${content.externalSource} requires ${requiredLocale} locale metadata`)
    else if (!nonblank(issues, metadataLocale.isbn, `${path}.locales.${requiredLocale}.isbn`, 'BOOK_ISBN')) {
      // nonblank records the exact failure.
    } else {
      const localeIsbn = canonicalContentResearchIsbn(metadataLocale.isbn)
      const externalIsbn = canonicalContentResearchIsbn(content.externalId)
      if (!localeIsbn) {
        issue(issues, `${path}.locales.${requiredLocale}.isbn`, 'BOOK_ISBN', 'must have a valid ISBN-10 or ISBN-13 checksum')
      } else if (externalIsbn && localeIsbn !== externalIsbn) {
        issue(issues, `${path}.locales.${requiredLocale}.isbn`, 'BOOK_ISBN_EDITION_MISMATCH', 'must identify the same edition as content.externalId')
      }
    }
  }
}

function usablePrimary(source) {
  return source?.sourceTier === 'primary'
    && source?.supportsCandidate === true
    && ['accessible', 'archived'].includes(source?.accessStatus)
}

function validateCandidate(issues, candidate, path, scopeType, seenCandidateKeys, seenContentIds) {
  if (!exactKeys(issues, candidate, CANDIDATE_KEYS, path)) return
  if (nonblank(issues, candidate.candidateKey, `${path}.candidateKey`, 'CANDIDATE_KEY')) {
    if (seenCandidateKeys.has(candidate.candidateKey)) issue(issues, `${path}.candidateKey`, 'CANDIDATE_DUPLICATE', 'must be unique in the payload')
    seenCandidateKeys.add(candidate.candidateKey)
  }
  if (!['eligible', 'rejected', 'unresolved'].includes(candidate.decision)) issue(issues, `${path}.decision`, 'DECISION', 'is not allowed')
  if (candidate.decision === 'unresolved') issue(issues, `${path}.decision`, 'UNRESOLVED_FORBIDDEN', 'unresolved candidates cannot be committed')
  nonblank(issues, candidate.title, `${path}.title`)
  nullableText(issues, candidate.creator, `${path}.creator`)
  if (!Array.isArray(candidate.sources) || candidate.sources.length === 0) issue(issues, `${path}.sources`, 'CANDIDATE_SOURCES', 'must be a nonempty array')
  else candidate.sources.forEach((source, index) => validateSource(issues, source, `${path}.sources[${index}]`))

  if (candidate.decision === 'eligible') {
    nonblank(issues, candidate.evidenceSummary, `${path}.evidenceSummary`, 'EVIDENCE_SUMMARY')
    if (candidate.rejectionReason !== null) issue(issues, `${path}.rejectionReason`, 'REJECTION_REASON', 'must be null for eligible candidates')
    if (!isObject(candidate.content)) issue(issues, `${path}.content`, 'CONTENT_REQUIRED', 'must contain verified provider metadata')
    else {
      validateContent(issues, candidate.content, `${path}.content`, scopeType)
      const externalIdentity = candidate.content.type === 'BOOK'
        ? canonicalContentResearchIsbn(candidate.content.externalId) ?? candidate.content.externalId
        : candidate.content.externalId
      const identity = `${candidate.content.externalSource}:${externalIdentity}`
      if (seenContentIds.has(identity)) issue(issues, `${path}.content.externalId`, 'CONTENT_DUPLICATE', 'must identify only one candidate')
      seenContentIds.add(identity)
    }
    if (!candidate.sources?.some(usablePrimary)) {
      issue(issues, `${path}.sources`, 'ELIGIBLE_PRIMARY_SOURCE', 'requires an accessible or archived primary source that supports the candidate')
    }
  } else if (candidate.decision === 'rejected') {
    nonblank(issues, candidate.evidenceSummary, `${path}.evidenceSummary`, 'EVIDENCE_SUMMARY')
    nonblank(issues, candidate.rejectionReason, `${path}.rejectionReason`, 'REJECTION_REASON')
    if (candidate.content !== null) issue(issues, `${path}.content`, 'REJECTED_CONTENT', 'must be null for rejected candidates')
  } else {
    nullableText(issues, candidate.evidenceSummary, `${path}.evidenceSummary`)
    nullableText(issues, candidate.rejectionReason, `${path}.rejectionReason`)
    if (candidate.content !== null) issue(issues, `${path}.content`, 'UNRESOLVED_CONTENT', 'must be null for unresolved candidates')
  }
}

function validateScope(issues, scope, index, seenCandidateKeys, seenContentIds) {
  const path = `$.scopes[${index}]`
  if (!exactKeys(issues, scope, SCOPE_KEYS, path)) return
  if (!CONTENT_RESEARCH_TYPES.includes(scope.contentType)) issue(issues, `${path}.contentType`, 'CONTENT_TYPE', 'is not allowed')
  if (scope.status !== 'completed') issue(issues, `${path}.status`, 'SCOPE_STATUS', 'must be completed')
  nonblank(issues, scope.searchNotes, `${path}.searchNotes`, 'SEARCH_NOTES')
  if (!Array.isArray(scope.scopeSources) || scope.scopeSources.length === 0) {
    issue(issues, `${path}.scopeSources`, 'SCOPE_SOURCES', 'must be a nonempty array')
  } else {
    scope.scopeSources.forEach((source, sourceIndex) => validateSource(issues, source, `${path}.scopeSources[${sourceIndex}]`))
    if (!scope.scopeSources.some((source) => ['accessible', 'archived'].includes(source?.accessStatus))) {
      issue(issues, `${path}.scopeSources`, 'SCOPE_SOURCE_ACCESS', 'requires at least one accessible or archived source')
    }
  }
  if (!Array.isArray(scope.candidates)) issue(issues, `${path}.candidates`, 'CANDIDATES', 'must be an array')
  else scope.candidates.forEach((candidate, candidateIndex) => validateCandidate(
    issues, candidate, `${path}.candidates[${candidateIndex}]`, scope.contentType,
    seenCandidateKeys, seenContentIds,
  ))
}

export function validateContentResearchCommitPayload(payload, expectedProfileSnapshot = null) {
  const issues = []
  validateNoSecrets(issues, payload)
  if (!exactKeys(issues, payload, PAYLOAD_KEYS, '$')) return { valid: false, issues }
  validateProfileSnapshot(issues, payload.profileSnapshot, expectedProfileSnapshot)
  if (!Array.isArray(payload.nameVariants) || payload.nameVariants.length === 0) {
    issue(issues, '$.nameVariants', 'NAME_VARIANTS', 'must be a nonempty array')
  } else {
    const normalized = payload.nameVariants.map((value) => typeof value === 'string' ? value.trim() : value)
    payload.nameVariants.forEach((value, index) => nonblank(issues, value, `$.nameVariants[${index}]`))
    if (new Set(normalized).size !== normalized.length) issue(issues, '$.nameVariants', 'NAME_VARIANT_DUPLICATE', 'must not contain duplicates')
    if (payload.profileSnapshot?.nickname && !normalized.includes(payload.profileSnapshot.nickname.trim())) {
      issue(issues, '$.nameVariants', 'NAME_VARIANT_NICKNAME', 'must include profileSnapshot.nickname')
    }
    if (payload.profileSnapshot?.nicknameEn && !normalized.includes(payload.profileSnapshot.nicknameEn.trim())) {
      issue(issues, '$.nameVariants', 'NAME_VARIANT_NICKNAME_EN', 'must include profileSnapshot.nicknameEn')
    }
  }
  nonblank(issues, payload.homonymNotes, '$.homonymNotes', 'HOMONYM_NOTES')
  nonblank(issues, payload.summary, '$.summary', 'SUMMARY')
  if (!Array.isArray(payload.scopes) || payload.scopes.length !== CONTENT_RESEARCH_TYPES.length) {
    issue(issues, '$.scopes', 'SCOPES', 'must contain exactly BOOK, VIDEO, GAME and MUSIC')
  } else {
    const actualTypes = payload.scopes.map((scope) => scope?.contentType)
    if (new Set(actualTypes).size !== actualTypes.length
      || !CONTENT_RESEARCH_TYPES.every((type) => actualTypes.includes(type))) {
      issue(issues, '$.scopes', 'SCOPE_TYPES', 'must contain each content type exactly once')
    }
    const seenCandidateKeys = new Set()
    const seenContentIds = new Set()
    payload.scopes.forEach((scope, index) => validateScope(issues, scope, index, seenCandidateKeys, seenContentIds))
  }
  return { valid: issues.length === 0, issues }
}

export function assertContentResearchCommitPayload(payload, expectedProfileSnapshot = null) {
  const result = validateContentResearchCommitPayload(payload, expectedProfileSnapshot)
  if (!result.valid) {
    const error = new Error(`invalid content research payload (${result.issues.length})`)
    error.code = 'INVALID_CONTENT_RESEARCH_PAYLOAD'
    error.issues = result.issues
    throw error
  }
  return payload
}

export function classifyContentResearchPayload(payload) {
  const eligible = payload.scopes.flatMap((scope) => scope.candidates.map((candidate) => ({
    contentType: scope.contentType,
    decision: candidate.decision,
  }))).filter((candidate) => candidate.decision === 'eligible')
  const musicEligible = eligible.filter((candidate) => candidate.contentType === 'MUSIC').length
  const nonMusicEligible = eligible.length - musicEligible
  return {
    eligible: eligible.length,
    musicEligible,
    nonMusicEligible,
    musicOnlyDeferred: musicEligible > 0 && nonMusicEligible === 0,
    confirmedEmptyCandidate: eligible.length === 0,
  }
}
