'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import type { VoiceFile } from '../../voice-utils'
import { useBreathEditor, type BreathEndpoints } from './useBreathEditor'

const CANVAS_H = 160
const BAR_COLOR = 'rgba(200, 164, 110, 0.85)'

type Props = {
  series: string
  name: string
  file: VoiceFile
  onRefresh: () => void
  /** 로드·저장 라우트 어댑터 (선택) — 세력도 등 다른 저장 경로용. 미지정 시 북리커맨드 기본 라우트. */
  endpoints?: BreathEndpoints
}

/** BREATH mode panel — 파형에서 들숨·잡소리 구간을 드래그로 지정해 무음 처리한다.
 *  잘라내지 않고 소리만 0으로 깎으므로 전체 길이·자막 타이밍이 변하지 않는다. */
export function BreathModeContent({ series, name, file, onRefresh, endpoints }: Props) {
  const ed = useBreathEditor({ series, name, file, onRefresh, endpoints })
  const [pxPerSec, setPxPerSec] = useState(200)
  const [gain, setGain] = useState(3)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  // 드래그 중 임시 선택 구간 [시작, 현재] (초)
  const [tempSel, setTempSel] = useState<{ a: number; b: number } | null>(null)
  const dragRef = useRef<{ startX: number; startT: number; dragging: boolean } | null>(null)

  const dur = ed.wav?.duration ?? 0
  const canvasW = Math.min(30000, Math.max(600, Math.round(dur * pxPerSec)))

  // 파형 그리기 — 픽셀 컬럼별 min/max 피크. gain 으로 세로 증폭해 작은 들숨도 보이게 한다.
  useEffect(() => {
    const canvas = canvasRef.current
    const data = ed.samples
    if (!canvas || !data || data.length === 0) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const W = canvas.width
    const mid = CANVAS_H / 2
    ctx.clearRect(0, 0, W, CANVAS_H)
    ctx.fillStyle = 'rgba(200, 164, 110, 0.15)'
    ctx.fillRect(0, mid, W, 1)
    ctx.fillStyle = BAR_COLOR
    const perPx = data.length / W
    for (let x = 0; x < W; x++) {
      const s = Math.floor(x * perPx)
      const e = Math.max(s + 1, Math.floor((x + 1) * perPx))
      let min = 1, max = -1
      for (let i = s; i < e && i < data.length; i++) {
        const v = data[i]
        if (v < min) min = v
        if (v > max) max = v
      }
      const top = mid - Math.min(1, Math.max(-1, max * gain)) * (mid - 2)
      const bot = mid - Math.min(1, Math.max(-1, min * gain)) * (mid - 2)
      ctx.fillRect(x, top, 1, Math.max(1, bot - top))
    }
  }, [ed.samples, canvasW, gain])

  const xToTime = useCallback((clientX: number) => {
    const rect = innerRef.current?.getBoundingClientRect()
    if (!rect || dur <= 0) return 0
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)) * dur
  }, [dur])

  // 드래그 = 구간 지정, 클릭 = 그 위치부터 재생(무음 적용 상태로 들린다)
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (dur <= 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = { startX: e.clientX, startT: xToTime(e.clientX), dragging: false }
  }, [dur, xToTime])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const d = dragRef.current
    if (!d) return
    if (!d.dragging && Math.abs(e.clientX - d.startX) < 4) return
    d.dragging = true
    setTempSel({ a: d.startT, b: xToTime(e.clientX) })
  }, [xToTime])

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    const d = dragRef.current
    dragRef.current = null
    if (!d) return
    if (d.dragging) {
      // 드래그하면 일단 잘라내기 구간으로 만든다. 무음으로 바꿀 건 구간 칩에서 누른다.
      ed.addRegion(d.startT, xToTime(e.clientX), 'cut')
      setTempSel(null)
    } else {
      ed.play(d.startT)
    }
  }, [ed, xToTime])

  const pct = (t: number) => dur > 0 ? `${(t / dur) * 100}%` : '0%'
  const widthPct = (a: number, b: number) => dur > 0 ? `${(Math.abs(b - a) / dur) * 100}%` : '0%'

  // 구간 처리 방식별 집계 — 저장 버튼 문구·결과 길이 안내에 쓴다.
  const cutCount = ed.regions.filter(r => (r.mode ?? 'mute') === 'cut').length
  const muteCount = ed.regions.length - cutCount
  const cutSec = ed.regions.filter(r => (r.mode ?? 'mute') === 'cut').reduce((s, r) => s + (r.end - r.start), 0)

  return (
    <section className="rounded-md border border-border bg-bg-main/40 p-4 space-y-3 relative">

      <div className="flex items-center gap-3 flex-wrap">
        <h3 className="text-sm font-semibold text-text-primary">들숨 제거·구간 잘라내기</h3>
        <span className="text-xs text-text-secondary">
          파형을 드래그해 구간을 지정한다. 무음은 소리만 비우고(길이 유지), 잘라내기는 그 구간을 없애고 앞뒤를 붙인다(길이 단축). 클릭하면 그 위치부터 재생.
        </span>
        <div className="ml-auto flex items-center gap-3 text-xs text-text-secondary">
          <span>{file.name}</span>
          <span className="text-border">·</span>
          <span>길이 {dur.toFixed(2)}초</span>
          {ed.saving && <span className="text-amber-400 animate-pulse">저장 중…</span>}
        </div>
      </div>

      {/* 컨트롤 바 */}
      <div className="flex items-center gap-4 flex-wrap text-xs">
        <div role="group" className="inline-flex items-stretch rounded border border-border overflow-hidden">
          <button
            onClick={() => ed.playing ? ed.stop() : ed.play(0, undefined, true, true)}
            disabled={!ed.wav}
            className="px-3 py-1.5 bg-bg-card hover:bg-bg-hover text-text-primary disabled:opacity-40"
            title="무음·잘라내기를 모두 적용한 완성본을 처음부터 재생"
          >
            {ed.playing ? '정지' : '결과 미리듣기'}
          </button>
          <button
            onClick={() => ed.play(0, undefined, false)}
            disabled={!ed.wav}
            className="px-3 py-1.5 bg-bg-card hover:bg-bg-hover text-text-secondary border-l border-border disabled:opacity-40"
            title="편집 없이 원본 그대로 재생"
          >
            원본 듣기
          </button>
        </div>

        <label className="flex items-center gap-2 text-text-secondary">
          확대
          <input type="range" min={50} max={1000} step={10} value={pxPerSec}
            onChange={e => setPxPerSec(Number(e.target.value))} className="w-28 accent-accent" />
        </label>
        <label className="flex items-center gap-2 text-text-secondary" title="작은 들숨이 보이도록 파형 세로 크기만 키운다. 소리에는 영향 없음.">
          증폭
          <input type="range" min={1} max={10} step={0.5} value={gain}
            onChange={e => setGain(Number(e.target.value))} className="w-28 accent-accent" />
        </label>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-text-secondary">
            {cutCount > 0 && <span className="text-sky-300">잘라 {cutCount}</span>}
            {cutCount > 0 && muteCount > 0 && <span className="text-border"> · </span>}
            {muteCount > 0 && <span className="text-red-300">무음 {muteCount}</span>}
            {ed.regions.length === 0 && '구간 0개'}
          </span>
          <button
            onClick={ed.saveApplied}
            disabled={ed.saving || ed.regions.length === 0}
            className="px-3 py-1.5 rounded bg-accent text-bg-primary text-sm font-semibold hover:opacity-90 disabled:opacity-40 disabled:bg-bg-card disabled:text-text-secondary"
            title={cutSec > 0 ? `잘라내기 ${cutSec.toFixed(2)}초만큼 길이가 줄어든다` : undefined}
          >
            {ed.saving ? '저장 중…' : ed.regions.length > 0 ? `적용 저장 (${ed.regions.length})` : '적용 저장 (구간 지정 필요)'}
          </button>
          <button
            onClick={ed.restoreOriginal}
            disabled={ed.saving || ed.savedCount === 0}
            className="px-3 py-1.5 rounded text-sm bg-bg-card hover:bg-bg-hover text-text-secondary border border-border disabled:opacity-40"
            title="이 패널을 연 시점의 원본으로 되돌린다. 패널을 닫으면 복원 불가."
          >
            원본 복원
          </button>
        </div>
      </div>

      {/* 파형 */}
      {ed.loading ? (
        <div className="text-sm text-text-secondary italic px-1 py-6">음원 로딩 중…</div>
      ) : ed.wav ? (
        <div className="overflow-x-auto rounded border border-border bg-bg-card">
          <div
            ref={innerRef}
            className="relative cursor-crosshair select-none"
            style={{ width: canvasW, height: CANVAS_H }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          >
            <canvas ref={canvasRef} width={canvasW} height={CANVAS_H} className="block" />
            {/* 확정된 구간 — 잘라내기(파랑) / 무음(빨강) */}
            {ed.regions.map(r => {
              const isCut = (r.mode ?? 'mute') === 'cut'
              return (
                <div
                  key={r.id}
                  className={`absolute top-0 bottom-0 pointer-events-none border-x ${isCut ? 'bg-sky-500/25 border-sky-400/60' : 'bg-red-500/25 border-red-400/60'}`}
                  style={{ left: pct(r.start), width: widthPct(r.start, r.end) }}
                />
              )
            })}
            {/* 드래그 중 임시 선택 */}
            {tempSel && (
              <div
                className="absolute top-0 bottom-0 pointer-events-none border-x bg-sky-400/15 border-sky-300/50"
                style={{ left: pct(Math.min(tempSel.a, tempSel.b)), width: widthPct(tempSel.a, tempSel.b) }}
              />
            )}
            {/* 재생 위치 */}
            {ed.playing && (
              <div
                className="absolute top-0 bottom-0 w-px bg-amber-300 pointer-events-none"
                style={{ left: pct(ed.playhead) }}
              />
            )}
          </div>
        </div>
      ) : null}

      {/* 구간 목록 */}
      {ed.regions.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {ed.regions.map(r => {
            const isCut = (r.mode ?? 'mute') === 'cut'
            return (
              <span
                key={r.id}
                className={`inline-flex items-center gap-1.5 rounded border px-2 py-1 text-xs text-text-primary ${isCut ? 'border-sky-400/40 bg-sky-500/10' : 'border-red-400/40 bg-red-500/10'}`}
              >
                <button
                  onClick={() => ed.toggleRegionMode(r.id)}
                  className={`rounded px-1.5 font-semibold ${isCut ? 'bg-sky-500/25 text-sky-200' : 'bg-red-500/25 text-red-200'}`}
                  title="처리 방식 전환 (잘라내기 ↔ 무음)"
                >
                  {isCut ? '잘라' : '무음'}
                </button>
                {r.start.toFixed(2)}–{r.end.toFixed(2)} ({(r.end - r.start).toFixed(2)}초)
                <button
                  onClick={() => ed.play(Math.max(0, r.start - 0.3), Math.min(dur, r.end + 0.3), false)}
                  className="text-text-secondary hover:text-text-primary"
                  title="이 구간 소리를 앞뒤 0.3초 여유와 함께 원본 그대로 들어본다"
                >
                  듣기
                </button>
                <button
                  onClick={() => ed.removeRegion(r.id)}
                  className="text-text-secondary hover:text-red-300"
                  title="이 구간 지정 해제"
                >
                  ✕
                </button>
              </span>
            )
          })}
        </div>
      )}

      {ed.error && <div className="text-xs text-danger-text">{ed.error}</div>}

      {/* 사용법 안내 */}
      <div className="rounded border border-border bg-bg-card/60 p-4 text-xs leading-relaxed text-text-secondary space-y-2">
        <div className="text-sm font-semibold text-text-primary">사용법</div>
        <ol className="list-decimal list-inside space-y-1.5">
          <li>
            <span className="text-text-primary font-semibold">구간 지정</span> — 파형 위를 <span className="text-text-primary">드래그</span>하면 그 구간이 잡힙니다(처음엔 <span className="text-sky-300">잘라내기</span>=파랑).
            여러 군데를 연달아 지정할 수 있습니다. 파형을 클릭하면 그 위치부터 들어볼 수 있고, 잘 안 보이면 「증폭」·「확대」로 키우세요.
          </li>
          <li>
            <span className="text-text-primary font-semibold">방식 바꾸기</span> — 잡은 구간을 그대로 두면 <span className="text-sky-300">잘라내기</span>(빈 구간을 없애고 앞뒤를 붙임)입니다.
            소리만 비우려면 아래 구간 칩 맨 앞의 <span className="text-sky-300">「잘라」</span>를 눌러 <span className="text-red-300">「무음」</span>(들숨·잡소리 죽이기)으로 바꿉니다.
          </li>
          <li>
            <span className="text-text-primary font-semibold">확인</span> — 칩의 「듣기」는 그 구간 소리만 앞뒤 여유를 두고 들려줍니다.
            잘못 잡았으면 ✕로 해제하세요. 「결과 미리듣기」는 잘라내기·무음을 모두 적용한 완성본을 들려줍니다.
          </li>
          <li>
            <span className="text-text-primary font-semibold">저장</span> — 「적용 저장」을 누르면 파일이 덮어써집니다.
            실수했다면 「원본 복원」으로 되돌릴 수 있지만, <span className="text-amber-300">이 창을 닫으면 복원할 수 없습니다.</span>
          </li>
        </ol>
        <div className="pt-1 border-t border-border/60 space-y-1.5">
          <div>
            <span className="text-red-300">무음</span>은 소리만 비워 전체 길이가 그대로이므로, 이미 맞춰 둔 자막 타이밍(싱크 탭)이 유효합니다.
          </div>
          <div>
            <span className="text-sky-300">잘라내기</span>는 그만큼 <span className="text-amber-300">전체 길이가 줄어듭니다.</span>
            저장한 뒤에는 음성 동기화를 다시 돌려 자막 점등 타이밍을 새 길이에 맞춰 주세요.
          </div>
        </div>
      </div>
    </section>
  )
}
