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
// 편집 대상은 검색 창구(/api/celebs/search)로 고른 뒤 그 한 명만 읽는다
// (voice-gen.ts의 getCelebVoiceDetail).

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

// 대사 조회(getCelebDialogues)는 제거했다. 대사만 따로 읽는 화면이 없어졌고,
// 편집기는 프로필 값까지 함께 필요해 voice-gen.ts의 getCelebVoiceDetail 하나로 읽는다.

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
