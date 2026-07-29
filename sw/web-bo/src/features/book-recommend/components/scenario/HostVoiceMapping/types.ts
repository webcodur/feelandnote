export type ElevenVoice = {
  voice_id: string
  name: string
  category: string | null
  labels: Record<string, string> | null
  preview_url: string | null
  description: string | null
  /** 음성이 속한 ElevenLabs 계정(목록 API가 음성마다 붙여준다). */
  account?: { id: string; label: string } | null
}

export type DbVoice = {
  id: string
  slug: string | null
  nickname: string | null
  voice_id_ko: string | null
  voice_id_en: string | null
}

export type SaveScope = 'episode' | 'db' | 'both'

// 부모가 받아 처리할 콜백 시그니처 재export
export type HostVoiceApply = (voiceId: string, scope: SaveScope) => Promise<{ ok: boolean; message: string }>
