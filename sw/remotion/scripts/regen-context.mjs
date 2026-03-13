/**
 * context 텍스트 변경분만 재생성
 * book-0-context.wav, book-0-context-after.wav, book-2-context.wav
 */
import 'dotenv/config'
import { GoogleGenAI } from '@google/genai'
import wav from 'wav'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT_DIR = path.join(__dirname, '..', 'public', 'voice')

const API_KEYS = Array.from({ length: 19 }, (_, i) => process.env[`GOOGLE_GENAI_API_KEY${i + 1}`]).filter(Boolean)
let keyIndex = 5 // 앞 키들 이미 사용됨
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

console.log('[book-0-context] (변경됨)')
const ctx0 = await synthesize(
  'Fresh Dialogues 인터뷰에서 머스크는 12세에서 15세 사이 실존적 위기를 겪으며 니체와 쇼펜하우어를 읽었지만 너무 부정적이었다고 회상했다. 이 책에서 슈퍼컴퓨터가 42라는 답을 내놓지만 정작 질문이 뭔지 아무도 모른다는 이야기를 읽고 결정적 통찰을 얻었다고 말했다.',
  'Kore',
  path.join(OUT_DIR, 'book-0-context.wav'),
)

console.log('[book-0-context-after] (신규)')
const ctxAfter0 = await synthesize(
  "2018년 테슬라 로드스터를 우주로 보낼 때 화면에 표시한 Don't Panic이라는 문구도 이 책에 대한 오마주다.",
  'Kore',
  path.join(OUT_DIR, 'book-0-context-after.wav'),
)

console.log('[book-2-context] (변경됨)')
const ctx2 = await synthesize(
  'Business Insider에 따르면 머스크는 이 책을 반복적으로 언급했으며, SpaceX 직원들에게 선물한 이력이 있다. 12명의 모험가들이 기존 권위에 맞서 자신만의 길을 개척한 이야기에서, 머스크는 자신의 기업가 정신의 뿌리를 찾았다고 한다.',
  'Kore',
  path.join(OUT_DIR, 'book-2-context.wav'),
)

console.log('\n=== script.ts 업데이트 ===')
console.log(`book[0]: contextDuration: ${ctx0.toFixed(2)}, contextAfterDuration: ${ctxAfter0.toFixed(2)}`)
console.log(`book[2]: contextDuration: ${ctx2.toFixed(2)}`)
