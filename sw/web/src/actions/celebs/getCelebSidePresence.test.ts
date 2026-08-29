import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const presenceSource = readFileSync(
  new URL('./getCelebSidePresence.ts', import.meta.url),
  'utf8',
)

test('페이지 전용 presence 모듈은 공개 Server Action 경계가 아니다', () => {
  const publicActions = readFileSync(new URL('./getCelebSideData.ts', import.meta.url), 'utf8')

  assert.match(presenceSource, /^import 'server-only'/)
  assert.doesNotMatch(presenceSource, /['"]use server['"]/)
  assert.doesNotMatch(publicActions, /getCelebSidePresence|celeb_persona|celeb_influence/)
})

test('가상 인물은 DB 조회 전에 존재 여부를 모두 끈다', () => {
  assert.match(
    presenceSource,
    /if \(tier === 'fiction'\) return EMPTY_SIDE_PRESENCE/,
  )
  assert.match(presenceSource, /EMPTY_SIDE_PRESENCE[\s\S]*?influence: false[\s\S]*?spectrum: false/)
})

test('초기 존재 조회는 ID 한 칸과 7일 상세 캐시만 사용한다', () => {
  assert.match(presenceSource, /\.from\('celeb_influence'\)[\s\S]*?\.select\('celeb_id'\)/)
  assert.match(presenceSource, /\.from\('celeb_persona'\)[\s\S]*?\.select\('celeb_id'\)/)
  assert.match(presenceSource, /cachedDetail\([\s\S]*?CACHE_TAGS\.CELEBS/)
  assert.match(presenceSource, /cachedDetail\([\s\S]*?CACHE_TAGS\.SPECTRUM/)
  assert.match(presenceSource, /extraTags: \[CACHE_TAGS\.CELEBS\]/)
  assert.match(presenceSource, /throwOnQueryError\('getCelebSidePresence\/influence', error\)/)
  assert.match(presenceSource, /throwOnQueryError\('getCelebSidePresence\/spectrum', error\)/)
  assert.doesNotMatch(presenceSource, /LIST_REVALIDATE/)
})

test('인물 페이지는 server-only presence만 초기 렌더에서 부른다', () => {
  const page = readFileSync(
    new URL('../../app/[locale]/(main)/celeb/[slug]/page.tsx', import.meta.url),
    'utf8',
  )

  assert.match(page, /@\/actions\/celebs\/getCelebSidePresence/)
  assert.doesNotMatch(page, /@\/actions\/celebs\/getCelebSideData/)
  assert.doesNotMatch(page, /getCelebInfluence/)
  assert.doesNotMatch(page, /getSimilarByCelebId/)
  assert.doesNotMatch(page, /getContemporaries/)
  assert.match(page, /export const revalidate = false/)
  assert.match(page, /generateStaticParams\(\)[\s\S]*?return \[\]/)
})
