'use server'

import { createClient } from '@/lib/supabase/server'
import { uploadToR2, deleteFromR2, R2_PUBLIC_URL } from '@/lib/r2'

const DIALOGUE_TYPES = ['greeting', 'roll_call', 'deploy', 'battle_win', 'battle_draw', 'battle_lose', 'clash_attack'] as const
const TYPE_PREFIX: Record<string, string> = {
  greeting: 'g', roll_call: 'a', deploy: 'd',
  battle_win: 'bw', battle_draw: 'bd', battle_lose: 'bl', clash_attack: 'c',
}
const VARIANTS = [1, 2, 3]
const LOCALES = ['ko', 'en'] as const

function voiceKey(celebId: string, locale: string, file: string) {
  return `celebs/${celebId}/voice/${locale}/${file}`
}

/** 음성 파일 업로드 (단일) */
export async function uploadVoiceFile(
  celebId: string,
  locale: 'ko' | 'en',
  fileName: string,
  formData: FormData,
): Promise<{ success: boolean; error?: string }> {
  const file = formData.get('file') as File | null
  if (!file) return { success: false, error: '파일이 없다.' }

  const buffer = Buffer.from(await file.arrayBuffer())
  const key = voiceKey(celebId, locale, fileName)
  await uploadToR2(key, buffer, 'audio/mpeg')
  return { success: true }
}

/** has_voice 토글 */
export async function toggleHasVoice(
  celebId: string,
  value: boolean,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('profiles')
    .update({ has_voice: value })
    .eq('id', celebId)
  if (error) return { success: false, error: error.message }
  return { success: true }
}

/** 인물의 음성 파일 목록 확인 (R2 URL ping) */
export async function getVoiceStatus(celebId: string): Promise<{
  hasVoice: boolean
  files: Record<string, boolean>
}> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select('has_voice')
    .eq('id', celebId)
    .single()

  const files: Record<string, boolean> = {}

  for (const locale of LOCALES) {
    for (const type of DIALOGUE_TYPES) {
      const prefix = TYPE_PREFIX[type]
      for (const v of VARIANTS) {
        const url = `${R2_PUBLIC_URL}/${voiceKey(celebId, locale, `${prefix}${v}.mp3`)}`
        try {
          const res = await fetch(url, { method: 'HEAD' })
          files[`${locale}/${prefix}${v}`] = res.ok
        } catch {
          files[`${locale}/${prefix}${v}`] = false
        }
      }
    }
    // quote
    const quoteUrl = `${R2_PUBLIC_URL}/${voiceKey(celebId, locale, 'quote.mp3')}`
    try {
      const res = await fetch(quoteUrl, { method: 'HEAD' })
      files[`${locale}/quote`] = res.ok
    } catch {
      files[`${locale}/quote`] = false
    }
  }

  return { hasVoice: data?.has_voice ?? false, files }
}

/** 전체 음성 삭제 */
export async function deleteAllVoiceFiles(celebId: string): Promise<{ success: boolean }> {
  const keys: string[] = []
  for (const locale of LOCALES) {
    for (const type of DIALOGUE_TYPES) {
      const prefix = TYPE_PREFIX[type]
      for (const v of VARIANTS) {
        keys.push(voiceKey(celebId, locale, `${prefix}${v}.mp3`))
      }
    }
    keys.push(voiceKey(celebId, locale, 'quote.mp3'))
  }

  await Promise.allSettled(keys.map((k) => deleteFromR2(k)))

  const supabase = await createClient()
  await supabase.from('profiles').update({ has_voice: false }).eq('id', celebId)

  return { success: true }
}
