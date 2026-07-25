/**
 * 업로드 기록 ↔ 유튜브 실물 대조.
 *
 * 기록(youtube-lineup.json · faction-lineup.json)은 업로드할 때만 쓰이고 지울 때는 아무도 안 건드린다.
 * 그래서 유튜브에서 영상을 지워도 기록은 남아 "출품됨"이라 답한다 — 이 모듈이 그 어긋남을 잡는다.
 *
 * 쿼터: videos.list = 호출당 1 unit(응답 개수·part 수와 무관). id 를 콤마로 묶어 한 번에 50개까지.
 * 한 에피소드는 기록이 많아야 8건이라 채널당 1회, 즉 KO+EN 합쳐 2 unit 이면 끝난다(일일 한도 10,000).
 */

import { ytGetStrict, YouTubeApiError } from './youtube-client'

/** 유튜브에 있는 영상의 공개 상태 + 없는 경우(missing) + 판정 보류(unknown) */
export type LiveState = 'public' | 'unlisted' | 'private' | 'missing' | 'unknown'

export type UploadRecordLike = {
  videoId: string
  uploadedAt: string
  bookFolder?: string
  titleAtUpload?: string
}

export type LiveVideo = UploadRecordLike & { state: LiveState }

export type LiveCheck = {
  checkedAt: string
  /** 조회가 실패한 채널의 사유. 해당 채널 기록은 전부 unknown 이 된다(삭제로 오인하지 않는다). */
  errors: string[]
  videos: Record<string, LiveVideo>
}

type YTStatusItem = { id: string; status?: { privacyStatus?: string } }
type YTStatusList = { items?: YTStatusItem[] }

const BATCH = 50

/** variant 키의 채널 — en- 접두사만 EN, 나머지는 KO(세력도는 전부 KO) */
export function channelOfVariant(variantKey: string): 'ko' | 'en' {
  return variantKey.startsWith('en-') ? 'en' : 'ko'
}

/**
 * videoId 목록의 공개 상태를 조회한다. 응답에 없는 id = 유튜브에 없는 영상.
 * **실패하면 던진다** — 호출부가 "없음"과 "못 물어봤음"을 구별할 수 있어야 한다.
 *
 * 비공개(private) 영상도 소유 채널의 토큰으로 조회하면 그대로 돌아온다.
 * 따라서 응답에서 빠졌다는 건 비공개 전환이 아니라 실제 삭제(또는 다른 채널 소유)를 뜻한다.
 */
export async function fetchPrivacyStatuses(
  channel: 'ko' | 'en',
  videoIds: string[],
): Promise<Map<string, string>> {
  const found = new Map<string, string>()
  for (let i = 0; i < videoIds.length; i += BATCH) {
    const ids = videoIds.slice(i, i + BATCH).join(',')
    const data = await ytGetStrict<YTStatusList>(channel, 'videos', { part: 'status', id: ids })
    for (const v of data.items ?? []) found.set(v.id, v.status?.privacyStatus ?? 'public')
  }
  return found
}

function toLiveState(privacy: string | undefined): LiveState {
  if (privacy === 'private' || privacy === 'unlisted' || privacy === 'public') return privacy
  // 유튜브가 새 값을 주더라도 "살아있음"은 확실하다 — 삭제로 뒤집지 않는다.
  return 'public'
}

/**
 * 업로드 기록 전체를 유튜브와 대조한다.
 *
 * 기록이 없으면 null(조회 자체를 하지 않는다 — 쿼터 0).
 * 채널 조회가 실패하면 그 채널 기록만 unknown 으로 두고 사유를 errors 에 남긴다.
 */
export async function checkUploadsLive(
  uploads: Record<string, UploadRecordLike> | null | undefined,
  channelOf: (variantKey: string) => 'ko' | 'en' = channelOfVariant,
): Promise<LiveCheck | null> {
  const entries = Object.entries(uploads ?? {}).filter(([, r]) => r?.videoId)
  if (entries.length === 0) return null

  const byChannel = new Map<'ko' | 'en', string[]>()
  for (const [key, rec] of entries) {
    const ch = channelOf(key)
    const list = byChannel.get(ch) ?? []
    list.push(rec.videoId)
    byChannel.set(ch, list)
  }

  const privacy = new Map<string, string>()
  const failed = new Set<'ko' | 'en'>()
  const errors: string[] = []

  for (const [channel, ids] of byChannel) {
    try {
      const found = await fetchPrivacyStatuses(channel, ids)
      for (const [id, p] of found) privacy.set(id, p)
    } catch (e) {
      failed.add(channel)
      errors.push(e instanceof YouTubeApiError ? e.message : `${channel.toUpperCase()} 조회 실패: ${String(e)}`)
    }
  }

  const videos: Record<string, LiveVideo> = {}
  for (const [key, rec] of entries) {
    const state: LiveState = failed.has(channelOf(key))
      ? 'unknown'
      : privacy.has(rec.videoId) ? toLiveState(privacy.get(rec.videoId)) : 'missing'
    videos[key] = { ...rec, state }
  }

  return { checkedAt: new Date().toISOString(), errors, videos }
}
