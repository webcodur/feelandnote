'use client'

import { useState, useRef } from 'react'
import type { CinematicImage, AnchorPick } from '../types'
import { stripExt, parseImagePrefix, stripImagePrefix, isVideoFile } from '../utils'
import { MediaThumb } from './MediaThumb'
import { ACTION_BTN_THUMB, ACTION_BTN_DELETE, ACTION_BTN_AMBER } from './styles'

/** 인라인 이미지 행 — 롱폼 책 섹션 등 여러 CinematicImage 를 한 행에 표시 */
export function InlineImageRow({ images, allImages, imageBaseUrl, itemIdx, picking, anchorPick,
  onReplace, onRemove, onRemoveFileOnly, onStartPick, onCancelPick, crossUsage }: {
  images: CinematicImage[]; allImages: CinematicImage[]; imageBaseUrl: string; itemIdx: number
  picking: boolean; anchorPick: AnchorPick
  onReplace: (itemIdx: number, imgIdx: number, fileName: string) => void
  onRemove: (itemIdx: number, imgIdx: number) => void
  onRemoveFileOnly: (itemIdx: number, imgIdx: number) => void
  onStartPick: (globalIdx: number) => void; onCancelPick: () => void
  crossUsage?: Map<string, string[]>
}) {
  if (!images.length) return null
  return (
    <div className="flex gap-1.5 py-1 flex-wrap">
      {images.map(img => {
        const gi = allImages.indexOf(img)
        const isPicking = picking && anchorPick?.imgIdx === gi
        return <InlineThumb key={`it-${gi}`} img={img} index={gi} imageBaseUrl={imageBaseUrl}
          isPicking={isPicking}
          onReplace={fn => onReplace(itemIdx, gi, fn)}
          onRemove={() => onRemove(itemIdx, gi)}
          onRemoveFileOnly={() => onRemoveFileOnly(itemIdx, gi)}
          onStartPick={() => onStartPick(gi)}
          onCancelPick={onCancelPick}
          crossLabels={img.file ? crossUsage?.get(img.file) : undefined}
        />
      })}
    </div>
  )
}

/** 인라인 썸네일 — 롱폼 앵커 시스템 포함. 쇼츠에서는 단순 모드로 사용. */
export function InlineThumb({ img, index, imageBaseUrl, isPicking, onReplace, onRemove, onRemoveFileOnly, onStartPick, onCancelPick, crossLabels }: {
  img: CinematicImage; index: number; imageBaseUrl: string; isPicking: boolean
  onReplace: (fileName: string) => void; onRemove: () => void; onRemoveFileOnly: () => void
  onStartPick: () => void; onCancelPick: () => void
  /** 전체 사용 현황 (롱폼 · 쇼츠 등 위치) */
  crossLabels?: string[]
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
      className={`group/thumb relative w-[140px] rounded overflow-hidden border  shrink-0 ${
        isEmpty
          ? over ? 'border-accent ring-1 ring-accent/30 bg-accent/10' : 'border-dashed border-border/60 bg-bg-main/50'
          : over ? 'border-accent ring-1 ring-accent/30' : isPicking ? 'border-amber-500/60' : 'border-border/40 hover:border-border'
      } ${!isEmpty ? 'cursor-grab active:cursor-grabbing' : ''}`}
      title={isEmpty ? `빈 슬롯 — "${img.text ?? ''}"` : `#${index + 1} ${stripExt(stripImagePrefix(img.file))}${img.text ? ` — "${img.text}"` : ''}`}
    >
      <div className="aspect-[16/10] bg-bg-main relative">
        {isEmpty ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-text-secondary">
            {over
              ? <span className="text-accent text-sm font-bold font-semibold">놓기</span>
              : <span className="text-[16px] leading-none opacity-50">+</span>
            }
          </div>
        ) : (
          <>
            {over && <div className="absolute inset-0 bg-accent/20 z-10 flex items-center justify-center text-accent text-sm font-bold font-semibold">교체</div>}
            {err ? (
              <div className="absolute inset-0 flex items-center justify-center text-text-secondary text-sm font-bold px-0.5 text-center">{stripExt(img.file)}</div>
            ) : (
              <MediaThumb fileName={img.file} imageBaseUrl={imageBaseUrl} className="w-full h-full object-cover" onError={() => setErr(true)} />
            )}
            <div className="absolute top-0 left-0 px-0.5 bg-black/70 text-white text-sm font-bold font-mono leading-tight">
              {(() => { const p = parseImagePrefix(img.file); return p ? <><span className="text-accent">{p.bookNum}-{p.fieldCode}</span> </> : null })()}#{index + 1}
              {isVideoFile(img.file) && <span className="text-accent ml-0.5">▶</span>}
            </div>
            <button onClick={onRemove} title={img.text ? '이미지+앵커 삭제' : '이미지 삭제'} className={`absolute top-0.5 right-0.5 ${ACTION_BTN_THUMB} ${ACTION_BTN_DELETE}`}>&times;</button>
            <button onClick={onRemoveFileOnly} title={img.text ? '이미지만 해제 (앵커 유지)' : '이미지만 해제 (자리 유지)'} className={`absolute top-0.5 right-6.5 ${ACTION_BTN_THUMB} ${ACTION_BTN_AMBER}`}>⊘</button>
          </>
        )}
        {isEmpty && (
          <button onClick={onRemove} className={`absolute top-0.5 right-0.5 ${ACTION_BTN_THUMB} ${ACTION_BTN_DELETE}`}>&times;</button>
        )}
      </div>
      {img.text ? (
        <div className="px-0.5 py-px bg-bg-card/80 text-sm font-bold truncate cursor-pointer" onClick={() => isPicking ? onCancelPick() : onStartPick()}>
          <span className={isEmpty ? 'text-text-secondary italic' : 'text-amber-400'}>&ldquo;{img.text}&rdquo;</span>
        </div>
      ) : !isEmpty && (
        <div className="px-0.5 py-px bg-bg-card/80 text-sm font-bold truncate cursor-pointer" onClick={() => isPicking ? onCancelPick() : onStartPick()}>
          <span className={index > 0 ? 'text-red-400 italic' : 'text-text-secondary italic opacity-0 group-hover/thumb:opacity-100 '}>
            {index > 0 ? '앵커 없음' : '위치 변경'}
          </span>
        </div>
      )}
      {!isEmpty && crossLabels && crossLabels.length > 0 && (
        <div className="px-0.5 py-px text-sm font-bold text-blue-400/70 leading-tight space-y-px" title={crossLabels.join('\n')}>
          {crossLabels.map((l, i) => <div key={i} className="truncate">{l}</div>)}
        </div>
      )}
    </div>
  )
}
