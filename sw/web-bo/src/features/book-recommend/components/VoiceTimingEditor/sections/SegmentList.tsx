import React from 'react'
import type { Timing } from '../types'
import { COLORS } from '../constants'

type Props = {
  timings: Timing[]
  segments: string[]
  activeSegment: number | null
  setActiveSegment: (idx: number | null) => void
  inputRefs: React.MutableRefObject<(HTMLInputElement | null)[]>
  updateSegments: (next: string[]) => void
  updateSub: (segIdx: number, k: number, value: string) => void
  removeSubBoundary: (segIdx: number, subIdx: number) => void
  shiftWord: (segIdx: number, direction: 'left' | 'right') => void
}

export function SegmentList({
  timings, segments, activeSegment, setActiveSegment, inputRefs,
  updateSegments, updateSub, removeSubBoundary, shiftWord,
}: Props) {
  return (
    <div className="space-y-1">
      {timings.map((t, i) => {
        const hasSub = !!(t.sub && t.sub.length > 0)
        return (
        <React.Fragment key={i}>
        <div className={`flex items-start gap-2 text-xs group rounded px-1 py-0.5 ${activeSegment === i ? 'bg-accent/10 ring-1 ring-accent/30' : ''}`}>
          <div
            className="w-5 h-5 rounded flex items-center justify-center text-xs font-black font-bold shrink-0 mt-0.5 cursor-pointer"
            style={{ backgroundColor: COLORS[i % COLORS.length], color: '#fff' }}
            onClick={() => setActiveSegment(activeSegment === i ? null : i)}>
            {i + 1}
          </div>
          <span className="text-text-secondary w-20 flex-shrink-0 font-mono mt-0.5">
            {t.start.toFixed(2)}~{t.end.toFixed(2)}
          </span>
          <input
            ref={el => { inputRefs.current[i] = el }}
            type="text"
            value={segments[i] ?? ''}
            readOnly={hasSub}
            onFocus={() => setActiveSegment(i)}
            onChange={(e) => {
              const newSegs = [...segments]
              newSegs[i] = e.target.value
              updateSegments(newSegs)
            }}
            title={hasSub ? 'Hemistich로 분할된 Stich — 아래 Hemistich 행에서 편집한다' : undefined}
            className={`flex-1 min-w-0 bg-bg-main border rounded px-2 py-0.5 text-xs focus:outline-none ${activeSegment === i ? 'border-accent' : 'border-border'} ${hasSub ? 'opacity-60 cursor-not-allowed' : ''}`}
          />
          <div className="flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100">
            {i > 0 && (
              <button onClick={() => shiftWord(i, 'left')}
                className="px-1 py-0.5 rounded text-xs font-black bg-bg-card border border-border hover:bg-bg-hover"
                title="첫 단어를 이전 토막로">◀</button>
            )}
            {i < timings.length - 1 && (
              <button onClick={() => shiftWord(i, 'right')}
                className="px-1 py-0.5 rounded text-xs font-black bg-bg-card border border-border hover:bg-bg-hover"
                title="마지막 단어를 다음 토막로">▶</button>
            )}
          </div>
        </div>
        {hasSub && (
          <div className="ml-7 pl-2 border-l-2 border-cyan-500/40 space-y-0.5 py-0.5">
            {t.sub!.map((subText, k) => (
              <div key={k} className="flex items-center gap-1.5 text-xs">
                <span className="text-cyan-400 text-[10px] font-black w-10 shrink-0 text-right" title={`Hemistich ${k + 1}`}>H{k + 1}</span>
                <input
                  type="text"
                  value={subText}
                  onChange={(e) => updateSub(i, k, e.target.value)}
                  className="flex-1 min-w-0 bg-bg-main border border-cyan-500/40 rounded px-2 py-0.5 text-[13px] text-cyan-900 focus:outline-none focus:border-cyan-500"
                />
                {k < t.sub!.length - 1 ? (
                  <button onClick={() => removeSubBoundary(i, k)}
                    className="px-1 py-0.5 rounded text-[10px] font-black bg-bg-card border border-cyan-500/30 hover:bg-bg-hover text-cyan-300 shrink-0"
                    title="아래 Hemistich와 경계 제거(병합)">⌄ 병합</button>
                ) : (
                  <span className="w-[44px] shrink-0" />
                )}
              </div>
            ))}
          </div>
        )}
        </React.Fragment>
        )
      })}
    </div>
  )
}
