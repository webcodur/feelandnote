import { NextRequest, NextResponse } from "next/server"
import { GoogleGenAI } from "@google/genai"

// Gemini API 키 로테이션 (remotion/.env 키들을 web/.env에 복사)
const API_KEYS = Array.from({ length: 50 }, (_, i) =>
  process.env[`GOOGLE_GENAI_API_KEY${i}`],
).filter(Boolean) as string[]

let keyIndex = 0

const MODEL = "gemini-2.5-flash-preview-tts"
const MAX_TEXT_LENGTH = 2000

/** PCM 16bit mono 24kHz → WAV 헤더 생성 */
function createWavHeader(pcmLength: number): Buffer {
  const sampleRate = 24000
  const channels = 1
  const bitDepth = 16
  const byteRate = sampleRate * channels * (bitDepth / 8)
  const blockAlign = channels * (bitDepth / 8)
  const header = Buffer.alloc(44)

  header.write("RIFF", 0)
  header.writeUInt32LE(36 + pcmLength, 4)
  header.write("WAVE", 8)
  header.write("fmt ", 12)
  header.writeUInt32LE(16, 16) // fmt chunk size
  header.writeUInt16LE(1, 20) // PCM
  header.writeUInt16LE(channels, 22)
  header.writeUInt32LE(sampleRate, 24)
  header.writeUInt32LE(byteRate, 28)
  header.writeUInt16LE(blockAlign, 32)
  header.writeUInt16LE(bitDepth, 34)
  header.write("data", 36)
  header.writeUInt32LE(pcmLength, 40)

  return header
}

async function synthesize(
  text: string,
  voiceName: string,
  retries = Math.min(API_KEYS.length - 1, 5),
): Promise<Buffer> {
  const ai = new GoogleGenAI({ apiKey: API_KEYS[keyIndex] })

  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName } },
        },
      },
    })

    const data =
      response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data
    if (!data) {
      if (retries > 0) {
        keyIndex = (keyIndex + 1) % API_KEYS.length
        return synthesize(text, voiceName, retries - 1)
      }
      throw new Error("No audio data from Gemini")
    }

    const pcm = Buffer.from(data, "base64")
    const wavHeader = createWavHeader(pcm.length)
    return Buffer.concat([wavHeader, pcm])
  } catch (e: unknown) {
    const status = (e as { status?: number }).status
    if ((status === 429 || status === 403) && retries > 0) {
      keyIndex = (keyIndex + 1) % API_KEYS.length
      return synthesize(text, voiceName, retries - 1)
    }
    throw e
  }
}

export async function POST(req: NextRequest) {
  // 프로덕션 차단 — localhost 개발 전용 API
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available" }, { status: 403 })
  }

  if (API_KEYS.length === 0) {
    return NextResponse.json(
      { error: "TTS not configured" },
      { status: 500 },
    )
  }

  const { text, locale = "ko" } = await req.json()

  if (!text || typeof text !== "string") {
    return NextResponse.json({ error: "text required" }, { status: 400 })
  }

  if (text.length > MAX_TEXT_LENGTH) {
    return NextResponse.json({ error: "text too long" }, { status: 400 })
  }

  // 한국어: Kore (여성), 영어: Kore (추후 변경 가능)
  const voiceName = locale === "en" ? "Kore" : "Kore"

  try {
    const wavBuffer = await synthesize(text, voiceName)

    return new NextResponse(new Uint8Array(wavBuffer), {
      headers: {
        "Content-Type": "audio/wav",
        "Cache-Control": "public, max-age=86400",
      },
    })
  } catch (e) {
    console.error("TTS error:", e)
    return NextResponse.json({ error: "TTS failed" }, { status: 502 })
  }
}
