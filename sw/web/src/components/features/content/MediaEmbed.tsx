'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { ExternalLink, Music } from 'lucide-react'
import { getMediaEmbed, type MediaEmbedResult } from '@/actions/contents/getMediaEmbed'
import type { ContentType } from '@/types/database'

interface MediaEmbedProps {
  contentId: string
  type: ContentType
}

// Apple Music 30초 미리듣기 — 외부 iframe 없이 우리 플레이어로 직접 재생한다.
function AppleMusicPreview({ src, appleMusicUrl }: { src: string; appleMusicUrl?: string | null }) {
  const t = useTranslations('contentDetail.appleMusic')
  return (
    <div className="space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#fa2d48] via-[#d52d8c] to-[#7d3cff] text-white shadow-sm">
            <Music size={14} fill="currentColor" />
          </span>
          <span className="truncate text-xs font-semibold text-text-primary">{t('label')}</span>
        </div>
        {appleMusicUrl && (
          <a
            href={appleMusicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-accent hover:bg-accent/10"
          >
            {t('listen')}
            <ExternalLink size={11} />
          </a>
        )}
      </div>
      <audio src={src} controls preload="none" className="w-full rounded-xl" />
      <p className="text-[11px] text-text-secondary">{t('previewNotice')}</p>
    </div>
  )
}

export default function MediaEmbed({ contentId, type }: MediaEmbedProps) {
  const requestKey = `${contentId}:${type}`
  const supportsEmbed = type === 'VIDEO' || type === 'GAME' || type === 'MUSIC'
  const [result, setResult] = useState<{ key: string; embed: MediaEmbedResult | null } | null>(null)

  useEffect(() => {
    // VIDEO, GAME, MUSIC 모두 서버 액션 호출
    if (!supportsEmbed) return

    let cancelled = false
    getMediaEmbed(contentId, type)
      .then((embed) => {
        if (!cancelled) setResult({ key: requestKey, embed })
      })
      .catch(() => {
        if (!cancelled) setResult({ key: requestKey, embed: null })
      })
    return () => {
      cancelled = true
    }
  }, [contentId, requestKey, supportsEmbed, type])

  if (!supportsEmbed) return null

  const loading = result?.key !== requestKey
  const embed = loading ? null : (result?.embed ?? null)

  // MUSIC: Apple Music 미리듣기만 렌더링
  if (type === 'MUSIC') {
    if (loading) {
      return <div className="w-full h-[152px] rounded-xl bg-white/5 animate-shimmer" />
    }
    if (embed?.embedType === 'appleMusicPreview') {
      return embed.previewUrl
        ? <AppleMusicPreview src={embed.previewUrl} appleMusicUrl={embed.appleMusicUrl} />
        : null
    }
    return null
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
