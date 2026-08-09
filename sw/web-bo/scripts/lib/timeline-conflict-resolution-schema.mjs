export const RESOLUTION_SCHEMA_VERSION = '1.0'

export const RESOLUTION_ACTIONS = new Set([
  'UPDATE_PROFILE',
  'KEEP_PROFILE',
  'REDUCE_PRECISION',
  'IDENTITY_REVIEW',
  'QUARANTINE_PROFILE',
  'RESUME_TIMELINE',
])

export const RESOLUTION_PRECISIONS = new Set([
  'exact-day',
  'month',
  'year',
  'circa-year',
  'year-range',
  'unknown',
  'collective',
  'not-applicable',
])

export const RESOLUTION_CONFIDENCES = new Set(['high', 'medium', 'low'])
export const RESOLUTION_SCOPES = new Set(['date', 'identity', 'other'])

const DATE_FIELDS = new Set(['birthDate', 'deathDate'])
const IDENTITY_FIELDS = new Set(['celebId', 'slug', 'nickname', 'nicknameEn', 'wikidataQid'])
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function issue(code, path, message, severity = 'error') {
  return { severity, code, path, message }
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function hasOwn(value, field) {
  return Object.prototype.hasOwnProperty.call(value, field)
}

function isScalar(value) {
  return value === null || ['string', 'number', 'boolean'].includes(typeof value)
}

function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right)
}

function isHttpUrl(value) {
  if (!hasText(value)) return false
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

function validateText(value, path, issues, { min = 1, max = 2_000 } = {}) {
  if (!hasText(value)) {
    issues.push(issue('TEXT_REQUIRED', path, '비어 있지 않은 문자열이 필요합니다.'))
    return
  }
  const length = value.trim().length
  if (length < min || length > max) {
    issues.push(issue('TEXT_LENGTH', path, `${min}~${max}자여야 합니다. 현재 ${length}자입니다.`))
  }
}

export function resolutionScopeFor(field) {
  if (field === 'researchStatus') return 'identity'
  if (DATE_FIELDS.has(field)) return 'date'
  if (IDENTITY_FIELDS.has(field)) return 'identity'
  return 'other'
}

export function resolutionConflictKey({ celebId, slug, field, currentValue }) {
  return JSON.stringify([celebId ?? null, slug ?? null, field ?? null, currentValue ?? null])
}

export function validateResolutionItem(item, index, { expectedScope = null } = {}) {
  const issues = []
  const base = `resolutions[${index}]`
  if (!isObject(item)) {
    return { issues: [issue('RESOLUTION_OBJECT', base, 'resolution은 객체여야 합니다.')], key: null }
  }

  if (!UUID.test(item.celebId ?? '')) {
    issues.push(issue('RESOLUTION_CELEB_ID', `${base}.celebId`, 'UUID 형식의 celebId가 필요합니다.'))
  }
  validateText(item.slug, `${base}.slug`, issues, { max: 180 })
  validateText(item.field, `${base}.field`, issues, { max: 80 })
  if (!hasOwn(item, 'currentValue') || !isScalar(item.currentValue)) {
    issues.push(issue('RESOLUTION_CURRENT_VALUE', `${base}.currentValue`, 'conflict key의 JSON scalar currentValue가 필요합니다.'))
  }
  if (!RESOLUTION_ACTIONS.has(item.action)) {
    issues.push(issue('RESOLUTION_ACTION', `${base}.action`, `허용 action: ${[...RESOLUTION_ACTIONS].join(', ')}`))
  }
  if (!hasOwn(item, 'proposedValue') || !isScalar(item.proposedValue)) {
    issues.push(issue('RESOLUTION_PROPOSED_VALUE', `${base}.proposedValue`, 'JSON scalar proposedValue가 필요합니다. null도 명시해야 합니다.'))
  }
  if (!RESOLUTION_PRECISIONS.has(item.precision)) {
    issues.push(issue('RESOLUTION_PRECISION', `${base}.precision`, `허용 precision: ${[...RESOLUTION_PRECISIONS].join(', ')}`))
  }
  validateText(item.rationale, `${base}.rationale`, issues, { min: 20, max: 2_000 })
  validateText(item.rationaleEn, `${base}.rationaleEn`, issues, { min: 20, max: 2_500 })

  if (!Array.isArray(item.evidenceUrls) || item.evidenceUrls.length === 0) {
    issues.push(issue('RESOLUTION_EVIDENCE_URLS', `${base}.evidenceUrls`, 'HTTP(S) evidence URL이 1개 이상 필요합니다.'))
  } else {
    const seenUrls = new Set()
    for (const [urlIndex, url] of item.evidenceUrls.entries()) {
      const urlPath = `${base}.evidenceUrls[${urlIndex}]`
      if (!isHttpUrl(url)) issues.push(issue('RESOLUTION_EVIDENCE_URL', urlPath, 'http:// 또는 https:// URL이어야 합니다.'))
      if (seenUrls.has(url)) issues.push(issue('RESOLUTION_EVIDENCE_URL_DUPLICATE', urlPath, '같은 resolution에서 evidence URL이 중복되었습니다.'))
      seenUrls.add(url)
    }
  }

  if (!RESOLUTION_CONFIDENCES.has(item.confidence)) {
    issues.push(issue('RESOLUTION_CONFIDENCE', `${base}.confidence`, 'confidence는 high, medium, low 중 하나여야 합니다.'))
  }
  if (item.status !== 'resolved') {
    issues.push(issue('RESOLUTION_STATUS', `${base}.status`, "판정 문서의 status는 'resolved'여야 합니다."))
  }

  const itemScope = hasText(item.field) ? resolutionScopeFor(item.field) : null
  if (expectedScope && itemScope && itemScope !== expectedScope) {
    issues.push(issue('RESOLUTION_SCOPE', `${base}.field`, `field '${item.field}'는 ${itemScope} 범위이며 ${expectedScope} 파일에 둘 수 없습니다.`))
  }
  if (DATE_FIELDS.has(item.field) && item.precision === 'not-applicable') {
    issues.push(issue('RESOLUTION_DATE_PRECISION', `${base}.precision`, '날짜 충돌에는 날짜 정밀도를 명시해야 합니다.'))
  }
  if (!DATE_FIELDS.has(item.field) && RESOLUTION_PRECISIONS.has(item.precision) && item.precision !== 'not-applicable') {
    issues.push(issue('RESOLUTION_NON_DATE_PRECISION', `${base}.precision`, '날짜 외 충돌에는 not-applicable을 사용해야 합니다.'))
  }
  if (item.action === 'KEEP_PROFILE' && hasOwn(item, 'currentValue') && hasOwn(item, 'proposedValue') && !sameJson(item.currentValue, item.proposedValue)) {
    issues.push(issue('RESOLUTION_KEEP_VALUE', `${base}.proposedValue`, 'KEEP_PROFILE의 proposedValue는 currentValue와 같아야 합니다.'))
  }
  if (['UPDATE_PROFILE', 'REDUCE_PRECISION'].includes(item.action)
      && hasOwn(item, 'currentValue') && hasOwn(item, 'proposedValue')
      && sameJson(item.currentValue, item.proposedValue)) {
    issues.push(issue('RESOLUTION_CHANGE_VALUE', `${base}.proposedValue`, `${item.action}의 proposedValue는 currentValue와 달라야 합니다.`))
  }

  if (item.field === 'researchStatus') {
    if (item.currentValue !== 'blocked') {
      issues.push(issue('BLOCKED_CURRENT_VALUE', `${base}.currentValue`, "blocked resolution의 currentValue는 'blocked'여야 합니다."))
    }
    if (item.trigger?.type !== 'blocked') {
      issues.push(issue('BLOCKED_TRIGGER', `${base}.trigger.type`, "blocked resolution에는 trigger.type='blocked'가 필요합니다."))
    }
    if (!['QUARANTINE_PROFILE', 'RESUME_TIMELINE'].includes(item.action)) {
      issues.push(issue('BLOCKED_ACTION', `${base}.action`, 'blocked resolution은 QUARANTINE_PROFILE 또는 RESUME_TIMELINE이어야 합니다.'))
    }
  }

  const key = UUID.test(item.celebId ?? '') && hasText(item.slug) && hasText(item.field) && hasOwn(item, 'currentValue')
    ? resolutionConflictKey(item)
    : null
  return { issues, key, scope: itemScope }
}

export function validateResolutionDocument(document, { expectedScope = null } = {}) {
  const issues = []
  if (!isObject(document)) {
    return { issues: [issue('RESOLUTION_DOCUMENT', '$', 'resolution 문서는 객체여야 합니다.')], resolutions: [] }
  }
  if (document.schemaVersion !== RESOLUTION_SCHEMA_VERSION) {
    issues.push(issue('RESOLUTION_SCHEMA_VERSION', 'schemaVersion', `schemaVersion은 '${RESOLUTION_SCHEMA_VERSION}'이어야 합니다.`))
  }
  if (!hasText(document.generatedAt) || Number.isNaN(Date.parse(document.generatedAt))) {
    issues.push(issue('RESOLUTION_GENERATED_AT', 'generatedAt', '유효한 ISO 날짜/시각이 필요합니다.'))
  }
  if (!Array.isArray(document.resolutions)) {
    issues.push(issue('RESOLUTIONS_ARRAY', 'resolutions', 'resolutions 배열이 필요합니다.'))
    return { issues, resolutions: [] }
  }
  if (expectedScope && !RESOLUTION_SCOPES.has(expectedScope)) {
    issues.push(issue('RESOLUTION_EXPECTED_SCOPE', '$', `알 수 없는 expected scope '${expectedScope}'입니다.`))
  }

  const resolutions = []
  for (const [index, item] of document.resolutions.entries()) {
    const result = validateResolutionItem(item, index, { expectedScope })
    issues.push(...result.issues)
    resolutions.push({ item, index, key: result.key, scope: result.scope })
  }
  return { issues, resolutions }
}
