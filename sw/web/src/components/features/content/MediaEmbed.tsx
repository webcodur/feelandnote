'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { useTranslations } from 'next-intl'
import { ExternalLink, Music } from 'lucide-react'
import { getMediaEmbed, type MediaEmbedResult } from '@/actions/contents/getMediaEmbed'
import type { ContentType } from '@/types/database'
import { PendingBlock } from '@/components/ui/pending'
import ContentImageGalleryPlaceholder from './ContentImageGalleryPlaceholder'

interface MediaEmbedProps {
  contentId: string
  type: ContentType
  showImages?: boolean
  title?: string
}

const ContentImageGallery = dynamic(() => import('./ContentImageGallery'), { loading: ContentImageGalleryPlaceholder })

// 탭을 다시 열면 이미 받은 자료를 바로 쓴다. 실패한 요청은 저장하지 않는다.
const MEDIA_CACHE_MS = 60_000
const MEDIA_CACHE_LIMIT = 32
const mediaCache = new Map<string, { embed: MediaEmbedResult; expires: number }>()
const pendingMedia = new Map<string, Promise<MediaEmbedResult>>()
function readMedia(key: string) {
  const entry = mediaCache.get(key)
  if (entry && entry.expires > Date.now()) return entry.embed
  mediaCache.delete(key)
  return undefined
}
function loadMedia(key: string, contentId: string, type: ContentType, showImages: boolean) {
  const pending = pendingMedia.get(key)
  if (pending) return pending
  const request = getMediaEmbed(contentId, type, showImages).then(embed => {
    mediaCache.delete(key)
    mediaCache.set(key, { embed, expires: Date.now() + MEDIA_CACHE_MS })
    if (mediaCache.size > MEDIA_CACHE_LIMIT) mediaCache.delete(mediaCache.keys().next().value!)
    return embed
  }).finally(() => pendingMedia.delete(key))
  pendingMedia.set(key, request)
  return request
}

function MediaGallery({ images, title, type }: { images: string[]; title: string; type: ContentType }) {
  const t = useTranslations('contentDetail')
  return <ContentImageGallery images={images} title={title} label={t(type === 'VIDEO' ? 'stills' : 'screenshots')} />
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

export default function MediaEmbed({ contentId, type, showImages = false, title = '' }: MediaEmbedProps) {
  const requestKey = `${contentId}:${type}:${showImages}`
  const supportsEmbed = type === 'VIDEO' || type === 'GAME' || type === 'MUSIC'
  const [result, setResult] = useState<{ key: string; embed: MediaEmbedResult | null } | null>(null)
  const cached = readMedia(requestKey)

  useEffect(() => {
    // VIDEO, GAME, MUSIC 모두 서버 액션 호출
    if (!supportsEmbed || cached !== undefined) return

    let cancelled = false
    loadMedia(requestKey, contentId, type, showImages)
      .then((embed) => {
        if (!cancelled) setResult({ key: requestKey, embed })
      })
      .catch(() => {
        if (!cancelled) setResult({ key: requestKey, embed: null })
      })
    return () => {
      cancelled = true
    }
  }, [cached, contentId, requestKey, showImages, supportsEmbed, type])

  if (!supportsEmbed) return null

  const loading = cached === undefined && result?.key !== requestKey
  const embed = cached ?? (loading ? null : (result?.embed ?? null))

  // MUSIC: Apple Music 미리듣기만 렌더링
  if (type === 'MUSIC') {
    if (loading) {
      return <PendingBlock variant="panel" minHeight="min-h-[152px]" className="[&>div:first-child]:h-auto" />
    }
    if (embed?.embedType === 'appleMusicPreview') {
      return embed.previewUrl
        ? <AppleMusicPreview src={embed.previewUrl} appleMusicUrl={embed.appleMusicUrl} />
        : null
    }
    return null
  }

  if (loading) {
    return <PendingBlock variant="panel" className="[&>div:first-child]:h-auto">
      <div className="space-y-5">
        {showImages && <ContentImageGalleryPlaceholder />}
        <div className="w-full aspect-video rounded-lg border border-line bg-bg-card" />
      </div>
    </PendingBlock>
  }

  if (!embed?.embedId && !embed?.images?.length) return null

  return (
    <div className="space-y-5">
      {showImages && !!embed?.images?.length && <MediaGallery images={embed.images} title={title} type={type} />}
      {embed?.embedId && <div className="w-full aspect-video rounded-lg overflow-hidden">
      <iframe
        src={`https://www.youtube.com/embed/${embed.embedId}`}
        title={title ? `${title} · YouTube` : 'YouTube'}
        width="100%"
        height="100%"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        loading="lazy"
      />
      </div>}
    </div>
  )
}
