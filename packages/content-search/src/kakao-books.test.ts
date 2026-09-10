import assert from 'node:assert/strict'
import test, { before } from 'node:test'

let kakao: typeof import('./kakao-books')
before(async () => {
  const previousApiKey = process.env.KAKAO_REST_API_KEY
  process.env.KAKAO_REST_API_KEY = 'test-key'
  try {
    kakao = await import('./kakao-books')
  } finally {
    if (previousApiKey === undefined) delete process.env.KAKAO_REST_API_KEY
    else process.env.KAKAO_REST_API_KEY = previousApiKey
  }
})

test('카카오가 원제와 저자를 합친 제목에서 한국어 본제만 남긴다', () => {
  assert.equal(
    kakao.normalizeKakaoBookTitle('제인 오스틴의 멘스필드 공원 _ Mansfield Park by Jane Austen'),
    '제인 오스틴의 멘스필드 공원',
  )
  assert.equal(
    kakao.normalizeKakaoBookTitle('하루 24시간을 사는 법.How to Live on 24 Hours a Day, by Arnold Bennett'),
    '하루 24시간을 사는 법',
  )
  assert.equal(
    kakao.normalizeKakaoBookTitle('제인 에어, 샬럿 브론테: Jane Eyre - An Autobiography'),
    '제인 에어',
  )
  assert.equal(kakao.normalizeKakaoBookTitle('The Help. Kathryn Stockett'), 'The Help')
  assert.equal(kakao.normalizeKakaoBookTitle('Mr. China'), 'Mr. China')
  assert.equal(
    kakao.normalizeKakaoBookTitle('미시마 유키오 - 우국·한여름의 죽음 외 22편', '미시마 유키오'),
    '미시마 유키오 - 우국·한여름의 죽음 외 22편',
  )
})

test('카카오 저자명 뒤의 영문 병기와 물음표를 제거한다', () => {
  assert.equal(kakao.normalizeKakaoBookCreator(['제인 오스틴(Jane Austen？)'], []), '제인 오스틴')
  assert.equal(kakao.normalizeKakaoBookCreator(['제인 오스틴', '제인 오스틴'], []), '제인 오스틴')
  assert.equal(kakao.normalizeKakaoBookCreator(['샬럿 브론테 Charlotte Brontë'], []), '샬럿 브론테')
  assert.equal(kakao.normalizeKakaoBookCreator(['율리시스 S 그랜트&#40;Ulysses S Grant&#41;'], []), '율리시스 S 그랜트')
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
    kakao.parseDaumBookDescription(html),
    '첫 문단 & 설명.\n\n250자 뒤에 이어지는 둘째 문단과 결말.',
  )
})

test('책 소개 영역이 없으면 null을 반환한다', () => {
  assert.equal(kakao.parseDaumBookDescription('<main>소개 없음</main>'), null)
})

function bookResponse(isbn: string) {
  return Response.json({
    documents: [{
      title: '조회한 책', contents: 'API 소개', isbn,
      url: 'https://search.daum.net/search?w=bookpage&bookId=123',
      authors: ['저자'], translators: [], publisher: '출판사',
      datetime: '', thumbnail: '', status: '정상판매',
    }],
    meta: { total_count: 1, is_end: true },
  })
}

test('ISBN 검색의 첫 결과가 다른 판본이면 소개를 가져오지 않는다', async (t) => {
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => bookResponse('9788970446653'))
  assert.equal(await kakao.getBookByIsbnWithFullDescription('9788994228341'), null)
  assert.equal(fetchMock.mock.callCount(), 1)
})

test('ISBN-10과 ISBN-13이 같은 책이면 상세 소개를 사용한다', async (t) => {
  t.mock.method(globalThis, 'fetch', async (url: Parameters<typeof fetch>[0]) => {
    if (String(url).includes('dapi.kakao.com')) return bookResponse('8994228349 9788994228341')
    return new Response('<div class="info_desc"><p class="desc">API보다 길게 이어지는 상세 소개입니다.</p></div>')
  })
  const result = await kakao.getBookByIsbnWithFullDescription('8994228349')
  assert.equal(result?.book.metadata.isbn, '9788994228341')
  assert.equal(result?.book.metadata.description, 'API보다 길게 이어지는 상세 소개입니다.')
})

test('다음 상세 장애는 카카오 소개로 대체한다', async (t) => {
  t.mock.method(globalThis, 'fetch', async (url: Parameters<typeof fetch>[0]) => {
    if (String(url).includes('dapi.kakao.com')) return bookResponse('9788994228341')
    throw new Error('Daum timeout')
  })
  const result = await kakao.getBookByIsbnWithFullDescription('9788994228341')
  assert.equal(result?.book.metadata.description, 'API 소개')
  assert.equal(result?.fullDescription, null)
})

test('카카오 장애는 소개 없음으로 처리하지 않고 호출자에게 전달한다', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response('', { status: 503 }))
  await assert.rejects(kakao.getBookByIsbnWithFullDescription('9788994228341'), /503/)
})

test('ISBN이 아니거나 체크섬이 틀리면 조회하지 않는다', async (t) => {
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => { throw new Error('unexpected fetch') })
  assert.equal(await kakao.getBookByIsbnWithFullDescription('삼국지'), null)
  assert.equal(await kakao.getBookByIsbnWithFullDescription('9788994228342'), null)
  assert.equal(fetchMock.mock.callCount(), 0)
})
