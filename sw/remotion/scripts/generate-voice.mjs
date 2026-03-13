/**
 * BookRecommend TTS 생성 (v9 — 3-phase + optional quote)
 * 사용법: node scripts/generate-voice.mjs
 *
 * 나레이터(Kore): 제목+저자+년도 / 추천 경위(3인칭)
 * 요약맨(Charon): 핵심 요약
 * 셀럽(Puck): 직접 인용문 (있을 때만)
 */

import 'dotenv/config'
import { GoogleGenAI } from '@google/genai'
import wav from 'wav'
import { mkdir } from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT_DIR = path.join(__dirname, '..', 'public', 'voice')

// API 키 로테이션 (rate limit 대응) — GOOGLE_GENAI_API_KEY1 ~ _19
const API_KEYS = Array.from({ length: 19 }, (_, i) => process.env[`GOOGLE_GENAI_API_KEY${i + 1}`]).filter(Boolean)
let keyIndex = 0
let ai = new GoogleGenAI({ apiKey: API_KEYS[0] })

const MODEL = 'gemini-2.5-flash-preview-tts'
const MALE_VOICE = 'Puck'       // 셀럽 (직접 인용만)
const FEMALE_VOICE = 'Kore'     // 나레이터
const SUMMARY_VOICE = 'Charon'  // 요약맨
const SAMPLE_RATE = 24000

// --- WAV 저장 + duration 계산 ---
async function saveWav(filename, pcmData) {
  return new Promise((resolve, reject) => {
    const writer = new wav.FileWriter(filename, {
      channels: 1,
      sampleRate: SAMPLE_RATE,
      bitDepth: 16,
    })
    writer.on('finish', () => {
      const duration = pcmData.length / (SAMPLE_RATE * 2) // 16bit = 2 bytes
      resolve(duration)
    })
    writer.on('error', reject)
    writer.write(pcmData)
    writer.end()
  })
}

// --- Gemini TTS 합성 (rate limit 자동 재시도) ---
async function synthesize(text, voiceName, outputFile, retries = 3) {
  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    })

    const data = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data
    if (!data) throw new Error(`No audio returned for ${outputFile}`)
    const pcm = Buffer.from(data, 'base64')
    const duration = await saveWav(outputFile, pcm)
    console.log(`  ${path.basename(outputFile).padEnd(30)} ${duration.toFixed(2)}s`)
    return duration
  } catch (e) {
    if (e.status === 429 && retries > 0) {
      if (API_KEYS.length > 1) {
        keyIndex = (keyIndex + 1) % API_KEYS.length
        ai = new GoogleGenAI({ apiKey: API_KEYS[keyIndex] })
        console.log(`  Rate limited. 키 ${keyIndex + 1}로 전환 후 재시도...`)
        return synthesize(text, voiceName, outputFile, retries - 1)
      }
      const wait = parseInt(e.message?.match(/retry in ([\d.]+)s/i)?.[1] || '60')
      console.log(`  Rate limited. ${wait}s 대기 후 재시도... (남은 ${retries}회)`)
      await new Promise((r) => setTimeout(r, (wait + 5) * 1000))
      return synthesize(text, voiceName, outputFile, retries - 1)
    }
    throw e
  }
}

// --- Section 1: 나레이터 — 이름 + bio ---
const narratorCelebIntro =
  '일론 머스크. 남아프리카 출신의 기업가이자 투자자. 테슬라, 스페이스X 등으로 전기차와 우주 탐사의 패러다임을 전환하고 있다.'

// --- Section 2: 셀럽 인사 + 감상철학 ---
const philosophy =
  '안녕하세요, 일론 머스크입니다. 공상과학 소설은 제 예언서였습니다. 파운데이션을 읽고 SpaceX를 세웠고, 히치하이커를 읽고 질문하는 법을 배웠습니다. 테슬라, 뉴럴링크, 스타링크, 모두 책에서 시작된 프로젝트입니다. 책은 제게 가장 위대한 멘토입니다.'

// --- 아웃트로 ---
const narratorOutro =
  '일론 머스크의 세계를 확장시킨 세 권의 책이었습니다. 그의 더 깊은 이야기와 세상을 바꾼 또 다른 거장들의 서재가 궁금하신가요? 지금 바로 Feel and Note 앱에서 만나보세요.'

// --- 도서: title(Kore) / summary(Charon) / context(Kore) / quote(Puck, optional) ---
const books = [
  {
    title: '은하수를 여행하는 히치하이커를 위한 안내서, 더글러스 애덤스, 1979',
    summary: '지구가 은하 고속도로 건설을 위해 철거되고, 평범한 영국인 아서 덴트가 우주를 떠돌게 됩니다. 더글러스 애덤스는 이 황당한 설정 위에 거대한 질문을 던집니다. 삶과 우주, 그리고 모든 것의 답은 무엇인가. 슈퍼컴퓨터가 칠백오십만 년을 계산해 내놓은 답은 사십이. 하지만 진짜 문제는 아무도 질문이 뭔지를 모른다는 것입니다. 이 책이 전하는 핵심은 간결합니다. 답을 구하기 전에 올바른 질문을 먼저 찾아야 한다는 것.',
    context: 'Fresh Dialogues 인터뷰에서 머스크는 열두 살에서 열다섯 살 사이 실존적 위기를 겪으며 니체와 쇼펜하우어를 읽었지만 너무 부정적이었다고 회상했습니다. 이 책에서 슈퍼컴퓨터가 사십이라는 답을 내놓지만 정작 질문이 뭔지 아무도 모른다는 이야기를 읽고 결정적 통찰을 얻었다고 말했습니다.',
    quote: '많은 경우 질문이 답보다 더 어렵다',
    contextAfter: '2018년 테슬라 로드스터를 우주로 보낼 때 화면에 표시한 Don\'t Panic이라는 문구도 이 책에 대한 오마주입니다.',
  },
  {
    title: '로마제국 쇠망사, 에드워드 기번, 1776',
    summary: '전 여섯 권, 천삼백 년의 역사. 이 세기 로마의 전성기부터 1453년 동로마 멸망까지를 추적한 역사서의 바이블입니다. 기번의 핵심 주장은 이것입니다. 로마는 외부의 적이 아니라 내부의 부패로 무너졌다. 시민의 자유와 경쟁심이 사라지자, 번영 그 자체가 타락의 온상이 됩니다. 군대는 용병에 의존하고, 정치는 궁정 음모로 전락합니다. 이백오십 년이 지난 지금도 읽히는 이유는 단 하나, 어떤 문명도 스스로를 갉아먹는 것을 멈추지 않으면 영원할 수 없다는 교훈 때문입니다.',
    context: 'Esquire가 선정한 머스크의 추천 도서 목록에 포함되어 있습니다. 머스크는 문명의 흥망에서 현대 사회에 대한 교훈을 찾는다고 알려져 있으며, 인류가 단일 행성에 의존하는 것 자체를 리스크로 보는 그의 다행성 종 비전과도 맞닿아 있습니다.',
    // 직접 인용문 없음
  },
  {
    title: '신에 맞선 12인, 윌리엄 볼리소, 1929',
    summary: '알렉산더 대왕, 콜럼버스, 카사노바, 나폴레옹부터 이사도라 던컨까지. 이 책은 열두 명의 모험가를 다룹니다. 공통점은 하나, 기존 질서에 순응하지 않았다는 것입니다. 볼리소는 이들을 단순한 영웅이 아니라 기존 권위에 맞서 자신만의 길을 개척한 사람들로 그립니다. 성공과 실패 모두를 냉정하게 분석하며, 결국 세상을 바꾸는 건 안전한 선택이 아니라 자신의 비전을 끝까지 밀어붙이는 용기라는 메시지를 전합니다.',
    context: 'Business Insider에 따르면 머스크는 이 책을 반복적으로 언급했으며, SpaceX 직원들에게 선물한 이력이 있습니다. 열두 명의 모험가들이 기존 권위에 맞서 자신만의 길을 개척한 이야기에서, 머스크는 자신의 기업가 정신의 뿌리를 찾았다고 합니다.',
    quote: '이 책이 나를 만들었다',
  },
]

async function main() {
  await mkdir(OUT_DIR, { recursive: true })

  // Section 1: 나레이터 셀럽 소개
  console.log('\n[Section 1 — 나레이터: 이름 + bio]')
  const celebIntroDur = await synthesize(
    narratorCelebIntro,
    FEMALE_VOICE,
    path.join(OUT_DIR, 'narrator-celeb-intro.wav'),
  )

  // Section 2: 셀럽 감상철학
  console.log('\n[Section 2 — 셀럽: 인사 + 감상철학]')
  const philoDur = await synthesize(
    philosophy,
    MALE_VOICE,
    path.join(OUT_DIR, 'philosophy.wav'),
  )

  // 도서: title(Kore) + summary(Charon) + context(Kore) + quote(Puck, optional)
  const bookResults = []
  for (let i = 0; i < books.length; i++) {
    console.log(`\n[Book ${i + 1}/${books.length}]`)

    const titleDur = await synthesize(
      books[i].title,
      FEMALE_VOICE,
      path.join(OUT_DIR, `book-${i}-title.wav`),
    )
    const summaryDur = await synthesize(
      books[i].summary,
      SUMMARY_VOICE,
      path.join(OUT_DIR, `book-${i}-summary.wav`),
    )
    const contextDur = await synthesize(
      books[i].context,
      FEMALE_VOICE,
      path.join(OUT_DIR, `book-${i}-context.wav`),
    )

    let quoteDur = 0
    if (books[i].quote) {
      quoteDur = await synthesize(
        books[i].quote,
        MALE_VOICE,
        path.join(OUT_DIR, `book-${i}-quote.wav`),
      )
    }

    let contextAfterDur = 0
    if (books[i].contextAfter) {
      contextAfterDur = await synthesize(
        books[i].contextAfter,
        FEMALE_VOICE,
        path.join(OUT_DIR, `book-${i}-context-after.wav`),
      )
    }

    bookResults.push({ titleDuration: titleDur, summaryDuration: summaryDur, contextDuration: contextDur, quoteDuration: quoteDur, contextAfterDuration: contextAfterDur })
  }

  // 아웃트로
  console.log('\n[나레이터: 아웃트로]')
  const outroDur = await synthesize(
    narratorOutro,
    FEMALE_VOICE,
    path.join(OUT_DIR, 'narrator-outro.wav'),
  )

  // 결과 출력
  console.log('\n=== script.ts에 복사 ===')
  console.log(`narrator.celebIntroDuration: ${celebIntroDur.toFixed(2)},`)
  console.log(`narrator.outroDuration: ${outroDur.toFixed(2)},`)
  console.log(`host.voiceDuration: ${philoDur.toFixed(2)},`)
  bookResults.forEach((b, i) => {
    const parts = [`titleDuration: ${b.titleDuration.toFixed(2)}`, `summaryDuration: ${b.summaryDuration.toFixed(2)}`, `contextDuration: ${b.contextDuration.toFixed(2)}`]
    if (b.quoteDuration > 0) parts.push(`quoteDuration: ${b.quoteDuration.toFixed(2)}`)
    if (b.contextAfterDuration > 0) parts.push(`contextAfterDuration: ${b.contextAfterDuration.toFixed(2)}`)
    console.log(`book[${i}]: ${parts.join(', ')}`)
  })
}

main().catch(console.error)
