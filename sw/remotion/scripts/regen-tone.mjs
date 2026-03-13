/**
 * 말투+숫자 변경 재생성: summary(~습니다+한글숫자), context(한글숫자), outro(세 권)
 */
import 'dotenv/config'
import { GoogleGenAI } from '@google/genai'
import wav from 'wav'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT_DIR = path.join(__dirname, '..', 'public', 'voice')

const API_KEYS = Array.from({ length: 19 }, (_, i) => process.env[`GOOGLE_GENAI_API_KEY${i + 1}`]).filter(Boolean)
let keyIndex = 9
let ai = new GoogleGenAI({ apiKey: API_KEYS[keyIndex] })

async function saveWav(filename, pcmData) {
  return new Promise((resolve, reject) => {
    const writer = new wav.FileWriter(filename, { channels: 1, sampleRate: 24000, bitDepth: 16 })
    writer.on('finish', () => resolve(pcmData.length / (24000 * 2)))
    writer.on('error', reject)
    writer.write(pcmData)
    writer.end()
  })
}

async function synthesize(text, voiceName, outputFile, retries = 3) {
  try {
    const r = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-tts',
      contents: [{ parts: [{ text }] }],
      config: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } } },
    })
    const data = r.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data
    if (!data) throw new Error(`No audio: ${outputFile}`)
    const dur = await saveWav(outputFile, Buffer.from(data, 'base64'))
    console.log(`  ${path.basename(outputFile).padEnd(30)} ${dur.toFixed(2)}s`)
    return dur
  } catch (e) {
    if (e.status === 429 && retries > 0) {
      keyIndex = (keyIndex + 1) % API_KEYS.length
      ai = new GoogleGenAI({ apiKey: API_KEYS[keyIndex] })
      console.log(`  Rate limited → 키 ${keyIndex + 1}`)
      return synthesize(text, voiceName, outputFile, retries - 1)
    }
    throw e
  }
}

const jobs = [
  // 요약맨 (Charon) — ~습니다 + 한글숫자
  { file: 'book-0-summary.wav', voice: 'Charon',
    text: '지구가 은하 고속도로 건설을 위해 철거되고, 평범한 영국인 아서 덴트가 우주를 떠돌게 됩니다. 더글러스 애덤스는 이 황당한 설정 위에 거대한 질문을 던집니다. 삶과 우주, 그리고 모든 것의 답은 무엇인가. 슈퍼컴퓨터가 칠백오십만 년을 계산해 내놓은 답은 사십이. 하지만 진짜 문제는 아무도 질문이 뭔지를 모른다는 것입니다. 이 책이 전하는 핵심은 간결합니다. 답을 구하기 전에 올바른 질문을 먼저 찾아야 한다는 것.' },
  { file: 'book-1-summary.wav', voice: 'Charon',
    text: '전 여섯 권, 천삼백 년의 역사. 이 세기 로마의 전성기부터 1453년 동로마 멸망까지를 추적한 역사서의 바이블입니다. 기번의 핵심 주장은 이것입니다. 로마는 외부의 적이 아니라 내부의 부패로 무너졌다. 시민의 자유와 경쟁심이 사라지자, 번영 그 자체가 타락의 온상이 됩니다. 군대는 용병에 의존하고, 정치는 궁정 음모로 전락합니다. 이백오십 년이 지난 지금도 읽히는 이유는 단 하나, 어떤 문명도 스스로를 갉아먹는 것을 멈추지 않으면 영원할 수 없다는 교훈 때문입니다.' },
  { file: 'book-2-summary.wav', voice: 'Charon',
    text: '알렉산더 대왕, 콜럼버스, 카사노바, 나폴레옹부터 이사도라 던컨까지. 이 책은 열두 명의 모험가를 다룹니다. 공통점은 하나, 기존 질서에 순응하지 않았다는 것입니다. 볼리소는 이들을 단순한 영웅이 아니라 기존 권위에 맞서 자신만의 길을 개척한 사람들로 그립니다. 성공과 실패 모두를 냉정하게 분석하며, 결국 세상을 바꾸는 건 안전한 선택이 아니라 자신의 비전을 끝까지 밀어붙이는 용기라는 메시지를 전합니다.' },
  // 나레이터 context — 한글숫자
  { file: 'book-0-context.wav', voice: 'Kore',
    text: 'Fresh Dialogues 인터뷰에서 머스크는 열두 살에서 열다섯 살 사이 실존적 위기를 겪으며 니체와 쇼펜하우어를 읽었지만 너무 부정적이었다고 회상했습니다. 이 책에서 슈퍼컴퓨터가 사십이라는 답을 내놓지만 정작 질문이 뭔지 아무도 모른다는 이야기를 읽고 결정적 통찰을 얻었다고 말했습니다.' },
  { file: 'book-2-context.wav', voice: 'Kore',
    text: 'Business Insider에 따르면 머스크는 이 책을 반복적으로 언급했으며, SpaceX 직원들에게 선물한 이력이 있습니다. 열두 명의 모험가들이 기존 권위에 맞서 자신만의 길을 개척한 이야기에서, 머스크는 자신의 기업가 정신의 뿌리를 찾았다고 합니다.' },
  // 나레이터 outro — 세 권
  { file: 'narrator-outro.wav', voice: 'Kore',
    text: '일론 머스크의 세계를 확장시킨 세 권의 책이었습니다. 그의 더 깊은 이야기와 세상을 바꾼 또 다른 거장들의 서재가 궁금하신가요? 지금 바로 Feel and Note 앱에서 만나보세요.' },
]

const results = {}
for (const job of jobs) {
  console.log(`\n[${job.file}]`)
  results[job.file] = await synthesize(job.text, job.voice, path.join(OUT_DIR, job.file))
}

console.log('\n=== script.ts 업데이트 ===')
console.log(`book[0]: summaryDuration: ${results['book-0-summary.wav'].toFixed(2)}, contextDuration: ${results['book-0-context.wav'].toFixed(2)}`)
console.log(`book[1]: summaryDuration: ${results['book-1-summary.wav'].toFixed(2)}`)
console.log(`book[2]: summaryDuration: ${results['book-2-summary.wav'].toFixed(2)}, contextDuration: ${results['book-2-context.wav'].toFixed(2)}`)
console.log(`narrator.outroDuration: ${results['narrator-outro.wav'].toFixed(2)}`)
