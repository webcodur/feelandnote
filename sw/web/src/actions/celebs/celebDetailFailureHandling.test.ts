import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = (relativePath: string) => readFileSync(
  new URL(relativePath, import.meta.url),
  'utf8',
)

const profileSource = read('../user/getCelebBySlug.ts')
const dialogueSource = read('./getCelebJsonLdData.ts')
const spectrumSource = read('../spectrum/getSimilarByCelebId.ts')
const influenceSource = read('../home/getCelebInfluence.ts')
const countsSource = read('../contents/getContentCounts.ts')
const affiliateSource = read('../home/getAffiliateBooks.ts')

test('cached celeb profile queries throw before missing and empty values are normalized', () => {
  for (const label of [
    'profile',
    'content-count',
    'follower-count',
    'guestbook-count',
    'dialogue',
    'type-counts',
    'faction-members',
    'faction-tags',
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
    profileSource,
    /throwOnQueryError\('getCelebBySlug\/profile',[\s\S]*?if \(!celeb\) return null/,
  )
  assert.match(profileSource, /celeb-by-slug-v7-query-guards/)
  assert.doesNotMatch(profileSource, /if \(explanationResult\.error\)[\s\S]*?console\.error/)
})

test('cached dialogue, JSON-LD, spectrum, and influence ranking queries reject failures', () => {
  assert.match(dialogueSource, /throwOnQueryError\('getCelebJsonLdContents'/)
  assert.match(
    dialogueSource,
    /withQueryFallback\([\s\S]*?'getCelebJsonLdContents'[\s\S]*?getCelebJsonLdContentsCached/,
  )
  assert.match(dialogueSource, /throwOnQueryError\('getCelebDialogueFull'/)
  assert.match(dialogueSource, /celeb-jsonld-contents-v2-query-guards/)
  assert.match(dialogueSource, /celeb-dialogue-full-v2-query-guards/)
  assert.match(spectrumSource, /throwOnQueryError\('getSimilarByCelebId\/target'/)
  assert.match(spectrumSource, /spectrum-by-id-v2-query-guards/)
  assert.match(influenceSource, /throwOnQueryError\('getCelebInfluence\/higher-count'/)
  assert.match(influenceSource, /throwOnQueryError\('getCelebInfluence\/total-count'/)
  assert.match(influenceSource, /celeb-influence-detail-v2-query-guards/)
})

test('content type counts propagate query failures instead of returning false zero counts', () => {
  assert.doesNotMatch(countsSource, /withQueryFallback/)
  assert.match(countsSource, /return countByType\(supabase, user\.id, false\)/)
  assert.match(countsSource, /return getCachedUserContentCounts\(userId\)/)
  assert.match(countsSource, /return getCachedCelebContentCounts\(userId\)/)
})

test('affiliate recommendations reject source failures before any empty result is cached', () => {
  for (const label of [
    'pool',
    'celeb-read',
    'profession',
    'profession-peers',
    'profession-read',
    'origin',
  ]) {
    assert.match(
      affiliateSource,
      new RegExp(`throwOnQueryError\\('getAffiliateBooks/${label}'`),
      `missing getAffiliateBooks/${label} query guard`,
    )
  }
  assert.match(affiliateSource, /affiliate-pool-v2-query-guards/)
  assert.match(affiliateSource, /affiliate-books-celeb-v2-query-guards/)
})
