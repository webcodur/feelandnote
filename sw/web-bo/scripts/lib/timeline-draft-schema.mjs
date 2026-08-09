export const TIMELINE_MODES = new Set(['life', 'fiction'])
export const RESEARCH_STATUSES = new Set(['complete', 'blocked'])
export const PROFILE_CONFLICT_FIELDS = new Set([
  'nickname',
  'nicknameEn',
  'celebTier',
  'publicationStatus',
  'birthDate',
  'deathDate',
  'profession',
  'nationality',
  'wikidataQid',
])
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

// PostgreSQL uuid 입력은 RFC 생성 버전/variant 비트까지 제한하지 않는다.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const HTTP_URL = /^https?:\/\/[^\s]+$/i
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const BROKEN_TEXT = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\uFFFD\uF900-\uFAFF]|(?:Ã.|Â.|â€|ðŸ)|(?:^|\W)\?{2,}(?:\W|$)/u

function issue(code, path, message, severity = 'error') {
  return { severity, code, path, message }
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function nullableEqual(left, right) {
  return (left ?? null) === (right ?? null)
}

function hasOwn(value, field) {
  return Object.prototype.hasOwnProperty.call(value, field)
}

function profileValue(draft, field) {
  if (field === 'nickname' || field === 'nicknameEn') return draft[field] ?? null
  return draft.profileSnapshot?.[field] ?? null
}

function profileConflictManifestMatches(field, conflictValue, canonicalValue) {
  if (nullableEqual(conflictValue, canonicalValue)) return true
  if (field !== 'birthDate' && field !== 'deathDate') return false
  if (typeof conflictValue !== 'string' || typeof canonicalValue !== 'string') return false
  const normalizedConflict = /^\d{4}$/.test(conflictValue) ? `${conflictValue}-01-01` : conflictValue
  const normalizedCanonical = /^\d{4}$/.test(canonicalValue) ? `${canonicalValue}-01-01` : canonicalValue
  return normalizedConflict === normalizedCanonical
}

export function parseProfileYear(value) {
  if (!hasText(value)) return null
  const match = /^(-?\d{1,4})(?:-|$)/.exec(value.trim())
  return match ? Number(match[1]) : null
}

export function sentenceCount(value) {
  if (!hasText(value)) return 0
  const normalized = value
    .trim()
    .replace(/\b(Mr|Mrs|Ms|Dr|Prof|St|No|Nos|Op|Opp|Vol|Pt|Chap|Fig)\./gi, '$1')
    .replace(/\b[A-Z]\.(?=\s*[A-Z]\.)/g, '')
  const endings = normalized.match(/[.!?。！？]+(?=(?:["'”’)]*\s)|["'”’)]*$)/gu)
  return endings?.length ?? 0
}

function validateText(value, path, issues, { required = true, min = 1, max = 800 } = {}) {
  if (value == null && !required) return
  if (!hasText(value)) {
    issues.push(issue('TEXT_REQUIRED', path, '비어 있지 않은 문자열이 필요합니다.'))
    return
  }
  const length = value.trim().length
  if (length < min || length > max) {
    issues.push(issue('TEXT_LENGTH', path, `${min}~${max}자여야 합니다. 현재 ${length}자입니다.`))
  }
  if (BROKEN_TEXT.test(value) || value.includes("''")) {
    issues.push(issue('BROKEN_TEXT', path, '깨진 문자, 제어 문자 또는 잘못 이스케이프된 따옴표가 있습니다.'))
  }
}

function validateDescription(value, path, issues) {
  validateText(value, path, issues, { min: 20, max: 800 })
  if (hasText(value)) {
    const count = sentenceCount(value)
    if (count < 2 || count > 3) {
      issues.push(issue('SENTENCE_COUNT', path, `서술은 2~3문장이어야 합니다. 현재 ${count}문장입니다.`))
    }
  }
}

function validateNullableInteger(value, path, issues, { min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER } = {}) {
  if (value == null) return
  if (!Number.isInteger(value) || value < min || value > max) {
    issues.push(issue('INTEGER_RANGE', path, `${min}~${max} 범위의 정수 또는 null이어야 합니다.`))
  }
}

function validateSource(source, index, issues, seenIds) {
  const base = `sources[${index}]`
  if (!isObject(source)) {
    issues.push(issue('SOURCE_OBJECT', base, '출처는 객체여야 합니다.'))
    return
  }
  validateText(source.id, `${base}.id`, issues, { max: 80 })
  if (hasText(source.id)) {
    if (seenIds.has(source.id)) issues.push(issue('SOURCE_DUPLICATE', `${base}.id`, `중복 출처 id '${source.id}'입니다.`))
    seenIds.add(source.id)
  }
  validateText(source.url, `${base}.url`, issues, { max: 2_000 })
  if (hasText(source.url) && !HTTP_URL.test(source.url)) {
    issues.push(issue('SOURCE_URL', `${base}.url`, 'http:// 또는 https:// 절대 URL이어야 합니다.'))
  }
  validateText(source.title, `${base}.title`, issues, { max: 500 })
  validateText(source.publisher, `${base}.publisher`, issues, { required: false, max: 200 })
  if (source.accessedAt != null && (!hasText(source.accessedAt) || !ISO_DATE.test(source.accessedAt))) {
    issues.push(issue('SOURCE_ACCESSED_AT', `${base}.accessedAt`, 'YYYY-MM-DD 형식이어야 합니다.'))
  }
}

function validateEvidenceRefs(refs, path, issues, sourceIds, usedSourceIds) {
  if (!Array.isArray(refs) || refs.length === 0) {
    issues.push(issue('EVIDENCE_REQUIRED', path, '각 사건·차단 사유·프로필 충돌에는 sources[].id를 직접 참조하는 evidenceRefs가 1개 이상 필요합니다.'))
    return false
  }
  const seen = new Set()
  let valid = true
  for (const [index, ref] of refs.entries()) {
    const refPath = `${path}[${index}]`
    if (!hasText(ref)) {
      issues.push(issue('EVIDENCE_ID', refPath, '출처 id 문자열이어야 합니다.'))
      valid = false
      continue
    }
    if (seen.has(ref)) {
      issues.push(issue('EVIDENCE_DUPLICATE', refPath, `같은 항목 안에서 '${ref}'가 중복 참조됐습니다.`))
      valid = false
    }
    seen.add(ref)
    if (!sourceIds.has(ref)) {
      issues.push(issue('EVIDENCE_DANGLING', refPath, `sources에 없는 id '${ref}'를 참조합니다.`))
      valid = false
    }
    else usedSourceIds.add(ref)
  }
  return valid
}

function validateBlockingIssues(draft, issues, sourceIds, usedSourceIds) {
  if (!Array.isArray(draft.blockingIssues) || draft.blockingIssues.length === 0) {
    issues.push(issue('BLOCKING_ISSUES_REQUIRED', 'blockingIssues', 'blocked 초안에는 blockingIssues가 1개 이상 필요합니다.'))
    return
  }
  for (const [index, blockingIssue] of draft.blockingIssues.entries()) {
    const base = `blockingIssues[${index}]`
    if (!isObject(blockingIssue)) {
      issues.push(issue('BLOCKING_ISSUE_OBJECT', base, '차단 사유는 객체여야 합니다.'))
      continue
    }
    validateText(blockingIssue.code, `${base}.code`, issues, { max: 80 })
    validateText(blockingIssue.message, `${base}.message`, issues, { min: 20, max: 1_200 })
    validateText(blockingIssue.messageEn, `${base}.messageEn`, issues, { min: 20, max: 1_600 })
    validateEvidenceRefs(blockingIssue.evidenceRefs, `${base}.evidenceRefs`, issues, sourceIds, usedSourceIds)
  }
}

function validateProfileConflicts(draft, issues, sourceIds, usedSourceIds) {
  const validFields = new Set()
  if (draft.profileConflicts == null) return validFields
  if (!Array.isArray(draft.profileConflicts)) {
    issues.push(issue('PROFILE_CONFLICTS_ARRAY', 'profileConflicts', 'profileConflicts는 배열이어야 합니다.'))
    return validFields
  }
  const seenFields = new Set()
  for (const [index, conflict] of draft.profileConflicts.entries()) {
    const base = `profileConflicts[${index}]`
    if (!isObject(conflict)) {
      issues.push(issue('PROFILE_CONFLICT_OBJECT', base, '프로필 충돌은 객체여야 합니다.'))
      continue
    }
    let valid = true
    if (!PROFILE_CONFLICT_FIELDS.has(conflict.field)) {
      issues.push(issue('PROFILE_CONFLICT_FIELD', `${base}.field`, `허용 field: ${[...PROFILE_CONFLICT_FIELDS].join(', ')}`))
      valid = false
    } else if (seenFields.has(conflict.field)) {
      issues.push(issue('PROFILE_CONFLICT_DUPLICATE', `${base}.field`, `field '${conflict.field}'가 중복됐습니다.`))
      valid = false
    }
    seenFields.add(conflict.field)
    if (!hasOwn(conflict, 'manifestValue')) {
      issues.push(issue('PROFILE_CONFLICT_MANIFEST_VALUE', `${base}.manifestValue`, 'manifestValue가 필요합니다.'))
      valid = false
    } else if (PROFILE_CONFLICT_FIELDS.has(conflict.field) && !profileConflictManifestMatches(conflict.field, conflict.manifestValue, profileValue(draft, conflict.field))) {
      issues.push(issue('PROFILE_CONFLICT_MANIFEST_VALUE', `${base}.manifestValue`, `초안의 정본 값 ${JSON.stringify(profileValue(draft, conflict.field))}과 일치해야 합니다.`))
      valid = false
    }
    if (!hasOwn(conflict, 'evidenceValue') || conflict.evidenceValue == null || (typeof conflict.evidenceValue === 'string' && !hasText(conflict.evidenceValue))) {
      issues.push(issue('PROFILE_CONFLICT_EVIDENCE_VALUE', `${base}.evidenceValue`, '근거가 나타내는 비어 있지 않은 evidenceValue가 필요합니다.'))
      valid = false
    } else if (nullableEqual(conflict.manifestValue, conflict.evidenceValue)) {
      issues.push(issue('PROFILE_CONFLICT_SAME_VALUE', `${base}.evidenceValue`, 'manifestValue와 다른 근거값이어야 합니다.'))
      valid = false
    }
    validateText(conflict.message, `${base}.message`, issues, { min: 20, max: 1_200 })
    validateText(conflict.messageEn, `${base}.messageEn`, issues, { min: 20, max: 1_600 })
    if (!hasText(conflict.message) || !hasText(conflict.messageEn)) valid = false
    if (!validateEvidenceRefs(conflict.evidenceRefs, `${base}.evidenceRefs`, issues, sourceIds, usedSourceIds)) valid = false
    if (valid) {
      validFields.add(conflict.field)
      issues.push(issue('PROFILE_CONFLICT', base, `manifest의 '${conflict.field}' 값과 출처 근거가 충돌합니다. 정본 교정 전까지 충돌 기록을 유지해야 합니다.`, 'warning'))
    }
  }
  return validFields
}

function validateCoordinates(event, base, issues) {
  for (const field of ['lat', 'lng', 'placeQid', 'place_qid', 'coordinates']) {
    if (event[field] != null) {
      issues.push(issue('MODEL_COORDINATE_FORBIDDEN', `${base}.${field}`, '초안에는 모델이 작성한 좌표나 장소 QID를 넣을 수 없습니다.'))
    }
  }
}

function validateCommonEvent(event, index, mode, issues, sourceIds, usedSourceIds) {
  const base = `events[${index}]`
  if (!isObject(event)) {
    issues.push(issue('EVENT_OBJECT', base, '사건은 객체여야 합니다.'))
    return
  }
  if (event.eventType != null && event.eventType !== mode) {
    issues.push(issue('EVENT_MODE', `${base}.eventType`, `timelineMode '${mode}'와 같아야 합니다.`))
  }
  validateText(event.title, `${base}.title`, issues, { max: 120 })
  validateText(event.titleEn, `${base}.titleEn`, issues, { max: 200 })
  validateDescription(event.description, `${base}.description`, issues)
  validateDescription(event.descriptionEn, `${base}.descriptionEn`, issues)
  if (!TIMELINE_KINDS.has(event.kind)) {
    issues.push(issue('EVENT_KIND', `${base}.kind`, `허용 kind: ${[...TIMELINE_KINDS].join(', ')}`))
  }
  for (const field of ['placeName', 'placeNameEn', 'placeQuery', 'placeCountry']) {
    validateText(event[field], `${base}.${field}`, issues, { required: false, max: 240 })
  }
  validateCoordinates(event, base, issues)
  validateEvidenceRefs(event.evidenceRefs, `${base}.evidenceRefs`, issues, sourceIds, usedSourceIds)
}

function validateLifeEvents(draft, issues, sourceIds, usedSourceIds, profileConflictFields = new Set()) {
  const events = draft.events
  if (!Array.isArray(events)) return
  if (events.length < 3 || events.length > 30) {
    issues.push(issue('EVENT_COUNT', 'events', `life 사건은 3~30개여야 합니다. 현재 ${events.length}개입니다.`))
  }
  let previous = null
  const duplicateKeys = new Set()
  for (const [index, event] of events.entries()) {
    validateCommonEvent(event, index, 'life', issues, sourceIds, usedSourceIds)
    if (!isObject(event)) continue
    const base = `events[${index}]`
    if (!Number.isInteger(event.year)) issues.push(issue('LIFE_YEAR', `${base}.year`, 'life 사건에는 정수 year가 필요합니다.'))
    validateNullableInteger(event.yearEnd, `${base}.yearEnd`, issues)
    validateNullableInteger(event.month, `${base}.month`, issues, { min: 1, max: 12 })
    validateNullableInteger(event.day, `${base}.day`, issues, { min: 1, max: 31 })
    if (Number.isInteger(event.yearEnd) && Number.isInteger(event.year) && event.yearEnd < event.year) {
      issues.push(issue('YEAR_END_ORDER', `${base}.yearEnd`, 'yearEnd가 year보다 앞설 수 없습니다.'))
    }
    if (event.sequenceLabel != null || event.sequenceLabelEn != null || event.sortOrder != null) {
      issues.push(issue('TIMELINE_UNION', base, 'life 사건에는 sequenceLabel, sequenceLabelEn, sortOrder를 넣을 수 없습니다.'))
    }
    const current = [event.year, event.month ?? 0, event.day ?? 0]
    if (previous && current.some((value, part) => value !== previous[part]) && (
      current[0] < previous[0]
      || (current[0] === previous[0] && current[1] < previous[1])
      || (current[0] === previous[0] && current[1] === previous[1] && current[2] < previous[2])
    )) {
      issues.push(issue('EVENT_ORDER', base, 'life 사건 배열이 year, month, day 오름차순이 아닙니다.'))
    }
    previous = current
    const key = `${event.year}|${String(event.title ?? '').trim()}`
    if (duplicateKeys.has(key)) issues.push(issue('EVENT_DUPLICATE', base, `중복 사건 '${key}'입니다.`))
    duplicateKeys.add(key)
  }

  const birthYear = parseProfileYear(draft.profileSnapshot?.birthDate)
  const deathYear = parseProfileYear(draft.profileSnapshot?.deathDate)
  const births = events.map((event, index) => ({ event, index })).filter(({ event }) => event?.kind === 'birth')
  const deaths = events.map((event, index) => ({ event, index })).filter(({ event }) => event?.kind === 'death')
  if (birthYear != null) {
    if (!profileConflictFields.has('birthDate') && (births.length !== 1 || births[0]?.index !== 0 || births[0]?.event.year !== birthYear)) {
      issues.push(issue('BIRTH_BOUNDARY', 'events', `birthDate가 있으면 첫 사건에 birth 1개를 두고 year를 ${birthYear}로 맞춰야 합니다.`))
    }
  } else if (births.length > 0) {
    issues.push(issue('UNKNOWN_BIRTH_KIND', `events[${births[0].index}].kind`, 'profileSnapshot.birthDate가 null이면 birth 사건을 강제할 수 없습니다.'))
  }
  if (deathYear != null) {
    if (!profileConflictFields.has('deathDate') && (deaths.length !== 1 || deaths[0]?.index !== events.length - 1 || deaths[0]?.event.year !== deathYear)) {
      issues.push(issue('DEATH_BOUNDARY', 'events', `deathDate가 있으면 마지막 사건에 death 1개를 두고 year를 ${deathYear}로 맞춰야 합니다.`))
    }
  } else if (deaths.length > 0) {
    issues.push(issue('UNKNOWN_DEATH_KIND', `events[${deaths[0].index}].kind`, 'profileSnapshot.deathDate가 null이면 death 사건을 강제할 수 없습니다.'))
  }
}

function validateFictionEvents(draft, issues, sourceIds, usedSourceIds) {
  const events = draft.events
  if (!Array.isArray(events)) return
  if (events.length < 6 || events.length > 12) {
    issues.push(issue('EVENT_COUNT', 'events', `fiction 사건은 6~12개여야 합니다. 현재 ${events.length}개입니다.`))
  }
  const orders = new Set()
  for (const [index, event] of events.entries()) {
    validateCommonEvent(event, index, 'fiction', issues, sourceIds, usedSourceIds)
    if (!isObject(event)) continue
    const base = `events[${index}]`
    validateText(event.sequenceLabel, `${base}.sequenceLabel`, issues, { max: 80 })
    validateText(event.sequenceLabelEn, `${base}.sequenceLabelEn`, issues, { max: 120 })
    if (!Number.isInteger(event.sortOrder) || event.sortOrder < 1) {
      issues.push(issue('FICTION_SORT_ORDER', `${base}.sortOrder`, '1부터 시작하는 양의 정수가 필요합니다.'))
    } else {
      if (orders.has(event.sortOrder)) issues.push(issue('FICTION_SORT_DUPLICATE', `${base}.sortOrder`, `중복 sortOrder ${event.sortOrder}입니다.`))
      orders.add(event.sortOrder)
      if (event.sortOrder !== index + 1) issues.push(issue('FICTION_SORT_SEQUENCE', `${base}.sortOrder`, `배열 위치에 맞는 값 ${index + 1}이어야 합니다.`))
    }
    if (event.year != null || event.yearEnd != null || event.month != null || event.day != null) {
      issues.push(issue('TIMELINE_UNION', base, 'fiction 사건에는 year, yearEnd, month, day를 넣을 수 없습니다.'))
    }
  }
}

export function validateManifest(manifest) {
  const issues = []
  if (!isObject(manifest)) return { issues: [issue('MANIFEST_OBJECT', '$', 'manifest는 객체여야 합니다.')], people: [] }
  if (!Number.isInteger(manifest.schemaVersion) || manifest.schemaVersion < 1) issues.push(issue('MANIFEST_SCHEMA_VERSION', 'schemaVersion', '양의 정수여야 합니다.'))
  validateText(manifest.snapshotId, 'snapshotId', issues, { max: 160 })
  if (!Array.isArray(manifest.people)) {
    issues.push(issue('MANIFEST_PEOPLE', 'people', 'people 배열이 필요합니다.'))
    return { issues, people: [] }
  }
  const ids = new Set()
  const slugs = new Set()
  for (const [index, person] of manifest.people.entries()) {
    const base = `people[${index}]`
    if (!isObject(person)) {
      issues.push(issue('MANIFEST_PERSON', base, '인물은 객체여야 합니다.'))
      continue
    }
    if (!UUID.test(person.celebId ?? '')) issues.push(issue('CELEB_ID', `${base}.celebId`, 'UUID가 필요합니다.'))
    validateText(person.slug, `${base}.slug`, issues, { max: 180 })
    validateText(person.nickname, `${base}.nickname`, issues, { max: 180 })
    validateText(person.nicknameEn, `${base}.nicknameEn`, issues, { required: false, max: 180 })
    if (!TIMELINE_MODES.has(person.timelineMode)) issues.push(issue('TIMELINE_MODE', `${base}.timelineMode`, 'life 또는 fiction이어야 합니다.'))
    if (person.timelineMode === 'fiction' && person.celebTier !== 'fiction') issues.push(issue('MANIFEST_MODE_TIER', base, "fiction 모드는 celebTier='fiction'이어야 합니다."))
    if (person.timelineMode === 'life' && person.celebTier === 'fiction') issues.push(issue('MANIFEST_MODE_TIER', base, "celebTier='fiction'은 fiction 모드여야 합니다."))
    if (ids.has(person.celebId)) issues.push(issue('MANIFEST_DUPLICATE_ID', `${base}.celebId`, `중복 celebId '${person.celebId}'입니다.`))
    if (slugs.has(person.slug)) issues.push(issue('MANIFEST_DUPLICATE_SLUG', `${base}.slug`, `중복 slug '${person.slug}'입니다.`))
    ids.add(person.celebId)
    slugs.add(person.slug)
  }
  const life = manifest.people.filter((person) => person?.timelineMode === 'life').length
  const fiction = manifest.people.filter((person) => person?.timelineMode === 'fiction').length
  if (manifest.counts?.missingTotal != null && manifest.counts.missingTotal !== manifest.people.length) {
    issues.push(issue('MANIFEST_COUNT', 'counts.missingTotal', `people ${manifest.people.length}명과 일치해야 합니다.`))
  }
  if (manifest.counts?.life != null && manifest.counts.life !== life) issues.push(issue('MANIFEST_COUNT', 'counts.life', `실제 life ${life}명과 일치해야 합니다.`))
  if (manifest.counts?.fiction != null && manifest.counts.fiction !== fiction) issues.push(issue('MANIFEST_COUNT', 'counts.fiction', `실제 fiction ${fiction}명과 일치해야 합니다.`))
  return { issues, people: manifest.people }
}

export function validateDraft(draft, expectedPerson = null) {
  const issues = []
  if (!isObject(draft)) return { issues: [issue('DRAFT_OBJECT', '$', '초안은 객체여야 합니다.')] }
  if (!UUID.test(draft.celebId ?? '')) issues.push(issue('CELEB_ID', 'celebId', 'UUID가 필요합니다.'))
  validateText(draft.slug, 'slug', issues, { max: 180 })
  validateText(draft.nickname, 'nickname', issues, { max: 180 })
  validateText(draft.nicknameEn, 'nicknameEn', issues, { required: false, max: 180 })
  if (!TIMELINE_MODES.has(draft.timelineMode)) issues.push(issue('TIMELINE_MODE', 'timelineMode', 'life 또는 fiction이어야 합니다.'))
  if (!isObject(draft.profileSnapshot)) issues.push(issue('PROFILE_SNAPSHOT', 'profileSnapshot', '객체가 필요합니다.'))
  if (!Array.isArray(draft.sources) || draft.sources.length === 0) issues.push(issue('SOURCES_REQUIRED', 'sources', '출처 배열이 1개 이상 필요합니다.'))
  if (!Array.isArray(draft.events)) issues.push(issue('EVENTS_REQUIRED', 'events', 'events 배열이 필요합니다.'))
  if (!RESEARCH_STATUSES.has(draft.researchStatus)) issues.push(issue('RESEARCH_STATUS', 'researchStatus', 'complete 또는 blocked여야 합니다.'))

  const sourceIds = new Set()
  for (const [index, source] of (Array.isArray(draft.sources) ? draft.sources : []).entries()) validateSource(source, index, issues, sourceIds)
  const usedSourceIds = new Set()
  let profileConflictFields = new Set()
  if (draft.researchStatus === 'blocked') {
    if (Array.isArray(draft.events) && draft.events.length !== 0) {
      issues.push(issue('BLOCKED_EVENTS', 'events', 'blocked 초안은 부분 연표와 섞지 않고 events를 빈 배열로 유지해야 합니다.'))
    }
    if (draft.profileConflicts != null && (!Array.isArray(draft.profileConflicts) || draft.profileConflicts.length > 0)) {
      issues.push(issue('PROFILE_CONFLICT_STATUS', 'profileConflicts', 'profileConflicts는 complete 초안에서만 사용할 수 있습니다.'))
    }
    validateBlockingIssues(draft, issues, sourceIds, usedSourceIds)
  } else {
    if (draft.blockingIssues != null && (!Array.isArray(draft.blockingIssues) || draft.blockingIssues.length > 0)) {
      issues.push(issue('BLOCKING_ISSUES_STATUS', 'blockingIssues', 'blockingIssues는 blocked 초안에서만 사용할 수 있습니다.'))
    }
    profileConflictFields = validateProfileConflicts(draft, issues, sourceIds, usedSourceIds)
    if (draft.timelineMode === 'life') validateLifeEvents(draft, issues, sourceIds, usedSourceIds, profileConflictFields)
    if (draft.timelineMode === 'fiction') validateFictionEvents(draft, issues, sourceIds, usedSourceIds)
  }
  for (const sourceId of sourceIds) {
    if (!usedSourceIds.has(sourceId)) issues.push(issue('SOURCE_UNUSED', `sources.${sourceId}`, `출처 '${sourceId}'를 참조하는 사건·차단 사유·프로필 충돌이 없습니다.`, 'warning'))
  }

  if (expectedPerson) {
    const directFields = ['celebId', 'slug', 'nickname', 'nicknameEn', 'timelineMode', 'laneId']
    for (const field of directFields) {
      if (!nullableEqual(draft[field], expectedPerson[field])) issues.push(issue('MANIFEST_MISMATCH', field, `manifest 값 ${JSON.stringify(expectedPerson[field] ?? null)}과 일치해야 합니다.`))
    }
    const snapshotFields = ['celebTier', 'publicationStatus', 'birthDate', 'deathDate', 'profession', 'nationality', 'wikidataQid']
    for (const field of snapshotFields) {
      if (!nullableEqual(draft.profileSnapshot?.[field], expectedPerson[field])) issues.push(issue('PROFILE_SNAPSHOT_MISMATCH', `profileSnapshot.${field}`, `manifest 값 ${JSON.stringify(expectedPerson[field] ?? null)}과 일치해야 합니다.`))
    }
  }
  return { issues }
}
