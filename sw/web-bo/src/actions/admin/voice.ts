'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/admin-auth'
import { uploadToR2, deleteFromR2, R2_PUBLIC_URL } from '@/lib/r2'
import {
  DIALOGUE_TYPES, TYPE_PREFIX, VARIANTS, LOCALES,
  voiceR2Key,
} from '@/lib/voice-path'
import { revalidateWebCeleb } from '@/lib/revalidate-web'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'

/** 음성 파일 업로드 (단일, VoiceSection 수동 업로드용) */
export async function uploadVoiceFile(
  celebId: string,
  locale: 'ko' | 'en',
  fileName: string,
  formData: FormData,
): Promise<{ success: boolean; error?: string }> {
  await requireAdmin()
  const file = formData.get('file') as File | null
  if (!file) return { success: false, error: '파일이 없다.' }

  const buffer = Buffer.from(await file.arrayBuffer())
  const key = voiceR2Key(celebId, locale, fileName)
  await uploadToR2(key, buffer, 'audio/mpeg')
  return { success: true }
}

/** has_voice 토글 */
export async function toggleHasVoice(
  celebId: string,
  value: boolean,
): Promise<{ success: boolean; error?: string }> {
  await requireAdmin()
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('celebs')
    .update({ has_voice: value })
    .eq('id', celebId)
    .select('id, slug')
    .maybeSingle()
  if (error) return { success: false, error: error.message }
  if (!data) return { success: false, error: '셀럽을 찾을 수 없습니다.' }
  // celebs.has_voice — 이 인물의 상세과 관련 목록만 갱신한다.
  await revalidateWebCeleb(celebId, data.slug, [CACHE_TAGS.CELEBS, CACHE_TAGS.DIALOGUES])
  return { success: true }
}

/** 인물의 음성 파일 목록 확인 (R2 URL HEAD)
 *  files 키 형식: "{locale}/{type}-{variant}" (e.g. "ko/greeting-1", "en/quote")
 */
export async function getVoiceStatus(celebId: string): Promise<{
  hasVoice: boolean
  voiceV: number
  files: Record<string, boolean>
}> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('celebs')
    .select('has_voice, voice_v')
    .eq('id', celebId)
    .single()

  if (error) throw new Error(`Failed to load celeb voice status: ${error.message}`)

  const voiceV = (data as Record<string, unknown>)?.voice_v as number ?? 0
  const checks: Promise<[string, boolean]>[] = []

  for (const locale of LOCALES) {
    for (const type of DIALOGUE_TYPES) {
      const prefix = TYPE_PREFIX[type]
      for (const v of VARIANTS) {
        const key = `${locale}/${type}-${v}`
        const url = `${R2_PUBLIC_URL}/${voiceR2Key(celebId, locale, `${prefix}${v}.mp3`)}`
        checks.push(
          fetch(url, { method: 'HEAD' })
            .then((res) => [key, res.ok] as [string, boolean])
            .catch(() => [key, false] as [string, boolean]),
        )
      }
    }
    const qKey = `${locale}/quote`
    const qUrl = `${R2_PUBLIC_URL}/${voiceR2Key(celebId, locale, 'quote.mp3')}`
    checks.push(
      fetch(qUrl, { method: 'HEAD' })
        .then((res) => [qKey, res.ok] as [string, boolean])
        .catch(() => [qKey, false] as [string, boolean]),
    )
  }

  const results = await Promise.all(checks)
  const files: Record<string, boolean> = {}
  for (const [k, v] of results) files[k] = v

  return { hasVoice: data?.has_voice ?? false, voiceV, files }
}

/** 전체 음성 삭제 */
export async function deleteAllVoiceFiles(celebId: string): Promise<{ success: boolean }> {
  await requireAdmin()
  const keys: string[] = []
  for (const locale of LOCALES) {
    for (const type of DIALOGUE_TYPES) {
      const prefix = TYPE_PREFIX[type]
      for (const v of VARIANTS) {
        keys.push(voiceR2Key(celebId, locale, `${prefix}${v}.mp3`))
      }
    }
    keys.push(voiceR2Key(celebId, locale, 'quote.mp3'))
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('celebs')
    .update({ has_voice: false, voice_v: 0 })
    .eq('id', celebId)
    .select('id, slug')
    .maybeSingle()
  if (error) throw error
  if (!data) throw new Error('셀럽을 찾을 수 없습니다.')

  const deletionResults = await Promise.allSettled(keys.map((key) => deleteFromR2(key)))
  const failedDeletionCount = deletionResults.filter((result) => result.status === 'rejected').length

  // celebs.has_voice/voice_v — 음성 전량 삭제, 대사 재생 경로도 무효
  await revalidateWebCeleb(celebId, data.slug, [CACHE_TAGS.CELEBS, CACHE_TAGS.DIALOGUES])
  if (failedDeletionCount > 0) {
    throw new Error(`음성 파일 ${failedDeletionCount}개를 삭제하지 못했습니다.`)
  }
  return { success: true }
}
