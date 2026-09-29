/**
 * pcm-wav.ts — WAV↔raw PCM 변환 순수 함수 (단일 원천)
 *
 * Gemini TTS ≤3.1 응답은 헤더 없는 PCM이라 소비 측에서 WAV로 감싸야 하고,
 * 3.8 응답은 WAV(RIFF)라 PCM이 필요한 소비자가 헤더를 벗겨야 한다.
 * 소비자: web-bo 미리듣기 라우트(lib/gemini-tts.ts), remotion voice/lib/gemini-engine.ts.
 */

export function wrapPcmAsWav(pcm: Buffer, sampleRate: number, channels: number, bitDepth: number): Buffer {
  const dataLen = pcm.length
  const header = Buffer.alloc(44)
  header.write('RIFF', 0)
  header.writeUInt32LE(36 + dataLen, 4)
  header.write('WAVE', 8)
  header.write('fmt ', 12)
  header.writeUInt32LE(16, 16)
  header.writeUInt16LE(1, 20)
  header.writeUInt16LE(channels, 22)
  header.writeUInt32LE(sampleRate, 24)
  header.writeUInt32LE(sampleRate * channels * (bitDepth / 8), 28)
  header.writeUInt16LE(channels * (bitDepth / 8), 32)
  header.writeUInt16LE(bitDepth, 34)
  header.write('data', 36)
  header.writeUInt32LE(dataLen, 40)
  return Buffer.concat([header, pcm])
}

/**
 * RIFF WAV 바이트에서 PCM 본문과 포맷을 꺼낸다. RIFF가 아니면 입력을 그대로 PCM으로 돌려준다.
 * Gemini 3.8 TTS unary 응답(audio/wav)용.
 */
export function unwrapWavToPcm(buf: Buffer): { pcm: Buffer; sampleRate?: number; channels?: number; bitDepth?: number } {
  if (buf.length < 12 || buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WAVE') {
    return { pcm: buf }
  }
  let sampleRate: number | undefined, channels: number | undefined, bitDepth: number | undefined
  let off = 12
  while (off + 8 <= buf.length) {
    const id = buf.toString('ascii', off, off + 4)
    const size = buf.readUInt32LE(off + 4)
    if (id === 'fmt ') {
      channels = buf.readUInt16LE(off + 10)
      sampleRate = buf.readUInt32LE(off + 12)
      bitDepth = buf.readUInt16LE(off + 22)
    } else if (id === 'data') {
      return { pcm: buf.subarray(off + 8, off + 8 + size), sampleRate, channels, bitDepth }
    }
    off += 8 + size + (size % 2)
  }
  return { pcm: buf }
}
