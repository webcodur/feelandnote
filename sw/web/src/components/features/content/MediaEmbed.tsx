'use client'

import { useEffect, useState } from 'react'
import { getMediaEmbed, type MediaEmbedResult, type SpotifyEntityType } from '@/actions/contents/getMediaEmbed'
import type { ContentType } from '@/types/database'

interface MediaEmbedProps {
  contentId: string
  type: ContentType
}

// Spotify 임베드 (entity 타입에 따라 track/album URL 구분)
function SpotifyEmbed({ contentId, entity }: { contentId: string; entity: SpotifyEntityType }) {
  const spotifyId = contentId.replace(/^spotify[-_]/, '')

  return (
    <div className="space-y-1.5">
      <iframe
        src={`https://open.spotify.com/embed/${entity}/${spotifyId}?utm_source=generator&theme=0`}
        width="100%"
        height={entity === 'album' ? '380' : '152'}
        frameBorder="0"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        className="rounded-xl"
      />
      <p className="text-[11px] text-text-tertiary">
        <span className="block mb-0.5">모바일 브라우저에서는 30초만 듣기가 가능합니다.</span>
        PC에서는 {' '}
        <a
          href="https://accounts.spotify.com/login"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#1DB954] hover:underline"
        >
          Spotify 로그인
        </a>
        {' '}후 돌아오시면 음악을 끝까지 감상할 수 있습니다. Spotify 성인 인증 시 모든 곡을 감상할 수 있습니다.
      </p>
    </div>
  )
}

export default function MediaEmbed({ contentId, type }: MediaEmbedProps) {
  const [embed, setEmbed] = useState<MediaEmbedResult | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // VIDEO, GAME, MUSIC 모두 서버 액션 호출 (MUSIC은 entity 타입 판별 필요)
    if (type !== 'VIDEO' && type !== 'GAME' && type !== 'MUSIC') return

    setLoading(true)
    getMediaEmbed(contentId, type)
      .then(setEmbed)
      .catch(() => setEmbed(null))
      .finally(() => setLoading(false))
  }, [contentId, type])

  // MUSIC: entity 타입에 따라 렌더링
  if (type === 'MUSIC') {
    if (loading) {
      return <div className="w-full h-[152px] rounded-xl bg-white/5 animate-shimmer" />
    }
    // embed 결과가 있으면 spotifyEntity 사용, 없으면 album으로 fallback (검색 결과는 대부분 album)
    const entity = embed?.spotifyEntity ?? 'album'
    return <SpotifyEmbed contentId={contentId} entity={entity} />
  }

  if (loading) {
    return <div className="w-full aspect-video rounded-lg bg-white/5 animate-shimmer" />
  }

  if (!embed?.embedType || !embed.embedId) return null

  return (
    <div className="w-full aspect-video rounded-lg overflow-hidden">
      <iframe
        src={`https://www.youtube.com/embed/${embed.embedId}`}
        width="100%"
        height="100%"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        loading="lazy"
      />
    </div>
  )
}
