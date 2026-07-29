import React, { useState, useCallback, useMemo } from 'react'
import type { Timing, Props } from './types'
import { splitTextAtRatio, redistributeByDuration } from './utils'

type Args = Pick<Props, 'timings' | 'duration' | 'onChange' | 'onSegmentsChange' | 'segmentsRef'> & {
  initialSentences: string[]
}

export function useTimingEditor({ timings, duration, initialSentences, onChange, onSegmentsChange, segmentsRef }: Args) {
  // 초기값 기억 (초기화용)
  const [originalTimings] = useState(() => [...timings.map(t => ({ ...t }))])
  const [originalSentences] = useState(() => [...initialSentences])
  const [jsonOpen, setJsonOpen] = useState(false)
  const [jsonText, setJsonText] = useState('')
  const [jsonError, setJsonError] = useState<string | null>(null)
  const [activeSegment, setActiveSegment] = useState<number | null>(null)
  const [guideOpen, setGuideOpen] = useState(false)
  // 파형 위 마우스 시간(초) — 더블클릭 삭제가 어느 선을 잡을지 미리 강조하기 위함.
  const [hoverT, setHoverT] = useState<number | null>(null)
  // Shift 눌림 — 빈 곳 더블클릭이 노란선(Stich)인지 파란선(Hemistich)인지 미리보기 색을 가른다.
  const [shiftHeld, setShiftHeld] = useState(false)
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => { if (e.key === 'Shift') setShiftHeld(true) }
    const up = (e: KeyboardEvent) => { if (e.key === 'Shift') setShiftHeld(false) }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [])
  const inputRefs = React.useRef<(HTMLInputElement | null)[]>([])

  // 로컬 토막 텍스트 — timings에 text가 있으면 그대로 사용 (저장된 자막)
  const [segments, setSegments] = useState<string[]>(() => {
    // 1) timings에 text가 이미 저장되어 있으면 그걸 사용
    if (timings.length > 0 && timings.every(t => t.text)) {
      return timings.map(t => t.text!)
    }
    // 2) 문장 수 == 타이밍 수면 1:1 매핑, 아니면 3) 시간 비율 기반 배분
    return redistributeByDuration(initialSentences, timings)
  })

  // setSegments 래핑 — 부모에도 전파 + ref 동기화
  const updateSegments = useCallback((next: string[]) => {
    setSegments(next)
    if (segmentsRef) segmentsRef.current = next
    onSegmentsChange?.(next)
  }, [onSegmentsChange, segmentsRef])

  // 초기 토막를 ref에 동기화
  React.useEffect(() => {
    if (segmentsRef) segmentsRef.current = segments
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // 마우스 위치에서 더블클릭 삭제가 잡을 경계 — handleDblClick과 같은 규칙(Hemistich 우선 → Stich, ±0.18s).
  const hoveredMark = useMemo<{ type: 'sub'; si: number; k: number } | { type: 'stich'; i: number } | null>(() => {
    if (hoverT == null) return null
    const NEAR = 0.18
    let best: { type: 'sub'; si: number; k: number } | { type: 'stich'; i: number } | null = null
    let bestDist = NEAR
    // Hemistich(파란선) 우선
    for (let si = 0; si < timings.length; si++) {
      const subTs = timings[si].subTimings ?? []
      for (let k = 0; k < subTs.length; k++) {
        const d = Math.abs(subTs[k] - hoverT)
        if (d < bestDist) { bestDist = d; best = { type: 'sub', si, k } }
      }
    }
    if (best) return best
    // Hemistich가 근처에 없을 때만 Stich(노란선) 경계
    for (let i = 0; i < timings.length - 1; i++) {
      const d = Math.abs(timings[i].end - hoverT)
      if (d < bestDist) { bestDist = d; best = { type: 'stich', i } }
    }
    return best
  }, [hoverT, timings])

  // 파형 클릭 → 토막 식별 (포커스는 파형에 유지 — Space 키 동작 보장)
  const handleWaveTimeClick = useCallback((time: number) => {
    const idx = timings.findIndex(t => time >= t.start && time < t.end)
    setActiveSegment(idx >= 0 ? idx : (time >= (timings.at(-1)?.start ?? 0) ? timings.length - 1 : null))
  }, [timings])

  // 경계선 드래그
  // preventDefault 는 하지 않는다 — pointerdown 에서 preventDefault 하면 브라우저가 후속
  // 마우스 호환 이벤트(click→dblclick)를 만들지 않아 노란선 더블클릭(경계 제거)이 죽는다.
  // 대신 4px 이동 임계값을 둬 '정지 클릭'은 드래그로 처리하지 않고 더블클릭과 공존시킨다.
  const handlePointerDown = useCallback((boundaryIdx: number, e: React.PointerEvent) => {
    e.stopPropagation()
    const container = e.currentTarget.parentElement
    if (!container || duration <= 0) return
    const rect = container.getBoundingClientRect()
    const startX = e.clientX
    let dragging = false

    const onMove = (ev: PointerEvent) => {
      if (!dragging && Math.abs(ev.clientX - startX) < 4) return
      dragging = true
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

  // Shift+더블클릭 → 토막 내부 sub(작은 조각) 경계 추가. t 위치가 속한 토막을 찾아
  // sub 가 없으면 토막 텍스트를 둘로, 있으면 t 가 속한 sub 조각을 둘로 나눈다.
  // 사용자가 직접 위치를 찍는 수동 분할이라 자동 글자수 분할 규칙과 무관하다.
  const handleAddSub = useCallback((t: number) => {
    const segIdx = timings.findIndex(s => t > s.start && t < s.end)
    if (segIdx < 0) return
    const seg = timings[segIdx]
    const roundedT = Math.round(t * 1000) / 1000
    // 토막 경계·기존 sub 경계와 너무 가까우면 무시
    const marks = [seg.start, seg.end, ...(seg.subTimings ?? [])]
    if (marks.some(x => Math.abs(x - t) < 0.15)) return

    let newSub: string[]
    let newSubTimings: number[]
    if (!seg.sub || seg.sub.length === 0) {
      const text = segments[segIdx] ?? seg.text ?? ''
      const ratio = (t - seg.start) / (seg.end - seg.start)
      const [p1, p2] = splitTextAtRatio(text, ratio)
      newSub = [p1, p2]
      newSubTimings = [roundedT]
    } else {
      const subs = seg.sub
      const subTs = seg.subTimings ?? []
      // t 가 속한 sub 조각 인덱스 k 와 그 조각의 시작 시각 prevT 찾기
      let k = subs.length - 1
      let prevT = seg.start
      for (let i = 0; i < subs.length; i++) {
        const endT = i < subTs.length ? subTs[i] : seg.end
        if (t < endT) { k = i; break }
        prevT = endT
      }
      const nextT = k < subTs.length ? subTs[k] : seg.end
      const ratio = nextT > prevT ? (t - prevT) / (nextT - prevT) : 0.5
      const [sp1, sp2] = splitTextAtRatio(subs[k] ?? '', ratio)
      newSub = [...subs.slice(0, k), sp1, sp2, ...subs.slice(k + 1)]
      newSubTimings = [...subTs.slice(0, k), roundedT, ...subTs.slice(k)]
    }
    const newTimings = [...timings]
    newTimings[segIdx] = { ...seg, sub: newSub, subTimings: newSubTimings }
    onChange(newTimings)
  }, [timings, segments, onChange])

  // 토막(Stich) 경계 제거 + 텍스트 병합 (sub/subTimings 보존 병합)
  const removeBoundary = useCallback((boundaryIdx: number) => {
    if (timings.length <= 1) return
    const left = timings[boundaryIdx]
    const right = timings[boundaryIdx + 1]
    if (!left || !right) return
    const leftText = segments[boundaryIdx] ?? ''
    const rightText = segments[boundaryIdx + 1] ?? ''
    const merged: Timing = { start: left.start, end: right.end, text: (leftText + ' ' + rightText).trim() }
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

  // Hemistich(sub) 경계 제거 + 양옆 텍스트 병합
  const removeSubBoundary = useCallback((segIdx: number, subIdx: number) => {
    const seg = timings[segIdx]
    if (!seg?.sub || !seg.subTimings) return
    const newSub = [...seg.sub]
    const newSubTimings = [...seg.subTimings]
    newSub.splice(subIdx, 2, `${newSub[subIdx] ?? ''} ${newSub[subIdx + 1] ?? ''}`.trim())
    newSubTimings.splice(subIdx, 1)
    const newTimings = [...timings]
    const updated: Timing = { ...seg, sub: newSub, subTimings: newSubTimings }
    if (newSub.length <= 1) { delete updated.sub; delete updated.subTimings }
    newTimings[segIdx] = updated
    onChange(newTimings)
  }, [timings, onChange])

  // 파형 더블클릭 — 위치로 판단한다. 좁은 경계선을 정확히 못 눌러도 동작하도록 일원화.
  //  · Shift: 토막 안 Hemistich(sub) 경계 추가
  //  · 경계 근처(파란선 우선 → 노란선): 그 경계 제거
  //  · 빈 곳: 토막(Stich) 경계 추가 (텍스트·sub 분배)
  const handleDblClick = useCallback((t: number, modifiers?: { shiftKey: boolean }) => {
    if (modifiers?.shiftKey) { handleAddSub(t); return }
    const NEAR = 0.18 // pxPerSec=120 기준 약 22px — 좁은 선을 정확히 못 눌러도 제거되게 한다.

    // 1) 근처 Hemistich(파란선) 경계 → 제거
    for (let si = 0; si < timings.length; si++) {
      const subTs = timings[si].subTimings ?? []
      const k = subTs.findIndex(x => Math.abs(x - t) < NEAR)
      if (k >= 0) { removeSubBoundary(si, k); return }
    }
    // 2) 근처 토막(노란선) 경계 → 제거
    const bIdx = timings.slice(0, -1).findIndex(seg => Math.abs(seg.end - t) < NEAR)
    if (bIdx >= 0) { removeBoundary(bIdx); return }

    // 3) 빈 곳 → 토막 경계 추가
    const idx = timings.findIndex(seg => t > seg.start && t < seg.end)
    if (idx < 0) return
    const original = timings[idx]
    const roundedT = Math.round(t * 1000) / 1000
    const segText = segments[idx] ?? ''
    const ratio = (t - original.start) / (original.end - original.start)
    const [p1, p2] = splitTextAtRatio(segText, ratio)

    // sub/subTimings 보존: t가 속한 sub 항목을 두 조각으로 분할하고 양쪽 토막에 분배
    let leftSubExtra: Pick<Timing, 'sub' | 'subTimings'> = {}
    let rightSubExtra: Pick<Timing, 'sub' | 'subTimings'> = {}
    if (original.sub && original.sub.length > 0) {
      const subs = original.sub
      const subTs = original.subTimings ?? []
      let k = subs.length - 1
      for (let i = 0; i < subTs.length; i++) { if (t < subTs[i]) { k = i; break } }
      const prevT = k > 0 ? subTs[k - 1] : original.start
      const nextT = k < subTs.length ? subTs[k] : original.end
      const subRatio = nextT > prevT ? (t - prevT) / (nextT - prevT) : 0.5
      const [sp1, sp2] = splitTextAtRatio(subs[k] ?? '', subRatio)
      leftSubExtra = { sub: [...subs.slice(0, k), sp1], subTimings: subTs.slice(0, k) }
      rightSubExtra = { sub: [sp2, ...subs.slice(k + 1)], subTimings: subTs.slice(k) }
    }

    const newTimings = [...timings]
    newTimings.splice(idx, 1,
      { start: original.start, end: roundedT, text: p1, ...leftSubExtra },
      { start: roundedT, end: original.end, text: p2, ...rightSubExtra }
    )
    const newSegs = [...segments]
    newSegs.splice(idx, 1, p1, p2)
    updateSegments(newSegs)
    onChange(newTimings)
  }, [timings, segments, onChange, updateSegments, handleAddSub, removeBoundary, removeSubBoundary])

  // sub 경계선 드래그 — segIdx 토막 내부의 subTimings[subIdx] 조정
  // (노란선과 동일) preventDefault 미사용 + 4px 임계값으로 더블클릭(sub 경계 제거)과 공존.
  const handleSubPointerDown = useCallback((segIdx: number, subIdx: number, e: React.PointerEvent) => {
    e.stopPropagation()
    const container = e.currentTarget.parentElement
    if (!container || duration <= 0) return
    const rect = container.getBoundingClientRect()

    const seg = timings[segIdx]
    if (!seg.subTimings || seg.subTimings.length === 0) return
    const startX = e.clientX
    let dragging = false

    const onMove = (ev: PointerEvent) => {
      if (!dragging && Math.abs(ev.clientX - startX) < 4) return
      dragging = true
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

  // sub 텍스트 편집 — sub[k] 변경 + 토막 자막(text/segments)을 sub 합으로 동기화.
  // text·sub 모두 voiceTimings 내부 필드라 원문(episode 본문)에는 닿지 않는다.
  const updateSub = useCallback((segIdx: number, k: number, value: string) => {
    const seg = timings[segIdx]
    if (!seg.sub) return
    const newSub = [...seg.sub]
    newSub[k] = value
    const merged = newSub.join(' ').replace(/\s+/g, ' ').trim()
    const newTimings = [...timings]
    newTimings[segIdx] = { ...seg, sub: newSub, text: merged }
    onChange(newTimings)
    const newSegs = [...segments]
    newSegs[segIdx] = merged
    updateSegments(newSegs)
  }, [timings, segments, onChange, updateSegments])

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

  // 경계+텍스트 초기화
  const resetAll = useCallback(() => {
    updateSegments([...originalSentences])
    onChange(originalTimings.map(t => ({ ...t })))
  }, [updateSegments, originalSentences, onChange, originalTimings])

  // 텍스트만 재배분 (경계 유지)
  const redistributeText = useCallback(() => {
    updateSegments(redistributeByDuration(originalSentences, timings))
  }, [updateSegments, originalSentences, timings])

  // JSON 편집 열기/닫기 토글
  const toggleJson = useCallback(() => {
    if (jsonOpen) { setJsonOpen(false) } else {
      setJsonText(JSON.stringify(timings, null, 2))
      setJsonError(null)
      setJsonOpen(true)
    }
  }, [jsonOpen, timings])

  return {
    // state
    segments,
    jsonOpen, setJsonOpen,
    jsonText, setJsonText,
    jsonError, setJsonError,
    activeSegment, setActiveSegment,
    guideOpen, setGuideOpen,
    hoverT, setHoverT,
    shiftHeld,
    hoveredMark,
    inputRefs,
    // handlers
    updateSegments,
    handleWaveTimeClick,
    handlePointerDown,
    handleAddSub,
    removeBoundary,
    removeSubBoundary,
    handleDblClick,
    handleSubPointerDown,
    updateSub,
    shiftWord,
    resetAll,
    redistributeText,
    toggleJson,
  }
}
