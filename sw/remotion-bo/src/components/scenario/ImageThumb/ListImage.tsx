'use client'

import { useState } from 'react'
import { stripExt, parseImagePrefix, stripImagePrefix, isVideoFile } from '../utils'
import { MediaThumb } from './MediaThumb'
import { ROW_ACTION, USED_BADGE_INLINE } from './styles'

/** 리스트 뷰 행 — 텍스트 중심, 썸네일 작게 (32px) */
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
      className={`group/row flex items-center gap-2 px-1.5 py-1 rounded border hover:bg-bg-main/50 cursor-grab active:cursor-grabbing ${
        selected ? 'border-accent bg-accent/5' : 'border-transparent hover:border-accent/40'
      }`}
      title={crossLabels?.join('\n')}
    >
      {onToggleSelect && (
        <button
          onClick={e => { e.stopPropagation(); onToggleSelect() }}
          className={`w-4 h-4 shrink-0 flex items-center justify-center rounded border text-[11px] font-bold ${
            selected ? 'bg-accent border-accent text-white' : 'bg-bg-main border-border/40 text-transparent hover:text-text-secondary'
          }`}
        >✓</button>
      )}
      <div className="w-8 h-8 bg-bg-main rounded overflow-hidden shrink-0 relative">
        {err ? (
          <div className="w-full h-full flex items-center justify-center text-[11px] text-text-secondary">?</div>
        ) : (
          <MediaThumb fileName={fileName} imageBaseUrl={imageBaseUrl} className="w-full h-full object-cover" onError={() => setErr(true)} />
        )}
        {isVideoFile(fileName) && (
          <span className="absolute bottom-0 right-0 px-0.5 text-[7px] font-semibold rounded bg-black/80 text-white leading-none">▶</span>
        )}
      </div>
      {prefix && (
        <span className="text-[11px] font-mono bg-accent/20 text-accent px-1 rounded shrink-0">{prefix.bookNum}-{prefix.fieldCode}</span>
      )}
      <span className="text-[11px] text-text-primary truncate flex-1">{baseName}</span>
      {used && <span className={USED_BADGE_INLINE}>used</span>}
      {crossLabels && crossLabels.length > 0 && (
        <span className="text-[11px] text-blue-400/70 truncate max-w-[180px] shrink-0">{crossLabels[0]}{crossLabels.length > 1 ? ` +${crossLabels.length - 1}` : ''}</span>
      )}
      <button onClick={onDrop} className="text-[11px] text-accent hover:underline shrink-0">추가</button>
      {onLocate && (
        <button
          onClick={e => { e.stopPropagation(); onLocate() }}
          title="배정된 섹션으로 이동"
          className={`${ROW_ACTION} text-accent hover:text-accent-hover`}
        >↗</button>
      )}
      {onDelete && (
        <button
          onClick={e => { e.stopPropagation(); if (confirm(`"${baseName}" 영구 삭제로 이동?`)) onDelete() }}
          className={`${ROW_ACTION} text-red-400 hover:text-red-200`}
        >삭제</button>
      )}
    </div>
  )
}
