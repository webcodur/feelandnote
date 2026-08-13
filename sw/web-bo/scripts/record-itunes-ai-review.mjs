/**
 * 사람이 읽을 수 있는 AI 판정 파일을 정밀 이전 상태에 안전하게 반영한다.
 * 기본은 dry-run이며 `--apply`일 때만 `.codex/runtime` 상태를 바꾼다.
 */

import { readFile, rename, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const args = process.argv.slice(2)
const decisionPath = args.find((arg) => !arg.startsWith('--'))
const APPLY = args.includes('--apply')
if (!decisionPath) throw new Error('사용법: node scripts/record-itunes-ai-review.mjs <decisions.json> [--apply]')

const STATE_PATH = resolve(process.cwd(), '../../.codex/runtime/itunes-music-precision-state.json')
const TRACK_EVIDENCE_PATH = resolve(process.cwd(), '../../.codex/runtime/itunes-music-ai-track-evidence.json')
const ALBUM_EVIDENCE_PATH = resolve(process.cwd(), '../../.codex/runtime/itunes-music-ai-album-evidence.json')
const DEEP_EVIDENCE_PATH = resolve(process.cwd(), '../../.codex/runtime/itunes-music-ai-track-deep-evidence.json')
const DEEP_ALBUM_EVIDENCE_PATH = resolve(process.cwd(), '../../.codex/runtime/itunes-music-ai-album-deep-evidence.json')

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'))
}

async function writeJsonAtomic(path, value) {
  const tempPath = `${path}.ai-review.next`
  await writeFile(tempPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
  await rename(tempPath, path)
}

function candidateFor(item, candidateId, deepCandidate = null) {
  return (deepCandidate?.id === candidateId ? deepCandidate : null)
    || (item.candidates || []).find((candidate) => candidate.id === candidateId)
    || (item.proposal?.id === candidateId ? item.proposal : null)
}

function deepCandidateFor(deepEvidence, contentId, candidateId) {
  const searches = deepEvidence.items?.[contentId]?.searches || []
  const matches = []
  for (const search of searches) {
    const candidate = search.candidates?.find((entry) => entry.id === candidateId)
    if (candidate) matches.push(candidate)
  }
  return matches.sort((left, right) => (
    Number(Boolean(right.previewUrl)) - Number(Boolean(left.previewUrl))
    || (right.appleTracks?.length || 0) - (left.appleTracks?.length || 0)
  ))[0] || null
}

function assertCandidate(item, candidate, contentId) {
  if (!candidate) throw new Error(`${contentId}: 판정 후보가 기존 증거에 없다`)
  if (candidate.entity !== item.originalSpotifyEntity) {
    throw new Error(`${contentId}: 후보 엔티티가 원본과 다르다`)
  }
  if (!candidate.previewUrl) throw new Error(`${contentId}: 후보에 미리듣기가 없다`)
}

const state = await readJson(STATE_PATH)
const payload = await readJson(resolve(decisionPath))
let trackEvidence = { items: {} }
try { trackEvidence = await readJson(TRACK_EVIDENCE_PATH) } catch (error) {
  if (error?.code !== 'ENOENT') throw error
}
let albumEvidence = { items: {} }
try { albumEvidence = await readJson(ALBUM_EVIDENCE_PATH) } catch (error) {
  if (error?.code !== 'ENOENT') throw error
}
const observedEvidence = { items: { ...trackEvidence.items, ...albumEvidence.items } }
let deepEvidence = { items: {} }
try { deepEvidence = await readJson(DEEP_EVIDENCE_PATH) } catch (error) {
  if (error?.code !== 'ENOENT') throw error
}
let deepAlbumEvidence = { items: {} }
try { deepAlbumEvidence = await readJson(DEEP_ALBUM_EVIDENCE_PATH) } catch (error) {
  if (error?.code !== 'ENOENT') throw error
}
const combinedDeepEvidence = {
  items: { ...deepEvidence.items, ...deepAlbumEvidence.items },
}
if (!Array.isArray(payload.decisions) || !payload.decisions.length) {
  throw new Error('decisions 배열이 비어 있다')
}

const seen = new Set()
const summary = { accept_candidate: 0, verified_current: 0, needs_search: 0, unavailable: 0 }
for (const decision of payload.decisions) {
  const { contentId, action, candidateId, rationale, evidence } = decision
  if (!contentId || seen.has(contentId)) throw new Error(`중복되거나 빈 contentId: ${contentId}`)
  seen.add(contentId)
  const item = state.items?.[contentId]
  if (!item) throw new Error(`${contentId}: 정밀 상태에 없는 콘텐츠다`)
  if (!(action in summary)) throw new Error(`${contentId}: 지원하지 않는 action ${action}`)
  if (typeof rationale !== 'string' || rationale.trim().length < 12) {
    throw new Error(`${contentId}: 판정 근거가 너무 짧다`)
  }

  const observed = observedEvidence.items?.[contentId]
  const deepCandidate = deepCandidateFor(combinedDeepEvidence, contentId, candidateId)
  if (observed) {
    if (Number.isFinite(Number(evidence?.spotifyDurationMs))
      && Number(evidence.spotifyDurationMs) !== Number(observed.spotify?.durationMs)) {
      throw new Error(`${contentId}: 기록한 Spotify 길이가 증거 파일과 다르다`)
    }
    if (candidateId) {
      const observedCandidate = deepCandidate
        || observed.candidates?.find((candidate) => candidate.id === candidateId)
        || (observed.currentApple?.id === candidateId ? observed.currentApple : null)
      if (!observedCandidate) throw new Error(`${contentId}: 선택 후보가 트랙 증거 파일에 없다`)
      if (Number.isFinite(Number(evidence?.appleDurationMs))
        && Number(evidence.appleDurationMs) !== Number(observedCandidate.durationMs)) {
        throw new Error(`${contentId}: 기록한 Apple 길이가 증거 파일과 다르다`)
      }
      if (evidence?.appleCollection && evidence.appleCollection !== observedCandidate.collectionName) {
        throw new Error(`${contentId}: 기록한 Apple 앨범이 증거 파일과 다르다`)
      }
      if (evidence?.appleAlbum && evidence.appleAlbum !== observedCandidate.title) {
        throw new Error(`${contentId}: 기록한 Apple 앨범 제목이 증거 파일과 다르다`)
      }
      if (Number.isFinite(Number(evidence?.appleTrackCount))
        && Number(evidence.appleTrackCount) !== Number(observedCandidate.totalTracks)) {
        throw new Error(`${contentId}: 기록한 Apple 수록곡 수가 증거 파일과 다르다`)
      }
      if (Number.isFinite(Number(evidence?.appleObservedTrackCount))
        && Number(evidence.appleObservedTrackCount) !== Number(
          observedCandidate.tracks?.length ?? observedCandidate.appleTracks?.length
        )) {
        throw new Error(`${contentId}: 기록한 Apple 관찰 수록곡 수가 증거 파일과 다르다`)
      }
      if (Number.isFinite(Number(evidence?.trackFingerprintScore))
        && Number(evidence.trackFingerprintScore) !== Number(observedCandidate.score?.tracklist)) {
        throw new Error(`${contentId}: 기록한 수록곡 지문 점수가 증거 파일과 다르다`)
      }
    }
    if (Number.isFinite(Number(evidence?.spotifyTrackCount))
      && Number(evidence.spotifyTrackCount) !== Number(observed.spotify?.tracks?.length)) {
      throw new Error(`${contentId}: 기록한 Spotify 수록곡 수가 증거 파일과 다르다`)
    }
  }

  const previousStatus = item.status
  if (action === 'accept_candidate') {
    const candidate = candidateFor(item, candidateId, deepCandidate)
    assertCandidate(item, candidate, contentId)
    item.status = 'matched'
    item.sourceEntity = candidate.entity
    item.matchType = 'ai_review'
    item.proposal = candidate
    delete item.apply
  } else if (action === 'verified_current') {
    const currentId = Number(String(item.currentExternalIdAtScan || '').replace(/^itunes[-_]/, ''))
    if (item.currentSourceAtScan !== 'itunes' || candidateId !== currentId) {
      throw new Error(`${contentId}: 현재 iTunes ID와 verified 후보가 다르다`)
    }
    const candidate = candidateFor(item, candidateId, deepCandidate)
    if (candidate) {
      assertCandidate(item, candidate, contentId)
    } else {
      const observedCurrent = observed?.currentApple
      if (observedCurrent?.id !== candidateId
        || observedCurrent.entity !== item.originalSpotifyEntity
        || !observedCurrent.preview) {
        throw new Error(`${contentId}: 현재 Apple 행의 미리듣기 증거가 없다`)
      }
    }
    item.status = 'verified'
    item.sourceEntity = candidate?.entity || observed.currentApple.entity
    item.matchType = 'ai_review_current'
    item.verifiedExternalId = item.currentExternalIdAtScan
    delete item.proposal
    delete item.apply
  }

  item.aiReview = {
    action,
    candidateId: candidateId || null,
    rationale: rationale.trim(),
    evidence: evidence || null,
    previousStatus,
    reviewedAt: payload.reviewedAt || new Date().toISOString(),
  }
  summary[action]++
}

if (APPLY) {
  state.status = 'ai_reviewed'
  state.updatedAt = new Date().toISOString()
  await writeJsonAtomic(STATE_PATH, state)
}

console.log(JSON.stringify({ mode: APPLY ? 'applied' : 'dry-run', count: seen.size, summary }, null, 2))
