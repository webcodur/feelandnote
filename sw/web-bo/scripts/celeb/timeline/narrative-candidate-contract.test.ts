import assert from 'node:assert/strict'
import test from 'node:test'
import {
  NARRATIVE_CANDIDATE_SCHEMA_VERSION,
  assertExplicitInactiveSlugMode,
  fingerprintNarrativeProfile,
  fingerprintSourceAssignments,
  fingerprintStoredEvents,
  validateNarrativeCandidate,
  type NarrativeCandidate,
  type NarrativeProfileSnapshot,
} from './narrative-candidate-contract'

const activeProfile: NarrativeProfileSnapshot = {
  id: '00000000-0000-4000-8000-000000000001',
  slug: 'test-hero',
  nickname: '시험 영웅',
  nickname_en: 'Test Hero',
  publication_status: 'active',
  celeb_reality: 'FICTION',
  birth_date: null,
  death_date: null,
  headline: '시험용 영웅',
  bio: '후보 계약을 시험하는 허구 인물이다.',
  profession: 'hero',
  nationality: 'GR',
}

const sourceContentId = '00000000-0000-4000-8000-000000000002'
const sourceAssignments = [{
  content_id: sourceContentId,
  relation_type: 'appears_in',
  sort_order: 0,
  content: {
    type: 'BOOK',
    external_id: 'test-source',
    external_source: 'manual',
  },
  locales: [{
    locale: 'ko',
    title: '테스트 원전',
    creator: null,
    description: null,
    sources: null,
  }],
}]

function candidate(): NarrativeCandidate {
  return {
    schema_version: NARRATIVE_CANDIDATE_SCHEMA_VERSION,
    slug: activeProfile.slug,
    celeb_id: activeProfile.id,
    celeb_reality: 'FICTION',
    before_events: [],
    before_fingerprint: fingerprintStoredEvents([]),
    source_snapshot: {
      fingerprint: fingerprintSourceAssignments(sourceAssignments),
      assignments: sourceAssignments,
    },
    anchor_source_ids: [sourceContentId],
    source_selection_reason: '연결 원전이 없는 예외 후보를 시험한다.',
    events: [{
      origin_id: null,
      identity_judgment: '시험 인물과 같은 정체성이다.',
      year: null,
      year_end: null,
      sequence_label: '시험 단계',
      sequence_label_en: 'Test stage',
      title: '시험 사건',
      title_en: 'Test event',
      description: '시험 인물의 상태가 달라지는 사건이다.',
      description_en: 'This event changes the state of the test figure.',
      kind: 'other',
      place_name: null,
      place_name_en: null,
      lat: null,
      lng: null,
      source_refs: [{
        content_id: sourceContentId,
        locus: '시험 범위',
        judgment: '이 범위가 시험 사건을 뒷받침한다.',
      }],
    }],
    deletions: [],
    quality_notes: {
      coverage_summary: '시험 사건 전체를 포함했다.',
      identity_review: '기존 사건이 없어 새 사건으로 작성했다.',
      variant_policy: '시험 판본 하나만 사용했다.',
      known_omissions: [],
    },
  }
}

test('legacy active candidate remains valid without profile metadata', () => {
  const result = validateNarrativeCandidate(candidate())
  assert.deepEqual(result.errors, [])
  assert.ok(result.candidate)
})

test('inactive candidate requires matching profile status and fingerprint metadata', () => {
  const missingFingerprint = { ...candidate(), publication_status: 'inactive' as const }
  assert.ok(validateNarrativeCandidate(missingFingerprint).errors.some(
    (error) => error.includes('publication_status와 profile_fingerprint'),
  ))

  const inactiveProfile = { ...activeProfile, publication_status: 'inactive' }
  const complete = {
    ...candidate(),
    publication_status: 'inactive' as const,
    profile_fingerprint: fingerprintNarrativeProfile(inactiveProfile),
  }
  assert.deepEqual(validateNarrativeCandidate(complete).errors, [])
})

test('fiction candidate rejects a profile without a connected source work', () => {
  const unlinked = candidate()
  unlinked.source_snapshot = {
    fingerprint: fingerprintSourceAssignments([]),
    assignments: [],
  }
  unlinked.anchor_source_ids = []
  unlinked.events[0].source_refs[0].content_id = null
  assert.ok(validateNarrativeCandidate(unlinked).errors.some(
    (error) => error.includes('원전 미연결 fiction 후보는 허용하지 않는다'),
  ))
})

test('profile fingerprint changes when publication status changes', () => {
  assert.notEqual(
    fingerprintNarrativeProfile(activeProfile),
    fingerprintNarrativeProfile({ ...activeProfile, publication_status: 'inactive' }),
  )
})

test('--allow-inactive is restricted to explicit slug targets', () => {
  assert.doesNotThrow(() => assertExplicitInactiveSlugMode({
    allowInactive: true,
    slugs: ['test-hero'],
    usesAllTargetMode: false,
  }))
  assert.throws(() => assertExplicitInactiveSlugMode({
    allowInactive: true,
    slugs: [],
    usesAllTargetMode: false,
  }), /--allow-inactive/)
  assert.throws(() => assertExplicitInactiveSlugMode({
    allowInactive: true,
    slugs: ['test-hero'],
    usesAllTargetMode: true,
  }), /--allow-inactive/)
})
