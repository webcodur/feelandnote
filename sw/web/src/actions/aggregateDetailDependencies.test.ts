import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  bulkTag,
  CACHE_TAGS,
  detailCacheTags,
} from '@feelandnote/shared/constants/cache-tags'

const reviewFeedSource = readFileSync(
  new URL('./contents/getReviewFeed.ts', import.meta.url),
  'utf8',
)
const curatedSource = readFileSync(
  new URL('./library/curated.ts', import.meta.url),
  'utf8',
)
const fictionSource = readFileSync(
  new URL('./fiction/getFictionSources.ts', import.meta.url),
  'utf8',
)
const contentDetailSource = readFileSync(
  new URL('./contents/getContentDetail.ts', import.meta.url),
  'utf8',
)

function exportedFunctionSource(source: string, name: string): string {
  const start = source.indexOf(`export async function ${name}`)
  assert.notEqual(start, -1, `${name} export must exist`)
  const nextExport = source.indexOf('\nexport async function ', start + 1)
  return source.slice(start, nextExport === -1 ? source.length : nextExport)
}

test('공개 리뷰는 1시간 route TTL을 만들지 않고 셀럽 bulk 의존성만 기록한다', () => {
  assert.match(
    reviewFeedSource,
    /trackPublicReviewCelebBulkDependency = unstable_cache\([\s\S]*?revalidate: false[\s\S]*?bulkTag\(CACHE_TAGS\.CELEBS\)/,
  )

  const publicFeed = exportedFunctionSource(reviewFeedSource, 'getPublicReviewFeed')
  assert.match(publicFeed, /dependencyPromise = trackPublicReviewCelebBulkDependency\(\)/)
  assert.match(publicFeed, /Promise\.all\(\[reviewsPromise, dependencyPromise\]\)/)
  assert.match(publicFeed, /\(\) => fetchReviewFeed\(/)
  assert.doesNotMatch(publicFeed, /getReviewFeedCached/)
  assert.equal(bulkTag(CACHE_TAGS.CELEBS), 'celebs:__all__')
})

test('작품별 선정 이력은 bare 목록이 아니라 item + bulk 상세 태그를 소비한다', () => {
  const entries = exportedFunctionSource(curatedSource, 'getCuratedEntriesForContent')
  assert.match(entries, /return cachedDetail\([\s\S]*?CACHE_TAGS\.CURATED,[\s\S]*?contentId,/)
  assert.match(entries, /curated-entries-for-content-v2/)
  assert.doesNotMatch(curatedSource, /getCuratedEntriesCached/)
  assert.deepEqual(
    detailCacheTags(CACHE_TAGS.CURATED, 'content-1'),
    ['curated:content-1', 'curated:__all__'],
  )
})

test('픽션 공유 원장은 bare와 bulk에 갱신되고 빈 결과도 bulk 의존성을 소비한다', () => {
  assert.match(fictionSource, /fiction-source-character-assignments-v2/)
  assert.match(
    fictionSource,
    /tags: \[[\s\S]*?CACHE_TAGS\.FICTION_SOURCES,[\s\S]*?bulkTag\(CACHE_TAGS\.FICTION_SOURCES\)/,
  )

  const characters = exportedFunctionSource(fictionSource, 'getFictionCharactersForContent')
  assert.match(characters, /const assignments = await fetchAllAssignmentsCached\(\)/)
  assert.match(characters, /if \(!assignments\.some\([\s\S]*?return \[\]/)
  assert.match(characters, /return cachedDetail\(/)
  assert.match(characters, /\(\) => fetchCharactersByContent\(contentId, locale, assignments\)/)

  assert.deepEqual(
    detailCacheTags(
      CACHE_TAGS.CONTENTS,
      'content-1',
      [CACHE_TAGS.FICTION_SOURCES, CACHE_TAGS.CELEBS],
    ),
    [
      'contents:content-1',
      'fiction-sources:content-1',
      'celebs:content-1',
      'contents:__all__',
      'fiction-sources:__all__',
      'celebs:__all__',
    ],
  )
})

test('공개 작품 상세 route가 세 aggregate 의존 소비자를 모두 호출한다', () => {
  const publicDetailStart = contentDetailSource.indexOf('async function getPublicContentDetailInner')
  const viewerStateStart = contentDetailSource.indexOf('\nexport async function getContentViewerState', publicDetailStart)
  assert.notEqual(publicDetailStart, -1)
  assert.notEqual(viewerStateStart, -1)
  const publicDetail = contentDetailSource.slice(publicDetailStart, viewerStateStart)

  assert.match(publicDetail, /getPublicReviewFeed\(/)
  assert.match(publicDetail, /getFictionCharactersForContent\(/)
  assert.match(publicDetail, /getCuratedEntriesForContent\(/)
})
