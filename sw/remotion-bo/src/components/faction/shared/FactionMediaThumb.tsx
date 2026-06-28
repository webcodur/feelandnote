'use client'

import type { CSSProperties } from 'react'
import { isVideoSrc } from './timing'

/** src 에서 확장자만 뽑는다(쿼리·해시 무시). 못 찾으면 영상/이미지 기본값. */
function srcExt(src: string, video: boolean): string {
  const m = src.match(/\.([a-zA-Z0-9]+)(?:[?#]|$)/)
  return (m?.[1] ?? (video ? 'mp4' : 'img')).toLowerCase()
}

/**
 * 이미지/영상 공용 썸네일 — 영상이면 무음 video(메타데이터만 선로딩해 첫 프레임 노출),
 * 아니면 img. className·style 을 그대로 전달해 기존 <img> 자리와 호환된다.
 *
 * showExt 를 켜면 미디어 위에 확장자 배지(mp4·jpg 등)를 얹어 영상/이미지를 한눈에 구분한다.
 * 이때 className·style 은 바깥 래퍼가 받고, 미디어는 래퍼를 h-full·w-full 로 채운다(fit 으로 맞춤).
 */
export function FactionMediaThumb({
  src, alt = '', className, style, autoPlay = false, showExt = false, fit = 'cover',
}: {
  src: string
  alt?: string
  className?: string
  style?: CSSProperties
  autoPlay?: boolean
  /** 확장자 배지 + 영상 재생 표식 노출 */
  showExt?: boolean
  /** showExt 일 때 미디어 채움 방식 */
  fit?: 'cover' | 'contain'
}) {
  const video = isVideoSrc(src)

  if (!showExt) {
    if (video) {
      return <video src={src} className={className} style={style} muted loop playsInline autoPlay={autoPlay} preload="metadata" />
    }
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} className={className} style={style} />
  }

  const ext = srcExt(src, video)
  const fitCls = fit === 'contain' ? 'object-contain' : 'object-cover'
  return (
    <span className={`relative block overflow-hidden ${className ?? ''}`} style={style}>
      {video ? (
        <video src={src} className={`h-full w-full ${fitCls}`} muted loop playsInline autoPlay={autoPlay} preload="metadata" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className={`h-full w-full ${fitCls}`} />
      )}
      {/* 확장자 배지 — 영상은 강조색, 이미지는 무채색 */}
      <span
        className={`pointer-events-none absolute bottom-0 right-0 rounded-tl px-1 py-px text-[9px] font-bold uppercase leading-none text-white ${
          video ? 'bg-rose-600/90' : 'bg-black/70'
        }`}
      >
        {video ? `▶ ${ext}` : ext}
      </span>
    </span>
  )
}
