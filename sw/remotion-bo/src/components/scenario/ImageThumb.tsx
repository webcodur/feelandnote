'use client'

import { useState, useRef } from 'react'
import type { CinematicImage, AnchorPick } from './types'
import { stripExt } from './utils'

/** 이미지 풀에서 드래그할 수 있는 이미지 카드 */
export function DraggableImage({ fileName, imageBaseUrl, onDrop, onDelete }: {
  fileName: string; imageBaseUrl: string; onDrop: () => void; onDelete?: () => void
}) {
  const [err, setErr] = useState(false)
  return (
    <div
      draggable
      onDragStart={e => { e.dataTransfer.setData('text/plain', fileName); e.dataTransfer.effectAllowed = 'copy' }}
      className="group/pool rounded overflow-hidden border border-border/30 cursor-grab active:cursor-grabbing hover:border-accent/50 transition-colors relative"
    >
      <div className="aspect-[16/10] bg-bg-main relative">
        {err ? (
          <div className="w-full h-full flex items-center justify-center text-[10px] text-text-secondary">{stripExt(fileName)}</div>
        ) : (
          <img src={`${imageBaseUrl}/${fileName}`} alt="" className="w-full h-full object-cover" onError={() => setErr(true)} />
        )}
        {onDelete && (
          <button
            onClick={e => { e.stopPropagation(); if (confirm(`"${stripExt(fileName)}" 휴지통으로 이동?`)) onDelete() }}
            className="absolute top-0.5 right-0.5 w-5 h-5 flex items-center justify-center rounded-full bg-black/80 text-red-400 hover:text-red-200 hover:bg-red-500/80 text-sm font-bold opacity-0 group-hover/pool:opacity-100 transition-all"
          >&times;</button>
        )}
      </div>
      <div className="flex items-center justify-between px-1 py-0.5">
        <span className="text-[10px] text-text-secondary truncate">{stripExt(fileName)}</span>
        <button onClick={onDrop} className="text-[10px] text-accent hover:underline shrink-0">추가</button>
      </div>
    </div>
  )
}

/** 인라인 이미지 행 — 롱폼 책 섹션용. 여러 CinematicImage를 한 행에 표시 */
export function InlineImageRow({ images, allImages, imageBaseUrl, bookIdx, picking, anchorPick,
  onReplace, onRemove, onStartPick, onCancelPick }: {
  images: CinematicImage[]; allImages: CinematicImage[]; imageBaseUrl: string; bookIdx: number
  picking: boolean; anchorPick: AnchorPick
  onReplace: (bookIdx: number, imgIdx: number, fileName: string) => void
  onRemove: (bookIdx: number, imgIdx: number) => void
  onStartPick: (globalIdx: number) => void; onCancelPick: () => void
}) {
  if (!images.length) return null
  return (
    <div className="flex gap-1.5 py-1 flex-wrap">
      {images.map(img => {
        const gi = allImages.indexOf(img)
        const isPicking = picking && anchorPick?.imgIdx === gi
        return <InlineThumb key={`it-${gi}`} img={img} index={gi} imageBaseUrl={imageBaseUrl}
          isPicking={isPicking}
          onReplace={fn => onReplace(bookIdx, gi, fn)}
          onRemove={() => onRemove(bookIdx, gi)}
          onStartPick={() => onStartPick(gi)}
          onCancelPick={onCancelPick}
        />
      })}
    </div>
  )
}

/** 인라인 썸네일 — 롱폼 앵커 시스템 포함. 쇼츠에서도 단순 모드로 재사용 */
export function InlineThumb({ img, index, imageBaseUrl, isPicking, onReplace, onRemove, onStartPick, onCancelPick }: {
  img: CinematicImage; index: number; imageBaseUrl: string; isPicking: boolean
  onReplace: (fileName: string) => void; onRemove: () => void
  onStartPick: () => void; onCancelPick: () => void
}) {
  const [over, setOver] = useState(false)
  const [err, setErr] = useState(false)
  const isEmpty = !img.file
  const prevFile = useRef(img.file)
  if (prevFile.current !== img.file) { prevFile.current = img.file; if (err) setErr(false) }

  return (
    <div
      draggable={!isEmpty}
      onDragStart={!isEmpty ? (e => { e.dataTransfer.setData('text/plain', img.file); e.dataTransfer.effectAllowed = 'copyMove' }) : undefined}
      onDragOver={e => { e.preventDefault(); e.stopPropagation(); setOver(true) }}
      onDragLeave={() => setOver(false)}
      onDrop={e => { e.preventDefault(); e.stopPropagation(); setOver(false); const f = e.dataTransfer.getData('text/plain'); if (f) onReplace(f) }}
      className={`group/thumb relative w-[140px] rounded overflow-hidden border transition-colors shrink-0 ${
        isEmpty
          ? over ? 'border-accent ring-1 ring-accent/30 bg-accent/10' : 'border-dashed border-border/60 bg-bg-main/50'
          : over ? 'border-accent ring-1 ring-accent/30' : isPicking ? 'border-amber-500/60' : 'border-border/40 hover:border-border'
      } ${!isEmpty ? 'cursor-grab active:cursor-grabbing' : ''}`}
      title={isEmpty ? `빈 슬롯 — "${img.text ?? ''}"` : `#${index + 1} ${stripExt(img.file)}${img.text ? ` — "${img.text}"` : ''}`}
    >
      <div className="aspect-[16/10] bg-bg-main relative">
        {isEmpty ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-text-secondary">
            {over
              ? <span className="text-accent text-[10px] font-semibold">놓기</span>
              : <span className="text-[16px] leading-none opacity-50">+</span>
            }
          </div>
        ) : (
          <>
            {over && <div className="absolute inset-0 bg-accent/20 z-10 flex items-center justify-center text-accent text-[10px] font-semibold">대체</div>}
            {err ? (
              <div className="absolute inset-0 flex items-center justify-center text-text-secondary text-[10px] px-0.5 text-center">{stripExt(img.file)}</div>
            ) : (
              <img src={`${imageBaseUrl}/${img.file}`} alt="" className="w-full h-full object-cover" onError={() => setErr(true)} />
            )}
            <div className="absolute top-0 left-0 px-0.5 bg-black/70 text-white text-[9px] font-mono leading-tight">#{index + 1}</div>
            <button onClick={onRemove} className="absolute top-0.5 right-0.5 w-5 h-5 flex items-center justify-center rounded-full bg-black/80 text-red-400 hover:text-red-200 hover:bg-red-500/80 text-sm font-bold opacity-0 group-hover/thumb:opacity-100 transition-all">&times;</button>
          </>
        )}
        {isEmpty && (
          <button onClick={onRemove} className="absolute top-0.5 right-0.5 w-5 h-5 flex items-center justify-center rounded-full bg-black/80 text-red-400 hover:text-red-200 hover:bg-red-500/80 text-sm font-bold opacity-0 group-hover/thumb:opacity-100 transition-all">&times;</button>
        )}
      </div>
      {(index > 0 || isEmpty) && img.text && (
        <div className="px-0.5 py-px bg-bg-card/80 text-[10px] truncate cursor-pointer" onClick={() => isPicking ? onCancelPick() : onStartPick()}>
          <span className={isEmpty ? 'text-text-secondary italic' : 'text-amber-400'}>&ldquo;{img.text}&rdquo;</span>
        </div>
      )}
      {index > 0 && !img.text && !isEmpty && (
        <div className="px-0.5 py-px bg-bg-card/80 text-[10px] truncate cursor-pointer" onClick={() => isPicking ? onCancelPick() : onStartPick()}>
          <span className="text-red-400 italic">앵커 없음</span>
        </div>
      )}
    </div>
  )
}
