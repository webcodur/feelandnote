'use server'

import { unstable_cache } from 'next/cache'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { YOUTUBE_SERIES_PLAYLISTS } from '@/constants/youtube'
import { toFactionVideos } from '@/lib/faction-videos'
import { createStaticClient } from '@/lib/db/static'

const YOUTUBE_FEED_REVALIDATE = 60 * 60 * 6

export interface YoutubeFactionVideo {
  videoId: string
  uploadedAt: string
  title?: string
  part?: number
  names: string[]
  namesEn: string[]
}

export interface YoutubeFactionVideos {
  longform: YoutubeFactionVideo[]
  shorts: YoutubeFactionVideo[]
}

interface FactionYoutubeTagRow {
  name: string
  name_en: string | null
  youtube_videos: unknown
}

interface MutableFactionVideo {
  videoId: string
  uploadedAt: string
  title?: string
  part?: number
  names: Set<string>
  namesEn: Set<string>
}

interface YoutubeFeedVideo {
  videoId: string
  uploadedAt: string
  title: string
}

function decodeXml(value: string) {
  return value
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCodePoint(Number(code)),
    )
    .replace(/&#x([\da-f]+);/gi, (_, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    )
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}

function tagValue(entry: string, tag: string) {
  const match = entry.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`))
  return match ? decodeXml(match[1].trim()) : ''
}

function parseYoutubeFeed(xml: string): YoutubeFeedVideo[] {
  return Array.from(xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g))
    .map((match) => {
      const entry = match[1]
      return {
        videoId: tagValue(entry, 'yt:videoId'),
        uploadedAt: tagValue(entry, 'published'),
        title: tagValue(entry, 'title'),
      }
    })
    .filter((video) => video.videoId && video.title)
}

function playlistId(url: string) {
  return new URL(url).searchParams.get('list')
}

async function fetchYoutubePlaylist(url: string): Promise<YoutubeFeedVideo[]> {
  const id = playlistId(url)
  if (!id) return []

  try {
    const response = await fetch(
      `https://www.youtube.com/feeds/videos.xml?playlist_id=${encodeURIComponent(id)}`,
      {
        cache: 'no-store',
        signal: AbortSignal.timeout(8_000),
      },
    )
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return parseYoutubeFeed(await response.text())
  } catch (error) {
    console.error(`YouTube playlist feed fetch failed (${id})`, error)
    return []
  }
}

function addVideo(
  target: Map<string, MutableFactionVideo>,
  row: FactionYoutubeTagRow,
  video: NonNullable<ReturnType<typeof toFactionVideos>>['longform'],
) {
  if (!video) return

  const uploadedAt = video.uploadedAt ?? ''
  const existing = target.get(video.id)
  if (existing) {
    existing.names.add(row.name)
    existing.namesEn.add(row.name_en ?? row.name)
    if (uploadedAt > existing.uploadedAt) {
      existing.uploadedAt = uploadedAt
    }
    return
  }

  target.set(video.id, {
    videoId: video.id,
    uploadedAt,
    ...(video.part ? { part: video.part } : {}),
    names: new Set([row.name]),
    namesEn: new Set([row.name_en ?? row.name]),
  })
}

function addFeedVideos(
  target: Map<string, MutableFactionVideo>,
  videos: YoutubeFeedVideo[],
) {
  for (const video of videos) {
    const existing = target.get(video.videoId)
    if (existing) {
      existing.title = video.title
      if (video.uploadedAt > existing.uploadedAt) {
        existing.uploadedAt = video.uploadedAt
      }
      continue
    }

    target.set(video.videoId, {
      videoId: video.videoId,
      uploadedAt: video.uploadedAt,
      title: video.title,
      names: new Set(),
      namesEn: new Set(),
    })
  }
}

function finishVideos(source: Map<string, MutableFactionVideo>) {
  return Array.from(source.values())
    .map((video): YoutubeFactionVideo => ({
      videoId: video.videoId,
      uploadedAt: video.uploadedAt,
      ...(video.title ? { title: video.title } : {}),
      ...(video.part ? { part: video.part } : {}),
      names: Array.from(video.names),
      namesEn: Array.from(video.namesEn),
    }))
    .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))
}

async function fetchYoutubeFactionVideos(): Promise<YoutubeFactionVideos> {
  const db = createStaticClient()
  const [{ data, error }, fullFeed, shortsFeed] = await Promise.all([
    db
      .from('celeb_tags')
      .select('name, name_en, youtube_videos')
      .eq('is_featured', true)
      .not('youtube_videos', 'is', null)
      .order('sort_order', { ascending: true }),
    fetchYoutubePlaylist(YOUTUBE_SERIES_PLAYLISTS.ko.faction.full),
    fetchYoutubePlaylist(YOUTUBE_SERIES_PLAYLISTS.ko.faction.shorts),
  ])

  if (error) {
    throw new Error(`세력도감 유튜브 영상 조회 실패: ${error.message}`)
  }

  const longform = new Map<string, MutableFactionVideo>()
  const shorts = new Map<string, MutableFactionVideo>()

  for (const row of (data ?? []) as FactionYoutubeTagRow[]) {
    const videos = toFactionVideos(row.youtube_videos)
    if (!videos) continue
    addVideo(longform, row, videos.longform)
    addVideo(shorts, row, videos.shorts)
  }

  addFeedVideos(longform, fullFeed)
  addFeedVideos(shorts, shortsFeed)

  return {
    longform: finishVideos(longform),
    shorts: finishVideos(shorts),
  }
}

const getYoutubeFactionVideosCached = unstable_cache(
  fetchYoutubeFactionVideos,
  ['youtube-faction-videos-v2'],
  {
    revalidate: YOUTUBE_FEED_REVALIDATE,
    tags: [CACHE_TAGS.TAGS],
  },
)

/** 출간된 세력 태그에 연결된 공개 유튜브 영상을 중복 없이 반환한다. */
export async function getYoutubeFactionVideos(): Promise<YoutubeFactionVideos> {
  return getYoutubeFactionVideosCached()
}
