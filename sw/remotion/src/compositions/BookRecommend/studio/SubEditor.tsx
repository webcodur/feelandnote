/**
 * SubEditor — voiceTimings sub 칩 편집기 (롱폼/쇼츠 공용)
 *
 * 현재 재생 중인 세그먼트의 sub를 단어 칩으로 바로 표시.
 * 칩 사이 경계를 클릭하여 sub 분할 위치를 토글한다.
 * Save 클릭 시 dev API로 에피소드 JSON 직접 업데이트.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { VoiceTimings, VoiceTimingSegment } from '../types'
import {
  S, PANEL_BG, PANEL_BLUR, FONT_MONO, FONT_UI,
  C_GOLD, C_TEXT, C_DIM, C_BORDER,
} from './panel-const'

/** SubEditor 전용 스케일 — 공유 S의 절반 */
const L = S / 2
const L_BTN_RADIUS = 10 * L
const L_BTN_BORDER = Math.max(1, Math.round(L))
const L_PANEL_TOP = 60 * L
const L_PANEL_RADIUS = 14 * L
const L_PANEL_PAD = 16 * L
const L_PANEL_BORDER = L_BTN_BORDER
const L_FONT_MD = 16 * L
const L_FONT_SM = 14 * L
const L_FONT_XS = 12 * L

const API_URL = 'http://localhost:8787/api/save-sub'

/** 모듈 레벨 sub 오버라이드 — Remotion 재렌더와 무관하게 유지 */
const subOverrides = new Map<string, string[]>()
function overrideKey(timingKey: string, segIndex: number) { return `${timingKey}:${segIndex}` }

interface Props {
  voiceTimings?: VoiceTimings
  episodeName: string
  locale: string
  /** 현재 재생 중인 voiceTimings 키 (없으면 빈 상태) */
  currentTimingKey?: string
}

function tokenize(text: string): string[] {
  return text.split(/\s+/).filter(Boolean)
}

function wordsToSub(words: string[], breaks: number[]): string[] {
  const sorted = [...new Set([0, ...breaks, words.length])].sort((a, b) => a - b)
  const result: string[] = []
  for (let i = 0; i < sorted.length - 1; i++) {
    result.push(words.slice(sorted[i], sorted[i + 1]).join(' '))
  }
  return result
}

function subToBreaks(sub: string[], words: string[]): number[] {
  const breaks: number[] = []
  let cursor = 0
  for (const chunk of sub) {
    const chunkWords = tokenize(chunk)
    cursor += chunkWords.length
    if (cursor < words.length) breaks.push(cursor)
  }
  return breaks
}

interface SegEditorProps {
  seg: VoiceTimingSegment
  segIndex: number
  timingKey: string
  episodeName: string
  locale: string
}

const GROUP_COLORS = ['#c8a46e', '#6ea4c8', '#8bb8a8', '#c86ea4', '#c8c86e', '#a46ec8', '#6ec8c8', '#c86e6e']

function SegEditor({ seg, segIndex, timingKey, episodeName, locale }: SegEditorProps) {
  const text = seg.text ?? ''
  const words = useMemo(() => tokenize(text), [text])
  const oKey = overrideKey(timingKey, segIndex)
  // seg.sub 직렬화 — Remotion 매 프레임 새 객체 생성해도 값이 같으면 effect 안 돎
  const subJson = JSON.stringify(seg.sub ?? null)
  const [breaks, setBreaks] = useState<number[]>(() => {
    const cached = subOverrides.get(oKey)
    const sub = cached ?? seg.sub
    return sub ? subToBreaks(sub, words) : []
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(() => subOverrides.has(oKey))

  useEffect(() => {
    const cached = subOverrides.get(oKey)
    const sub = cached ?? seg.sub
    setBreaks(sub ? subToBreaks(sub, words) : [])
    setSaved(!!cached)
  }, [oKey, subJson, text])

  const toggleBreak = useCallback((idx: number) => {
    setBreaks(prev => {
      if (prev.includes(idx)) return prev.filter(b => b !== idx)
      return [...prev, idx].sort((a, b) => a - b)
    })
    setSaved(false)
  }, [])

  const currentSub = useMemo(() => wordsToSub(words, breaks), [words, breaks])

  const [saveError, setSaveError] = useState<string | null>(null)
  const save = useCallback(async () => {
    setSaving(true)
    setSaveError(null)
    // 모듈 캐시에 즉시 반영 — Remotion 재렌더와 무관하게 유지
    subOverrides.set(oKey, currentSub)
    // 디스크 저장
    let ok = false
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ episode: episodeName, locale, timingKey, segIndex, sub: currentSub }),
      })
      if (!res.ok) {
        const err = await res.text()
        console.error(`[SubEditor] save 실패 ${res.status}:`, err)
        setSaveError(`HTTP ${res.status}: ${err}`)
      } else {
        console.log(`[SubEditor] 저장 완료: ${timingKey}[${segIndex}]`)
        ok = true
      }
    } catch (e) {
      console.error('[SubEditor] API 연결 실패:', e)
      setSaveError(`네트워크 실패: ${e instanceof Error ? e.message : String(e)}`)
    }
    setSaved(ok)
    setSaving(false)
  }, [oKey, episodeName, locale, timingKey, segIndex, currentSub])

  if (words.length <= 1) return null

  const wordGroupIdx: number[] = []
  let gIdx = 0
  for (const chunk of currentSub) {
    const n = tokenize(chunk).length
    for (let j = 0; j < n; j++) wordGroupIdx.push(gIdx)
    gIdx++
  }

  const needsSub = text.length > 20

  return (
    <div style={{ marginBottom: 12 * L, padding: `${8 * L}px`, background: 'rgba(255,255,255,0.02)', borderRadius: 8 * L }}>
      {/* 시간 */}
      <div style={{ fontSize: L_FONT_XS, color: C_DIM, fontFamily: FONT_MONO, marginBottom: 6 * L }}>
        {seg.start.toFixed(2)}s — {seg.end.toFixed(2)}s
        {!needsSub && <span style={{ marginLeft: 8 * L, color: 'rgba(255,255,255,0.2)' }}>(sub 불필요)</span>}
      </div>

      {/* 칩 영역 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 0, alignItems: 'center' }}>
        {words.map((word, wi) => {
          const isBreak = breaks.includes(wi)
          const color = GROUP_COLORS[wordGroupIdx[wi] % GROUP_COLORS.length]
          return (
            <React.Fragment key={wi}>
              {wi > 0 && (
                <div
                  onClick={() => toggleBreak(wi)}
                  title={isBreak ? '병합' : '분할'}
                  style={{
                    width: 20 * L, height: 28 * L,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', flexShrink: 0,
                  }}
                >
                  <div style={{
                    width: isBreak ? 6 * L : 2 * L,
                    height: 20 * L,
                    background: isBreak ? '#fff' : 'rgba(255,255,255,0.15)',
                    borderRadius: 2 * L,
                    transition: 'all 0.15s',
                  }} />
                </div>
              )}
              <span style={{
                display: 'inline-block',
                padding: `${3 * L}px ${6 * L}px`,
                borderRadius: 4 * L,
                fontSize: L_FONT_SM, fontFamily: FONT_UI,
                color: C_TEXT,
                background: `${color}22`,
                border: `${Math.max(1, L / 2)}px solid ${color}44`,
                whiteSpace: 'nowrap',
              }}>
                {word}
              </span>
            </React.Fragment>
          )
        })}
      </div>

      {/* sub 미리보기 + 저장 */}
      <div style={{ marginTop: 6 * L, display: 'flex', gap: 8 * L, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, fontSize: L_FONT_XS, color: 'rgba(255,255,255,0.25)', fontFamily: FONT_MONO, lineHeight: 1.6 }}>
          {currentSub.map((s, i) => (
            <span key={i} style={{ color: GROUP_COLORS[i % GROUP_COLORS.length], opacity: 0.7 }}>
              {i > 0 && ' | '}{s}
            </span>
          ))}
        </div>
        <button
          onClick={save}
          disabled={saving}
          style={{
            padding: `${3 * L}px ${10 * L}px`, borderRadius: 4 * L,
            border: `${Math.max(1, L / 2)}px solid ${saveError ? 'rgba(220,90,90,0.5)' : saved ? 'rgba(110,200,130,0.4)' : 'rgba(200,164,110,0.3)'}`,
            background: saveError ? 'rgba(220,90,90,0.14)' : saved ? 'rgba(110,200,130,0.12)' : 'rgba(200,164,110,0.08)',
            color: saveError ? '#e08585' : saved ? '#7ec88a' : C_GOLD,
            fontSize: L_FONT_XS, fontWeight: 600, cursor: 'pointer', fontFamily: FONT_UI,
            flexShrink: 0,
          }}
        >
          {saving ? '...' : saveError ? 'Failed' : saved ? 'Saved' : 'Save'}
        </button>
      </div>
      {saveError && (
        <div style={{ marginTop: 4 * L, fontSize: L_FONT_XS, color: '#e08585', fontFamily: FONT_MONO, wordBreak: 'break-all' }}>
          {saveError}
        </div>
      )}
    </div>
  )
}

export const SubEditor: React.FC<Props> = ({ voiceTimings, episodeName, locale, currentTimingKey }) => {
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  const activeKey = currentTimingKey ?? null
  const segments = activeKey ? voiceTimings?.[activeKey] ?? [] : []

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const PANEL_W = 800 * L
  const BTN_RIGHT = 16 * L
  const BTN_TOP_OFFSET = 16 * L

  return createPortal(
    <div ref={panelRef}>
      {/* 토글 버튼 — 우측 상단 */}
      <div
        style={{
          position: 'fixed', top: BTN_TOP_OFFSET, right: BTN_RIGHT, zIndex: 9999,
          padding: `${12 * L}px ${24 * L}px`, borderRadius: L_BTN_RADIUS,
          background: 'rgba(139,184,168,0.15)', border: `${L_BTN_BORDER}px solid rgba(139,184,168,0.3)`,
          color: '#8bb8a8', fontSize: 18 * L, fontWeight: 700, cursor: 'pointer',
          fontFamily: FONT_UI, backdropFilter: 'blur(8px)',
        }}
        onClick={() => setOpen(v => !v)}
      >
        {open ? 'Close' : 'Sub Edit'}
      </div>

      {open && (
        <div style={{
          position: 'fixed', top: L_PANEL_TOP, right: BTN_RIGHT, zIndex: 9998,
          width: PANEL_W,
          maxHeight: `calc(100vh - ${L_PANEL_TOP + 16 * L}px)`,
          display: 'flex', flexDirection: 'column',
          background: PANEL_BG, border: `${L_PANEL_BORDER}px solid rgba(139,184,168,0.2)`,
          borderRadius: L_PANEL_RADIUS, fontFamily: FONT_UI,
          backdropFilter: PANEL_BLUR,
        }}>
          {/* 헤더 */}
          <div style={{
            padding: `${L_PANEL_PAD}px`, borderBottom: `${L_PANEL_BORDER}px solid ${C_BORDER}`,
            display: 'flex', alignItems: 'center', gap: 8 * L,
          }}>
            <span style={{ fontSize: L_FONT_MD, color: '#8bb8a8', fontWeight: 700 }}>Sub Editor</span>
            {activeKey && (
              <span style={{ fontSize: L_FONT_SM, color: C_GOLD, fontFamily: FONT_MONO, fontWeight: 600 }}>
                {activeKey}
              </span>
            )}
          </div>

          {/* 에디터 본문 */}
          <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'thin', padding: `${L_PANEL_PAD}px` }}>
            {segments.length > 0 ? (
              segments.map((seg, si) => (
                <SegEditor
                  key={`${activeKey}-${si}`}
                  seg={seg}
                  segIndex={si}
                  timingKey={activeKey!}
                  episodeName={episodeName}
                  locale={locale}
                />
              ))
            ) : (
              <div style={{ fontSize: L_FONT_SM, color: 'rgba(255,255,255,0.2)', padding: 16 * L }}>
                재생 위치의 voiceTimings가 없습니다
              </div>
            )}
          </div>
        </div>
      )}
    </div>,
    document.body,
  )
}
