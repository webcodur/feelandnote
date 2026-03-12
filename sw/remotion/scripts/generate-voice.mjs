/**
 * BookRecommend TTS 생성 (마스터 대본 v3)
 * 사용법: node scripts/generate-voice.mjs
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

// --- Section 1: 나레이터 — bio 읊기 (여성) ---
const narratorCelebIntro =
  '일론 머스크. 남아프리카 출신의 기업가이자 투자자. 테슬라, 스페이스X 등으로 전기차와 우주 탐사의 패러다임을 전환하고 있다.'

// --- Section 2: 셀럽 감상철학 — 인사 + 철학 (남성) ---
const philosophy =
  '안녕하세요, 일론 머스크입니다. 공상과학 소설은 제 예언서였습니다. 파운데이션을 읽고 SpaceX를 세웠고, 히치하이커를 읽고 질문하는 법을 배웠습니다. 테슬라, 뉴럴링크, 스타링크, 모두 책에서 시작된 프로젝트입니다. 책은 제게 가장 위대한 멘토입니다.'

// --- 브릿지: 나레이터 서재 이동 안내 (여성) ---
const bridge = '이제 그의 서재를 열어보겠습니다.'

// --- Section 6/7: 나레이터 아웃트로 (여성) ---
const narratorOutro =
  '일론 머스크의 세계를 확장시킨 3권의 책이었습니다. 그의 더 깊은 이야기와 세상을 바꾼 또 다른 거장들의 서재가 궁금하신가요? 지금 바로 Feel and Note 앱에서 만나보세요.'

// --- 도서 스크립트 (위키백과 스타일) ---
const books = [
  {
    narrator:
      '<speak>둠의 창조자들. <break time="300ms"/>데이비드 쿠쉬너 저. <break time="200ms"/>게임 산업의 혁신을 담은 논픽션.</speak>',
    narr: '아무것도 없는 곳에서 혁신을 만들어낸 이들의 정신, 저도 공감합니다. 그들이 엔진을 바닥부터 짠 것처럼, 저도 로켓을 바닥부터 만들었으니까요.',
  },
  {
    narrator:
      '<speak>로마제국 쇠망사. <break time="300ms"/>에드워드 기번 저. <break time="200ms"/>18세기에 쓰인 역사서의 고전.</speak>',
    narr: '문명은 왜 무너지는가. 이 질문에 답하지 못하면 같은 실수를 반복합니다. 인류가 다행성 종이 되어야 하는 이유도 여기에 있습니다.',
  },
  {
    narrator:
      '<speak>나쁜 과학 대처법. <break time="300ms"/>스티븐 노벨라 외 저. <break time="200ms"/>과학적 사고의 기초를 다지는 필독서.</speak>',
    narr: '제가 항상 강조하는 제1원칙 사고, 그 기반이 되는 책입니다. 편향 없이 생각하는 법을 배우고 싶다면 이 책부터 읽으세요.',
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

  // Section 1: 나레이터 bio 읊기
  console.log('\n[Section 1 — 나레이터: bio 소개]')
  const celebIntroDur = await synthesize(
    { text: narratorCelebIntro },
    FEMALE_VOICE,
    FEMALE_AUDIO,
    path.join(OUT_DIR, 'narrator-celeb-intro.mp3'),
  )

  // Section 2: 셀럽 인사 + 감상철학
  console.log('\n[Section 2 — 셀럽: 인사 + 감상철학]')
  const philoDur = await synthesize(
    { text: philosophy },
    MALE_VOICE,
    MALE_AUDIO,
    path.join(OUT_DIR, 'philosophy.mp3'),
  )

  // 브릿지: 나레이터 서재 이동
  console.log('\n[Bridge — 나레이터: 서재 이동]')
  const bridgeDur = await synthesize(
    { text: bridge },
    FEMALE_VOICE,
    FEMALE_AUDIO,
    path.join(OUT_DIR, 'narrator-bridge.mp3'),
  )

  // Sections 3-5: 도서 (위키백과 스타일)
  const bookResults = []
  for (let i = 0; i < books.length; i++) {
    console.log(`\n[Section ${i + 3} — 도서 ${i + 1}]`)
    const narratorDur = await synthesize(
      { ssml: books[i].narrator },
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
    bookResults.push({ narratorDuration: narratorDur, narrationDuration: narrDur })
  }

  // Section 6/7: 나레이터 아웃트로
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
  console.log(`narrator.bridgeDuration: ${bridgeDur.toFixed(2)},`)
  console.log(`narrator.outroDuration: ${outroDur.toFixed(2)},`)
  console.log(`host.voiceDuration: ${philoDur.toFixed(2)},`)
  bookResults.forEach((b, i) => {
    console.log(
      `book[${i}]: narratorDuration: ${b.narratorDuration.toFixed(2)}, narrationDuration: ${b.narrationDuration.toFixed(2)},`,
    )
  })
}

main().catch(console.error)
