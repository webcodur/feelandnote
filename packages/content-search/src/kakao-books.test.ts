import assert from 'node:assert/strict'
import test from 'node:test'

import {
  normalizeKakaoBookCreator,
  normalizeKakaoBookTitle,
  parseDaumBookDescription,
} from './kakao-books'

test('카카오가 원제와 저자를 합친 제목에서 한국어 본제만 남긴다', () => {
  assert.equal(
    normalizeKakaoBookTitle('제인 오스틴의 멘스필드 공원 _ Mansfield Park by Jane Austen'),
    '제인 오스틴의 멘스필드 공원',
  )
  assert.equal(
    normalizeKakaoBookTitle('하루 24시간을 사는 법.How to Live on 24 Hours a Day, by Arnold Bennett'),
    '하루 24시간을 사는 법',
  )
  assert.equal(
    normalizeKakaoBookTitle('제인 에어, 샬럿 브론테: Jane Eyre - An Autobiography'),
    '제인 에어',
  )
  assert.equal(normalizeKakaoBookTitle('The Help. Kathryn Stockett'), 'The Help')
  assert.equal(normalizeKakaoBookTitle('Mr. China'), 'Mr. China')
  assert.equal(
    normalizeKakaoBookTitle('미시마 유키오 - 우국·한여름의 죽음 외 22편', '미시마 유키오'),
    '미시마 유키오 - 우국·한여름의 죽음 외 22편',
  )
})

test('카카오 저자명 뒤의 영문 병기와 물음표를 제거한다', () => {
  assert.equal(normalizeKakaoBookCreator(['제인 오스틴(Jane Austen？)'], []), '제인 오스틴')
  assert.equal(normalizeKakaoBookCreator(['제인 오스틴', '제인 오스틴'], []), '제인 오스틴')
  assert.equal(normalizeKakaoBookCreator(['샬럿 브론테 Charlotte Brontë'], []), '샬럿 브론테')
  assert.equal(normalizeKakaoBookCreator(['율리시스 S 그랜트&#40;Ulysses S Grant&#41;'], []), '율리시스 S 그랜트')
})

test('다음 책 상세의 여러 문단 전체를 소개로 복원한다', () => {
  const html = `
    <div class="info_desc">
      <p class="desc">
        첫 문단 &amp; 설명.<br><br><br><br>
        250자 뒤에 이어지는 둘째 문단과 결말.
        <a href="javascript:;" class="more_comm2">
          <span>더보기</span><span class="ico_rwd ico_bot_s"></span>
        </a>
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
