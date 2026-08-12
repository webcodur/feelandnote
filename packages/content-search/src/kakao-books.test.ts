import assert from 'node:assert/strict'
import test from 'node:test'

import { parseDaumBookDescription } from './kakao-books'

test('다음 책 상세의 여러 문단 전체를 소개로 복원한다', () => {
  const html = `
    <div class="info_desc">
      <p class="desc">
        첫 문단 &amp; 설명.<br><br><br><br>
        250자 뒤에 이어지는 둘째 문단과 결말.
      </p>
      <div class="cp_comp">출처</div>
    </div>
  `

  assert.equal(
    parseDaumBookDescription(html),
    '첫 문단 & 설명.\n\n250자 뒤에 이어지는 둘째 문단과 결말.',
  )
})

test('책 소개 영역이 없으면 null을 반환한다', () => {
  assert.equal(parseDaumBookDescription('<main>소개 없음</main>'), null)
})
