import assert from 'node:assert/strict'
import test from 'node:test'
import { buildFactionDescription, buildFactionTitle, buildMythDescription, buildMythTitle } from './atlasMeta'

const odyssey = {
  name: '오디세이아',
  headline: '트로이 전쟁 영웅 오디세우스의 10년 귀향길',
  description: '트로이가 무너진 뒤에도 오디세우스는 바다를 벗어나지 못한다. 외눈 거인 폴리페모스의 눈을 찔러 바다의 저주를 산 그는 십 년 동안 낯선 섬들을 맴돈다.',
  leads: ['오디세우스', '페넬로페', '텔레마코스'],
  memberCount: 56,
  groups: ['이타카의 사람들', '길에서 만난 존재들'],
}

test('신화 제목은 이름과 「줄거리와 등장인물」이다', () => {
  assert.equal(buildMythTitle(odyssey, 'ko'), '오디세이아 줄거리와 등장인물')
  assert.equal(buildMythTitle({ name: 'The Odyssey' }, 'en'), 'The Odyssey: Story and Characters')
})

test('신화 설명은 한 줄 정의에 이어 「만나 보세요!」로 끝나고 숫자·「봅니다」·「…」가 없다', () => {
  const ko = buildMythDescription(odyssey, 'ko')
  assert.equal(ko, '트로이 전쟁 영웅 오디세우스의 10년 귀향길. 이타카의 사람들, 길에서 만난 존재들로 나눠 만나 보세요!')
  assert.doesNotMatch(ko, /…|봅니다|56/)
  assert.equal(
    buildMythDescription({ ...odyssey, name: 'The Odyssey', headline: "Odysseus's ten-year voyage home from Troy", description: null, leads: ['Odysseus', 'Penelope', 'Telemachus'], groups: ['The People of Ithaca', 'Beings on the Road'] }, 'en'),
    "Odysseus's ten-year voyage home from Troy. Meet the characters, grouped into The People of Ithaca and Beings on the Road!",
  )
})

test('그룹이 사람이 아닌 이름이면 「나뉜 등장인물을」로 잇는다', () => {
  assert.equal(
    buildMythDescription({ ...odyssey, groups: ['창세의 신들', '다카마가하라의 신들', '이즈모의 신들', '그 밖의 신'] }, 'ko'),
    '트로이 전쟁 영웅 오디세우스의 10년 귀향길. 창세의 신들, 다카마가하라의 신들, 이즈모의 신들 등으로 나눠 만나 보세요!',
  )
  assert.equal(
    buildMythDescription({ ...odyssey, groups: ['태초', '인간의 시대'] }, 'ko'),
    '트로이 전쟁 영웅 오디세우스의 10년 귀향길. 태초, 인간의 시대로 나뉜 등장인물을 만나 보세요!',
  )
})

test('한 줄 정의가 없으면 이름과 소개글의 끝난 문장으로 시작한다', () => {
  assert.equal(buildMythDescription({ ...odyssey, headline: null }, 'ko'), '오디세이아. 트로이가 무너진 뒤에도 오디세우스는 바다를 벗어나지 못한다. 외눈 거인 폴리페모스의 눈을 찔러 바다의 저주를 산 그는 십 년 동안 낯선 섬들을 맴돈다.')
})

const paypal = {
  name: '페이팔 마피아',
  headline: '유튜브·링크드인·팔란티어를 함께 세운 옛 동료들',
  description: null,
  leads: ['피터 틸', '일론 머스크', '맥스 레브친'],
  memberCount: 14,
  isFiction: false,
  groups: ['공동 창업자', '초기 경영진', '엔지니어·디자이너'],
}

test('세력 제목은 「이름: 대표 2명 등」이고 인원을 싣지 않으며 폭을 넘으면 줄인다', () => {
  assert.equal(buildFactionTitle(paypal, 'ko'), '페이팔 마피아: 피터 틸·일론 머스크 등')
  assert.equal(buildFactionTitle({ ...paypal, name: '홍길동전', leads: ['홍길동', '홍판서'], memberCount: 5, isFiction: true }, 'ko'), '홍길동전 등장인물: 홍길동·홍판서 등')
  const long = buildFactionTitle({ ...paypal, name: '제2차 세계대전의 영국과 자유 프랑스', leads: ['윈스턴 처칠', '조지 6세'], memberCount: 17 }, 'ko')
  assert.ok(!long.includes('조지 6세') && !/\d+명/.test(long), long)
  assert.equal(buildFactionTitle({ ...paypal, name: 'PayPal Mafia', leads: ['Peter Thiel', 'Elon Musk'] }, 'en'), 'PayPal Mafia: Peter Thiel, Elon Musk and Others')
  // 세력 이름과 같은 사람은 제목에서 되풀이하지 않는다
  assert.equal(buildFactionTitle({ ...paypal, name: '임꺽정', leads: ['임꺽정', '서림', '박유복'], memberCount: 8, isFiction: true }, 'ko'), '임꺽정 등장인물: 서림·박유복 등')
})

test('세력 설명은 한 줄 정의 + 그룹 나열로 「만나 보세요!」다', () => {
  assert.equal(buildFactionDescription(paypal, 'ko'), '유튜브·링크드인·팔란티어를 함께 세운 옛 동료들. 공동 창업자, 초기 경영진, 엔지니어·디자이너로 나눠 만나 보세요!')
  assert.equal(
    buildFactionDescription({ ...paypal, name: 'PayPal Mafia', headline: 'Former colleagues who went on to found YouTube, LinkedIn and Palantir', leads: ['Peter Thiel', 'Elon Musk', 'Max Levchin'], groups: ['Co-founders', 'Early Executives', 'Engineers & Designers'] }, 'en'),
    'Former colleagues who went on to found YouTube, LinkedIn and Palantir. Meet the members, grouped into Co-founders, Early Executives and Engineers & Designers!',
  )
})

test('그룹 이름이 사람을 가리키면 「인물들」을 겹치지 않고 「…로 나눠」로 끝낸다', () => {
  assert.equal(
    buildFactionDescription({ ...paypal, name: 'OpenAI', headline: 'ChatGPT로 생성형 AI 시대를 연 연구소의 사람들', leads: ['샘 올트먼', '그렉 브록만'], groups: ['지도부', '연구진', '떠난 인물'], memberCount: 9 }, 'ko'),
    'ChatGPT로 생성형 AI 시대를 연 연구소의 사람들. 지도부, 연구진, 떠난 인물로 나눠 만나 보세요!',
  )
})

test('그룹이 없으면 아직 부르지 않은 사람으로 「…도 만나 보세요!」를 잇는다', () => {
  assert.equal(
    buildFactionDescription({ ...paypal, name: 'HYBE', headline: '방탄소년단의 성공을 엔터테인먼트 제국으로 키운 방시혁', leads: ['방시혁', 'RM', '슈가', '정국'], memberCount: 30, groups: [] }, 'ko'),
    '방탄소년단의 성공을 엔터테인먼트 제국으로 키운 방시혁. 슈가·정국도 만나 보세요!',
  )
  // 부른 사람이 하나도 없으면 이름을 받는다 — 제목이 「주요 인물」로 줄어든 긴 이름처럼
  assert.equal(
    buildFactionDescription({ ...paypal, name: '오스트레일리아 대륙을 누빈 개척자들의 긴 이름', headline: '난세의 맞수들', leads: ['다케다 신겐', '다테 마사무네', '미야모토 무사시', '우에스기 겐신'], memberCount: 8, groups: [] }, 'ko'),
    '난세의 맞수들. 다케다 신겐·다테 마사무네·미야모토 무사시 등 오스트레일리아 대륙을 누빈 개척자들의 긴 이름의 인물들을 만나 보세요!',
  )
})

test('이야기 속 세력은 「등장인물」로 부른다', () => {
  assert.equal(
    buildFactionDescription({ ...paypal, name: '홍길동전', headline: '서자 차별에 맞서 활빈당을 이끈 의적의 이야기', leads: ['홍길동', '홍판서', '홍인형'], memberCount: 5, isFiction: true, groups: [] }, 'ko'),
    '서자 차별에 맞서 활빈당을 이끈 의적의 이야기. 홍인형도 만나 보세요!',
  )
})
