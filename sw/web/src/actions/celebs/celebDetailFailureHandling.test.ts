import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { DIALOGUE_PROFILE_SELECT } from '@/lib/utils/celeb-dialogues'

const read = (relativePath: string) => readFileSync(
  new URL(relativePath, import.meta.url),
  'utf8',
)

const profileSource = read('../user/getCelebBySlug.ts')
const identitySource = read('../../lib/celeb/identity.ts')
const spectrumSource = read('../spectrum/getSimilarByCelebId.ts')
const influenceSource = read('../home/getCelebInfluence.ts')
const countsSource = read('../contents/getContentCounts.ts')
const affiliateSource = read('../home/getAffiliateBooks.ts')

test('cached celeb profile queries throw before missing and empty values are normalized', () => {
  for (const label of [
    'content-count',
    'follower-count',
    'guestbook-count',
    'dialogue',
    'type-counts',
    'faction-members',
    'factions',
    'outgoing-relations',
    'incoming-relations',
    'external-relations',
    'explanation',
  ]) {
    assert.match(
      profileSource,
      new RegExp(`throwOnQueryError\\('getCelebBySlug/${label}'`),
      `missing getCelebBySlug/${label} query guard`,
    )
  }

  assert.match(
    identitySource,
    /throwOnQueryError\('celeb-identity',[\s\S]*?return data as IdentityRow/,
  )
  assert.match(profileSource, /cachedDetail\([\s\S]*?CACHE_TAGS\.CELEBS/)
  assert.doesNotMatch(profileSource, /if \(explanationResult\.error\)[\s\S]*?console\.error/)
})

test('profile dialogue projects greeting without loading full dialogue JSON', () => {
  const fields = DIALOGUE_PROFILE_SELECT.split(',').map(field => field.trim())
  assert.ok(fields.includes('greeting:lines->greeting'))
  assert.ok(fields.includes('greeting_en:lines_en->greeting'))
  assert.ok(fields.every(field => field.includes('->')), 'all dialogue reads must project individual situations')
})

test('cached spectrum and influence ranking queries reject failures', () => {
  assert.match(spectrumSource, /throwOnQueryError\('getSimilarByCelebId\/target'/)
  assert.match(spectrumSource, /spectrum-by-id-v2-query-guards/)
  assert.match(influenceSource, /throwOnQueryError\('getCelebInfluence\/higher-count'/)
  assert.match(influenceSource, /throwOnQueryError\('getCelebInfluence\/total-count'/)
  assert.match(influenceSource, /celeb-influence-detail-v2-query-guards/)
})

test('content type counts propagate query failures instead of returning false zero counts', () => {
  assert.doesNotMatch(countsSource, /withQueryFallback/)
  assert.match(countsSource, /return countByType\(db, user\.id, false\)/)
  assert.match(countsSource, /return getCachedUserContentCounts\(userId\)/)
  assert.match(countsSource, /return getCachedCelebContentCounts\(userId\)/)
})

test('affiliate recommendations reject source failures before any empty result is cached', () => {
  for (const label of [
    'celeb-read',
    'profession',
    'profession-peers',
    'origin',
  ]) {
    assert.match(
      affiliateSource,
      new RegExp(`throwOnQueryError\\('getAffiliateBooks/${label}'`),
      `missing getAffiliateBooks/${label} query guard`,
    )
  }
  // 판본 풀은 작품 ID 묶음 조회로 옮겨졌고, 공유 조회기가 오류를 전파한다.
  assert.match(affiliateSource, /selectInChunks<SourceContentCountRow>/)
  assert.match(affiliateSource, /selectInChunks<LocaleRow>/)
  assert.match(affiliateSource, /compressedJsonCache\(fetchAffiliatePool/)
  assert.match(affiliateSource, /cachedDetail\([\s\S]*?CACHE_TAGS\.CELEBS/)
})
