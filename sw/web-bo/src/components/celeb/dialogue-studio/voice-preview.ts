import type { GenEngine } from '@feelandnote/shared/bo/voice-utils'
import type { SpeakerEngine } from '@/components/scenario-voice/SpeakerEngineToggle'
import type { VoiceSettings } from './constants'

export interface VoicePreviewResult {
  success: boolean
  base64?: string
  bytes?: number
  contentType: 'audio/mpeg' | 'audio/wav'
  error?: string
}

export function celebVoicePreviewUrl(celebKey: string, route: GenEngine): string {
  if (route === 'elevenlabs') {
    return `/api/celebs/${encodeURIComponent(celebKey)}/voice/preview`
  }
  return `/api/book-recommend/voice/${route}/preview`
}

export async function requestCelebVoicePreview({
  celebKey,
  engine,
  voice,
  text,
  settings,
}: {
  celebKey: string
  engine: SpeakerEngine
  voice: string
  text: string
  settings: VoiceSettings
}): Promise<VoicePreviewResult> {
  try {
    const body = engine === 'elevenlabs'
      ? { voiceId: voice, text, settings }
      : { voiceName: voice, text }
    const response = await fetch(celebVoicePreviewUrl(celebKey, engine), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await response.json().catch(() => ({}))
    return {
      success: response.ok && data.success === true,
      base64: data.base64,
      bytes: data.bytes,
      contentType: engine === 'elevenlabs' ? 'audio/mpeg' : 'audio/wav',
      error: data.error ?? (!response.ok ? `음성 생성 실패 (${response.status})` : undefined),
    }
  } catch (error) {
    return {
      success: false,
      contentType: engine === 'elevenlabs' ? 'audio/mpeg' : 'audio/wav',
      error: error instanceof Error ? error.message : String(error),
    }
  }
}
