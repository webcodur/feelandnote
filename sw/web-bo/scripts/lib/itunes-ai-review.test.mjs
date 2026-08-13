import assert from 'node:assert/strict'
import test from 'node:test'
import { validateAiReviewCandidate } from './itunes-ai-review.mjs'

const trackItem = {
  matchType: 'ai_review',
  originalSpotifyEntity: 'track',
  aiReview: {
    action: 'accept_candidate',
    candidateId: 10,
    rationale: '원본과 후보의 녹음 및 재생시간이 일치한다.',
    evidence: { appleDurationMs: 221133 },
  },
}

test('자동 점수와 무관하게 AI가 판정한 동일 트랙의 안정성을 검증한다', () => {
  const result = validateAiReviewCandidate(trackItem, {
    id: 10,
    entity: 'track',
    previewUrl: 'https://example.com/preview.m4a',
    durationMs: 221133,
  })
  assert.deepEqual(result, { ok: true, reason: null })
})

test('판정 당시와 다른 Apple ID는 거부한다', () => {
  const result = validateAiReviewCandidate(trackItem, {
    id: 11,
    entity: 'track',
    previewUrl: 'https://example.com/preview.m4a',
    durationMs: 221133,
  })
  assert.equal(result.ok, false)
})

test('Apple 재생시간이 변한 후보는 거부한다', () => {
  const result = validateAiReviewCandidate(trackItem, {
    id: 10,
    entity: 'track',
    previewUrl: 'https://example.com/preview.m4a',
    durationMs: 230000,
  })
  assert.equal(result.ok, false)
})

test('앨범은 판정 당시 수록곡 수가 유지돼야 한다', () => {
  const result = validateAiReviewCandidate({
    matchType: 'ai_review',
    originalSpotifyEntity: 'album',
    aiReview: {
      action: 'accept_candidate',
      candidateId: 20,
      rationale: '원본과 후보의 수록곡 순서와 길이가 일치한다.',
      evidence: { appleTrackCount: 12 },
    },
  }, {
    id: 20,
    entity: 'album',
    previewUrl: 'https://example.com/preview.m4a',
    totalTracks: 12,
  })
  assert.equal(result.ok, true)
})
