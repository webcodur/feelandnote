/**
 * pcm-wav.ts — raw PCM 본문에 44바이트 WAV 헤더를 씌우는 순수 함수 (단일 원천)
 *
 * Gemini TTS 응답은 헤더 없는 PCM이라 소비 측에서 WAV로 감싸야 한다.
 * 소비자: web-bo 미리듣기 라우트(lib/gemini-tts.ts), web 읽기 TTS 라우트(api/tts/route.ts).
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
