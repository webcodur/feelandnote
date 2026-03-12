/**
 * BookRecommend TTS 생성 (마스터 대본 v5)
 * 사용법: node scripts/generate-voice.mjs
 *
 * 도서 나레이터 오디오를 제목+저자 / 설명으로 분리 생성.
 */

import textToSpeech from '@google-cloud/text-to-speech'
import { writeFile, mkdir } from 'fs/promises'
import mp3Duration from 'mp3-duration'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT_DIR = path.join(__dirname, '..', 'public', 'voice')
const CREDENTIALS_PATH = path.join(__dirname, '..', '..', '..', 'ga-credentials.json')

const client = new textToSpeech.TextToSpeechClient({
  keyFilename: CREDENTIALS_PATH,
})

const MALE_VOICE = { languageCode: 'ko-KR', name: 'ko-KR-Wavenet-C', ssmlGender: 'MALE' }
const FEMALE_VOICE = { languageCode: 'ko-KR', name: 'ko-KR-Wavenet-A', ssmlGender: 'FEMALE' }
const MALE_AUDIO = { audioEncoding: 'MP3', sampleRateHertz: 44100, speakingRate: 0.95, pitch: -1.0 }
const FEMALE_AUDIO = { audioEncoding: 'MP3', sampleRateHertz: 44100, speakingRate: 0.95, pitch: 0.0 }

// --- Section 1: 나레이터 — 이름 + bio ---
const narratorCelebIntro =
  '일론 머스크. 남아프리카 출신의 기업가이자 투자자. 테슬라, 스페이스X 등으로 전기차와 우주 탐사의 패러다임을 전환하고 있다.'

// --- Section 2: 셀럽 인사 + 감상철학 ---
const philosophy =
  '안녕하세요, 일론 머스크입니다. 공상과학 소설은 제 예언서였습니다. 파운데이션을 읽고 SpaceX를 세웠고, 히치하이커를 읽고 질문하는 법을 배웠습니다. 테슬라, 뉴럴링크, 스타링크, 모두 책에서 시작된 프로젝트입니다. 책은 제게 가장 위대한 멘토입니다.'

// --- Section 6/7: 나레이터 아웃트로 ---
const narratorOutro =
  '일론 머스크의 세계를 확장시킨 3권의 책이었습니다. 그의 더 깊은 이야기와 세상을 바꾼 또 다른 거장들의 서재가 궁금하신가요? 지금 바로 Feel and Note 앱에서 만나보세요.'

// --- 도서: 제목+저자 (title) / 설명 (desc) 분리 ---
const books = [
  {
    title: '<speak><emphasis level="strong">둠의 창조자들</emphasis>. <break time="400ms"/> <emphasis level="strong">데이비드 쿠쉬너</emphasis> 저.</speak>',
    desc: '1990년대 게임 산업의 혁명을 이끈 두 천재, 존 카맥과 존 로메로의 실화를 담은 논픽션입니다. id 소프트웨어에서 울펜슈타인 3D와 둠, 퀘이크를 만들어낸 과정을 추적하며, FPS 장르의 탄생과 게임 엔진 기술의 비약적인 발전이 어떻게 이루어졌는지를 생생하게 그려내고 있습니다.',
    narr: '이 책을 읽으면서 저는 계속 고개를 끄덕였습니다. 존 카맥이 차고에서 게임 엔진을 바닥부터 만들어낸 그 집착, 그 근본적인 문제 해결 방식. 저도 똑같았거든요. 스페이스X를 시작했을 때, 기존 로켓이 너무 비싸니까 직접 만들기로 했습니다. 아무것도 없는 곳에서 시작하는 것, 그게 진짜 혁신입니다. 그들이 엔진을 짠 것처럼, 저도 로켓을 바닥부터 만들었으니까요.',
  },
  {
    title: '<speak><emphasis level="strong">로마제국 쇠망사</emphasis>. <break time="400ms"/> <emphasis level="strong">에드워드 기번</emphasis> 저.</speak>',
    desc: '18세기 영국의 역사가 에드워드 기번이 집필한 서양 역사학의 기념비적 저작입니다. 전 6권으로 구성되어 있으며, 2세기 로마 제국의 전성기부터 1453년 동로마 제국의 멸망까지, 약 1300년에 걸친 문명의 흥망성쇠를 다루고 있습니다. 출간 이후 250년이 지난 지금까지도 역사서의 고전으로 널리 읽히고 있습니다.',
    narr: '이 책은 단순한 역사서가 아닙니다. 문명이 왜 무너지는가에 대한 가장 체계적인 분석이죠. 기번은 내부의 쇠퇴가 외부의 침략보다 더 치명적이었다고 말합니다. 저도 같은 관점입니다. 인류 문명이 하나의 행성에만 의존하고 있다는 것, 그 자체가 리스크입니다. 로마가 멸망한 것처럼 지구 문명도 영원하지 않습니다. 그래서 인류가 다행성 종이 되어야 합니다. 이 책을 읽으면 그 절박함을 이해하게 됩니다.',
  },
  {
    title: '<speak><emphasis level="strong">나쁜 과학 대처법</emphasis>. <break time="400ms"/> <emphasis level="strong">스티븐 노벨라</emphasis> 외 저.</speak>',
    desc: '예일대 의과대학 신경과 교수 스티븐 노벨라를 비롯한 다섯 명의 저자가 공동 집필한 과학적 사고의 입문서입니다. 인지 편향, 논리적 오류, 유사과학의 함정 등을 체계적으로 분석하며, 일상에서 비판적 사고를 실천하는 구체적인 방법을 제시합니다. 과학적 회의주의의 대중적 교과서로 평가받고 있습니다.',
    narr: '제가 항상 강조하는 것이 제1원칙 사고입니다. 기존의 가정을 모두 걷어내고 가장 근본적인 진실에서부터 추론해 나가는 것. 이 책은 바로 그 사고의 기반을 다져줍니다. 우리가 얼마나 많은 편향에 빠져 있는지, 얼마나 쉽게 잘못된 결론에 도달하는지를 보여줍니다. 편향 없이 생각하는 법을 배우고 싶다면 이 책부터 읽으세요. 로켓을 만들든, 회사를 경영하든, 올바른 판단의 출발점은 결국 올바른 사고법입니다.',
  },
]

async function synthesize(input, voice, audioConfig, outputFile) {
  const [response] = await client.synthesizeSpeech({ input, voice, audioConfig })
  await writeFile(outputFile, response.audioContent, 'binary')
  const duration = await mp3Duration(outputFile)
  console.log(`  ${path.basename(outputFile).padEnd(30)} ${duration.toFixed(2)}s`)
  return duration
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })

  // Section 1
  console.log('\n[Section 1 — 나레이터: 이름 + bio]')
  const celebIntroDur = await synthesize(
    { text: narratorCelebIntro },
    FEMALE_VOICE,
    FEMALE_AUDIO,
    path.join(OUT_DIR, 'narrator-celeb-intro.mp3'),
  )

  // Section 2
  console.log('\n[Section 2 — 셀럽: 인사 + 감상철학]')
  const philoDur = await synthesize(
    { text: philosophy },
    MALE_VOICE,
    MALE_AUDIO,
    path.join(OUT_DIR, 'philosophy.mp3'),
  )

  // Sections 3-5: 도서 (제목/설명 분리)
  const bookResults = []
  for (let i = 0; i < books.length; i++) {
    console.log(`\n[Section ${i + 3} — 도서 ${i + 1}]`)
    const titleDur = await synthesize(
      { ssml: books[i].title },
      FEMALE_VOICE,
      FEMALE_AUDIO,
      path.join(OUT_DIR, `book-${i}-title.mp3`),
    )
    const descDur = await synthesize(
      { text: books[i].desc },
      FEMALE_VOICE,
      FEMALE_AUDIO,
      path.join(OUT_DIR, `book-${i}-desc.mp3`),
    )
    const narrDur = await synthesize(
      { text: books[i].narr },
      MALE_VOICE,
      MALE_AUDIO,
      path.join(OUT_DIR, `book-${i}-narr.mp3`),
    )
    bookResults.push({ titleDuration: titleDur, narratorDuration: descDur, narrationDuration: narrDur })
  }

  // Section 6/7
  console.log('\n[Section 6/7 — 나레이터: 아웃트로]')
  const outroDur = await synthesize(
    { text: narratorOutro },
    FEMALE_VOICE,
    FEMALE_AUDIO,
    path.join(OUT_DIR, 'narrator-outro.mp3'),
  )

  // 결과 출력
  console.log('\n=== script.ts에 복사 ===')
  console.log(`narrator.celebIntroDuration: ${celebIntroDur.toFixed(2)},`)
  console.log(`narrator.outroDuration: ${outroDur.toFixed(2)},`)
  console.log(`host.voiceDuration: ${philoDur.toFixed(2)},`)
  bookResults.forEach((b, i) => {
    console.log(
      `book[${i}]: titleDuration: ${b.titleDuration.toFixed(2)}, narratorDuration: ${b.narratorDuration.toFixed(2)}, narrationDuration: ${b.narrationDuration.toFixed(2)},`,
    )
  })
}

main().catch(console.error)
