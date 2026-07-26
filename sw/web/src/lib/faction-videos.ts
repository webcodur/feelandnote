/**
 * 테마에 걸린 세력도 영상·배경음악 — 저장된 값을 화면이 쓰는 형태로 푼다.
 *
 * 원천은 제작 쪽이고 관리자 출간이 `celeb_tags.youtube_videos`·`celeb_tags.theme_music` 에 실어 나른다.
 * 영상은 공개(public) 상태를, 음악은 실제로 흐르는 곡인지를 이미 확인해 저장하므로
 * 여기서는 모양만 확인한다.
 * 서버 액션 파일(`'use server'`)은 비동기 함수만 내보낼 수 있어 이 자리에 둔다.
 */

/** 이 테마를 다룬 영상 한 편 */
export interface FactionVideo {
  /** 유튜브 영상 id */
  id: string
  /** 짧은 영상의 편 번호 — 편을 나누지 않았으면 없다 */
  part?: number
}

/** 테마에 걸린 영상. 둘 다 없으면 null 로 다룬다 */
export interface FactionVideos {
  longform: FactionVideo | null
  shorts: FactionVideo | null
}

/** 이 테마 구간에서 흐르는 배경음악 한 곡 */
export interface FactionMusic {
  /** 재생 주소 */
  url: string
  /** 곡 파일 이름 — 되짚기용(화면에 그대로 쓰지는 않는다) */
  file: string
}

function toVideo(raw: unknown): FactionVideo | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const id = typeof r.id === 'string' ? r.id.trim() : ''
  if (!id) return null
  const part = typeof r.part === 'number' && r.part > 0 ? r.part : undefined
  return part ? { id, part } : { id }
}

/** `celeb_tags.youtube_videos`(jsonb) → 화면 형태. 모양이 어긋나거나 비었으면 null */
export function toFactionVideos(v: unknown): FactionVideos | null {
  if (!v || typeof v !== 'object') return null
  const row = v as Record<string, unknown>
  const longform = toVideo(row.longform)
  const shorts = toVideo(row.shorts)
  if (!longform && !shorts) return null
  return { longform, shorts }
}

/** `celeb_tags.theme_music`(jsonb) → 화면 형태. 재생 주소가 없으면 null */
export function toFactionMusic(v: unknown): FactionMusic | null {
  if (!v || typeof v !== 'object') return null
  const row = v as Record<string, unknown>
  const url = typeof row.url === 'string' ? row.url.trim() : ''
  if (!url) return null
  return { url, file: typeof row.file === 'string' ? row.file.trim() : '' }
}
