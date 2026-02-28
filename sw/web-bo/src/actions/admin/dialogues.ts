'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface DialogueLines {
  greeting: [string, string, string]
  select: [string, string, string]
  deploy: [string, string, string]
  battle_win: [string, string, string]
  battle_draw: [string, string, string]
  battle_lose: [string, string, string]
  clash_attack: [string, string, string]
}

export interface CelebDialogueItem {
  id: string
  nickname: string | null
  avatar_url: string | null
  profession: string | null
  speech_tone: string | null
  dialogue_lines: DialogueLines | null
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
      `id, nickname, avatar_url, profession, speech_tone,
       celeb_dialogues(lines)`,
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
      dialogue_lines:
        dlg?.lines && Object.keys(dlg.lines).length > 0
          ? (dlg.lines as DialogueLines)
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
  const supabase = await createClient()

  const { error } = await supabase
    .from('profiles')
    .update({ speech_tone: tone })
    .eq('id', celebId)

  if (error) throw error

  revalidatePath('/celebs/dialogues')
}
// #endregion

// #region getCelebDialogues
export async function getCelebDialogues(
  celebId: string,
): Promise<DialogueLines | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('celeb_dialogues')
    .select('lines')
    .eq('celeb_id', celebId)
    .maybeSingle()

  if (error) throw error
  if (!data?.lines || Object.keys(data.lines).length === 0) return null

  return data.lines as DialogueLines
}
// #endregion

// #region saveCelebDialogues
export async function saveCelebDialogues(
  celebId: string,
  lines: DialogueLines,
): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('celeb_dialogues')
    .upsert(
      { celeb_id: celebId, lines, updated_at: new Date().toISOString() },
      { onConflict: 'celeb_id' },
    )

  if (error) throw error

  revalidatePath('/celebs/dialogues')
}
// #endregion
