'use client'

import { ChevronLeft, ChevronRight, LocateFixed } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { MediaSegment } from '@/lib/types'

type Props = { jobId: string; duration: number; current: number; segments: MediaSegment[]; onSeek: (time: number) => void; onCreate: (start: number, end: number) => void }

export function WaveformTimeline({ jobId, duration, current, segments, onSeek, onCreate }: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const dragStartRef = useRef<number | null>(null)
  const [peaks, setPeaks] = useState<number[]>([])
  const [dragStart, setDragStart] = useState<number | null>(null)
  const [dragEnd, setDragEnd] = useState<number | null>(null)
  const [windowSize, setWindowSize] = useState(60)
  const [viewStart, setViewStart] = useState(0)
  const safeDuration = Math.max(duration, 1)
  const viewLength = Math.min(windowSize, safeDuration)
  const viewEnd = Math.min(viewStart + viewLength, safeDuration)

  useEffect(() => {
    const controller = new AbortController()
    void fetch(`/api/jobs/${jobId}/waveform?v=2`, { signal: controller.signal }).then((response) => response.ok ? response.json() : { peaks: [] }).then((data: { peaks: number[] }) => setPeaks(data.peaks)).catch(() => undefined)
    return () => controller.abort()
  }, [jobId])
  useEffect(() => { if (duration > 0 && windowSize > duration) setWindowSize(duration) }, [duration, windowSize])

  function timeAt(clientX: number) {
    const box = svgRef.current?.getBoundingClientRect()
    if (!box) return viewStart
    return Math.max(viewStart, Math.min(viewStart + (clientX - box.left) / box.width * viewLength, viewEnd))
  }
  function pointerDown(event: React.PointerEvent<SVGSVGElement>) {
    event.currentTarget.setPointerCapture(event.pointerId)
    const time = timeAt(event.clientX)
    dragStartRef.current = time
    setDragStart(time)
    setDragEnd(time)
  }
  function pointerMove(event: React.PointerEvent<SVGSVGElement>) { if (dragStartRef.current !== null) setDragEnd(timeAt(event.clientX)) }
  function pointerUp(event: React.PointerEvent<SVGSVGElement>) {
    const start = dragStartRef.current
    if (start === null) return
    const end = timeAt(event.clientX)
    const first = Math.min(start, end)
    const last = Math.max(start, end)
    if (last - first >= 0.5) onCreate(first, last)
    if (last - first < 0.5) onSeek(first)
    dragStartRef.current = null
    setDragStart(null)
    setDragEnd(null)
  }
  function moveWindow(start: number) { setViewStart(Math.max(0, Math.min(start, safeDuration - viewLength))) }
  function focusCurrent() { moveWindow(current - viewLength / 2) }
  function changeWindow(next: number) { setWindowSize(next); setViewStart(Math.max(0, Math.min(current - next / 2, safeDuration - next))) }

  const startIndex = Math.floor(viewStart / safeDuration * peaks.length)
  const endIndex = Math.ceil(viewEnd / safeDuration * peaks.length)
  const visiblePeaks = peaks.slice(startIndex, endIndex)
  const visibleSegments = segments.filter((item) => item.end > viewStart && item.start < viewEnd)
  const selection = dragStart === null || dragEnd === null ? null : { start: Math.min(dragStart, dragEnd), end: Math.max(dragStart, dragEnd) }
  const zoomOptions = [...new Set([30, 60, 120, Math.round(safeDuration)])].filter((value) => value <= safeDuration)

  return <div className="border border-line bg-panel"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3"><div><p className="text-sm font-semibold text-signal">드래그로 사용할 부분 선택</p><p className="mt-1 text-sm text-muted">한 문장씩 고르거나, 같은 사람이 이어 말하는 부분을 넓게 고르세요.</p></div><div className="flex flex-wrap items-center gap-2"><button aria-label="이전 파형" onClick={() => moveWindow(viewStart - viewLength)} className="border border-line p-2"><ChevronLeft size={17} /></button><button onClick={focusCurrent} className="flex items-center gap-2 border border-line px-3 py-2 text-sm"><LocateFixed size={16} />재생 위치</button><button aria-label="다음 파형" onClick={() => moveWindow(viewStart + viewLength)} className="border border-line p-2"><ChevronRight size={17} /></button><select aria-label="파형 확대 범위" value={windowSize} onChange={(event) => changeWindow(Number(event.target.value))} className="border border-line bg-ink px-3 py-2 text-sm">{zoomOptions.map((value) => <option key={value} value={value}>{value >= safeDuration ? '전체 보기' : `${value}초 보기`}</option>)}</select></div></div><div className="flex gap-3 border-b border-line px-4 py-2 text-sm"><span className="text-signal">■ 화자 A</span><span className="text-live">■ 화자 B</span><span className="text-danger">■ 겹침</span></div><svg ref={svgRef} viewBox="0 0 900 180" preserveAspectRatio="none" className="waveform-editor block h-44 w-full select-none" onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp}>{visiblePeaks.map((peak, index) => <line key={startIndex + index} x1={index / Math.max(visiblePeaks.length - 1, 1) * 900} x2={index / Math.max(visiblePeaks.length - 1, 1) * 900} y1={90 - peak * 78} y2={90 + peak * 78} stroke="var(--color-muted)" strokeWidth="1" />)}{visibleSegments.map((item) => <rect key={item.id} x={(Math.max(item.start, viewStart) - viewStart) / viewLength * 900} width={Math.max((Math.min(item.end, viewEnd) - Math.max(item.start, viewStart)) / viewLength * 900, 2)} y="8" height="164" fill={speakerColor(item)} opacity="0.35" stroke={speakerColor(item)} strokeWidth="2" />)}{selection && <rect x={(selection.start - viewStart) / viewLength * 900} width={(selection.end - selection.start) / viewLength * 900} y="3" height="174" fill="var(--color-signal)" opacity="0.45" stroke="var(--color-cream)" strokeWidth="2" />}{current >= viewStart && current <= viewEnd && <line x1={(current - viewStart) / viewLength * 900} x2={(current - viewStart) / viewLength * 900} y1="0" y2="180" stroke="var(--color-cream)" strokeWidth="2" />}</svg><div className="flex justify-between border-t border-line px-3 py-2 font-mono text-sm text-muted"><span>{formatTime(viewStart)}</span><span>{formatTime(viewStart + viewLength / 2)}</span><span>{formatTime(viewEnd)}</span></div></div>
}

function speakerColor(segment: MediaSegment) {
  if (segment.speaker === 'A') return 'var(--color-signal)'
  if (segment.speaker === 'B') return 'var(--color-live)'
  return 'var(--color-danger)'
}

function formatTime(seconds: number) { return `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, '0')}` }
