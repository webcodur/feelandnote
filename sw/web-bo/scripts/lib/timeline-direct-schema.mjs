export const TIMELINE_MODES = new Set(['life', 'fiction'])

export const TIMELINE_KINDS = new Set([
  'birth',
  'death',
  'education',
  'work',
  'publish',
  'battle',
  'travel',
  'office',
  'meeting',
  'other',
])

export const DIRECT_COMMIT_KEYS = new Set([
  'celebId',
  'slug',
  'nickname',
  'nicknameEn',
  'timelineMode',
  'laneId',
  'sourceSnapshotId',
  'profileSnapshot',
  'sources',
  'researchStatus',
  'events',
  'profileConflicts',
  'blockingIssues',
  'applicationStatus',
])

export const PROFILE_SNAPSHOT_KEYS = new Set([
  'id',
  'slug',
  'nickname',
  'nicknameEn',
  'title',
  'titleEn',
  'celebTier',
  'publicationStatus',
  'birthDate',
  'deathDate',
  'profession',
  'nationality',
  'gender',
  'wikidataQid',
])

export const SOURCE_KEYS = new Set(['id', 'url', 'title', 'publisher', 'accessedAt'])

const COMMON_EVENT_KEYS = [
  'eventType',
  'title',
  'titleEn',
  'description',
  'descriptionEn',
  'kind',
  'placeName',
  'placeNameEn',
  'placeQuery',
  'placeCountry',
  'evidenceRefs',
]

export const LIFE_EVENT_KEYS = new Set([
  ...COMMON_EVENT_KEYS,
  'year',
  'yearEnd',
  'month',
  'day',
  'sequenceLabel',
  'sequenceLabelEn',
])

export const FICTION_EVENT_KEYS = new Set([
  ...COMMON_EVENT_KEYS,
  'sequenceLabel',
  'sequenceLabelEn',
  'sortOrder',
])

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const PROFILE_DATE = /^(-?\d{1,6})(?:-(\d{2})(?:-(\d{2}))?)?$/
const WIKIDATA_QID = /^Q\d+$/
const PROFILE_CONFLICT_KEYS = new Set([
  'field', 'manifestValue', 'evidenceValue', 'message', 'messageEn', 'evidenceRefs',
])
const BLOCKING_ISSUE_KEYS = new Set(['code', 'message', 'messageEn', 'evidenceRefs', 'resolution'])
const BLOCKING_RESOLUTION_KEYS = new Set([
  'status', 'action', 'proposedValue', 'precision', 'rationale', 'rationaleEn',
  'evidenceUrls', 'confidence', 'resolvedAt',
])
const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/
const PROFILE_CONFLICT_FIELDS = new Set([
  'nickname', 'nicknameEn', 'celebTier', 'publicationStatus', 'birthDate', 'deathDate',
  'profession', 'nationality', 'wikidataQid',
])

// U+FFFD, control characters, CJK compatibility ideographs and frequent UTF-8/CP949
// mojibake markers. Literal question marks are allowed unless two or more appear as a
// standalone replacement run.
const BROKEN_TEXT = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\uFFFD\uF900-\uFAFF]|(?:Ã.|Â.|â(?:€|€™|€œ|€|€“|€”))|\?(?=[\p{L}\p{N}])|(?:^|\s)\?{2,}(?=\s|$)/u
const BROKEN_URL_TEXT = /[\u0000-\u001F\u007F\uFFFD]|(?:\u00C3[\u0080-\u00BF]|\u00C2[\u0080-\u00BF]|\u00E2(?:\u0080|\u20AC))|%EF%BF%BD/iu

function makeIssue(code, path, message) {
  return { code, path, message }
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key)
}

function isText(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function normalizeNullableText(value) {
  return isText(value) ? value.trim() : null
}

function canonicalValue(value) {
  if (Array.isArray(value)) return value.map(canonicalValue)
  if (isObject(value)) {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalValue(value[key])]))
  }
  return value
}

function valuesEqual(left, right) {
  return JSON.stringify(canonicalValue(left)) === JSON.stringify(canonicalValue(right))
}

function rejectExtraKeys(value, allowed, path, issues) {
  if (!isObject(value)) return
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      issues.push(makeIssue('EXTRA_KEY', path === '$' ? `$.${key}` : `${path}.${key}`, `허용되지 않은 키 '${key}'입니다.`))
    }
  }
}

function requireText(value, path, issues, { min = 1, max = 2_000, nullable = false } = {}) {
  if (value == null && nullable) return
  if (!isText(value)) {
    issues.push(makeIssue('TEXT_REQUIRED', path, '비어 있지 않은 문자열이어야 합니다.'))
    return
  }
  const text = value.trim()
  if (text.length < min || text.length > max) {
    issues.push(makeIssue('TEXT_LENGTH', path, `${min}~${max}자여야 합니다. 현재 ${text.length}자입니다.`))
  }
  if (BROKEN_TEXT.test(text)) {
    issues.push(makeIssue('BROKEN_TEXT', path, '깨진 문자나 잘못 디코딩된 문자열이 포함되어 있습니다.'))
  }
}

function requireHttpUrl(value, path, issues, { max = 2_000 } = {}) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    issues.push(makeIssue('URL_REQUIRED', path, '비어 있지 않은 HTTP(S) URL 문자열이어야 합니다.'))
    return
  }
  const text = value.trim()
  if (text.length > max) {
    issues.push(makeIssue('URL_LENGTH', path, `URL은 ${max}자 이하여야 합니다. 현재 ${text.length}자입니다.`))
  }
  if (BROKEN_URL_TEXT.test(text)) {
    issues.push(makeIssue('BROKEN_TEXT', path, 'URL에 깨진 문자나 잘못 디코딩된 문자열이 포함되어 있습니다.'))
    return
  }
  if (/\s/u.test(text)) {
    issues.push(makeIssue('SOURCE_URL', path, '공백 없는 유효한 HTTP(S) URL이어야 합니다.'))
    return
  }
  let parsed
  try {
    parsed = new URL(text)
  } catch {
    issues.push(makeIssue('SOURCE_URL', path, '유효한 HTTP(S) URL이어야 합니다.'))
    return
  }
  if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname) {
    issues.push(makeIssue('SOURCE_URL', path, 'http:// 또는 https:// URL이어야 합니다.'))
  }
  if (parsed.username || parsed.password) {
    issues.push(makeIssue('URL_CREDENTIALS', path, 'URL에 사용자 이름이나 비밀번호를 포함할 수 없습니다.'))
  }
}

export function sentenceCount(value) {
  if (!isText(value)) return 0
  const normalized = value
    .trim()
    .replace(/\b(Mr|Mrs|Ms|Dr|Prof|St|No|Nos|Op|Opp|Vol|Pt|Chap|Fig)\./gi, '$1')
    .replace(/\b[A-Z]\.(?=\s*[A-Z]\.)/g, '')
  return normalized.match(/[.!?。！？]+(?=(?:["'”’)]*\s)|["'”’)]*$)/gu)?.length ?? 0
}

function validateDescription(value, path, issues) {
  requireText(value, path, issues, { min: 20, max: 800 })
  if (isText(value)) {
    const count = sentenceCount(value)
    if (count < 2 || count > 3) {
      issues.push(makeIssue('SENTENCE_COUNT', path, `설명은 2~3문장이어야 합니다. 현재 ${count}문장입니다.`))
    }
  }
}

function validateNullableInteger(value, path, issues, { min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER } = {}) {
  if (value == null) return
  if (!Number.isInteger(value) || value < min || value > max) {
    issues.push(makeIssue('INTEGER_RANGE', path, `${min}~${max} 범위의 정수 또는 null이어야 합니다.`))
  }
}

function parseProfileDate(value) {
  if (!isText(value)) return null
  const match = PROFILE_DATE.exec(value.trim())
  if (!match) return null
  const year = Number(match[1])
  const month = match[2] == null ? null : Number(match[2])
  const day = match[3] == null ? null : Number(match[3])
  if (!Number.isInteger(year)
    || (month != null && (month < 1 || month > 12))
    || (day != null && (day < 1 || day > 31))) return null
  return {
    year,
    month,
    day,
  }
}

function validateProfileSnapshot(snapshot, issues) {
  if (!isObject(snapshot)) {
    issues.push(makeIssue('PROFILE_SNAPSHOT_OBJECT', '$.profileSnapshot', 'profileSnapshot은 객체여야 합니다.'))
    return
  }
  rejectExtraKeys(snapshot, PROFILE_SNAPSHOT_KEYS, '$.profileSnapshot', issues)
  for (const field of PROFILE_SNAPSHOT_KEYS) {
    if (!hasOwn(snapshot, field)) {
      issues.push(makeIssue('PROFILE_SNAPSHOT_KEY', `$.profileSnapshot.${field}`, 'claim 스냅샷의 필수 키가 없습니다. null이라도 키를 유지해야 합니다.'))
    }
  }
  if (!isText(snapshot.id) || !UUID.test(snapshot.id.trim())) {
    issues.push(makeIssue('UUID', '$.profileSnapshot.id', 'UUID 문자열이어야 합니다.'))
  }
  requireText(snapshot.slug, '$.profileSnapshot.slug', issues, { max: 180, nullable: true })
  requireText(snapshot.nickname, '$.profileSnapshot.nickname', issues, { max: 180 })
  requireText(snapshot.nicknameEn, '$.profileSnapshot.nicknameEn', issues, { max: 180, nullable: true })
  requireText(snapshot.title, '$.profileSnapshot.title', issues, { max: 240, nullable: true })
  requireText(snapshot.titleEn, '$.profileSnapshot.titleEn', issues, { max: 240, nullable: true })
  requireText(snapshot.celebTier, '$.profileSnapshot.celebTier', issues, { max: 40 })
  requireText(snapshot.publicationStatus, '$.profileSnapshot.publicationStatus', issues, { max: 40 })
  requireText(snapshot.profession, '$.profileSnapshot.profession', issues, { max: 180, nullable: true })
  requireText(snapshot.nationality, '$.profileSnapshot.nationality', issues, { max: 180, nullable: true })
  if (snapshot.gender != null && typeof snapshot.gender !== 'boolean') {
    issues.push(makeIssue('PROFILE_GENDER', '$.profileSnapshot.gender', 'boolean 또는 null이어야 합니다.'))
  }
  for (const field of ['birthDate', 'deathDate']) {
    const value = snapshot[field]
    if (value != null && !isText(value)) {
      issues.push(makeIssue('PROFILE_DATE', `$.profileSnapshot.${field}`, '비어 있지 않은 DB 날짜 원문 문자열이나 null이어야 합니다.'))
    }
  }
  if (snapshot.wikidataQid != null && (!isText(snapshot.wikidataQid) || !WIKIDATA_QID.test(snapshot.wikidataQid.trim()))) {
    issues.push(makeIssue('WIKIDATA_QID', '$.profileSnapshot.wikidataQid', 'Q로 시작하는 Wikidata QID 또는 null이어야 합니다.'))
  }
}

function validateSources(sources, issues) {
  const ids = new Set()
  const byId = new Map()
  if (!Array.isArray(sources) || sources.length === 0) {
    issues.push(makeIssue('SOURCES_REQUIRED', '$.sources', 'sources는 한 개 이상의 출처 배열이어야 합니다.'))
    return { ids, byId }
  }
  for (const [index, source] of sources.entries()) {
    const base = `$.sources[${index}]`
    if (!isObject(source)) {
      issues.push(makeIssue('SOURCE_OBJECT', base, '출처는 객체여야 합니다.'))
      continue
    }
    rejectExtraKeys(source, SOURCE_KEYS, base, issues)
    requireText(source.id, `${base}.id`, issues, { max: 80 })
    requireHttpUrl(source.url, `${base}.url`, issues)
    requireText(source.title, `${base}.title`, issues, { max: 500 })
    requireText(source.publisher, `${base}.publisher`, issues, { max: 200, nullable: true })
    if (source.accessedAt != null && (!isText(source.accessedAt) || !ISO_DATE.test(source.accessedAt.trim()))) {
      issues.push(makeIssue('SOURCE_ACCESSED_AT', `${base}.accessedAt`, 'YYYY-MM-DD 문자열 또는 null이어야 합니다.'))
    }
    if (isText(source.id)) {
      const id = source.id.trim()
      if (ids.has(id)) issues.push(makeIssue('SOURCE_DUPLICATE', `${base}.id`, `출처 id '${id}'가 중복되었습니다.`))
      ids.add(id)
      byId.set(id, source)
    }
  }
  return { ids, byId }
}

function validateEvidenceRefs(value, path, sourceIds, issues, usedSourceIds) {
  if (!Array.isArray(value) || value.length === 0) {
    issues.push(makeIssue('EVIDENCE_REQUIRED', path, '최소 한 개의 sources[].id를 참조해야 합니다.'))
    return
  }
  const seen = new Set()
  for (const [index, ref] of value.entries()) {
    const refPath = `${path}[${index}]`
    if (!isText(ref)) {
      issues.push(makeIssue('EVIDENCE_ID', refPath, '비어 있지 않은 출처 id 문자열이어야 합니다.'))
      continue
    }
    const id = ref.trim()
    if (seen.has(id)) issues.push(makeIssue('EVIDENCE_DUPLICATE', refPath, `출처 id '${id}'가 한 사건에서 중복 참조되었습니다.`))
    if (!sourceIds.has(id)) issues.push(makeIssue('EVIDENCE_DANGLING', refPath, `sources에 없는 id '${id}'를 참조합니다.`))
    seen.add(id)
    usedSourceIds.add(id)
  }
}

function validateCommonEvent(event, index, mode, sourceIds, issues, usedSourceIds) {
  const base = `$.events[${index}]`
  if (!isObject(event)) {
    issues.push(makeIssue('EVENT_OBJECT', base, '사건은 객체여야 합니다.'))
    return false
  }
  rejectExtraKeys(event, mode === 'life' ? LIFE_EVENT_KEYS : FICTION_EVENT_KEYS, base, issues)
  if (event.eventType != null && event.eventType !== mode) {
    issues.push(makeIssue('EVENT_MODE', `${base}.eventType`, `timelineMode '${mode}'와 같아야 합니다.`))
  }
  requireText(event.title, `${base}.title`, issues, { max: 120 })
  requireText(event.titleEn, `${base}.titleEn`, issues, { max: 200 })
  validateDescription(event.description, `${base}.description`, issues)
  validateDescription(event.descriptionEn, `${base}.descriptionEn`, issues)
  if (!TIMELINE_KINDS.has(event.kind)) {
    issues.push(makeIssue('EVENT_KIND', `${base}.kind`, `허용 kind: ${[...TIMELINE_KINDS].join(', ')}`))
  }
  for (const field of ['placeName', 'placeNameEn', 'placeQuery', 'placeCountry']) {
    requireText(event[field], `${base}.${field}`, issues, { max: 240, nullable: true })
  }
  validateEvidenceRefs(event.evidenceRefs, `${base}.evidenceRefs`, sourceIds, issues, usedSourceIds)
  return true
}

function validateProfileConflicts(payload, sourceIds, issues, usedSourceIds) {
  const validBoundaryConflicts = new Set()
  if (payload.profileConflicts == null) return validBoundaryConflicts
  if (!Array.isArray(payload.profileConflicts)) {
    issues.push(makeIssue('PROFILE_CONFLICTS_ARRAY', '$.profileConflicts', 'profileConflicts는 배열이어야 합니다.'))
    return validBoundaryConflicts
  }
  const seen = new Set()
  for (const [index, conflict] of payload.profileConflicts.entries()) {
    const base = `$.profileConflicts[${index}]`
    const issueCountBefore = issues.length
    if (!isObject(conflict)) {
      issues.push(makeIssue('PROFILE_CONFLICT_OBJECT', base, '프로필 충돌은 객체여야 합니다.'))
      continue
    }
    rejectExtraKeys(conflict, PROFILE_CONFLICT_KEYS, base, issues)
    if (!PROFILE_CONFLICT_FIELDS.has(conflict.field)) {
      issues.push(makeIssue('PROFILE_CONFLICT_FIELD', `${base}.field`, '허용된 프로필 필드가 아닙니다.'))
    } else if (seen.has(conflict.field)) {
      issues.push(makeIssue('PROFILE_CONFLICT_DUPLICATE', `${base}.field`, `field '${conflict.field}'가 중복되었습니다.`))
    }
    seen.add(conflict.field)
    if (!hasOwn(conflict, 'manifestValue')) {
      issues.push(makeIssue('PROFILE_CONFLICT_MANIFEST_VALUE', `${base}.manifestValue`, 'manifestValue가 필요합니다.'))
    } else if (PROFILE_CONFLICT_FIELDS.has(conflict.field)
      && !valuesEqual(conflict.manifestValue, payload.profileSnapshot?.[conflict.field])) {
      issues.push(makeIssue(
        'PROFILE_CONFLICT_CURRENT_MISMATCH',
        `${base}.manifestValue`,
        'manifestValue는 claim 시점 profileSnapshot의 현재 값과 정확히 같아야 합니다.',
      ))
    }
    if (!hasOwn(conflict, 'evidenceValue') || conflict.evidenceValue == null) {
      issues.push(makeIssue('PROFILE_CONFLICT_EVIDENCE_VALUE', `${base}.evidenceValue`, 'evidenceValue가 필요합니다.'))
    } else if (!isText(conflict.evidenceValue)) {
      issues.push(makeIssue('PROFILE_CONFLICT_EVIDENCE_VALUE', `${base}.evidenceValue`, 'evidenceValue는 비어 있지 않은 문자열이어야 합니다.'))
    } else {
      if (conflict.field === 'wikidataQid' && !WIKIDATA_QID.test(conflict.evidenceValue.trim())) {
        issues.push(makeIssue('PROFILE_CONFLICT_QID', `${base}.evidenceValue`, 'Wikidata 충돌의 evidenceValue는 QID여야 합니다.'))
      }
      if (hasOwn(conflict, 'manifestValue') && valuesEqual(conflict.manifestValue, conflict.evidenceValue)) {
        issues.push(makeIssue('PROFILE_CONFLICT_NO_DIFFERENCE', `${base}.evidenceValue`, 'evidenceValue는 현재 manifestValue와 달라야 합니다.'))
      }
    }
    requireText(conflict.message, `${base}.message`, issues, { min: 20, max: 1_200 })
    requireText(conflict.messageEn, `${base}.messageEn`, issues, { min: 20, max: 1_600 })
    validateEvidenceRefs(conflict.evidenceRefs, `${base}.evidenceRefs`, sourceIds, issues, usedSourceIds)
    if (issues.length === issueCountBefore && ['birthDate', 'deathDate'].includes(conflict.field)) {
      validBoundaryConflicts.add(conflict.field)
    }
  }
  return validBoundaryConflicts
}

function validateBlockingIssues(payload, sourceIds, issues, usedSourceIds) {
  let hasResolution = false
  let hasQuarantineResolution = false
  if (payload.blockingIssues == null) return { hasResolution, hasQuarantineResolution }
  if (!Array.isArray(payload.blockingIssues)) {
    issues.push(makeIssue('BLOCKING_ISSUES_ARRAY', '$.blockingIssues', 'blockingIssues는 배열이어야 합니다.'))
    return { hasResolution, hasQuarantineResolution }
  }
  for (const [index, blocking] of payload.blockingIssues.entries()) {
    const base = `$.blockingIssues[${index}]`
    if (!isObject(blocking)) {
      issues.push(makeIssue('BLOCKING_ISSUE_OBJECT', base, '차단 사유는 객체여야 합니다.'))
      continue
    }
    rejectExtraKeys(blocking, BLOCKING_ISSUE_KEYS, base, issues)
    requireText(blocking.code, `${base}.code`, issues, { max: 80 })
    requireText(blocking.message, `${base}.message`, issues, { min: 20, max: 1_200 })
    requireText(blocking.messageEn, `${base}.messageEn`, issues, { min: 20, max: 1_600 })
    validateEvidenceRefs(blocking.evidenceRefs, `${base}.evidenceRefs`, sourceIds, issues, usedSourceIds)
    if (hasOwn(blocking, 'resolution')) {
      hasResolution = true
      const resolutionPath = `${base}.resolution`
      const resolution = blocking.resolution
      if (!isObject(resolution)) {
        issues.push(makeIssue('BLOCKING_RESOLUTION_OBJECT', resolutionPath, 'resolution은 객체여야 합니다.'))
        continue
      }
      rejectExtraKeys(resolution, BLOCKING_RESOLUTION_KEYS, resolutionPath, issues)
      for (const key of BLOCKING_RESOLUTION_KEYS) {
        if (!hasOwn(resolution, key)) {
          issues.push(makeIssue('BLOCKING_RESOLUTION_KEY', `${resolutionPath}.${key}`, 'resolution 필수 키가 없습니다.'))
        }
      }
      for (const [field, expected] of [
        ['status', 'resolved'],
        ['action', 'QUARANTINE_PROFILE'],
        ['proposedValue', 'quarantined'],
        ['precision', 'not-applicable'],
        ['confidence', 'high'],
      ]) {
        if (resolution[field] !== expected) {
          issues.push(makeIssue('BLOCKING_RESOLUTION_ENUM', `${resolutionPath}.${field}`, `'${expected}'만 허용됩니다.`))
        }
      }
      if (resolution.action === 'QUARANTINE_PROFILE') hasQuarantineResolution = true
      requireText(resolution.rationale, `${resolutionPath}.rationale`, issues, { min: 20, max: 2_000 })
      requireText(resolution.rationaleEn, `${resolutionPath}.rationaleEn`, issues, { min: 20, max: 2_400 })
      if (!Array.isArray(resolution.evidenceUrls) || resolution.evidenceUrls.length === 0) {
        issues.push(makeIssue('BLOCKING_RESOLUTION_URLS', `${resolutionPath}.evidenceUrls`, 'evidenceUrls는 비어 있지 않은 HTTP(S) URL 배열이어야 합니다.'))
      } else {
        const urls = new Set()
        for (const [urlIndex, url] of resolution.evidenceUrls.entries()) {
          const urlPath = `${resolutionPath}.evidenceUrls[${urlIndex}]`
          const issueCountBefore = issues.length
          requireHttpUrl(url, urlPath, issues)
          if (issues.length > issueCountBefore) continue
          const normalizedUrl = url.trim()
          if (urls.has(normalizedUrl)) issues.push(makeIssue('BLOCKING_RESOLUTION_URL_DUPLICATE', urlPath, 'evidenceUrls가 중복되었습니다.'))
          urls.add(normalizedUrl)
        }
      }
      if (!isText(resolution.resolvedAt)
        || !ISO_TIMESTAMP.test(resolution.resolvedAt.trim())
        || !Number.isFinite(Date.parse(resolution.resolvedAt.trim()))) {
        issues.push(makeIssue('BLOCKING_RESOLUTION_TIMESTAMP', `${resolutionPath}.resolvedAt`, 'resolvedAt은 timezone이 포함된 ISO timestamp여야 합니다.'))
      }
    }
  }
  return { hasResolution, hasQuarantineResolution }
}

function validateLifeEvents(payload, sourceIds, issues, usedSourceIds, boundaryConflicts = new Set()) {
  const events = payload.events
  if (!Array.isArray(events)) {
    issues.push(makeIssue('EVENTS_REQUIRED', '$.events', 'events는 배열이어야 합니다.'))
    return
  }
  if (events.length < 3 || events.length > 30) {
    issues.push(makeIssue('EVENT_COUNT', '$.events', `life 사건은 3~30개여야 합니다. 현재 ${events.length}개입니다.`))
  }
  let previous = null
  const duplicateKeys = new Set()
  for (const [index, event] of events.entries()) {
    if (!validateCommonEvent(event, index, 'life', sourceIds, issues, usedSourceIds)) continue
    const base = `$.events[${index}]`
    const hasDatedYear = Number.isInteger(event.year)
    const hasUndatedYear = hasOwn(event, 'year') && event.year === null
    if (!hasDatedYear && !hasUndatedYear) {
      issues.push(makeIssue('LIFE_POSITION_UNION', `${base}.year`, 'life 사건의 year는 정수 또는 명시적인 null이어야 합니다.'))
    }
    if (event.sequenceLabel != null || event.sequenceLabelEn != null) {
      issues.push(makeIssue('LIFE_LABELS_NULL', base, 'life 사건의 sequenceLabel과 sequenceLabelEn은 모두 null이어야 합니다.'))
    }
    validateNullableInteger(event.yearEnd, `${base}.yearEnd`, issues)
    validateNullableInteger(event.month, `${base}.month`, issues, { min: 1, max: 12 })
    validateNullableInteger(event.day, `${base}.day`, issues, { min: 1, max: 31 })
    if (hasUndatedYear && (event.yearEnd != null || event.month != null || event.day != null)) {
      issues.push(makeIssue('UNDATED_LIFE_DATE_RESIDUE', base, '날짜 미상 life 사건은 yearEnd, month, day가 모두 null이어야 합니다.'))
    }
    if (event.day != null && event.month == null) {
      issues.push(makeIssue('DAY_REQUIRES_MONTH', `${base}.day`, 'day가 있으면 month도 있어야 합니다.'))
    }
    if (Number.isInteger(event.yearEnd) && hasDatedYear && event.yearEnd < event.year) {
      issues.push(makeIssue('YEAR_END_ORDER', `${base}.yearEnd`, 'yearEnd는 year보다 앞설 수 없습니다.'))
    }
    if (hasDatedYear) {
      const current = [event.year, event.month ?? 0, event.day ?? 0]
      if (previous && (
        current[0] < previous[0]
        || (current[0] === previous[0] && current[1] < previous[1])
        || (current[0] === previous[0] && current[1] === previous[1] && current[2] < previous[2])
      )) {
        issues.push(makeIssue('EVENT_ORDER', base, 'life 사건은 year, month, day 오름차순이어야 합니다.'))
      }
      previous = current
    }
    const duplicateKey = `${hasUndatedYear ? 'undated' : event.year}|${normalizeNullableText(event.title)}`
    if (duplicateKeys.has(duplicateKey)) issues.push(makeIssue('EVENT_DUPLICATE', base, `중복 사건 '${duplicateKey}'입니다.`))
    duplicateKeys.add(duplicateKey)
  }

  const birth = parseProfileDate(payload.profileSnapshot?.birthDate)
  const death = parseProfileDate(payload.profileSnapshot?.deathDate)
  const hasBirthText = isText(payload.profileSnapshot?.birthDate)
  const hasDeathText = isText(payload.profileSnapshot?.deathDate)
  const births = events.map((event, index) => ({ event, index })).filter(({ event }) => event?.kind === 'birth')
  const deaths = events.map((event, index) => ({ event, index })).filter(({ event }) => event?.kind === 'death')
  if (!boundaryConflicts.has('birthDate') && birth) {
    const match = births.length === 1 && births[0].index === 0 && births[0].event.year === birth.year
      && (birth.month == null || births[0].event.month === birth.month)
      && (birth.day == null || births[0].event.day === birth.day)
    if (!match) issues.push(makeIssue('BIRTH_BOUNDARY', '$.events', '프로필 생년월일이 있으면 첫 사건은 같은 날짜의 birth 한 건이어야 합니다.'))
  } else if (!boundaryConflicts.has('birthDate') && !hasBirthText && births.length > 0) {
    issues.push(makeIssue('UNKNOWN_BIRTH_KIND', '$.events', '프로필 생년이 없으면 birth 사건을 확정할 수 없습니다.'))
  }
  if (!boundaryConflicts.has('deathDate') && death) {
    const lastIndex = events.length - 1
    const deathEntry = events.map((event, index) => ({ event, index })).filter(({ event }) => event?.kind === 'death')
    const match = deathEntry.length === 1 && deathEntry[0].index === lastIndex && deathEntry[0].event.year === death.year
      && (death.month == null || deathEntry[0].event.month === death.month)
      && (death.day == null || deathEntry[0].event.day === death.day)
    if (!match) issues.push(makeIssue('DEATH_BOUNDARY', '$.events', '프로필 사망년월일이 있으면 마지막 사건은 같은 날짜의 death 한 건이어야 합니다.'))
  } else if (!boundaryConflicts.has('deathDate') && !hasDeathText && deaths.length > 0) {
    issues.push(makeIssue('UNKNOWN_DEATH_KIND', '$.events', '프로필 사망년이 없으면 death 사건을 확정할 수 없습니다.'))
  }
}

function validateFictionEvents(payload, sourceIds, issues, usedSourceIds) {
  const events = payload.events
  if (!Array.isArray(events)) {
    issues.push(makeIssue('EVENTS_REQUIRED', '$.events', 'events는 배열이어야 합니다.'))
    return
  }
  if (events.length < 6 || events.length > 12) {
    issues.push(makeIssue('EVENT_COUNT', '$.events', `fiction 사건은 6~12개여야 합니다. 현재 ${events.length}개입니다.`))
  }
  const orders = new Set()
  for (const [index, event] of events.entries()) {
    if (!validateCommonEvent(event, index, 'fiction', sourceIds, issues, usedSourceIds)) continue
    const base = `$.events[${index}]`
    requireText(event.sequenceLabel, `${base}.sequenceLabel`, issues, { max: 80 })
    requireText(event.sequenceLabelEn, `${base}.sequenceLabelEn`, issues, { max: 120 })
    if (!Number.isInteger(event.sortOrder) || event.sortOrder !== index + 1) {
      issues.push(makeIssue('FICTION_SORT_SEQUENCE', `${base}.sortOrder`, `배열 위치에 맞는 값 ${index + 1}이어야 합니다.`))
    } else if (orders.has(event.sortOrder)) {
      issues.push(makeIssue('FICTION_SORT_DUPLICATE', `${base}.sortOrder`, `sortOrder ${event.sortOrder}가 중복되었습니다.`))
    }
    orders.add(event.sortOrder)
  }
}

function expectedValue(expectedJob, camel, snake = null) {
  if (!isObject(expectedJob)) return undefined
  if (hasOwn(expectedJob, camel)) return expectedJob[camel]
  if (snake && hasOwn(expectedJob, snake)) return expectedJob[snake]
  return undefined
}

function compareExpected(payload, expectedJob, issues) {
  if (!expectedJob) return
  for (const [field, snake] of [
    ['celebId', 'celeb_id'],
    ['slug', 'slug'],
    ['nickname', 'nickname'],
    ['nicknameEn', 'nickname_en'],
    ['timelineMode', 'timeline_mode'],
  ]) {
    const expected = expectedValue(expectedJob, field, snake)
    if (['slug', 'nickname', 'nicknameEn'].includes(field) && payload[field] == null) continue
    if (expected !== undefined && payload[field] !== expected) {
      issues.push(makeIssue('CLAIM_MISMATCH', `$.${field}`, `claim한 작업의 ${field} 값과 일치하지 않습니다.`))
    }
  }
  const expectedSnapshot = expectedValue(expectedJob, 'profileSnapshot', 'profile_snapshot')
  if (expectedSnapshot !== undefined && JSON.stringify(canonicalValue(payload.profileSnapshot)) !== JSON.stringify(canonicalValue(expectedSnapshot))) {
    issues.push(makeIssue('PROFILE_SNAPSHOT_MISMATCH', '$.profileSnapshot', 'claim 이후 프로필 스냅샷이 변경되었거나 payload가 다른 값을 제출했습니다.'))
  }
}

export function validateTimelinePayload(payload, expectedJob = null, expectedResearchStatus = null) {
  const issues = []
  if (!isObject(payload)) {
    return { valid: false, issues: [makeIssue('PAYLOAD_OBJECT', '$', 'commit payload는 JSON 객체여야 합니다.')] }
  }
  rejectExtraKeys(payload, DIRECT_COMMIT_KEYS, '$', issues)
  if (!isText(payload.celebId) || !UUID.test(payload.celebId.trim())) {
    issues.push(makeIssue('UUID', '$.celebId', 'UUID 문자열이어야 합니다.'))
  }
  requireText(payload.slug, '$.slug', issues, { max: 180, nullable: true })
  requireText(payload.nickname, '$.nickname', issues, { max: 180, nullable: true })
  requireText(payload.nicknameEn, '$.nicknameEn', issues, { max: 180, nullable: true })
  if (payload.laneId != null && (!Number.isInteger(payload.laneId) || payload.laneId < 1)) {
    issues.push(makeIssue('LANE_ID', '$.laneId', 'laneId는 1 이상의 정수 또는 null이어야 합니다.'))
  }
  requireText(payload.sourceSnapshotId, '$.sourceSnapshotId', issues, { max: 180, nullable: true })
  if (!TIMELINE_MODES.has(payload.timelineMode)) {
    issues.push(makeIssue('TIMELINE_MODE', '$.timelineMode', 'life 또는 fiction이어야 합니다.'))
  }
  if (!['complete', 'blocked'].includes(payload.researchStatus)) {
    issues.push(makeIssue('RESEARCH_STATUS', '$.researchStatus', "researchStatus는 'complete' 또는 'blocked'여야 합니다."))
  } else if (expectedResearchStatus && payload.researchStatus !== expectedResearchStatus) {
    issues.push(makeIssue('RESEARCH_STATUS', '$.researchStatus', `researchStatus는 '${expectedResearchStatus}'여야 합니다.`))
  }
  if (hasOwn(payload, 'applicationStatus')) {
    if (payload.researchStatus !== 'blocked') {
      issues.push(makeIssue('APPLICATION_STATUS_ON_COMPLETE', '$.applicationStatus', 'applicationStatus는 blocked 결과에서만 허용됩니다.'))
    } else if (payload.applicationStatus !== 'quarantined') {
      issues.push(makeIssue('APPLICATION_STATUS', '$.applicationStatus', "현재는 'quarantined'만 허용됩니다."))
    }
  }
  validateProfileSnapshot(payload.profileSnapshot, issues)
  if (payload.profileSnapshot?.id !== payload.celebId) {
    issues.push(makeIssue('PROFILE_SNAPSHOT_MISMATCH', '$.profileSnapshot.id', 'payload.celebId와 같아야 합니다.'))
  }
  if (payload.slug != null && payload.profileSnapshot?.slug !== payload.slug) {
    issues.push(makeIssue('PROFILE_SNAPSHOT_MISMATCH', '$.profileSnapshot.slug', 'top-level slug와 같아야 합니다.'))
  }
  if (payload.nickname != null && payload.profileSnapshot?.nickname !== payload.nickname) {
    issues.push(makeIssue('PROFILE_SNAPSHOT_MISMATCH', '$.profileSnapshot.nickname', 'top-level nickname과 같아야 합니다.'))
  }
  if (payload.timelineMode === 'fiction' && payload.profileSnapshot?.celebTier !== 'fiction') {
    issues.push(makeIssue('TIMELINE_MODE_TIER', '$.timelineMode', "fiction 모드는 profileSnapshot.celebTier='fiction'이어야 합니다."))
  }
  if (payload.timelineMode === 'life' && payload.profileSnapshot?.celebTier === 'fiction') {
    issues.push(makeIssue('TIMELINE_MODE_TIER', '$.timelineMode', "profileSnapshot.celebTier='fiction'이면 fiction 모드여야 합니다."))
  }
  const { ids: sourceIds, byId: sourcesById } = validateSources(payload.sources, issues)
  const usedSourceIds = new Set()
  const validBoundaryConflicts = validateProfileConflicts(payload, sourceIds, issues, usedSourceIds)
  const blockingResolutionState = validateBlockingIssues(payload, sourceIds, issues, usedSourceIds)
  if (payload.researchStatus === 'complete') {
    if (Array.isArray(payload.blockingIssues) && payload.blockingIssues.length > 0) {
      issues.push(makeIssue('BLOCKING_ISSUES_ON_COMPLETE', '$.blockingIssues', 'complete 결과에는 blockingIssues를 넣을 수 없습니다.'))
    }
    if (payload.timelineMode === 'life') {
      validateLifeEvents(payload, sourceIds, issues, usedSourceIds, validBoundaryConflicts)
    } else if (payload.timelineMode === 'fiction') {
      validateFictionEvents(payload, sourceIds, issues, usedSourceIds)
    }
  } else if (payload.researchStatus === 'blocked') {
    if (!Array.isArray(payload.events) || payload.events.length !== 0) {
      issues.push(makeIssue('BLOCKED_EVENTS_EMPTY', '$.events', 'blocked 결과의 events는 빈 배열이어야 합니다.'))
    }
    if (!Array.isArray(payload.blockingIssues) || payload.blockingIssues.length === 0) {
      issues.push(makeIssue('BLOCKING_ISSUES_REQUIRED', '$.blockingIssues', 'blocked 결과에는 근거가 연결된 blockingIssues가 한 건 이상 필요합니다.'))
    }
    if (payload.applicationStatus === 'quarantined' && !blockingResolutionState.hasQuarantineResolution) {
      issues.push(makeIssue('QUARANTINE_RESOLUTION_REQUIRED', '$.blockingIssues', 'quarantined 상태에는 QUARANTINE_PROFILE resolution이 필요합니다.'))
    }
    if (blockingResolutionState.hasResolution && payload.applicationStatus !== 'quarantined') {
      issues.push(makeIssue('QUARANTINE_APPLICATION_STATUS_REQUIRED', '$.applicationStatus', "resolution이 있으면 applicationStatus='quarantined'여야 합니다."))
    }
  }
  compareExpected(payload, expectedJob, issues)
  return {
    valid: issues.length === 0,
    issues,
    sourcesById,
    usedSourceIds,
  }
}

export function validateDirectCommitPayload(payload, expectedJob = null) {
  return validateTimelinePayload(payload, expectedJob, 'complete')
}

export function validateDirectBlockedPayload(payload, expectedJob = null) {
  return validateTimelinePayload(payload, expectedJob, 'blocked')
}

export function assertDirectCommitPayload(payload, expectedJob = null) {
  const result = validateDirectCommitPayload(payload, expectedJob)
  if (!result.valid) {
    const error = new Error(`timeline commit payload validation failed (${result.issues.length}): ${result.issues.map((item) => `${item.path} ${item.code}`).join(', ')}`)
    error.code = 'TIMELINE_PAYLOAD_INVALID'
    error.issues = result.issues
    throw error
  }
  return result
}

export function assertDirectBlockedPayload(payload, expectedJob = null) {
  const result = validateDirectBlockedPayload(payload, expectedJob)
  if (!result.valid) {
    const error = new Error(`timeline blocked payload validation failed (${result.issues.length}): ${result.issues.map((item) => `${item.path} ${item.code}`).join(', ')}`)
    error.code = 'TIMELINE_PAYLOAD_INVALID'
    error.issues = result.issues
    throw error
  }
  return result
}

export function mapDirectPayloadToTimelineRows(payload) {
  const validation = assertDirectCommitPayload(payload)
  return payload.events.map((event, index) => {
    const firstSource = validation.sourcesById.get(event.evidenceRefs[0])
    const common = {
      celeb_id: payload.celebId,
      title: event.title.trim(),
      title_en: event.titleEn.trim(),
      description: event.description.trim(),
      description_en: event.descriptionEn.trim(),
      kind: event.kind,
      place_name: normalizeNullableText(event.placeName),
      place_name_en: normalizeNullableText(event.placeNameEn),
      lat: null,
      lng: null,
      place_qid: null,
      source: 'research',
      source_url: firstSource.url.trim(),
    }
    if (payload.timelineMode === 'fiction') {
      return {
        ...common,
        year: null,
        year_end: null,
        month: null,
        day: null,
        sequence_label: event.sequenceLabel.trim(),
        sequence_label_en: event.sequenceLabelEn.trim(),
        sort_order: event.sortOrder,
      }
    }
    return {
      ...common,
      year: event.year,
      year_end: event.yearEnd ?? null,
      month: event.month ?? null,
      day: event.day ?? null,
      sequence_label: null,
      sequence_label_en: null,
      sort_order: index,
    }
  })
}
