'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import type { VoiceFile } from '@feelandnote/shared/bo/voice-utils'
import { useBreathEditor, type BreathEndpoints } from './useBreathEditor'
import { WaveDisplayControls } from '@feelandnote/shared/bo/audio-wave-player'

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

/** BREATH mode panel — 파형에서 들숨·잡소리 구간을 드래그 지정 (무음/잘라) + 클릭+삽입으로 간격을 넓힌다.
 *  mute: 길이 유지 / cut: 길이 단축 / insert: 길이 증가. 결과 미리듣기에서 모두 반영된다. */
export function BreathModeContent({ series, name, file, onRefresh, endpoints }: Props) {
  const ed = useBreathEditor({ series, name, file, onRefresh, endpoints })
  const [pxPerSec, setPxPerSec] = useState(200)
  const [gain, setGain] = useState(3)
  // 전역 처리 방식 — mute/cut 이면 모든 구간을 그 방식으로 강제, free 면 구간별 개별 지정
  const [regionMode, setRegionMode] = useState<'mute' | 'cut' | 'free'>('mute')
  // 간격 넓히기 기본값 (삽입 초)
  const [insertDur, setInsertDur] = useState(0.3)
  // 클릭으로 선택된 삽입 후보 위치 (클릭 시 재생 + 후보 설정)
  const [insertCandidate, setInsertCandidate] = useState<number | null>(null)
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

  // 전역 Space 토글
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return
      if (e.repeat) return
      const el = document.activeElement as HTMLElement | null
      if (el && (['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || el.isContentEditable)) return
      e.preventDefault()
      if (ed.playing) {
        ed.stop()
      } else {
        ed.play(ed.playhead > 0 && ed.playhead < dur ? ed.playhead : 0)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [ed, dur])

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
      // 새 구간은 전역 모드를 따른다(자율 모드는 일단 무음으로, 칩에서 개별 전환).
      ed.addRegion(d.startT, xToTime(e.clientX), regionMode === 'cut' ? 'cut' : 'mute')
      setTempSel(null)
      setInsertCandidate(null)
    } else {
      const t = d.startT
      ed.play(t)
      setInsertCandidate(t)
    }
  }, [ed, xToTime, regionMode])

  // 전역 모드 전환 — mute/cut 선택 시 기존 구간 전체를 그 방식으로 강제 정렬한다.
  const changeRegionMode = useCallback((m: 'mute' | 'cut' | 'free') => {
    setRegionMode(m)
    if (m !== 'free') ed.setAllRegionsMode(m)
  }, [ed])

  const pct = (t: number) => dur > 0 ? `${(t / dur) * 100}%` : '0%'
  const widthPct = (a: number, b: number) => dur > 0 ? `${(Math.abs(b - a) / dur) * 100}%` : '0%'

  // 구간 처리 방식별 집계 — 저장 버튼 문구·결과 길이 안내에 쓴다.
  const cutCount = ed.regions.filter(r => (r.mode ?? 'mute') === 'cut').length
  const muteCount = ed.regions.length - cutCount
  const cutSec = ed.regions.filter(r => (r.mode ?? 'mute') === 'cut').reduce((s, r) => s + (r.end - r.start), 0)

  return (
    <section className="rounded-md border border-border bg-bg-main/40 p-4 space-y-3 relative">

      <div className="flex items-center gap-3 flex-wrap">
        <h3 className="text-sm font-semibold text-text-primary">들숨 제거·구간 잘라내기·간격 넓히기</h3>
        <span className="text-xs text-text-secondary">
          드래그로 제거/무음 구간 지정. 클릭으로 위치 선택 후 아래 「넓히기」로 사이를 벌릴 수 있다. 무음(길이 유지) / 잘라(길이 ↓) / 삽입(길이 ↑).
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

        {/* 전역 처리 방식 — 무음 / 잘라 / 자율 */}
        <div className="flex items-center gap-2 text-text-secondary">
          방식
          <div role="group" className="inline-flex items-stretch rounded border border-border overflow-hidden">
            {([
              { key: 'mute', label: '무음', title: '모든 구간을 무음 처리 (길이 유지)' },
              { key: 'cut', label: '잘라', title: '모든 구간을 잘라내기 (길이 단축)' },
              { key: 'free', label: '자율', title: '구간마다 무음·잘라를 개별 지정' },
            ] as const).map(m => (
              <button
                key={m.key}
                onClick={() => changeRegionMode(m.key)}
                title={m.title}
                className={`px-3 py-1.5 border-l border-border first:border-l-0 ${
                  regionMode === m.key
                    ? 'bg-accent text-bg-primary font-semibold'
                    : 'bg-bg-card text-text-secondary hover:bg-bg-hover'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* 간격 넓히기 (삽입) 컨트롤 */}
        <div className="flex items-center gap-1.5 text-text-secondary">
          넓히기
          <div role="group" className="inline-flex items-stretch rounded border border-border overflow-hidden text-xs">
            {[0.1, 0.2, 0.3, 0.5].map(v => (
              <button
                key={v}
                onClick={() => setInsertDur(v)}
                className={`px-2 py-1 border-l border-border first:border-l-0 ${insertDur === v ? 'bg-emerald-600 text-white' : 'bg-bg-card hover:bg-bg-hover'}`}
              >
                +{v}
              </button>
            ))}
          </div>
          <input
            type="number"
            step={0.05}
            min={0.05}
            value={insertDur}
            onChange={e => setInsertDur(Math.max(0.05, parseFloat(e.target.value) || 0.3))}
            className="w-14 rounded border border-border bg-bg-card px-1 py-0.5 text-xs text-right font-mono"
          />
          <span className="text-[10px]">s</span>
          <button
            onClick={() => {
              const t = insertCandidate ?? ed.playhead ?? 0
              ed.addInsert(t, insertDur)
              setInsertCandidate(null)
            }}
            disabled={!ed.wav}
            className="ml-1 rounded bg-emerald-600/90 px-2 py-1 text-xs text-white hover:bg-emerald-600 disabled:opacity-40"
            title="클릭하거나 재생헤드 위치에 지정한 초만큼 무음 삽입 (길이 증가)"
          >
            +{insertDur.toFixed(1)}s 삽입
          </button>
        </div>

        <WaveDisplayControls
          zoom={pxPerSec} setZoom={setPxPerSec}
          visualGain={gain} setVisualGain={setGain}
        />

        <div className="ml-auto flex items-center gap-2">
          <span className="text-text-secondary">
            {cutCount > 0 && <span className="text-sky-300">잘라 {cutCount}</span>}
            {cutCount > 0 && muteCount > 0 && <span className="text-border"> · </span>}
            {muteCount > 0 && <span className="text-red-300">무음 {muteCount}</span>}
            {ed.inserts.length > 0 && <span className="text-emerald-300">삽입 {ed.inserts.length}</span>}
            {ed.regions.length === 0 && ed.inserts.length === 0 && '편집 0'}
          </span>
          <button
            onClick={ed.saveApplied}
            disabled={ed.saving || (ed.regions.length === 0 && ed.inserts.length === 0)}
            className="px-3 py-1.5 rounded bg-accent text-bg-primary text-sm font-semibold hover:opacity-90 disabled:opacity-40 disabled:bg-bg-card disabled:text-text-secondary"
            title={cutSec > 0 ? `잘라내기 ${cutSec.toFixed(2)}초만큼 길이가 줄어든다` : (ed.inserts.length > 0 ? '삽입으로 길이가 늘어난다' : undefined)}
          >
            {ed.saving ? '저장 중…' : (ed.regions.length + ed.inserts.length) > 0 ? `적용 저장 (${ed.regions.length + ed.inserts.length})` : '적용 저장 (편집 필요)'}
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
        <div className="rounded border border-border">
          <div 
            className="px-3 py-1.5 border-b border-border rounded-t flex items-center justify-between bg-bg-card text-text-primary"
          >
            <div className="text-xs font-semibold flex items-center gap-2 text-accent">
              <div className="w-2 h-2 rounded-full bg-accent" />
              들숨 구간 지정 영역
            </div>
            <span className="text-[10px] text-text-secondary font-mono">
              {ed.playhead.toFixed(2)}s / {dur.toFixed(2)}s
            </span>
          </div>
          <div className="overflow-x-auto bg-bg-card">
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
              {/* 삽입 마커 — 녹색 세로선 + 라벨 (원본 타임라인 기준) */}
              {ed.inserts.map(ins => (
                <div
                  key={ins.id}
                  className="absolute top-0 bottom-0 pointer-events-none z-10"
                  style={{ left: pct(ins.at) }}
                >
                  <div className="w-[3px] h-full bg-emerald-400/90" />
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded bg-emerald-600/90 px-1 py-0 text-[9px] text-white font-mono whitespace-nowrap">
                    +{ins.duration.toFixed(2)}
                  </div>
                </div>
              ))}
              {/* 드래그 중 임시 선택 */}
              {tempSel && (
                <div
                  className="absolute top-0 bottom-0 pointer-events-none border-x bg-sky-400/15 border-sky-300/50"
                  style={{ left: pct(Math.min(tempSel.a, tempSel.b)), width: widthPct(tempSel.a, tempSel.b) }}
                />
              )}
              {/* 재생 위치 (편집 결과 재생 시 길이가 달라질 수 있으므로 클램프) */}
              {ed.playing && (
                <div
                  className="absolute top-0 bottom-0 w-px bg-amber-300 pointer-events-none"
                  style={{ left: pct(Math.min(ed.playhead, dur)) }}
                />
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* 구간 목록 + 삽입 목록 */}
      {(ed.regions.length > 0 || ed.inserts.length > 0) && (
        <div className="flex items-center gap-2 flex-wrap">
          {/* 제거/무음 구간 */}
          {ed.regions.map(r => {
            const isCut = (r.mode ?? 'mute') === 'cut'
            return (
              <span
                key={r.id}
                className={`inline-flex items-center gap-1.5 rounded border px-2 py-1 text-xs text-text-primary ${isCut ? 'border-sky-400/40 bg-sky-500/10' : 'border-red-400/40 bg-red-500/10'}`}
              >
                <button
                  onClick={() => ed.toggleRegionMode(r.id)}
                  disabled={regionMode !== 'free'}
                  className={`rounded px-1.5 font-semibold disabled:cursor-default ${isCut ? 'bg-sky-500/25 text-sky-200' : 'bg-red-500/25 text-red-200'}`}
                  title={regionMode === 'free' ? '처리 방식 전환 (잘라내기 ↔ 무음)' : '방식을 「자율」로 두면 구간마다 바꿀 수 있다'}
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

          {/* 삽입(넓히기) 목록 — 녹색 */}
          {ed.inserts.map(ins => (
            <span
              key={ins.id}
              className="inline-flex items-center gap-1.5 rounded border border-emerald-400/40 bg-emerald-500/10 px-2 py-1 text-xs text-text-primary"
            >
              <span className="font-semibold text-emerald-200">+{ins.duration.toFixed(2)}s</span>
              <span className="text-text-secondary">@{ins.at.toFixed(2)}</span>
              <button
                onClick={() => ed.removeInsert(ins.id)}
                className="text-text-secondary hover:text-red-300"
                title="이 삽입 취소"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}

      {ed.error && <div className="text-xs text-danger-text">{ed.error}</div>}

      {/* 사용법 안내 */}
      <div className="rounded border border-border bg-bg-card/60 p-4 text-xs leading-relaxed text-text-secondary space-y-2">
        <div className="text-sm font-semibold text-text-primary">사용법</div>
        <ol className="list-decimal list-inside space-y-1.5">
          <li>
            <span className="text-text-primary font-semibold">방식 정하기</span> — 위쪽 「방식」에서 <span className="text-red-300">무음</span>·<span className="text-sky-300">잘라</span>·자율 중 하나를 고릅니다.
            <span className="text-red-300">무음</span>이면 잡는 구간이 모두 무음, <span className="text-sky-300">잘라</span>면 모두 잘라내기로 처리됩니다. 기본은 <span className="text-red-300">무음</span>입니다.
          </li>
          <li>
            <span className="text-text-primary font-semibold">구간 지정</span> — 파형 위를 <span className="text-text-primary">드래그</span>하면 그 구간이 잡힙니다 (제거/무음용).
            여러 군데를 연달아 지정할 수 있습니다. 파형을 클릭하면 그 위치부터 들어볼 수 있고, 잘 안 보이면 「증폭」·「확대」로 키우세요.
          </li>
          <li>
            <span className="text-text-primary font-semibold">간격 넓히기 (삽입)</span> — 파형을 <span className="text-text-primary">클릭</span>해 위치를 고른 뒤 위 「넓히기」 영역의 +0.1s 등 버튼 + 「+X.Xs 삽입」을 누르면 해당 지점 앞에 무음이 추가됩니다.
            말과 말 사이 호흡 공간이나 타이밍을 의도적으로 벌리고 싶을 때 사용. 삽입 목록은 별도 칩으로 나타나며 ✕로 제거 가능.
          </li>
          <li>
            <span className="text-text-primary font-semibold">섞어 쓰기</span> — 구간마다 다르게 처리하려면 방식을 <span className="text-text-primary">「자율」</span>로 두고,
            아래 구간 칩 맨 앞의 <span className="text-red-300">「무음」</span>↔<span className="text-sky-300">「잘라」</span> 버튼으로 구간별로 전환합니다.
          </li>
          <li>
            <span className="text-text-primary font-semibold">확인</span> — 칩의 「듣기」는 그 구간 소리만 앞뒤 여유를 두고 들려줍니다.
            잘못 잡았으면 ✕로 해제하세요. 「결과 미리듣기」는 잘라내기·무음·삽입을 모두 적용한 완성본을 들려줍니다.
          </li>
          <li>
            <span className="text-text-primary font-semibold">보기 조절</span> — <span className="text-text-primary">「확대」</span>는 파형을 가로로 늘려 짧은 구간도 정확히 집을 수 있게 합니다.
            <span className="text-text-primary">「증폭」</span>은 파형의 세로 높이만 키워 작은 들숨·잡소리를 눈에 띄게 합니다(소리 크기는 그대로, 보기에만 영향).
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
            <span className="text-emerald-300">삽입(넓히기)</span>은 그만큼 <span className="text-amber-300">길이가 늘어납니다.</span>
            저장 후에는 음성 동기화(align)를 다시 실행해 자막 점등 타이밍을 새 길이에 맞춰 주세요.
          </div>
        </div>
      </div>
    </section>
  )
}
