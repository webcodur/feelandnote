import { NextRequest, NextResponse } from "next/server"
import { GoogleGenAI } from "@google/genai"
import { cleanVoiceBuffer } from "@feelandnote/shared/bo/voice-cleanup"
import { googleFreeApiKeys } from "@feelandnote/shared/lib/gemini-keys"
import { wrapPcmAsWav } from "@feelandnote/shared/lib/pcm-wav"
import { MODEL_GEMINI_25 } from "@feelandnote/shared/lib/voice-policy"

// Gemini API 키 로테이션 (무료 키 풀 규약은 shared/lib/gemini-keys.ts 단일 원천)
const API_KEYS = googleFreeApiKeys()

let keyIndex = 0

const MODEL = MODEL_GEMINI_25
const MAX_TEXT_LENGTH = 2000

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
    return wrapPcmAsWav(pcm, 24000, 1, 16)
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
    // 들숨·쉼 정리(SSoT) — 읽어주기 내레이션이라 reading 프로필
    const wavBuffer = await cleanVoiceBuffer(await synthesize(text, voiceName), "wav", "reading")

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
