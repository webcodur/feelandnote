import 'dotenv/config'
import { GoogleGenAI } from '@google/genai'
import wav from 'wav'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY9 })

const text = '지구가 은하 고속도로 건설을 위해 철거되고, 평범한 영국인 아서 덴트가 우주를 떠돌게 된다. 더글러스 애덤스는 이 황당한 설정 위에 거대한 질문을 던진다. 삶과 우주, 그리고 모든 것의 답은 무엇인가. 슈퍼컴퓨터가 750만 년을 계산해 내놓은 답은 42. 하지만 진짜 문제는 아무도 질문이 뭔지를 모른다는 것이다. 이 책이 전하는 핵심은 간결하다. 답을 구하기 전에 올바른 질문을 먼저 찾아야 한다는 것.'

const r = await ai.models.generateContent({
  model: 'gemini-2.5-flash-preview-tts',
  contents: [{ parts: [{ text }] }],
  config: {
    responseModalities: ['AUDIO'],
    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Charon' } } },
  },
})

const data = r.candidates[0].content.parts[0].inlineData.data
const pcm = Buffer.from(data, 'base64')
const outFile = path.join(__dirname, '..', 'public', 'voice', 'book-0-summary.wav')
const writer = new wav.FileWriter(outFile, { channels: 1, sampleRate: 24000, bitDepth: 16 })
writer.on('finish', () => {
  const dur = pcm.length / (24000 * 2)
  console.log('book-0-summary.wav', dur.toFixed(2) + 's')
})
writer.write(pcm)
writer.end()
