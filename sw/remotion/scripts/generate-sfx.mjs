/**
 * 장면 전환 SFX 생성 — 간단한 사인파 기반 톤
 * 출력: public/sfx/whoosh.mp3, page-turn.mp3, transition.mp3
 */

import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT_DIR = path.join(__dirname, '..', 'public', 'sfx')

/**
 * WAV 파일 생성 (모노, 44100Hz, 16bit)
 */
function createWav(samples, sampleRate = 44100) {
  const numSamples = samples.length
  const dataSize = numSamples * 2
  const buffer = Buffer.alloc(44 + dataSize)

  // RIFF header
  buffer.write('RIFF', 0)
  buffer.writeUInt32LE(36 + dataSize, 4)
  buffer.write('WAVE', 8)

  // fmt chunk
  buffer.write('fmt ', 12)
  buffer.writeUInt32LE(16, 16)
  buffer.writeUInt16LE(1, 20) // PCM
  buffer.writeUInt16LE(1, 22) // mono
  buffer.writeUInt32LE(sampleRate, 24)
  buffer.writeUInt32LE(sampleRate * 2, 28)
  buffer.writeUInt16LE(2, 32)
  buffer.writeUInt16LE(16, 34)

  // data chunk
  buffer.write('data', 36)
  buffer.writeUInt32LE(dataSize, 40)

  for (let i = 0; i < numSamples; i++) {
    const val = Math.max(-1, Math.min(1, samples[i]))
    buffer.writeInt16LE(Math.round(val * 32767), 44 + i * 2)
  }

  return buffer
}

/** 부드러운 우쉬 (장면 전환) */
function generateWhoosh(duration = 0.4, sampleRate = 44100) {
  const samples = new Float64Array(Math.floor(duration * sampleRate))
  for (let i = 0; i < samples.length; i++) {
    const t = i / sampleRate
    const progress = t / duration
    const env = Math.sin(progress * Math.PI) * 0.3
    // 하강하는 노이즈 + 사인
    const freq = 800 * (1 - progress * 0.7)
    const noise = (Math.random() * 2 - 1) * 0.15
    samples[i] = (Math.sin(2 * Math.PI * freq * t) * 0.5 + noise) * env
  }
  return samples
}

/** 페이지 넘김 (책 전환) */
function generatePageTurn(duration = 0.3, sampleRate = 44100) {
  const samples = new Float64Array(Math.floor(duration * sampleRate))
  for (let i = 0; i < samples.length; i++) {
    const t = i / sampleRate
    const progress = t / duration
    const env = Math.exp(-progress * 8) * 0.25
    // 가벼운 스크래치 노이즈
    const noise = (Math.random() * 2 - 1)
    const filtered = noise * Math.sin(progress * Math.PI * 3)
    samples[i] = filtered * env
  }
  return samples
}

/** 부드러운 차임 (브랜드 인트로) */
function generateChime(duration = 1.0, sampleRate = 44100) {
  const samples = new Float64Array(Math.floor(duration * sampleRate))
  const freqs = [523.25, 659.25, 783.99] // C5, E5, G5
  for (let i = 0; i < samples.length; i++) {
    const t = i / sampleRate
    const env = Math.exp(-t * 3) * 0.2
    let val = 0
    for (const f of freqs) {
      val += Math.sin(2 * Math.PI * f * t)
    }
    samples[i] = (val / freqs.length) * env
  }
  return samples
}

/** 문 열리는 소리 — 래치 클릭 + 끊어지는 경첩 삐걱 + 공기 */
function generateDoorOpen(duration = 1.2, sampleRate = 44100) {
  const samples = new Float64Array(Math.floor(duration * sampleRate))

  // 시드 기반 의사난수 (매번 같은 결과)
  let seed = 42
  const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 * 2 - 1 }

  // 1) 래치 클릭 (0~30ms): 둔탁한 금속 충격
  for (let i = 0; i < Math.floor(0.03 * sampleRate); i++) {
    const t = i / sampleRate
    const env = Math.exp(-t * 200) * 0.35
    samples[i] = (Math.sin(2 * Math.PI * 1800 * t) * 0.3 + rand() * 0.7) * env
  }

  // 2) 경첩 삐걱 — 불규칙한 짧은 버스트 4회
  const creaks = [
    { start: 0.08, len: 0.12, freq: 380 },
    { start: 0.28, len: 0.15, freq: 420 },
    { start: 0.52, len: 0.10, freq: 460 },
    { start: 0.70, len: 0.08, freq: 350 },
  ]
  for (const c of creaks) {
    const s0 = Math.floor(c.start * sampleRate)
    const sLen = Math.floor(c.len * sampleRate)
    for (let j = 0; j < sLen; j++) {
      const t = j / sampleRate
      const p = j / sLen
      // 양끝이 0인 엔벨로프 (팝 방지)
      const env = Math.sin(p * Math.PI) * 0.18
      // 거친 사각파 느낌: sign(sin) + 노이즈
      const sq = Math.sign(Math.sin(2 * Math.PI * c.freq * t)) * 0.4
      const noise = rand() * 0.6
      // 3배 배음 (나무 울림)
      const h3 = Math.sin(2 * Math.PI * c.freq * 3.03 * t) * 0.15
      if (s0 + j < samples.length) {
        samples[s0 + j] += (sq + noise + h3) * env
      }
    }
  }

  // 3) 저역 공기 이동 (0.4~1.2s)
  for (let i = Math.floor(0.4 * sampleRate); i < samples.length; i++) {
    const t = (i / sampleRate - 0.4) / 0.8
    const env = Math.sin(t * Math.PI) * 0.04
    samples[i] += rand() * env
  }

  return samples
}

/** 타이핑 효과음 — 짧은 클릭 연속 */
function generateTypeReveal(duration = 1.2, sampleRate = 44100) {
  const samples = new Float64Array(Math.floor(duration * sampleRate))
  const clickCount = 8
  for (let c = 0; c < clickCount; c++) {
    const clickStart = Math.floor((c / clickCount) * duration * sampleRate)
    const clickLen = Math.floor(0.012 * sampleRate) // 12ms per click
    for (let i = 0; i < clickLen && clickStart + i < samples.length; i++) {
      const t = i / sampleRate
      const env = Math.exp(-i / (clickLen * 0.15)) * 0.25
      const freq = 2200 + c * 80 // 점점 올라가는 톤
      const tone = Math.sin(2 * Math.PI * freq * t) * 0.6
      const noise = (Math.random() * 2 - 1) * 0.4
      samples[clickStart + i] += (tone + noise) * env
    }
  }
  return samples
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })

  const sfx = [
    { name: 'whoosh', fn: generateWhoosh },
    { name: 'page-turn', fn: generatePageTurn },
    { name: 'chime', fn: generateChime },
    { name: 'type-reveal', fn: generateTypeReveal },
    { name: 'door-open', fn: generateDoorOpen },
  ]

  for (const { name, fn } of sfx) {
    const samples = fn()
    const wav = createWav(samples)
    const filePath = path.join(OUT_DIR, `${name}.wav`)
    await writeFile(filePath, wav)
    console.log(`생성: ${name}.wav (${(wav.length / 1024).toFixed(1)}KB)`)
  }

  console.log('\nSFX 생성 완료.')
}

main().catch(console.error)
