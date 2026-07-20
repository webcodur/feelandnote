'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { revalidateWebCache } from '@/lib/revalidate-web'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'

export interface DialogueLines {
  greeting: [string, string, string]
  roll_call: [string, string, string]
  deploy: [string, string, string]
  battle_win: [string, string, string]
  battle_draw: [string, string, string]
  battle_lose: [string, string, string]
  clash_attack: [string, string, string]
  quote?: string
  monologue?: string
}

// 대사 편집 목록(getCelebsForDialogueEdit)은 제거했다. 호출부가 한 번도 없었고,
// /celebs/voice-gen이 쓰는 getCelebsForVoiceGen이 같은 자리를 채운다.

// #region updateSpeechTone
export async function updateSpeechTone(
  celebId: string,
  tone: string,
): Promise<void> {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('profiles')
    .update({ speech_tone: tone })
    .eq('id', celebId)

  if (error) throw error

  revalidatePath('/celebs/[slug]', 'page')
  revalidatePath('/celebs/voice-gen', 'layout')
  // profiles.speech_tone — 프로필 컬럼이지만 대사 재생에 쓰이므로 둘 다
  await revalidateWebCache([CACHE_TAGS.CELEBS, CACHE_TAGS.DIALOGUES])
}
// #endregion

// #region updateVoiceSpeed
export async function updateVoiceSpeed(
  celebId: string,
  speed: number,
): Promise<void> {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('profiles')
    .update({ voice_speed: speed } as Record<string, unknown>)
    .eq('id', celebId)

  if (error) throw error

  revalidatePath('/celebs/[slug]', 'page')
  revalidatePath('/celebs/voice-gen', 'layout')
  // profiles.voice_speed — 프로필 컬럼이자 대사 재생 속도
  await revalidateWebCache([CACHE_TAGS.CELEBS, CACHE_TAGS.DIALOGUES])
}
// #endregion

export interface CelebDialoguesResult {
  lines: DialogueLines | null
  lines_en: DialogueLines | null
}

// #region getCelebDialogues
export async function getCelebDialogues(
  celebId: string,
): Promise<CelebDialoguesResult> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('celeb_dialogues')
    .select('lines, lines_en')
    .eq('celeb_id', celebId)
    .maybeSingle()

  if (error) throw error

  return {
    lines:
      data?.lines && Object.keys(data.lines).length > 0
        ? (data.lines as DialogueLines)
        : null,
    lines_en:
      data?.lines_en && Object.keys(data.lines_en).length > 0
        ? (data.lines_en as DialogueLines)
        : null,
  }
}
// #endregion

// #region saveCelebDialogues
export async function saveCelebDialogues(
  celebId: string,
  lines: DialogueLines | null,
  lines_en: DialogueLines | null,
): Promise<void> {
  const supabase = createAdminClient()

  const payload: Record<string, unknown> = {
    celeb_id: celebId,
    updated_at: new Date().toISOString(),
  }

  if (lines !== null) payload.lines = lines
  if (lines_en !== null) payload.lines_en = lines_en

  const { error } = await supabase
    .from('celeb_dialogues')
    .upsert(payload, { onConflict: 'celeb_id' })

  if (error) throw error

  revalidatePath('/celebs/[slug]', 'page')
  revalidatePath('/celebs/voice-gen', 'layout')
  // celeb_dialogues만 수정
  await revalidateWebCache(CACHE_TAGS.DIALOGUES)
}
// #endregion
