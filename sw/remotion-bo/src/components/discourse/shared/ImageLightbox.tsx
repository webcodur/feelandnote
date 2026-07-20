'use client'

/**
 * 사진 원본 크게 보기 — 콘티에서 사진을 누르면 화면 가득 띄운다.
 *
 * 담화 사진은 1:1 정사각이고 세로 영상에 꽉 차게 들어간다. 작은 미리보기로는
 * 얼굴·손·소품이 중앙에 제대로 모였는지 판단할 수 없어 원본 크기 확인 통로를 둔다.
 * 좌우 이동을 받아 한 발언의 사진들을 넘겨 보며 같은 촬영처럼 이어지는지 대조한다.
 */

import { useCallback, useEffect } from 'react'
import { X, ChevronLeft, ChevronRight } from '@/components/faction/shared/icons'

export type LightboxShot = {
  src: string
  /** 파일 경로 — 어느 사진인지 식별 */
  path: string
  /** 이 사진이 떠 있는 동안 나오는 대사 */
  caption?: string
  /** 언제 나오는지 (예: 발언 시작 / 3번째 덩어리부터) */
  when?: string
}

export function ImageLightbox({
  shots, index, onClose, onIndex,
}: {
  shots: LightboxShot[]
  /** null 이면 닫힌 상태 */
  index: number | null
  onClose: () => void
  onIndex: (next: number) => void
}) {
  const open = index != null && shots.length > 0
  const move = useCallback((delta: number) => {
    if (index == null || shots.length === 0) return
    onIndex((index + delta + shots.length) % shots.length)
  }, [index, shots.length, onIndex])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft') move(-1)
      else if (e.key === 'ArrowRight') move(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, move])

  if (!open) return null
  const shot = shots[index]
  if (!shot) return null

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-black/85 p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <button
        onClick={onClose}
        className="absolute end-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/25"
        title="닫기 (Esc)"
      >
        <X size={20} />
      </button>

      {shots.length > 1 && (
        <>
          <button
            onClick={e => { e.stopPropagation(); move(-1) }}
            className="absolute start-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/25"
            title="이전 사진 (←)"
          >
            <ChevronLeft size={24} />
          </button>
          <button
            onClick={e => { e.stopPropagation(); move(1) }}
            className="absolute end-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/25"
            title="다음 사진 (→)"
          >
            <ChevronRight size={24} />
          </button>
        </>
      )}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={shot.src}
        alt=""
        onClick={e => e.stopPropagation()}
        className="max-h-[78vh] max-w-[78vw] rounded-lg object-contain shadow-2xl"
      />

      <div className="max-w-[78vw] space-y-1 text-center" onClick={e => e.stopPropagation()}>
        {shot.caption && <p className="text-sm leading-relaxed text-white/90">{shot.caption}</p>}
        <p className="font-mono text-[11px] text-white/50">
          {shot.when ? `${shot.when} · ` : ''}{shot.path}
          {shots.length > 1 && ` · ${index + 1}/${shots.length}`}
        </p>
      </div>
    </div>
  )
}
