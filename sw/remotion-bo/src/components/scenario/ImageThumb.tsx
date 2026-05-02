'use client'

import { useState, useRef } from 'react'
import type { CinematicImage, AnchorPick } from './types'
import { stripExt, parseImagePrefix, stripImagePrefix, mediaSrc, isVideoFile } from './utils'

/** 파일 확장자로 `<img>` / `<video muted loop>` 자동 분기하는 공통 미디어 프리뷰.
 *  풀·인라인 썸네일에서 공용 사용. onError 콜백으로 에러 표시. */
function MediaThumb({ fileName, imageBaseUrl, className, onError }: {
  fileName: string; imageBaseUrl: string; className?: string; onError?: () => void
}) {
  const src = mediaSrc(imageBaseUrl, fileName)
  if (isVideoFile(fileName)) {
    return (
      <video
        src={src}
        className={className}
        muted
        loop
        playsInline
        autoPlay
        preload="metadata"
        onError={onError}
      />
    )
  }
  return <img src={src} alt="" className={className} onError={onError} />
}

// 썸네일 hover 시 우측 상단 액션 아이콘 공통 스타일 (그룹 이름은 호출부에서 지정)
const ACTION_BTN_BASE = 'w-5 h-5 flex items-center justify-center rounded-full bg-black/80 text-sm font-bold transition-all'
const ACTION_BTN_POOL = `${ACTION_BTN_BASE} opacity-0 group-hover/pool:opacity-100`
const ACTION_BTN_THUMB = `${ACTION_BTN_BASE} opacity-0 group-hover/thumb:opacity-100`
// 색상 바리에이션
const ACTION_BTN_DELETE = 'text-red-400 hover:text-red-200 hover:bg-red-500/80'
const ACTION_BTN_LOCATE = 'text-accent hover:text-accent-hover hover:bg-accent/20'
const ACTION_BTN_AMBER = 'text-amber-400 hover:text-amber-200 hover:bg-amber-500/80'
// 풀 리스트뷰 라인 텍스트 액션 (hover 시 노출)
const ROW_ACTION = 'text-[10px] shrink-0 opacity-0 group-hover/row:opacity-100 transition-opacity'
// used 뱃지 (풀 썸네일 공용)
const USED_BADGE_ABS = 'absolute top-0.5 left-0.5 px-1 py-px text-[9px] font-semibold rounded bg-blue-500/70 text-white'
const USED_BADGE_INLINE = 'text-[9px] font-semibold rounded bg-blue-500/70 text-white px-1 shrink-0'

/** 이미지 풀에서 드래그할 수 있는 이미지 카드 — 그리드 뷰 */
export function DraggableImage({ fileName, imageBaseUrl, onDrop, onDelete, onLocate, crossLabels, used, selected, onToggleSelect, onDragStartMulti }: {
  fileName: string; imageBaseUrl: string; onDrop: () => void; onDelete?: () => void
  /** 바로가기 — 배정된 섹션으로 스크롤 */
  onLocate?: () => void
  /** 전체 사용 현황 (롱폼·쇼츠 전 위치) */
  crossLabels?: string[]
  /** 이미 다른 곳에 배정된 이미지 여부 — 뱃지 표시 */
  used?: boolean
  /** 체크박스 선택 상태. 있으면 체크박스 노출 */
  selected?: boolean
  onToggleSelect?: () => void
  /** 선택된 집합 정보를 드래그 이벤트에 담는 훅 */
  onDragStartMulti?: (e: React.DragEvent, fileName: string) => void
}) {
  const [err, setErr] = useState(false)
  return (
    <div
      draggable
      onDragStart={e => {
        if (onDragStartMulti) onDragStartMulti(e, fileName)
        else { e.dataTransfer.setData('text/plain', fileName); e.dataTransfer.effectAllowed = 'copy' }
      }}
      className={`group/pool rounded overflow-hidden border cursor-grab active:cursor-grabbing hover:border-accent/50 transition-colors relative ${
        selected ? 'border-accent ring-1 ring-accent/40' : 'border-border/30'
      }`}
    >
      {onToggleSelect && (
        <button
          onClick={e => { e.stopPropagation(); onToggleSelect() }}
          className={`absolute top-0.5 left-0.5 z-10 w-4 h-4 flex items-center justify-center rounded border text-[10px] font-bold transition-colors ${
            selected ? 'bg-accent border-accent text-white' : 'bg-black/60 border-white/40 text-transparent hover:text-white/60'
          }`}
          title={selected ? '선택 해제' : '선택'}
        >✓</button>
      )}
      <div className="aspect-[16/10] bg-bg-main relative">
        {err ? (
          <div className="w-full h-full flex items-center justify-center text-[10px] text-text-secondary">{stripExt(fileName)}</div>
        ) : (
          <MediaThumb fileName={fileName} imageBaseUrl={imageBaseUrl} className="w-full h-full object-cover" onError={() => setErr(true)} />
        )}
        {isVideoFile(fileName) && (
          <span className="absolute bottom-0.5 left-0.5 px-1 py-px text-[9px] font-semibold rounded bg-black/70 text-white">▶</span>
        )}
        {used && <span className={USED_BADGE_ABS}>used</span>}
        <div className="absolute top-0.5 right-0.5 flex items-center gap-0.5">
          {onLocate && (
            <button
              onClick={e => { e.stopPropagation(); onLocate() }}
              title="배정된 섹션으로 이동"
              className={`${ACTION_BTN_POOL} ${ACTION_BTN_LOCATE}`}
            >↗</button>
          )}
          {onDelete && (
            <button
              onClick={e => { e.stopPropagation(); if (confirm(`"${stripExt(fileName)}" 휴지통으로 이동?`)) onDelete() }}
              className={`${ACTION_BTN_POOL} ${ACTION_BTN_DELETE}`}
            >&times;</button>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between px-1 py-0.5 gap-0.5">
        {(() => { const p = parseImagePrefix(fileName); return p ? <span className="text-[9px] font-mono bg-accent/20 text-accent px-0.5 rounded shrink-0">{p.bookNum}-{p.fieldCode}</span> : null })()}
        <span className="text-[10px] text-text-secondary truncate">{stripExt(stripImagePrefix(fileName))}</span>
        <button onClick={onDrop} className="text-[10px] text-accent hover:underline shrink-0">추가</button>
      </div>
      {crossLabels && crossLabels.length > 0 && (
        <div className="px-1 pb-0.5 text-[9px] text-blue-400/70 leading-tight space-y-px" title={crossLabels.join('\n')}>
          {crossLabels.map((l, i) => <div key={i} className="truncate">{l}</div>)}
        </div>
      )}
    </div>
  )
}

/** 리스트 뷰 — 텍스트 중심, 썸네일 작게 (32px) */
export function ListImage({ fileName, imageBaseUrl, onDrop, onDelete, onLocate, crossLabels, used, selected, onToggleSelect, onDragStartMulti }: {
  fileName: string; imageBaseUrl: string; onDrop: () => void; onDelete?: () => void
  onLocate?: () => void
  crossLabels?: string[]
  used?: boolean
  selected?: boolean
  onToggleSelect?: () => void
  onDragStartMulti?: (e: React.DragEvent, fileName: string) => void
}) {
  const [err, setErr] = useState(false)
  const prefix = parseImagePrefix(fileName)
  const baseName = stripExt(stripImagePrefix(fileName))
  return (
    <div
      draggable
      onDragStart={e => {
        if (onDragStartMulti) onDragStartMulti(e, fileName)
        else { e.dataTransfer.setData('text/plain', fileName); e.dataTransfer.effectAllowed = 'copy' }
      }}
      className={`group/row flex items-center gap-2 px-1.5 py-1 rounded border hover:bg-bg-main/50 cursor-grab active:cursor-grabbing transition-colors ${
        selected ? 'border-accent bg-accent/5' : 'border-transparent hover:border-accent/40'
      }`}
      title={crossLabels?.join('\n')}
    >
      {onToggleSelect && (
        <button
          onClick={e => { e.stopPropagation(); onToggleSelect() }}
          className={`w-4 h-4 shrink-0 flex items-center justify-center rounded border text-[10px] font-bold transition-colors ${
            selected ? 'bg-accent border-accent text-white' : 'bg-bg-main border-border/40 text-transparent hover:text-text-secondary'
          }`}
        >✓</button>
      )}
      <div className="w-8 h-8 bg-bg-main rounded overflow-hidden shrink-0 relative">
        {err ? (
          <div className="w-full h-full flex items-center justify-center text-[9px] text-text-secondary">?</div>
        ) : (
          <MediaThumb fileName={fileName} imageBaseUrl={imageBaseUrl} className="w-full h-full object-cover" onError={() => setErr(true)} />
        )}
        {isVideoFile(fileName) && (
          <span className="absolute bottom-0 right-0 px-0.5 text-[7px] font-semibold rounded bg-black/80 text-white leading-none">▶</span>
        )}
      </div>
      {prefix && (
        <span className="text-[9px] font-mono bg-accent/20 text-accent px-1 rounded shrink-0">{prefix.bookNum}-{prefix.fieldCode}</span>
      )}
      <span className="text-[11px] text-text-primary truncate flex-1">{baseName}</span>
      {used && <span className={USED_BADGE_INLINE}>used</span>}
      {crossLabels && crossLabels.length > 0 && (
        <span className="text-[9px] text-blue-400/70 truncate max-w-[180px] shrink-0">{crossLabels[0]}{crossLabels.length > 1 ? ` +${crossLabels.length - 1}` : ''}</span>
      )}
      <button onClick={onDrop} className="text-[10px] text-accent hover:underline shrink-0">추가</button>
      {onLocate && (
        <button
          onClick={e => { e.stopPropagation(); onLocate() }}
          title="배정된 섹션으로 이동"
          className={`${ROW_ACTION} text-accent hover:text-accent-hover`}
        >↗</button>
      )}
      {onDelete && (
        <button
          onClick={e => { e.stopPropagation(); if (confirm(`"${baseName}" 휴지통으로 이동?`)) onDelete() }}
          className={`${ROW_ACTION} text-red-400 hover:text-red-200`}
        >삭제</button>
      )}
    </div>
  )
}

/** 인라인 이미지 행 — 롱폼 책 섹션용. 여러 CinematicImage를 한 행에 표시 */
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

/** 인라인 썸네일 — 롱폼 앵커 시스템 포함. 쇼츠에서도 단순 모드로 재사용 */
export function InlineThumb({ img, index, imageBaseUrl, isPicking, onReplace, onRemove, onRemoveFileOnly, onStartPick, onCancelPick, crossLabels }: {
  img: CinematicImage; index: number; imageBaseUrl: string; isPicking: boolean
  onReplace: (fileName: string) => void; onRemove: () => void; onRemoveFileOnly: () => void
  onStartPick: () => void; onCancelPick: () => void
  /** 전체 사용 현황 (롱폼·쇼츠 전 위치) */
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
      className={`group/thumb relative w-[140px] rounded overflow-hidden border transition-colors shrink-0 ${
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
              <MediaThumb fileName={img.file} imageBaseUrl={imageBaseUrl} className="w-full h-full object-cover" onError={() => setErr(true)} />
            )}
            <div className="absolute top-0 left-0 px-0.5 bg-black/70 text-white text-[9px] font-mono leading-tight">
              {(() => { const p = parseImagePrefix(img.file); return p ? <><span className="text-accent">{p.bookNum}-{p.fieldCode}</span> </> : null })()}#{index + 1}
              {isVideoFile(img.file) && <span className="text-accent ml-0.5">▶</span>}
            </div>
            <button onClick={onRemove} title="이미지+앵커 삭제" className={`absolute top-0.5 right-0.5 ${ACTION_BTN_THUMB} ${ACTION_BTN_DELETE}`}>&times;</button>
            {img.text && (
              <button onClick={onRemoveFileOnly} title="이미지만 해제 (앵커 유지)" className={`absolute top-0.5 right-6.5 ${ACTION_BTN_THUMB} ${ACTION_BTN_AMBER}`}>⊘</button>
            )}
          </>
        )}
        {isEmpty && (
          <button onClick={onRemove} className={`absolute top-0.5 right-0.5 ${ACTION_BTN_THUMB} ${ACTION_BTN_DELETE}`}>&times;</button>
        )}
      </div>
      {img.text ? (
        <div className="px-0.5 py-px bg-bg-card/80 text-[10px] truncate cursor-pointer" onClick={() => isPicking ? onCancelPick() : onStartPick()}>
          <span className={isEmpty ? 'text-text-secondary italic' : 'text-amber-400'}>&ldquo;{img.text}&rdquo;</span>
        </div>
      ) : !isEmpty && (
        <div className="px-0.5 py-px bg-bg-card/80 text-[10px] truncate cursor-pointer" onClick={() => isPicking ? onCancelPick() : onStartPick()}>
          <span className={index > 0 ? 'text-red-400 italic' : 'text-text-secondary italic opacity-0 group-hover/thumb:opacity-100 transition-opacity'}>
            {index > 0 ? '앵커 없음' : '위치 변경'}
          </span>
        </div>
      )}
      {!isEmpty && crossLabels && crossLabels.length > 0 && (
        <div className="px-0.5 py-px text-[9px] text-blue-400/70 leading-tight space-y-px" title={crossLabels.join('\n')}>
          {crossLabels.map((l, i) => <div key={i} className="truncate">{l}</div>)}
        </div>
      )}
    </div>
  )
}
