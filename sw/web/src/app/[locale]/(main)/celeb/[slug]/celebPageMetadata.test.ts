import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import ts from 'typescript'
import * as celebMeta from '../../../../../lib/celeb/meta'
import type { CelebBySlugProfile } from '@/actions/user/getCelebBySlug'
import type { buildCelebPageMetadata } from './celebPageMetadata'

const compiled = ts.transpileModule(readFileSync(new URL('./celebPageMetadata.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText
const emptyCounts = { BOOK: 0, VIDEO: 0, MUSIC: 0, GAME: 0 }
const fixture = {
  id: 'figure', nickname: '인물', title: '수식어', headline: '인물을 구별하는 한 줄',
  bio: '소개 첫 문장. 소개 두 번째 문장.', reading: { guide: '안내 첫 문장. 안내 두 번째 문장.' },
  contentTypeCounts: emptyCounts, celeb_tier: 'full', celeb_reality: 'REAL',
} as unknown as CelebBySlugProfile

function load(profile: CelebBySlugProfile) {
  const calls: string[] = []
  const mocks = new Map<string, unknown>([
    ['@/lib/profile-route', { getCelebRouteProfile: async () => profile }],
    ['@/actions/figure-books/getFigureBooks', { getFigureBooksForCeleb: async () => {
      calls.push('sources')
      return [{ title: '원전', relationType: 'appearance' }, { title: '저작', relationType: 'authored' }]
    } }],
    ['@/lib/celeb/meta', celebMeta],
    ['@/lib/seo', { SITE_NAME: 'feelandnote', getAlternates: () => ({ canonical: 'https://feelandnote.com/celeb/figure' }), getSeoImageUrl: () => 'https://example.com/portrait.jpg' }],
    ['@/lib/url', { getCelebProfileUrl: () => '/celeb/figure' }],
    ['@feelandnote/shared/constants/celeb-tiers', { INDEXABLE_TIERS: ['full'] }],
  ])
  const loaded = { exports: {} as { buildCelebPageMetadata: typeof buildCelebPageMetadata } }
  new Function('require', 'module', 'exports', compiled)((key: string) => {
    assert.ok(mocks.has(key), `unexpected import ${key}`)
    return mocks.get(key)
  }, loaded, loaded.exports)
  return { calls, build: loaded.exports.buildCelebPageMetadata }
}

test('page metadata uses record presence and complete bio for every tier and reality', async () => {
  for (const celeb_tier of ['light', 'full'] as const) for (const celeb_reality of ['REAL', 'BOTH', 'FICTION'] as const) {
    for (const count of [0, 5]) {
      const { build, calls } = load({ ...fixture, celeb_tier, celeb_reality, contentTypeCounts: { ...emptyCounts, BOOK: count } })
      const metadata = await build('ko', 'figure')
      assert.deepEqual(metadata.title, { absolute: count ? '인물(수식어)이 감상한 책 5권' : '인물, 인물을 구별하는 한 줄' })
      assert.equal(metadata.description, fixture.bio)
      assert.equal(metadata.openGraph?.description, fixture.bio)
      assert.equal(metadata.twitter?.description, fixture.bio)
      assert.deepEqual(calls, [], 'a headline or appreciation records make the source query unnecessary')
      const englishBio = 'The first biography sentence. The second biography sentence.'
      const english = load({ ...fixture, celeb_tier, celeb_reality, nickname: 'Figure', title: 'Descriptor', headline: 'Distinct identity', headline_en: 'Distinct identity', bio: englishBio, contentTypeCounts: { ...emptyCounts, BOOK: count } })
      const englishMetadata = await english.build('en', 'figure')
      assert.deepEqual(englishMetadata.title, { absolute: count ? 'Figure (Descriptor): 5 Books Read' : 'Figure: Distinct identity' })
      assert.equal(englishMetadata.description, englishBio)
      assert.equal(englishMetadata.openGraph?.description, englishBio)
      assert.equal(englishMetadata.twitter?.description, englishBio)
      assert.deepEqual(english.calls, [])
    }
  }
})

test('localized fallback excludes Korean bio and preserves the complete English guide', async () => {
  const guide = 'The first sentence. The second sentence. The third sentence.'
  const { build } = load({ ...fixture, nickname: 'Figure', title: 'Writer', headline: 'Distinct identity', headline_en: 'Distinct identity', translationFallbacks: ['bio'], reading: { ...fixture.reading!, guide } })
  const metadata = await build('en', 'figure')
  assert.equal(metadata.description, guide)
  assert.equal(metadata.openGraph?.description, guide)
  const missing = load({ ...fixture, nickname: 'Figure', title: 'Writer', headline: 'Distinct identity', headline_en: 'Distinct identity', translationFallbacks: ['bio', 'personGuide'] })
  assert.equal((await missing.build('en', 'figure')).description, 'Figure: Distinct identity.')
})

test('source books only supplement a missing no-record title and never become appreciation counts', async () => {
  const { build, calls } = load({ ...fixture, headline: null })
  const metadata = await build('ko', 'figure')
  assert.deepEqual(calls, ['sources'])
  assert.deepEqual(metadata.title, { absolute: '인물, 《원전》의 등장인물' })
  assert.equal(metadata.description, fixture.bio)
})
