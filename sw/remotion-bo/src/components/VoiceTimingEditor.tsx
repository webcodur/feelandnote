'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { AudioWavePlayer, usePct } from './AudioWavePlayer'

type Timing = { start: number; end: number; text?: string; sub?: string[]; subTimings?: number[] }

type Props = {
  audioUrl: string
  duration: number
  sentences: string[]
  timings: Timing[]
  onChange: (timings: Timing[]) => void
  /** 토막 텍스트 변경 시 부모에 전파 */
  onSegmentsChange?: (segments: string[]) => void
  /** 부모가 현재 토막를 읽을 수 있도록 ref 연결 */
  segmentsRef?: React.MutableRefObject<string[]>
}

const COLORS = [
  'rgba(200,164,110,0.6)',
  'rgba(139,184,168,0.6)',
  'rgba(180,140,200,0.6)',
  'rgba(200,160,120,0.6)',
  'rgba(120,180,200,0.6)',
  'rgba(200,120,140,0.6)',
]

/** 텍스트를 시간 비율 기준으로 두 조각으로 분할 — 단어 경계 존중 */
function splitTextAtRatio(text: string, ratio: number): [string, string] {
  const words = text.split(/\s+/)
  if (words.length <= 1) return [text, '']
  const splitIdx = Math.max(1, Math.round(words.length * ratio))
  return [words.slice(0, splitIdx).join(' '), words.slice(splitIdx).join(' ')]
}

export function VoiceTimingEditor({ audioUrl, duration, sentences: initialSentences, timings, onChange, onSegmentsChange, segmentsRef }: Props) {
  // 초기값 기억 (초기화용)
  const [originalTimings] = useState(() => [...timings.map(t => ({ ...t }))])
  const [originalSentences] = useState(() => [...initialSentences])
  const [jsonOpen, setJsonOpen] = useState(false)
  const [jsonText, setJsonText] = useState('')
  const [jsonError, setJsonError] = useState<string | null>(null)
  const [activeSegment, setActiveSegment] = useState<number | null>(null)
  const [guideOpen, setGuideOpen] = useState(false)
  const inputRefs = React.useRef<(HTMLInputElement | null)[]>([])

  // setSegments 래핑 — 부모에도 전파 + ref 동기화
  const updateSegments = useCallback((next: string[]) => {
    setSegments(next)
    if (segmentsRef) segmentsRef.current = next
    onSegmentsChange?.(next)
  }, [onSegmentsChange, segmentsRef])

  // 로컬 토막 텍스트 — timings에 text가 있으면 그대로 사용 (저장된 자막)
  const [segments, setSegments] = useState<string[]>(() => {
    // 1) timings에 text가 이미 저장되어 있으면 그걸 사용
    if (timings.length > 0 && timings.every(t => t.text)) {
      return timings.map(t => t.text!)
    }
    // 2) 문장 수 == 타이밍 수면 1:1 매핑
    if (timings.length === initialSentences.length) return [...initialSentences]
    // 3) 시간 비율 기반 배분
    const fullText = initialSentences.join(' ')
    const words = fullText.split(/\s+/)
    const totalDur = timings.reduce((s, t) => s + (t.end - t.start), 0)
    if (totalDur <= 0) return timings.map(() => '')
    const result: string[] = []
    let wi = 0
    for (let i = 0; i < timings.length; i++) {
      const ratio = (timings[i].end - timings[i].start) / totalDur
      const wc = i === timings.length - 1 ? words.length - wi : Math.max(1, Math.round(words.length * ratio))
      result.push(words.slice(wi, wi + wc).join(' '))
      wi += wc
    }
    return result
  })

  // 초기 토막를 ref에 동기화
  React.useEffect(() => {
    if (segmentsRef) segmentsRef.current = segments
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const pct = usePct(duration)

  // 파형 클릭 → 토막 식별 (포커스는 파형에 유지 — Space 키 동작 보장)
  const handleWaveTimeClick = useCallback((time: number) => {
    const idx = timings.findIndex(t => time >= t.start && time < t.end)
    setActiveSegment(idx >= 0 ? idx : (time >= (timings.at(-1)?.start ?? 0) ? timings.length - 1 : null))
  }, [timings])

  // 경계선 드래그
  const handlePointerDown = useCallback((boundaryIdx: number, e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const container = e.currentTarget.parentElement
    if (!container || duration <= 0) return
    const rect = container.getBoundingClientRect()

    const onMove = (ev: PointerEvent) => {
      const t = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width)) * duration
      const newTimings = [...timings]
      const minT = boundaryIdx > 0 ? newTimings[boundaryIdx - 1].start + 0.05 : 0.05
      const maxT = boundaryIdx < newTimings.length - 1 ? newTimings[boundaryIdx + 1].end - 0.05 : duration - 0.05
      const clamped = Math.max(minT, Math.min(maxT, t))
      newTimings[boundaryIdx].end = Math.round(clamped * 1000) / 1000
      if (boundaryIdx + 1 < newTimings.length) {
        newTimings[boundaryIdx + 1].start = Math.round(clamped * 1000) / 1000
      }
      onChange(newTimings)
    }

    const onUp = () => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
    }
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
  }, [timings, duration, onChange])

  // 더블클릭 → 경계 추가 + 텍스트 분할 (sub/subTimings 보존 분배)
  const handleDblClick = useCallback((t: number) => {
    const tooClose = timings.some((seg, i) =>
      (i < timings.length - 1 && Math.abs(seg.end - t) < 0.2) ||
      Math.abs(seg.start - t) < 0.2
    )
    if (tooClose) return

    const idx = timings.findIndex(seg => t > seg.start && t < seg.end)
    if (idx < 0) return

    const original = timings[idx]
    const roundedT = Math.round(t * 1000) / 1000

    // 텍스트도 비율로 분할
    const segText = segments[idx] ?? ''
    const ratio = (t - original.start) / (original.end - original.start)
    const [p1, p2] = splitTextAtRatio(segText, ratio)

    // sub/subTimings 보존: t가 속한 sub 항목을 두 조각으로 분할하고 양쪽 토막에 분배
    let leftSubExtra: Pick<Timing, 'sub' | 'subTimings'> = {}
    let rightSubExtra: Pick<Timing, 'sub' | 'subTimings'> = {}
    if (original.sub && original.sub.length > 0) {
      const subs = original.sub
      const subTs = original.subTimings ?? []
      // t가 속한 sub 인덱스 k 찾기
      let k = subs.length - 1
      for (let i = 0; i < subTs.length; i++) {
        if (t < subTs[i]) { k = i; break }
      }
      const prevT = k > 0 ? subTs[k - 1] : original.start
      const nextT = k < subTs.length ? subTs[k] : original.end
      const subRatio = nextT > prevT ? (t - prevT) / (nextT - prevT) : 0.5
      const [sp1, sp2] = splitTextAtRatio(subs[k] ?? '', subRatio)
      leftSubExtra = { sub: [...subs.slice(0, k), sp1], subTimings: subTs.slice(0, k) }
      rightSubExtra = { sub: [sp2, ...subs.slice(k + 1)], subTimings: subTs.slice(k) }
    }

    const newTimings = [...timings]
    newTimings.splice(idx, 1,
      { start: original.start, end: roundedT, ...leftSubExtra },
      { start: roundedT, end: original.end, ...rightSubExtra }
    )

    const newSegs = [...segments]
    newSegs.splice(idx, 1, p1, p2)

    updateSegments(newSegs)
    onChange(newTimings)
  }, [timings, segments, onChange, updateSegments])

  // 경계선 더블클릭 → 제거 + 텍스트 병합 (sub/subTimings 보존 병합)
  const handleBoundaryDblClick = useCallback((boundaryIdx: number, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (timings.length <= 1) return

    const left = timings[boundaryIdx]
    const right = timings[boundaryIdx + 1]
    const leftText = segments[boundaryIdx] ?? ''
    const rightText = segments[boundaryIdx + 1] ?? ''

    const merged: Timing = { start: left.start, end: right.end }

    // 한쪽이라도 sub가 있으면 양쪽을 표준화한 뒤 병합 (없는 쪽은 [text] 단일 sub로 변환)
    const hasLeftSub = !!(left.sub && left.sub.length > 0)
    const hasRightSub = !!(right.sub && right.sub.length > 0)
    if (hasLeftSub || hasRightSub) {
      const leftSubs = hasLeftSub ? left.sub! : [leftText]
      const leftSubTs = hasLeftSub ? (left.subTimings ?? []) : []
      const rightSubs = hasRightSub ? right.sub! : [rightText]
      const rightSubTs = hasRightSub ? (right.subTimings ?? []) : []
      merged.sub = [...leftSubs, ...rightSubs]
      merged.subTimings = [...leftSubTs, left.end, ...rightSubTs]
    }

    const newTimings = [...timings]
    newTimings.splice(boundaryIdx, 2, merged)

    const newSegs = [...segments]
    newSegs.splice(boundaryIdx, 2, (leftText + ' ' + rightText).trim())

    updateSegments(newSegs)
    onChange(newTimings)
  }, [timings, segments, onChange, updateSegments])

  // sub 경계선 드래그 — segIdx 토막 내부의 subTimings[subIdx] 조정
  const handleSubPointerDown = useCallback((segIdx: number, subIdx: number, e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const container = e.currentTarget.parentElement
    if (!container || duration <= 0) return
    const rect = container.getBoundingClientRect()

    const seg = timings[segIdx]
    if (!seg.subTimings || seg.subTimings.length === 0) return

    const onMove = (ev: PointerEvent) => {
      const t = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width)) * duration
      // 인접 경계와 토막 start/end 안으로 clamp
      const cur = timings[segIdx].subTimings ?? []
      const minT = subIdx === 0 ? seg.start + 0.02 : cur[subIdx - 1] + 0.02
      const maxT = subIdx === cur.length - 1 ? seg.end - 0.02 : cur[subIdx + 1] - 0.02
      const clamped = Math.max(minT, Math.min(maxT, t))
      const newSubTimings = [...cur]
      newSubTimings[subIdx] = Math.round(clamped * 1000) / 1000
      const newTimings = [...timings]
      newTimings[segIdx] = { ...newTimings[segIdx], subTimings: newSubTimings }
      onChange(newTimings)
    }

    const onUp = () => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
    }
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
  }, [timings, duration, onChange])

  // 단어 이동: 현재 토막의 첫/마지막 단어를 인접 토막로
  const shiftWord = useCallback((segIdx: number, direction: 'left' | 'right') => {
    const newSegs = [...segments]
    if (direction === 'left' && segIdx > 0) {
      const words = newSegs[segIdx].split(/\s+/)
      if (words.length <= 1) return
      const moved = words.shift()!
      newSegs[segIdx] = words.join(' ')
      newSegs[segIdx - 1] = (newSegs[segIdx - 1] + ' ' + moved).trim()
    } else if (direction === 'right' && segIdx < segments.length - 1) {
      const words = newSegs[segIdx].split(/\s+/)
      if (words.length <= 1) return
      const moved = words.pop()!
      newSegs[segIdx] = words.join(' ')
      newSegs[segIdx + 1] = (moved + ' ' + newSegs[segIdx + 1]).trim()
    }
    updateSegments(newSegs)
  }, [segments, updateSegments])

  return (
    <div className="space-y-2">
      <AudioWavePlayer
        audioUrl={audioUrl}
        duration={duration}
        boundaries={timings.slice(0, -1).map(t => t.end)}
        onDoubleClick={handleDblClick}
        onTimeClick={handleWaveTimeClick}
        heightClass="h-56"
        pxPerSec={120}
      >
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
                <div className="text-sm font-bold px-1.5 py-0.5 rounded bg-black/75 shrink-0" style={{ color: COLORS[i % COLORS.length] }}>
                  #{i + 1}
                </div>
                <div className="text-sm font-medium leading-snug break-words bg-black/75 rounded px-2 py-1" style={{ color: COLORS[i % COLORS.length] }}>
                  {segText}
                </div>
              </div>
            </div>
          )
        })}

        {/* 토막 경계선 (amber, 굵음) */}
        {timings.slice(0, -1).map((t, i) => (
          <div
            key={`line-${i}`}
            className="absolute top-0 bottom-0 w-3 -ml-1.5 cursor-ew-resize z-10 flex items-center justify-center"
            style={{ left: `${pct(t.end)}%` }}
            onPointerDown={(e) => handlePointerDown(i, e)}
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={(e) => handleBoundaryDblClick(i, e)}
          >
            <div className="w-1 h-full bg-amber-400 rounded-sm hover:bg-amber-300" />
          </div>
        ))}

        {/* sub 경계선 (cyan, 얇음) — 토막 내부 sub 배열의 경계 */}
        {timings.map((seg, segIdx) =>
          (seg.subTimings ?? []).map((subT, subIdx) => (
            <div
              key={`sub-line-${segIdx}-${subIdx}`}
              className="absolute top-1 bottom-1 w-2 -ml-1 cursor-ew-resize z-10 flex items-center justify-center"
              style={{ left: `${pct(subT)}%` }}
              onPointerDown={(e) => handleSubPointerDown(segIdx, subIdx, e)}
              onClick={(e) => e.stopPropagation()}
              title={`sub 경계: ${seg.sub?.[subIdx] ?? ''} | ${seg.sub?.[subIdx + 1] ?? ''}`}
            >
              <div className="w-0.5 h-full bg-cyan-400 rounded-sm hover:bg-cyan-300" />
            </div>
          ))
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
              <div className="inline-block text-xs font-medium leading-snug break-words bg-black/75 rounded px-1.5 py-0.5 text-cyan-200">
                {r.text}
              </div>
            </div>
          ))
        })}
      </AudioWavePlayer>

      {/* 초기화 */}
      <div className="flex items-center gap-2">
        <button onClick={() => {
          updateSegments([...originalSentences])
          onChange(originalTimings.map(t => ({ ...t })))
        }}
          className="px-2 py-0.5 rounded text-[10px] bg-bg-card border border-border hover:bg-bg-hover text-text-secondary">
          경계+텍스트 초기화
        </button>
        <button onClick={() => {
          updateSegments([...originalSentences].length === timings.length
            ? [...originalSentences]
            : (() => {
              const fullText = originalSentences.join(' ')
              const words = fullText.split(/\s+/)
              const totalDur = timings.reduce((s, t) => s + (t.end - t.start), 0)
              if (totalDur <= 0) return timings.map(() => '')
              const result: string[] = []
              let wi = 0
              for (let i = 0; i < timings.length; i++) {
                const ratio = (timings[i].end - timings[i].start) / totalDur
                const wc = i === timings.length - 1 ? words.length - wi : Math.max(1, Math.round(words.length * ratio))
                result.push(words.slice(wi, wi + wc).join(' '))
                wi += wc
              }
              return result
            })()
          )
        }}
          className="px-2 py-0.5 rounded text-[10px] bg-bg-card border border-border hover:bg-bg-hover text-text-secondary">
          텍스트만 재배분
        </button>
      </div>

      {/* 조작 안내 (아코디언) */}
      <div className="bg-bg-main rounded overflow-hidden">
        <button
          onClick={() => setGuideOpen(v => !v)}
          className="w-full flex items-center justify-between px-3 py-1.5 text-[11px] text-text-secondary hover:text-text-primary transition-colors"
        >
          <span>조작 안내</span>
          <span className={`text-[10px] transition-transform ${guideOpen ? 'rotate-180' : ''}`}>▼</span>
        </button>
        {guideOpen && (
          <div className="text-[11px] text-text-primary px-3 pb-2 space-y-0.5">
            <div><span className="text-accent">클릭</span> — 해당 위치부터 재생 + 토막 선택</div>
            <div><span className="text-accent">Space</span> — 재생/일시정지 토글 (파형 포커스 시)</div>
            <div><span className="text-accent">노란선 드래그</span> — 문장 경계 이동</div>
            <div><span className="text-accent">파형 더블클릭</span> — 경계 추가 (텍스트도 해당 위치에서 분할)</div>
            <div><span className="text-accent">노란선 더블클릭</span> — 경계 제거 (텍스트 병합)</div>
            <div><span className="text-accent">◀ ▶</span> — 단어를 이전/다음 토막로 이동 (텍스트 비중 조절)</div>
            <div className="pt-1 border-t border-border mt-1 text-text-secondary">수정 후 <span className="text-green-400">타이밍 저장</span> 버튼으로 JSON 반영.</div>
          </div>
        )}
      </div>

      {/* 토막 목록 */}
      <div className="space-y-1">
        {timings.map((t, i) => (
          <div key={i} className={`flex items-start gap-2 text-xs group rounded px-1 py-0.5 transition-colors ${activeSegment === i ? 'bg-accent/10 ring-1 ring-accent/30' : ''}`}>
            <div
              className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5 cursor-pointer"
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
              onFocus={() => setActiveSegment(i)}
              onChange={(e) => {
                const newSegs = [...segments]
                newSegs[i] = e.target.value
                updateSegments(newSegs)
              }}
              className={`flex-1 min-w-0 bg-bg-main border rounded px-2 py-0.5 text-xs focus:outline-none ${activeSegment === i ? 'border-accent' : 'border-border'}`}
            />
            <div className="flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              {i > 0 && (
                <button onClick={() => shiftWord(i, 'left')}
                  className="px-1 py-0.5 rounded text-[9px] bg-bg-card border border-border hover:bg-bg-hover"
                  title="첫 단어를 이전 토막로">◀</button>
              )}
              {i < timings.length - 1 && (
                <button onClick={() => shiftWord(i, 'right')}
                  className="px-1 py-0.5 rounded text-[9px] bg-bg-card border border-border hover:bg-bg-hover"
                  title="마지막 단어를 다음 토막로">▶</button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* JSON 직접 편집 */}
      <div>
        <button onClick={() => {
          if (jsonOpen) { setJsonOpen(false) } else {
            setJsonText(JSON.stringify(timings, null, 2))
            setJsonError(null)
            setJsonOpen(true)
          }
        }}
          className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-bg-card border border-border hover:bg-bg-hover text-text-secondary">
          <span>{'{}'}</span>
          <span>{jsonOpen ? 'JSON 닫기' : 'JSON 편집'}</span>
        </button>
        {jsonOpen && (
          <div className="mt-1 space-y-1">
            <textarea
              value={jsonText}
              onChange={(e) => { setJsonText(e.target.value); setJsonError(null) }}
              className="w-full h-40 bg-bg-main border border-border rounded px-2 py-1 font-mono text-[10px] resize-y focus:outline-none focus:border-accent"
            />
            {jsonError && <div className="text-[10px] text-red-400">{jsonError}</div>}
            <div className="flex gap-1">
              <button onClick={() => {
                try {
                  const parsed = JSON.parse(jsonText)
                  if (!Array.isArray(parsed) || !parsed.every((t: any) => t && typeof t.start === 'number' && typeof t.end === 'number')) {
                    setJsonError('[{start, end}, ...] 형식이어야 합니다'); return
                  }
                  onChange(parsed)
                  setJsonOpen(false)
                } catch (e: unknown) { setJsonError('JSON 파싱 오류: ' + (e instanceof Error ? e.message : String(e))) }
              }}
                className="px-2 py-0.5 rounded text-[10px] font-semibold bg-green-600 text-white hover:bg-green-500">
                JSON 적용
              </button>
              <button onClick={() => setJsonOpen(false)}
                className="px-2 py-0.5 rounded text-[10px] bg-bg-card border border-border hover:bg-bg-hover text-text-secondary">
                취소
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
