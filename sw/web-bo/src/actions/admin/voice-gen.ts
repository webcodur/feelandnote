'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/admin-auth'
import { uploadToR2, R2_PUBLIC_URL } from '@/lib/r2'
import { voiceFileName, voiceR2Key } from '@/lib/voice-path'
import { revalidateWebCeleb } from '@/lib/revalidate-web'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import {
  getEleAccountConfigIssues, getEleAccountSetupError, resolveEleAccountForVoice,
} from '@feelandnote/shared/lib/ele-accounts'

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
  // 아래 넷은 목소리 추천에만 쓴다 — 어떤 목소리가 어울리는지 가릴 재료다
  profession: string | null
  title: string | null
  nationality: string | null
  gender: boolean | null
}

interface VoiceGenQueryRow {
  id: string
  nickname: string | null
  avatar_url: string | null
  slug: string | null
  speech_tone: string | null
  has_voice: boolean | null
  voice_id_ko: string | null
  voice_id_en: string | null
  voice_v: number | null
  voice_speed: number | null
  profession: string | null
  title: string | null
  nationality: string | null
  gender: boolean | null
  celeb_dialogues:
    | { lines: unknown; lines_en: unknown }
    | { lines: unknown; lines_en: unknown }[]
    | null
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * 편집 대상 셀럽 한 명의 대사·음성 데이터.
 *
 * 전에는 셀럽 전량(2,742명)을 대사까지 통째로 실어 보냈다. 대사 본문만 6MB가 넘어
 * 첫 화면이 20초 넘게 걸렸고, 그 데이터의 대부분은 검색 상자를 채우는 데조차 쓰이지 않았다.
 * 검색은 `/api/celebs/search`가 질의마다 처리하므로, 여기서는 고른 한 명만 읽는다.
 */
export async function getCelebVoiceDetail(idOrSlug: string): Promise<VoiceGenCeleb | null> {
  const supabase = await createClient()

  const query = supabase
    .from('celebs')
    .select(`
      id, nickname, avatar_url, slug, speech_tone, has_voice,
      voice_id_ko, voice_id_en, voice_v, voice_speed,
      profession, title, nationality, gender,
      celeb_dialogues!celeb_dialogues_celebs_fkey(lines, lines_en)
    `)

  const result = await (UUID_RE.test(idOrSlug)
    ? query.eq('id', idOrSlug)
    : query.eq('slug', idOrSlug)
  ).maybeSingle()

  if (result.error) throw new Error(`Failed to load celeb voice detail: ${result.error.message}`)

  const data = result.data as unknown as VoiceGenQueryRow | null

  if (!data) return null

  const dlg = Array.isArray(data.celeb_dialogues) ? data.celeb_dialogues[0] : data.celeb_dialogues
  const lines = dlg?.lines as Record<string, string[]> | null
  const linesEn = dlg?.lines_en as Record<string, string[]> | null

  return {
    id: data.id,
    nickname: data.nickname,
    avatar_url: data.avatar_url,
    slug: data.slug,
    speech_tone: data.speech_tone,
    has_voice: data.has_voice ?? false,
    voice_id_ko: data.voice_id_ko,
    voice_id_en: data.voice_id_en,
    dialogue_lines: lines && Object.keys(lines).length > 0 ? lines : null,
    dialogue_lines_en: linesEn && Object.keys(linesEn).length > 0 ? linesEn : null,
    voice_v: data.voice_v ?? 0,
    voice_speed: data.voice_speed ?? 1.0,
    profession: data.profession,
    title: data.title,
    nationality: data.nationality,
    gender: data.gender,
  }
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
  accountId?: string | null
}): Promise<{ success: boolean; base64?: string; bytes?: number; error?: string }> {
  const { voiceId, text, settings, accountId } = params
  const id = voiceId.trim()
  if (!id) return { success: false, error: 'voiceId 가 비어 있다' }

  const account = await resolveEleAccountForVoice(id, accountId)
  if (!account) {
    const configError = getEleAccountConfigIssues().length > 0 ? ` ${getEleAccountSetupError()}` : ''
    return {
      success: false,
      error: `해당 음성을 가진 ElevenLabs 계정을 찾지 못함: ${id} (연결된 계정 라이브러리에 없거나, 무료 계정은 라이브러리 음성을 API로 쓸 수 없음).${configError}`,
    }
  }

  try {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(id)}`, {
      method: 'POST',
      headers: {
        'xi-api-key': account.apiKey,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      cache: 'no-store',
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
  await requireAdmin()
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('celebs')
    .select('voice_v')
    .eq('id', celebId)
    .single()
  if (error || !data) throw error ?? new Error('셀럽을 찾을 수 없습니다.')

  const newV = ((data as Record<string, unknown>)?.voice_v as number ?? 0) + 1
  const { data: updated, error: updateError } = await supabase
    .from('celebs')
    .update({ voice_v: newV })
    .eq('id', celebId)
    .select('id, slug')
    .maybeSingle()
  if (updateError) throw updateError
  if (!updated) throw new Error('셀럽을 찾을 수 없습니다.')

  // celebs.voice_v — 음성 파일 캐시 버스터, 대사 음성 URL에 붙는다
  await revalidateWebCeleb(celebId, updated.slug, [CACHE_TAGS.CELEBS, CACHE_TAGS.DIALOGUES])
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
  await requireAdmin()
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

/** has_voice 활성화 */
export async function enableHasVoice(celebId: string): Promise<void> {
  await requireAdmin()
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('celebs')
    .update({ has_voice: true })
    .eq('id', celebId)
    .select('id, slug')
    .maybeSingle()
  if (error) throw error
  if (!data) throw new Error('셀럽을 찾을 수 없습니다.')

  // celebs.has_voice — 대사 음성 재생 여부를 가른다
  await revalidateWebCeleb(celebId, data.slug, [CACHE_TAGS.CELEBS, CACHE_TAGS.DIALOGUES])
}

/** voice_id 저장 */
export async function saveVoiceId(
  celebId: string,
  locale: 'ko' | 'en',
  voiceId: string,
): Promise<{ success: boolean; error?: string }> {
  await requireAdmin()
  const supabase = createAdminClient()
  const col = locale === 'ko' ? 'voice_id_ko' : 'voice_id_en'
  const { data, error } = await supabase
    .from('celebs')
    .update({ [col]: voiceId })
    .eq('id', celebId)
    .select('id, slug')
    .maybeSingle()
  if (error) return { success: false, error: error.message }
  if (!data) return { success: false, error: '셀럽을 찾을 수 없습니다.' }
  // celebs.voice_id_ko/en — 대사 음성 합성에 쓰이는 셀럽 컬럼
  await revalidateWebCeleb(celebId, data.slug, [CACHE_TAGS.CELEBS, CACHE_TAGS.DIALOGUES])
  return { success: true }
}
