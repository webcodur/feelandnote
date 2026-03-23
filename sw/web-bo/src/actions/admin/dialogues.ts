'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

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

export interface CelebDialogueItem {
  id: string
  nickname: string | null
  avatar_url: string | null
  profession: string | null
  speech_tone: string | null
  voice_speed: number
  dialogue_lines: DialogueLines | null
  dialogue_lines_en: DialogueLines | null
}

// #region getCelebsForDialogueEdit
export async function getCelebsForDialogueEdit(
  page: number = 1,
  limit: number = 50,
): Promise<{ celebs: CelebDialogueItem[]; total: number }> {
  const supabase = await createClient()
  const offset = (page - 1) * limit

  const { data, error, count } = await supabase
    .from('profiles')
    .select(
      `id, nickname, avatar_url, profession, speech_tone, voice_speed,
       celeb_dialogues(lines, lines_en)`,
      { count: 'exact' },
    )
    .eq('profile_type', 'CELEB')
    .eq('status', 'active')
    .not('death_date', 'is', null)
    .order('nickname', { ascending: true })
    .range(offset, offset + limit - 1)

  if (error) throw error

  const celebs: CelebDialogueItem[] = (data || []).map((row) => {
    const dlg = Array.isArray(row.celeb_dialogues)
      ? row.celeb_dialogues[0]
      : row.celeb_dialogues

    return {
      id: row.id,
      nickname: row.nickname,
      avatar_url: row.avatar_url,
      profession: row.profession,
      speech_tone: row.speech_tone ?? null,
      voice_speed: (row as Record<string, unknown>).voice_speed as number ?? 1.0,
      dialogue_lines:
        dlg?.lines && Object.keys(dlg.lines).length > 0
          ? (dlg.lines as DialogueLines)
          : null,
      dialogue_lines_en:
        dlg?.lines_en && Object.keys(dlg.lines_en).length > 0
          ? (dlg.lines_en as DialogueLines)
          : null,
    }
  })

  return { celebs, total: count || 0 }
}
// #endregion

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

  revalidatePath('/celebs/dialogues')
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

  revalidatePath('/celebs/dialogues')
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

  revalidatePath('/celebs/dialogues')
  revalidatePath('/celebs/voice-gen')
}
// #endregion
