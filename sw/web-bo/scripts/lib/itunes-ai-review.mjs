export function validateAiReviewCandidate(item, candidate) {
  const review = item?.aiReview
  if (item?.matchType !== 'ai_review' || review?.action !== 'accept_candidate') {
    return { ok: false, reason: 'AI 확정 판정이 아니다' }
  }
  if (candidate?.id !== review.candidateId) return { ok: false, reason: '판정한 Apple ID와 다르다' }
  if (candidate?.entity !== item.originalSpotifyEntity) return { ok: false, reason: '원본 엔티티와 다르다' }
  if (!candidate?.previewUrl) return { ok: false, reason: '미리듣기가 없다' }
  if (typeof review.rationale !== 'string' || review.rationale.trim().length < 12) {
    return { ok: false, reason: 'AI 판정 근거가 없다' }
  }

  const evidence = review.evidence || {}
  if (candidate.entity === 'track') {
    const expectedDuration = Number(evidence.appleDurationMs)
    const actualDuration = Number(candidate.durationMs)
    if (!(expectedDuration > 0) || !(actualDuration > 0)) {
      return { ok: false, reason: 'Apple 재생시간 증거가 없다' }
    }
    if (Math.abs(expectedDuration - actualDuration) > 1000) {
      return { ok: false, reason: 'Apple 재생시간이 판정 당시와 달라졌다' }
    }
  } else {
    const expectedTracks = Number(evidence.appleTrackCount)
    if (!Number.isInteger(expectedTracks) || expectedTracks < 1) {
      return { ok: false, reason: 'Apple 앨범 수록곡 수 증거가 없다' }
    }
    if (candidate.totalTracks !== expectedTracks) {
      return { ok: false, reason: 'Apple 앨범 수록곡 수가 판정 당시와 달라졌다' }
    }
  }

  return { ok: true, reason: null }
}
