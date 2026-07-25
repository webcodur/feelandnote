import React from 'react'
import type { Timing } from '../types'
import { COLORS } from '../constants'

type HoveredMark = { type: 'sub'; si: number; k: number } | { type: 'stich'; i: number } | null

type Props = {
  timings: Timing[]
  segments: string[]
  activeSegment: number | null
  hoveredMark: HoveredMark
  shiftHeld: boolean
  hoverT: number | null
  pct: (v: number) => number
  handlePointerDown: (boundaryIdx: number, e: React.PointerEvent) => void
  handleSubPointerDown: (segIdx: number, subIdx: number, e: React.PointerEvent) => void
}

export function WaveOverlay({
  timings, segments, activeSegment, hoveredMark, shiftHeld, hoverT, pct,
  handlePointerDown, handleSubPointerDown,
}: Props) {
  return (
    <>
      {/* 구간 배경 (반투명 — 활성 토막 강조) */}
      {timings.map((t, i) => (
        <div
          key={`bg-${i}`}
          className={`absolute inset-y-0 ${activeSegment === i ? 'cursor-pointer' : 'pointer-events-none'}`}
          style={{
            left: `${pct(t.start)}%`,
            width: `${pct(t.end - t.start)}%`,
            backgroundColor: COLORS[i % COLORS.length],
            opacity: activeSegment === i ? 0.35 : 0.15,
            borderRight: i < timings.length - 1 ? '1px solid rgba(255,255,255,0.1)' : 'none',
            transition: 'opacity 0.15s',
          }}
        />
      ))}
      {/* 구간 번호 + 텍스트 (별도 레이어 — opacity 영향 안 받음) */}
      {timings.map((t, i) => {
        const segText = segments[i] ?? `(${i + 1})`
        return (
          <div
            key={`label-${i}`}
            className="absolute inset-y-0 pointer-events-none overflow-hidden"
            style={{ left: `${pct(t.start)}%`, width: `${pct(t.end - t.start)}%` }}
          >
            <div className="absolute top-1 left-1.5 flex items-start gap-1.5">
              <div className="text-sm font-bold px-1.5 py-0.5 rounded bg-black/80 shrink-0 ring-1" style={{ color: COLORS[i % COLORS.length], '--tw-ring-color': COLORS[i % COLORS.length] } as React.CSSProperties}>
                #{i + 1}
              </div>
              {/* 자막 본문 흰색. Hemistich가 있으면 조각 단위로 흰색↔호박색 a-b-a-b 교대해 경계를 보인다. */}
              <div className="text-sm font-bold leading-snug break-words bg-black/80 rounded px-2 py-1 text-white">
                {t.sub && t.sub.length > 1
                  ? t.sub.map((s, k) => (
                      <span key={k} className={k % 2 === 1 ? 'text-amber-300' : 'text-white'}>{k > 0 ? ' ' : ''}{s}</span>
                    ))
                  : segText}
              </div>
            </div>
          </div>
        )
      })}

      {/* 토막 경계선 (amber, 굵음). 마우스가 삭제 사정권에 들면 강조해 어느 선이 지워질지 예고. */}
      {timings.slice(0, -1).map((t, i) => {
        const hot = hoveredMark?.type === 'stich' && hoveredMark.i === i
        return (
          <div
            key={`line-${i}`}
            className="absolute top-0 bottom-0 w-3 -ml-1.5 cursor-ew-resize z-10 flex items-center justify-center"
            style={{ left: `${pct(t.end)}%` }}
            onPointerDown={(e) => handlePointerDown(i, e)}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`h-full rounded-sm ${hot ? 'w-1.5 bg-amber-200 shadow-[0_0_8px_2px_rgba(251,191,36,0.9)]' : 'w-1 bg-amber-400'}`} />
          </div>
        )
      })}

      {/* sub 경계선 (cyan, 얇음) — 토막 내부 sub 배열의 경계. 삭제 사정권 진입 시 강조. */}
      {timings.map((seg, segIdx) =>
        (seg.subTimings ?? []).map((subT, subIdx) => {
          const hot = hoveredMark?.type === 'sub' && hoveredMark.si === segIdx && hoveredMark.k === subIdx
          return (
            <div
              key={`sub-line-${segIdx}-${subIdx}`}
              className="absolute top-1 bottom-1 w-2 -ml-1 cursor-ew-resize z-10 flex items-center justify-center"
              style={{ left: `${pct(subT)}%` }}
              onPointerDown={(e) => handleSubPointerDown(segIdx, subIdx, e)}
              onClick={(e) => e.stopPropagation()}
              title={`Hemistich 경계 (그 자리 더블클릭으로 제거): ${seg.sub?.[subIdx] ?? ''} | ${seg.sub?.[subIdx + 1] ?? ''}`}
            >
              <div className={`h-full rounded-sm ${hot ? 'w-1 bg-cyan-200 shadow-[0_0_8px_2px_rgba(34,211,238,0.9)]' : 'w-0.5 bg-cyan-400'}`} />
            </div>
          )
        })
      )}

      {/* 추가 미리보기 — 삭제 대상이 없는 빈 곳에 마우스를 올리면, 더블클릭 시 생길 경계를 점선으로 예고.
          Shift 누르면 파란선(Hemistich), 아니면 노란선(Stich)으로 색이 바뀐다. */}
      {hoverT != null && !hoveredMark && timings.some(s => hoverT > s.start && hoverT < s.end) && (
        <div
          className="absolute top-0 bottom-0 pointer-events-none z-[5] flex flex-col items-start"
          style={{ left: `${pct(hoverT)}%` }}
        >
          <div
            className="h-full border-l-2 border-dashed"
            style={{ borderColor: shiftHeld ? '#22d3ee' : '#fbbf24', opacity: 0.85 }}
          />
          <div
            className="absolute top-1 left-1 px-1 py-0.5 rounded text-[11px] font-black text-white whitespace-nowrap"
            style={{ backgroundColor: shiftHeld ? 'rgba(8,145,178,0.92)' : 'rgba(180,131,9,0.92)' }}
          >
            {shiftHeld ? '+ 파란선(마디)' : '+ 노란선(자막)'}
          </div>
        </div>
      )}

      {/* sub 구간 라벨 (cyan 텍스트) — 토막 안 sub 영역에 작은 글자 */}
      {timings.map((seg, segIdx) => {
        if (!seg.sub || seg.sub.length <= 1) return null
        const subTimings = seg.subTimings ?? []
        const subs = seg.sub
        // sub 범위 계산
        const ranges: { start: number; end: number; text: string }[] = []
        let cursor = seg.start
        for (let j = 0; j < subs.length; j++) {
          const end = j < subTimings.length ? subTimings[j] : seg.end
          ranges.push({ start: cursor, end, text: subs[j] })
          cursor = end
        }
        return ranges.map((r, j) => (
          <div
            key={`sub-label-${segIdx}-${j}`}
            className="absolute pointer-events-none overflow-hidden"
            style={{
              left: `${pct(r.start)}%`,
              width: `${pct(r.end - r.start)}%`,
              top: '50%',
              transform: 'translateY(-50%)',
            }}
          >
            <div className={`inline-block text-[13px] font-bold leading-snug break-words bg-black/80 rounded px-1.5 py-0.5 ring-1 ring-cyan-400/60 ${j % 2 === 1 ? 'text-amber-300' : 'text-white'}`}>
              {r.text}
            </div>
          </div>
        ))
      })}
    </>
  )
}
