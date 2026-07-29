'use client'

import { useState } from 'react'
import { mediaSrc, isVideoFile } from '../utils'

export function RevealBgSlot({ fileName, imageBaseUrl, onDrop, onRemove }: {
  fileName: string | null; imageBaseUrl: string
  onDrop: (fn: string) => void; onRemove: () => void
}) {
  const [over, setOver] = useState(false)
  const [err, setErr] = useState(false)

  return (
    <div
      onDragOver={e => { e.preventDefault(); setOver(true) }}
      onDragLeave={() => setOver(false)}
      onDrop={e => { e.preventDefault(); setOver(false); const f = e.dataTransfer.getData('text/plain'); if (f) onDrop(f) }}
      className={`mt-2 flex items-center gap-3 rounded border px-3 py-2 ${
        over ? 'border-accent bg-accent/10' : 'border-border/40 bg-bg-card'
      }`}
    >
      <span className="text-sm font-bold text-text-secondary font-semibold shrink-0">인트로 배경</span>
      {fileName ? (
        <div className="group/rv flex items-center gap-2">
          <div className="relative w-[100px] aspect-[16/10] rounded overflow-hidden bg-bg-main border border-border">
            {err ? (
              <div className="w-full h-full flex items-center justify-center text-xs font-black text-text-secondary">{fileName}</div>
            ) : isVideoFile(fileName) ? (
              <video src={mediaSrc(imageBaseUrl, fileName)} className="w-full h-full object-cover" muted loop playsInline autoPlay preload="metadata" onError={() => setErr(true)} />
            ) : (
              <img src={mediaSrc(imageBaseUrl, fileName)} alt="" className="w-full h-full object-cover" onError={() => setErr(true)} />
            )}
            {isVideoFile(fileName) && <span className="absolute bottom-0.5 left-0.5 px-1 py-px text-xs font-black font-semibold rounded bg-black/70 text-white">▶</span>}
          </div>
          <span className="text-xs font-bold text-text-secondary truncate max-w-[200px]">{fileName}</span>
          <button onClick={onRemove} className="text-red-400 hover:text-red-300 text-sm font-bold opacity-0 group-hover/rv:opacity-100">&times;</button>
        </div>
      ) : (
        <span className="text-xs font-bold text-text-secondary italic">이미지 풀에서 드래그하여 배정</span>
      )}
    </div>
  )
}
