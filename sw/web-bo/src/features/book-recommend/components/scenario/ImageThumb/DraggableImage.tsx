'use client'

import { useState } from 'react'
import { stripExt, parseImagePrefix, stripImagePrefix, isVideoFile } from '../utils'
import { MediaThumb } from './MediaThumb'
import { ACTION_BTN_POOL, ACTION_BTN_DELETE, ACTION_BTN_LOCATE, USED_BADGE_ABS } from './styles'

/** 이미지 풀에서 드래그할 수 있는 이미지 카드 — 그리드 뷰 */
export function DraggableImage({ fileName, imageBaseUrl, onDrop, onDelete, onLocate, crossLabels, used, selected, onToggleSelect, onDragStartMulti }: {
  fileName: string; imageBaseUrl: string; onDrop: () => void; onDelete?: () => void
  /** 바로가기 — 배정된 섹션으로 스크롤 */
  onLocate?: () => void
  /** 전체 사용 현황 (롱폼 · 쇼츠 등 위치) */
  crossLabels?: string[]
  /** 이미 다른 곳에 배정된 이미지 여부 — used 뱃지 표시 */
  used?: boolean
  /** 체크박스 선택 상태. 있으면 체크박스 노출 */
  selected?: boolean
  onToggleSelect?: () => void
  /** 선택된 집합 정보를 드래그 이벤트에 싣는 훅 */
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
      className={`group/pool rounded overflow-hidden border cursor-grab active:cursor-grabbing hover:border-accent/50 relative ${
        selected ? 'border-accent ring-1 ring-accent/40' : 'border-border'
      }`}
    >
      {onToggleSelect && (
        <button
          onClick={e => { e.stopPropagation(); onToggleSelect() }}
          className={`absolute top-0.5 left-0.5 z-10 w-4 h-4 flex items-center justify-center rounded border text-sm font-bold font-bold ${
            selected ? 'bg-accent border-accent text-white' : 'bg-black/60 border-white/40 text-transparent hover:text-white/60'
          }`}
          title={selected ? '선택 해제' : '선택'}
        >✓</button>
      )}
      <div className="aspect-[16/10] bg-bg-main relative">
        {err ? (
          <div className="w-full h-full flex items-center justify-center text-sm font-bold text-text-secondary">{stripExt(fileName)}</div>
        ) : (
          <MediaThumb fileName={fileName} imageBaseUrl={imageBaseUrl} className="w-full h-full object-cover" onError={() => setErr(true)} />
        )}
        {isVideoFile(fileName) && (
          <span className="absolute bottom-0.5 left-0.5 px-1 py-px text-sm font-bold font-semibold rounded bg-black/70 text-white">▶</span>
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
              onClick={e => { e.stopPropagation(); if (confirm(`"${stripExt(fileName)}" 영구 삭제로 이동?`)) onDelete() }}
              className={`${ACTION_BTN_POOL} ${ACTION_BTN_DELETE}`}
            >&times;</button>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between px-1 py-0.5 gap-0.5">
        {(() => { const p = parseImagePrefix(fileName); return p ? <span className="text-sm font-bold font-mono bg-accent/20 text-accent px-0.5 rounded shrink-0">{p.bookNum}-{p.fieldCode}</span> : null })()}
        <span className="text-sm font-bold text-text-secondary truncate">{stripExt(stripImagePrefix(fileName))}</span>
        <button onClick={onDrop} className="text-sm font-bold text-accent hover:underline shrink-0">추가</button>
      </div>
      {crossLabels && crossLabels.length > 0 && (
        <div className="px-1 pb-0.5 text-sm font-bold text-blue-400/70 leading-tight space-y-px" title={crossLabels.join('\n')}>
          {crossLabels.map((l, i) => <div key={i} className="truncate">{l}</div>)}
        </div>
      )}
    </div>
  )
}
