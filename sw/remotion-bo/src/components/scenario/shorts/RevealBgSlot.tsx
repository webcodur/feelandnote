'use client'

import { useState } from 'react'

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
      className={`mt-2 flex items-center gap-3 rounded border px-3 py-2 transition-colors ${
        over ? 'border-accent bg-accent/10' : 'border-border/40 bg-bg-card/30'
      }`}
    >
      <span className="text-[11px] text-text-secondary font-semibold shrink-0">인트로 배경</span>
      {fileName ? (
        <div className="group/rv flex items-center gap-2">
          <div className="w-[100px] aspect-[16/10] rounded overflow-hidden bg-bg-main border border-border/30">
            {err ? (
              <div className="w-full h-full flex items-center justify-center text-[9px] text-text-secondary">{fileName}</div>
            ) : (
              <img src={`${imageBaseUrl}/${fileName}`} alt="" className="w-full h-full object-cover" onError={() => setErr(true)} />
            )}
          </div>
          <span className="text-[10px] text-text-secondary truncate max-w-[200px]">{fileName}</span>
          <button onClick={onRemove} className="text-red-400 hover:text-red-300 text-[11px] opacity-0 group-hover/rv:opacity-100 transition-opacity">&times;</button>
        </div>
      ) : (
        <span className="text-[10px] text-text-secondary italic">이미지 풀에서 드래그하여 배정</span>
      )}
    </div>
  )
}
