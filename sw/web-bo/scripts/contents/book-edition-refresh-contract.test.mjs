import assert from 'node:assert/strict'
import test from 'node:test'
import { buildKakaoEditionReplacement } from './book-edition-refresh-contract.mjs'

const stored = { title: '부의 설계자들', creator: '지미 소니' }
const response = { isbn: '9781501197260', title: '부의 설계자들', authors: ['지미 소니'], translators: ['로브 굿맨'], publisher: '위즈덤하우스', thumbnail: '', status: '정상판매' }

test('캐시한 교체 후보라도 다른 ISBN·다른 저자·제목 포함관계만으로 통과하지 못한다', () => {
  assert.throws(() => buildKakaoEditionReplacement(stored, '9781476766683', response), /ISBN/)
  assert.throws(() => buildKakaoEditionReplacement(stored, response.isbn, { ...response, authors: ['로브 굿맨'] }), /원저자/)
  assert.throws(() => buildKakaoEditionReplacement(stored, response.isbn, { ...response, title: '부의 설계자들 해설서' }), /제목/)
})

test('상품 코드·저자 누락·역자만 있는 응답으로 판본을 바꾸지 않는다', () => {
  assert.throws(() => buildKakaoEditionReplacement(stored, '4808952741950', { ...response, isbn: '4808952741950' }), /ISBN/)
  assert.throws(() => buildKakaoEditionReplacement(stored, response.isbn, { ...response, authors: [] }), /원저자/)
})

test('새 판본 표지가 없을 때 옛 판본 표지를 섞지 않는다', () => {
  assert.deepEqual(buildKakaoEditionReplacement(stored, response.isbn, response), { isbn: '9781501197260', title: '부의 설계자들', creator: '지미 소니', publisher: '위즈덤하우스', thumbnail_url: null })
})
