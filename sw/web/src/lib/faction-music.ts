/**
 * 테마에 걸린 배경음악 — 저장된 값(`celeb_tags.theme_music`)을 화면이 쓰는 형태로 푼다.
 *
 * 여기서는 모양만 확인한다.
 * 서버 액션 파일(`'use server'`)은 비동기 함수만 내보낼 수 있어 이 자리에 둔다.
 */

/** 이 테마 구간에서 흐르는 배경음악 한 곡 */
export interface FactionMusic {
  /** 재생 주소 */
  url: string
  /** 곡 파일 이름 — 되짚기용(화면에 그대로 쓰지는 않는다) */
  file: string
}

/** `celeb_tags.theme_music`(jsonb) → 화면 형태. 재생 주소가 없으면 null */
export function toFactionMusic(v: unknown): FactionMusic | null {
  if (!v || typeof v !== 'object') return null
  const row = v as Record<string, unknown>
  const url = typeof row.url === 'string' ? row.url.trim() : ''
  if (!url) return null
  return { url, file: typeof row.file === 'string' ? row.file.trim() : '' }
}
