import { test } from 'node:test'
import assert from 'node:assert/strict'
import { celebTitleIssues, findCelebDuplicates, findCelebDuplicatePairs, normalizeCelebTitleAction } from './celeb-identity'

test('공개·비공개 모두 같은 사람의 중복 등록을 막고 자기 자신은 제외한다', () => {
  const rows = [
    { id: 'published', nickname: '같은 인물', wikidata_qid: 'Q123', publication_status: 'active' },
    { id: 'unpublished', nickname: '같은 인물', wikidata_qid: 'Q123', publication_status: 'inactive' },
    { id: 'other', nickname: '다른 인물', wikidata_qid: 'Q456', publication_status: 'active' },
  ]
  const matches = findCelebDuplicates({ id: 'published', wikidata_qid: 'Q123' }, rows)
  assert.deepEqual(matches.map(match => match.row.id), ['unpublished'])
  assert.equal(matches[0].strong, true)
  const pairs = findCelebDuplicatePairs(rows)
  assert.equal(pairs.length, 1)
  assert.deepEqual([pairs[0].a.id, pairs[0].b.id], ['published', 'unpublished'])
  assert.equal(pairs[0].strong, true)
})

test('대상이 있는 창시·개발·설립 표기를 통일하고 저장 오류로 잡는다', () => {
  for (const [before, after] of [
    ['유닉스 공동 개발자', '유닉스 개발'],
    ['레일즈 창시자', '레일즈 창시'],
    ['미적분학의 공동 창시자', '미적분학 창시'],
    ['신플라톤주의 창시자', '신플라톤주의 창시'],
    ['신플라톤주의의 창시자', '신플라톤주의 창시'],
    ['구글 공동창업자', '구글 설립'],
    ['구글의 공동 설립자', '구글 설립'],
    ['구글 창업주', '구글 설립'],
    ['구글 창립', '구글 설립'],
    ['구글 공동설립', '구글 설립'],
    ['유닉스 공동 개발', '유닉스 개발'],
    ['리눅스의 창시', '리눅스 창시'],
  ]) {
    assert.equal(normalizeCelebTitleAction(before), after)
    assert.ok(celebTitleIssues({ title: before }).some(issue => issue.level === 'error'))
    assert.ok(!celebTitleIssues({ title: after }).some(issue => issue.level === 'error'))
    assert.equal(normalizeCelebTitleAction(after), after)
  }
})

test('직함·통용 칭호·창업자금은 그대로 둔다', () => {
  for (const title of ['수석 개발자', '비트코인 전 수석 개발자', '핵심 개발자', '총설계자', '창업자금 조달', '웨이모 공동대표', '개발자', '세기의 경영자']) {
    assert.equal(normalizeCelebTitleAction(title), title)
    assert.ok(!celebTitleIssues({ title }).some(issue => issue.level === 'error'))
  }
})
