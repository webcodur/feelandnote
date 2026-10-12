import test from 'node:test'
import assert from 'node:assert/strict'
import { reviewedBookWorkSelectionReason, reviewedBookEditionSelectionReason } from './book-edition-policy'

function fixture() {
  return { contentId: 'work', metadata: { figureBook: {
    workTitle: 'Actual illustrated story', workCreator: 'Actual writer', workIdentity: 'actual-writer/actual-story',
    workSelectionEvidence: [{ method: 'independent_work_selection_review', content_id: 'work',
      work_title: 'Actual illustrated story', work_creator: 'Actual writer', work_identity: 'actual-writer/actual-story',
      reason: 'children_picture', source_url: 'https://publisher.example/actual-story',
      explanation: 'The LLM read the publisher body and confirmed this original is a picture book for early primary readers.' }],
  } } }
}

test('ISBN 없는 실재 그림책도 현재 작품에 묶은 독립 판정으로 제외하며 입력을 바꾸지 않는다', () => {
  const input = fixture(), before = structuredClone(input)
  assert.equal(reviewedBookWorkSelectionReason(input), 'children_picture')
  assert.deepEqual(input, before)
  assert.equal(reviewedBookEditionSelectionReason({ contentId: 'work', locale: 'en', title: 'Actual illustrated story', isbn: null }), null)
})

test('작품 ID·원작 제목·저자·정체성이 바뀌면 옛 선정 근거가 전파되지 않는다', () => {
  for (const field of ['workTitle', 'workCreator', 'workIdentity'] as const) {
    const input = fixture(); input.metadata.figureBook[field] = 'Different work'
    assert.equal(reviewedBookWorkSelectionReason(input), null)
  }
  assert.equal(reviewedBookWorkSelectionReason({ ...fixture(), contentId: 'another-work' }), null)
})

test('정체성 키 없는 기존 원작도 명시 제목·저자 앵커로 판정하되 임의 정체성 키는 거부한다', () => {
  const original = fixture()
  const { workIdentity: _identity, ...withoutIdentity } = original.metadata.figureBook
  const input = { ...original, metadata: { figureBook: { ...withoutIdentity, workSelectionEvidence: withoutIdentity.workSelectionEvidence.map(proof => ({ ...proof, work_identity: proof.work_identity as string | undefined })) } } }
  assert.equal(reviewedBookWorkSelectionReason(input), null)
  input.metadata.figureBook.workSelectionEvidence[0].work_identity = undefined
  assert.equal(reviewedBookWorkSelectionReason(input), 'children_picture')
})

test('제목의 그림책 단어·나이 표시만으로 정상 성인 저작을 기계 제외하지 않는다', () => {
  assert.equal(reviewedBookWorkSelectionReason({ contentId: 'normal', metadata: { figureBook: {
    workTitle: '그림책 미술 연구', workCreator: 'Adult art critic', audience: '8–12',
  } } }), null)
})

test('언어·한 상품의 오귀속을 원작 전체의 선정 제외로 확장하지 않는다', () => {
  for (const reason of ['wrong_locale', 'wrong_work', 'abridged', 'unverified_placeholder']) {
    const input = fixture(); input.metadata.figureBook.workSelectionEvidence[0].reason = reason
    assert.equal(reviewedBookWorkSelectionReason(input), null)
  }
})

test('원문을 읽은 판정과 공개 독립 URL을 요구하며 조회 실패·빈 근거는 정상 판정으로 쓰지 않는다', () => {
  for (const source of ['http://publisher.example/actual-story', 'https://openlibrary.org/books/OL1M', 'https://openlibrary.org./books/OL1M',
    'https://user:pass@publisher.example/book', 'https://localhost/book', 'https://publisher.example/book?api_key=secret']) {
    const input = fixture(); input.metadata.figureBook.workSelectionEvidence[0].source_url = source
    assert.equal(reviewedBookWorkSelectionReason(input), null)
  }
  const input = fixture(); input.metadata.figureBook.workSelectionEvidence[0].explanation = 'HTTP 404'
  assert.equal(reviewedBookWorkSelectionReason(input), null)
  assert.equal(reviewedBookWorkSelectionReason({ contentId: 'work', metadata: null }), null)
})
