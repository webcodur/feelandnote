import assert from 'node:assert/strict'
import test from 'node:test'
import { CONTEXT_ANCHORS, findContextAnchorKeys, profileContextText } from './context-anchors'
import { CONTEXT_BOOK_POOL, contextBook } from './context-book-pool'

function profile(value: string): string[] {
  return findContextAnchorKeys(profileContextText(value), 'profile')
}

function book(value: string): string[] {
  return findContextAnchorKeys(value, 'book')
}

test('인물의 역할명은 조사와 함께 있어도 분야 맥락으로 잡는다', () => {
  assert(profile('의사로 활동했다').includes('medicine'))
  assert(profile('영화 배우이자 연기자다').includes('acting'))
  assert(profile('영화배우로 활동했다').includes('acting'))
  assert(profile('화가로서 유럽에서 활동했다').includes('painting'))
})

test('다른 단어 안에 든 의사·화가·사이클은 책 분야로 오인하지 않는다', () => {
  assert(!book('의사소통 행위 이론').includes('medicine'))
  assert(!book('소비자 의사결정').includes('medicine'))
  assert(!book('교회교의학').includes('medicine'))
  assert(!book('지상 최대의 쇼: 진화가 펼쳐낸 경이로운 세계').includes('painting'))
  assert(!book('해커와 화가').includes('painting'))
  assert(!book('선과 모터사이클 관리술').includes('cycling'))
  assert(!book('마켓 사이클의 법칙').includes('cycling'))
})

test('책 자체가 분야를 명시하면 해당 맥락을 유지한다', () => {
  assert(book('현대 의학의 역사').includes('medicine'))
  assert(book('서양미술사: 회화를 읽는 법').includes('painting'))
  assert(book('자전거 여행과 사이클링').includes('cycling'))
  assert(book('스크린 연기의 비밀').includes('acting'))
  assert(book('영화 제작의 모든 것').includes('film'))
  assert(book('영화를 만든다는 것').includes('film'))
  assert(book('시네마토그라프에 대한 노트').includes('film'))
  assert(book('예술로서의 영화').includes('film'))
})

test('수상명과 비분야 철학 표현은 인물의 활동 분야로 쓰지 않는다', () => {
  assert(!profile('노벨물리학상을 받은 인공지능 연구자').includes('physics'))
  assert(profile('노벨물리학상을 받은 인공지능 연구자').includes('artificial-intelligence'))
  assert(!profile('통치철학을 세운 촉한의 군주').includes('philosophy'))
  assert(!profile('공격적인 축구 철학을 만든 감독').includes('philosophy'))
  assert(!profile('아테네 학당에 철학자들을 모은 화가').includes('philosophy'))
  assert(profile('윤리학을 연구한 철학자').includes('philosophy'))
})

test('육상 일반과 장거리 달리기를 구분한다', () => {
  assert(profile('올림픽 단거리 육상 선수').includes('athletics'))
  assert(!profile('올림픽 단거리 육상 선수').includes('distance-running'))
  assert(profile('마라톤과 장거리 달리기 선수').includes('distance-running'))
})

test('대표책 풀은 중복 없이 알려진 맥락만 가리킨다', () => {
  const ids = CONTEXT_BOOK_POOL.map((item) => item.contentId)
  assert.equal(new Set(ids).size, ids.length)
  const knownKeys = new Set(CONTEXT_ANCHORS.map((item) => item.key))
  for (const item of CONTEXT_BOOK_POOL) {
    assert(item.contextKeys.length > 0, `${item.title}: 맥락이 비었습니다`)
    for (const key of item.contextKeys) assert(knownKeys.has(key), `${item.title}: 알 수 없는 맥락 ${key}`)
  }
  assert.equal(contextBook('0925e1cc-92c1-4b74-b691-f125bde6ccde')?.title, '손자병법')
})

test('역할 단어가 비유나 별명이어도 직군이 다르면 분야 후보로 쓰지 않는다', () => {
  const xavi = profileContextText('스페인 대표팀의 중원 사령관인 축구 선수')
  assert(findContextAnchorKeys(xavi, 'profile', 'athlete').includes('football'))
  assert(!findContextAnchorKeys(xavi, 'profile', 'athlete').includes('military-strategy'))
  assert(findContextAnchorKeys('야전군 사령관', 'profile', 'commander').includes('military-strategy'))
})

test('대중음악·LoL 맥락을 클래식·다른 e스포츠와 섞지 않는다', () => {
  assert(findContextAnchorKeys('팝 가수이자 싱어송라이터', 'profile', 'musician').includes('popular-music'))
  assert(!findContextAnchorKeys('고전음악 작곡가', 'profile', 'musician').includes('popular-music'))
  assert(findContextAnchorKeys('리그 오브 레전드 프로게이머', 'profile', 'athlete').includes('league-of-legends'))
  assert(!findContextAnchorKeys('스타크래프트 프로게이머', 'profile', 'athlete').includes('league-of-legends'))
})
