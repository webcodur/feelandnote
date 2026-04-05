'use server'

import { createClient } from '@/lib/supabase/server'
import { uploadToR2, R2_PUBLIC_URL } from '@/lib/r2'
import { voiceFileName, voiceR2Key } from '@/lib/voice-path'

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY!

export interface VoiceGenCeleb {
  id: string
  nickname: string | null
  avatar_url: string | null
  slug: string | null
  speech_tone: string | null
  has_voice: boolean
  voice_id_ko: string | null
  voice_id_en: string | null
  dialogue_lines: Record<string, string[]> | null
  dialogue_lines_en: Record<string, string[]> | null
  voice_v: number
  voice_speed: number
}

/** 음성 생성 대상 셀럽 목록 (대사 보유자만) */
export async function getCelebsForVoiceGen(): Promise<VoiceGenCeleb[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('profiles')
    .select(`
      id, nickname, avatar_url, slug, speech_tone, has_voice,
      voice_id_ko, voice_id_en, voice_v, voice_speed,
      celeb_dialogues(lines, lines_en)
    `)
    .eq('profile_type', 'CELEB')
    .order('nickname', { ascending: true })

  if (error) throw error

  return (data || [])
    .map((row) => {
      const dlg = Array.isArray(row.celeb_dialogues)
        ? row.celeb_dialogues[0]
        : row.celeb_dialogues
      const lines = dlg?.lines as Record<string, string[]> | null
      const linesEn = dlg?.lines_en as Record<string, string[]> | null
      return {
        id: row.id,
        nickname: row.nickname,
        avatar_url: row.avatar_url,
        slug: row.slug,
        speech_tone: row.speech_tone,
        has_voice: row.has_voice ?? false,
        voice_id_ko: (row as Record<string, unknown>).voice_id_ko as string | null,
        voice_id_en: (row as Record<string, unknown>).voice_id_en as string | null,
        dialogue_lines: lines && Object.keys(lines).length > 0 ? lines : null,
        dialogue_lines_en: linesEn && Object.keys(linesEn).length > 0 ? linesEn : null,
        voice_v: (row as Record<string, unknown>).voice_v as number ?? 0,
        voice_speed: (row as Record<string, unknown>).voice_speed as number ?? 1.0,
      }
    })
}

export interface VoiceGenSettings {
  stability: number
  similarity_boost: number
  style: number
  speed: number
}

/** ElevenLabs TTS 생성 (프리뷰 전용, R2 미업로드) → base64 반환 */
export async function generateVoicePreview(params: {
  voiceId: string
  text: string
  settings: VoiceGenSettings
}): Promise<{ success: boolean; base64?: string; bytes?: number; error?: string }> {
  const { voiceId, text, settings } = params

  try {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_v3',
        voice_settings: {
          stability: settings.stability,
          similarity_boost: settings.similarity_boost,
          style: settings.style,
        },
        speed: settings.speed,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      return { success: false, error: `ElevenLabs ${res.status}: ${err}` }
    }

    const buffer = Buffer.from(await res.arrayBuffer())
    return { success: true, base64: buffer.toString('base64'), bytes: buffer.length }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

/** voice_v를 1 증가 (캐시 버스터 갱신) 후 새 값 반환 */
export async function bumpVoiceVersion(celebId: string): Promise<number> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select('voice_v')
    .eq('id', celebId)
    .single()
  const newV = ((data as Record<string, unknown>)?.voice_v as number ?? 0) + 1
  await supabase.from('profiles').update({ voice_v: newV }).eq('id', celebId)
  return newV
}

/** 프리뷰된 음성을 R2에 업로드 (고정 경로, 덮어쓰기) */
export async function uploadVoiceFromPreview(params: {
  celebId: string
  base64: string
  locale: 'ko' | 'en'
  dialogueType: string
  variant?: number
  contentType?: string
}): Promise<{ success: boolean; url?: string; error?: string }> {
  const { celebId, base64, locale, dialogueType, variant, contentType = 'audio/mpeg' } = params

  const name = voiceFileName(dialogueType, variant)
  if (!name) return { success: false, error: '잘못된 대사 유형 또는 변형 번호' }

  try {
    const buffer = Buffer.from(base64, 'base64')
    const r2Key = voiceR2Key(celebId, locale, name)
    await uploadToR2(r2Key, buffer, contentType)
    return { success: true, url: `${R2_PUBLIC_URL}/${r2Key}` }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

/** R2 기존 음성 파일을 base64로 반환 (CORS 우회) */
export async function fetchVoiceFile(params: {
  celebId: string
  locale: 'ko' | 'en'
  dialogueType: string
  variant?: number
}): Promise<{ success: boolean; base64?: string; bytes?: number; error?: string }> {
  const { celebId, locale, dialogueType, variant } = params

  const name = voiceFileName(dialogueType, variant)
  if (!name) return { success: false, error: '잘못된 대사 유형' }

  try {
    const r2Key = voiceR2Key(celebId, locale, name)
    const url = `${R2_PUBLIC_URL}/${r2Key}`
    const res = await fetch(url)
    if (!res.ok) return { success: false, error: `R2 ${res.status}` }
    const buffer = Buffer.from(await res.arrayBuffer())
    return { success: true, base64: buffer.toString('base64'), bytes: buffer.length }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

/** 명언 저장 (celeb_dialogues.lines.quote) */
export async function saveQuote(
  celebId: string,
  locale: 'ko' | 'en',
  quote: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const linesCol = locale === 'ko' ? 'lines' : 'lines_en'
  const { data: existing } = await supabase
    .from('celeb_dialogues')
    .select(`${linesCol}`)
    .eq('celeb_id', celebId)
    .maybeSingle()

  const currentLines = (existing as any)?.[linesCol] as Record<string, any> ?? {}
  const updatedLines = { ...currentLines, quote: quote || '' }
  const { error } = await supabase
    .from('celeb_dialogues')
    .upsert({ celeb_id: celebId, [linesCol]: updatedLines }, { onConflict: 'celeb_id' })
  if (error) return { success: false, error: error.message }

  return { success: true }
}

/** has_voice 활성화 */
export async function enableHasVoice(celebId: string): Promise<void> {
  const supabase = await createClient()
  await supabase.from('profiles').update({ has_voice: true }).eq('id', celebId)
}

/** voice_id 저장 */
export async function saveVoiceId(
  celebId: string,
  locale: 'ko' | 'en',
  voiceId: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const col = locale === 'ko' ? 'voice_id_ko' : 'voice_id_en'
  const { error } = await supabase
    .from('profiles')
    .update({ [col]: voiceId })
    .eq('id', celebId)
  if (error) return { success: false, error: error.message }
  return { success: true }
}
