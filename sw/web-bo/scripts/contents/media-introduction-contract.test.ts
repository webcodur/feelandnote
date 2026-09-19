import { test } from 'node:test'
import assert from 'node:assert/strict'
import { prepareMediaIntroduction, mediaIntroductionSql, mediaIntroductionBatchSql, mediaIntroductionText, type ReviewedMediaIntroduction } from './media-introduction-contract'

const input: ReviewedMediaIntroduction = {
  content: { id: 'test', type: 'VIDEO', external_source: 'tmdb', external_id: 'tmdb-movie-123' },
  target: { content_id: 'test', locale: 'en', title: 'A Film', creator: 'Director', publisher: null, isbn: null, description: null, sources: { primary: 'tmdb', introMissing: true } },
  description: "The film follows a traveler and his family.", sourceUrl: 'https://www.themoviedb.org/movie/123',
  method: 'provider', sourceLocale: 'en', identityEvidence: [{ url: 'https://www.themoviedb.org/movie/123', note: 'ID and title match' }],
}
test('preserves provenance and only clears obsolete missing-intro state', () => {
  const result = prepareMediaIntroduction(input)
  assert.equal(result.sources.primary, 'tmdb')
  assert.equal(result.sources.description, input.sourceUrl)
  assert.equal(result.sources.introMissing, undefined)
})
test('rejects wrong TMDB work, locale, existing text, unsafe URLs and absent evidence', () => {
  assert.throws(() => prepareMediaIntroduction({ ...input, sourceUrl: 'https://www.themoviedb.org/movie/124' }), /identity/)
  assert.throws(() => prepareMediaIntroduction({ ...input, sourceLocale: 'ko' }), /locale/)
  assert.throws(() => prepareMediaIntroduction({ ...input, target: { ...input.target, description: 'Existing' } }), /already filled/)
  assert.throws(() => prepareMediaIntroduction({ ...input, sourceUrl: 'https://www.themoviedb.org.evil.test/movie/123' }), /source URL/)
  assert.throws(() => prepareMediaIntroduction({ ...input, identityEvidence: [] }), /evidence/)
})
test('transaction locks external identity and checks the entire reviewed locale snapshot', () => {
  const sql = mediaIntroductionSql({ ...input, description: "The director's family and the $media_introduction$ journey." })
  assert.match(sql, /external_source IS NOT DISTINCT FROM 'tmdb' FOR SHARE/)
  assert.match(sql, /jsonb_build_object\('description',description,'sources',sources,'isbn',isbn/)
  assert.match(sql, /director''s/)
  assert.match(sql, /DO \$media_introduction_x\$/)
  assert.match(sql, /changed <> 1/)
})
test('translations retain the original source and require an original in the other language', () => {
  const translated: ReviewedMediaIntroduction = { ...input, target: { ...input.target, locale: 'ko' },
    description: '영화는 한 여행자와 가족의 이야기를 다룬다.', method: 'translation', sourceLocale: 'en', sourceText: input.description }
  const result = prepareMediaIntroduction(translated)
  assert.equal(result.sources.description, input.sourceUrl)
  assert.equal(result.sources.description_method, 'translation')
  assert.equal(result.sources.description_source_locale, 'en')
  assert.throws(() => prepareMediaIntroduction({ ...translated, sourceText: undefined }), /locale/)
  assert.throws(() => prepareMediaIntroduction({ ...translated, sourceLocale: 'ko' }), /locale/)
})
test('a translation without recorded source provenance keeps sources.description unset and needs no evidence', () => {
  const orphan: ReviewedMediaIntroduction = {
    content: { id: 'm1', type: 'MUSIC', external_source: 'itunes', external_id: 'itunes-1' },
    target: { content_id: 'm1', locale: 'en', title: 'A Song', creator: 'Singer', publisher: null, isbn: null, description: null, sources: { primary: 'itunes' } },
    description: 'The song deals with a traveler and his family on a long journey through the mountains.', sourceUrl: null,
    method: 'translation', sourceLocale: 'ko', sourceText: '이 노래는 한 여행자와 그의 가족이 산을 넘어 긴 여정을 떠나는 이야기를 다루고 있다.', identityEvidence: [] }
  const result = prepareMediaIntroduction(orphan)
  assert.equal(result.sources.description, undefined)
  assert.equal(result.sources.description_method, 'translation')
  assert.throws(() => prepareMediaIntroduction({ ...orphan, method: 'provider', sourceLocale: 'en' }), /source URL/)
  assert.throws(() => prepareMediaIntroduction({ ...orphan, description: "The song deals with a traveler's kin.", sourceUrl: 'https://example.org/x' }), /source URL|evidence/)
})
test('a batch has one transaction and cannot contain the same locale twice', () => {
  const second = { ...input, target: { ...input.target, locale: 'ko' as const }, sourceLocale: 'ko' as const,
    description: '한 여행자와 가족의 이야기를 다루는 영화다.' }
  const sql = mediaIntroductionBatchSql([input, second])
  assert.equal(sql.match(/^BEGIN;/gm)?.length, 1)
  assert.equal(sql.match(/^COMMIT;/gm)?.length, 1)
  assert.throws(() => mediaIntroductionBatchSql([input, input]), /duplicate/)
  assert.throws(() => mediaIntroductionBatchSql([]), /Empty/)
})
test('legacy rows with provider-prefixed external_id and null external_source pass with an IS NOT DISTINCT FROM check', () => {
  const legacy: ReviewedMediaIntroduction = { ...input,
    content: { ...input.content, external_source: null } }
  const sql = mediaIntroductionSql(legacy)
  assert.match(sql, /external_source IS NOT DISTINCT FROM NULL FOR SHARE/)
  assert.throws(() => prepareMediaIntroduction({ ...input, content: { ...input.content, external_source: undefined as unknown as null } }), /identity/)
})
test('Korean prose can contain long original artist and label names; a Korean name alone is not Korean prose', () => {
  const text = 'Boat는 영국 싱어송라이터 Ed Sheeran의 노래이다. Asylum과 Atlantic Records를 통해 발매되었다. Sheeran은 프로듀서 Aaron Dessner와 함께 이 곡을 썼다.'
  assert.equal(mediaIntroductionText(text, 'ko'), text)
  assert.equal(mediaIntroductionText('BTS 방탄소년단 is a Korean group. The song is from their album.', 'ko'), null)
})
