import { test } from 'node:test'
import assert from 'node:assert/strict'
import { exactYes24Product, extractYes24Introduction, planYes24Introduction } from './yes24-book-introduction'
import { buildIntroductionApplySql, type IntroductionRow } from './book-description-sources-contract'

const isbn = '9788987244075'
const body = '명나라의 관료제와 정치 현실을 다루는 역사서입니다.'
const identity = `<th class="txt">ISBN13</th><td>${isbn}</td>`
const section = `<div id="infoset_introduce"><div><textarea class="txtContentText">${body}</textarea></div></div>`

test('extracts only the identified product introduction, excluding adjacent reviews', () => {
  assert.equal(extractYes24Introduction(identity + section + '<div><textarea class="txtContentText">독자 리뷰</textarea></div>', isbn), body)
  assert.equal(extractYes24Introduction(identity + '<div id="infoset_review"><textarea class="txtContentText">독자 리뷰</textarea></div>', isbn), null)
  assert.throws(() => extractYes24Introduction(section + isbn, isbn), /ISBN mismatch/)
  assert.throws(() => extractYes24Introduction(identity + section, '9788932014500'), /ISBN mismatch/)
})
test('rejects truncated, foreign-language and image-only introductions', () => {
  for (const replacement of ['소개 문구입니다...', '소개 문구입니다...,', 'This is an English book.', '<img src="a.jpg">']) {
    assert.equal(extractYes24Introduction(identity + section.replace(body, replacement), isbn), null)
  }
  assert.equal(extractYes24Introduction(identity + section.replace(body, '&lt;p&gt;'+body+'&lt;/p&gt;'), isbn), body)
})
test('accepts the explicitly headed publisher review, never member reviews or book excerpts', () => {
  const publisherBody = '새로운 집으로 이사한 주인공이 전 주인의 흔적과 감춰진 사건을 마주하는 소설입니다.'
  const publisher = `<div id="infoset_pubReivew"><div><h4 class="tit_txt">출판사 리뷰</h4></div><div><textarea class="txtContentText">${publisherBody}</textarea></div></div>`
  const adjacent = '<div id="infoset_inBook"><textarea class="txtContentText">책에서 발췌한 문장입니다.</textarea></div><div id="infoset_reivew"><h4>회원 리뷰</h4><textarea class="txtContentText">독자가 작성한 평가입니다.</textarea></div>'
  assert.equal(extractYes24Introduction(identity + publisher + adjacent, isbn), publisherBody)
  assert.equal(extractYes24Introduction(identity + publisher.replace('infoset_pubReivew', 'infoset_review'), isbn), publisherBody)
  for (const heading of ['회원 리뷰', '추천평', '책 속으로', '']) {
    assert.equal(extractYes24Introduction(identity + publisher.replace('출판사 리뷰', heading) + adjacent, isbn), null)
  }
  assert.equal(extractYes24Introduction(identity + adjacent, isbn), null)
})
test('combines complete Korean publisher sections and removes identical introductions', () => {
  const review = (text: string) => `<div id="infoset_pubReivew"><h4>출판사 <em>리뷰</em></h4><textarea class="txtContentText">${text}</textarea></div>`
  const extra = '당대의 역사적 조건 속에서 관료들이 내린 선택과 그 결과를 살펴봅니다.'
  assert.equal(extractYes24Introduction(identity + section + review(extra), isbn), `${body}\n\n${extra}`)
  assert.equal(extractYes24Introduction(identity + section + review(`<p>${body}</p>`), isbn), body)
  for (const invalid of ['소개가 이어집니다…', 'This is an English review.', '<img src="cover.jpg">']) {
    assert.equal(extractYes24Introduction(identity + section.replace(body, invalid) + review(extra), isbn), extra)
    assert.equal(extractYes24Introduction(identity + section + review(invalid), isbn), body)
  }
})
test('keeps section boundaries despite div-like source text, comments and scripts', () => {
  const fake = `<div id="infoset_pubReivew"><h4>출판사 리뷰</h4><textarea class="txtContentText">잘못된 구획의 가짜 소개입니다.</textarea></div>`
  const ignored = `<!-- ${fake} --><script>${fake}</script><style>${fake}</style><textarea>${fake}</textarea>`
  assert.equal(extractYes24Introduction(identity + ignored, isbn), null)
  const balanced = section.replace(body, `<!-- </div> -->${body}<div>추가 본문을 담은 문장입니다.</div>`)
  assert.equal(extractYes24Introduction(identity + ignored + balanced, isbn), `${body} 추가 본문을 담은 문장입니다.`)
  assert.throws(() => extractYes24Introduction(identity + section.slice(0, -6), isbn), /Unclosed YES24/)
  const fakeArea = '<!-- <textarea class="txtContentText">잘못된 소개 문장입니다.</textarea> -->'
  assert.equal(extractYes24Introduction(identity + section.replace('<div><textarea', `<div>${fakeArea}<textarea`), isbn), body)
})
test('API match requires exact ISBN and canonical URL but permits out-of-print books', () => {
  const item = { isbn13: isbn, itemId: 12055, goodsType: '도서', itemStatus: '절판', link: 'https://www.yes24.com/product/goods/12055' }
  const response = (value: unknown) => ({ success: true, data: { items: [value] } })
  assert.equal(exactYes24Product(response(item), isbn), item.link)
  assert.equal(exactYes24Product(response({...item, isbn13: '9788932014500'}), isbn), null)
  assert.equal(exactYes24Product(response({...item, link: 'https://example.com'}), isbn), null)
})
test('only fills empty same-edition Korean rows, preserves metadata, and uses CAS SQL', () => {
  const row: IntroductionRow = { content_id: 'a', locale: 'ko', title: '명나라', creator: '레이 황', publisher: null, isbn, description: null, sources: { primary: 'kakao', description_translation: 'old' } }
  const result = { isbn, title: '명나라', author: '레이 황 저', sourceUrl: 'https://www.yes24.com/product/goods/12055', description: body, reason: 'verified-introduction' }
  const change = planYes24Introduction('content_locales', row, result)!
  assert.equal(change.description, body)
  assert.deepEqual(change.sources, { primary: 'kakao', description: result.sourceUrl })
  assert.equal(planYes24Introduction('content_locales', {...row, description: '기존 소개'}, result), null)
  assert.equal(planYes24Introduction('content_locales', {...row, locale: 'en'}, result), null)
  assert.equal(planYes24Introduction('content_locales', {...row, isbn: '9788932014500'}, result), null)
  assert.equal(planYes24Introduction('content_locales', {...row, title: '다른 작품'}, result), null)
  assert.equal(planYes24Introduction('content_locales', {...row, creator: '다른 작가'}, result), null)
  const sql = buildIntroductionApplySql('a', [change])
  assert.match(sql, /Book introduction changed concurrently/)
  assert.match(sql, /jsonb_build_object/)
})
