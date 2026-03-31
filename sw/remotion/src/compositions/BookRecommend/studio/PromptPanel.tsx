/**
 * PromptPanel — Studio 전용 프롬프트 뷰어
 *
 * 현재 재생 위치의 책 imagePrompts를 자동 표시. 탭/아코디언 없음.
 * SUMMARY + CONTEXT 프롬프트를 한 화면에 나열한다.
 * createPortal로 viewport 좌표계 사용 (SubEditor와 동일).
 */
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { BookRecommendScript } from '../types'
import {
  S, PANEL_BG, PANEL_BLUR, FONT_MONO, FONT_UI,
  C_GOLD, C_BORDER,
} from './panel-const'

/** viewport 스케일 — SubEditor와 동일 */
const L = S / 2
const L_BTN_RADIUS = 10 * L
const L_BTN_BORDER = Math.max(1, Math.round(L))
const L_FONT_MD = 16 * L
const L_FONT_SM = 14 * L
const L_FONT_XS = 12 * L
const L_PANEL_RADIUS = 14 * L
const L_PANEL_PAD = 16 * L
const L_PANEL_BORDER = L_BTN_BORDER

const PANEL_W = 640 * L
const BTN_RIGHT = 16 * L
/** SubEditor 버튼(16L) + 버튼 높이(~42L) + 간격(12L) = 70L */
const BTN_TOP = 70 * L

interface Props {
  script: BookRecommendScript
  currentBookIdx: number
  /** 현재 재생 중인 페이즈: '1'=summary, '2'=context, null=그 외 */
  currentPhase?: '1' | '2' | null
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }, [text])
  return (
    <button
      onClick={copy}
      style={{
        padding: `${6 * L}px ${12 * L}px`, borderRadius: 4 * L,
        border: `${L_BTN_BORDER}px solid rgba(200,164,110,0.3)`,
        background: copied ? 'rgba(110,200,130,0.15)' : 'rgba(200,164,110,0.08)',
        color: copied ? '#7ec88a' : C_GOLD,
        fontSize: L_FONT_XS, fontWeight: 600, cursor: 'pointer', fontFamily: FONT_UI,
        transition: 'all 0.2s', flexShrink: 0,
      }}
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

function PromptBlock({ label, color, keyword, text, promptText }: {
  label: string; color: string; keyword: string; text: string; promptText: string
}) {
  return (
    <div style={{ marginBottom: 12 * L }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8 * L, marginBottom: 6 * L,
        borderBottom: `${L_BTN_BORDER}px solid ${color}44`, paddingBottom: 4 * L,
      }}>
        <span style={{ fontSize: L_FONT_SM, fontWeight: 700, color }}>{label}</span>
        <span style={{ fontSize: L_FONT_XS, color, opacity: 0.6 }}>{keyword}</span>
      </div>
      <div style={{
        padding: `${10 * L}px ${L_PANEL_PAD}px`, borderRadius: 8 * L,
        background: 'rgba(255,255,255,0.02)',
        border: `${L_BTN_BORDER}px solid ${C_BORDER}`,
        fontSize: L_FONT_SM, lineHeight: 2, color: 'rgba(232,224,208,0.7)',
        cursor: 'text', userSelect: 'text', marginBottom: 6 * L,
      }}>
        {text}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <CopyBtn text={promptText} />
      </div>
    </div>
  )
}

export const PromptPanel: React.FC<Props> = ({ script, currentBookIdx, currentPhase }) => {
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  const book = script.books[currentBookIdx]
  const ip = book?.imagePrompts
  const hasAny = script.books.some(b => b.imagePrompts)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  if (!hasAny) return null

  return createPortal(
    <div ref={panelRef}>
      {/* 토글 버튼 — 우측, SubEditor 아래 */}
      <div
        style={{
          position: 'fixed', top: BTN_TOP, right: BTN_RIGHT, zIndex: 9999,
          padding: `${12 * L}px ${24 * L}px`, borderRadius: L_BTN_RADIUS,
          background: 'rgba(200,164,110,0.15)', border: `${L_BTN_BORDER}px solid rgba(200,164,110,0.3)`,
          color: C_GOLD, fontSize: 18 * L, fontWeight: 700, cursor: 'pointer',
          fontFamily: FONT_UI, backdropFilter: 'blur(8px)',
        }}
        onClick={() => setOpen(v => !v)}
      >
        {open ? 'Close' : 'Prompts'}
      </div>

      {open && (
        <div style={{
          position: 'fixed', top: 60 * L, left: 16 * L, zIndex: 9998,
          width: PANEL_W,
          maxHeight: `calc(100vh - ${76 * L}px)`,
          overflowY: 'auto',
          background: PANEL_BG, border: `${L_PANEL_BORDER}px solid rgba(200,164,110,0.2)`,
          borderRadius: L_PANEL_RADIUS, fontFamily: FONT_UI,
          backdropFilter: PANEL_BLUR, scrollbarWidth: 'thin',
        }}>
          {/* 헤더 — 현재 책 */}
          <div style={{
            padding: `${L_PANEL_PAD}px`, borderBottom: `${L_PANEL_BORDER}px solid ${C_BORDER}`,
            display: 'flex', alignItems: 'center', gap: 8 * L,
          }}>
            <span style={{ fontSize: L_FONT_SM, color: C_GOLD, fontWeight: 700 }}>
              Book {currentBookIdx + 1}
            </span>
            <span style={{ fontSize: L_FONT_MD, color: '#e8e0d0', fontWeight: 600 }}>
              {book?.title ?? '—'}
            </span>
          </div>

          {/* 프롬프트 본문 */}
          <div style={{ padding: L_PANEL_PAD }}>
            {ip ? (
              <>
                {(!currentPhase || currentPhase === '1') && (
                  <PromptBlock
                    label="SUMMARY" color="#6ea0c8" keyword={ip['1'].keyword}
                    text={ip['1'].ko || ip['1'].prompt} promptText={ip['1'].prompt}
                  />
                )}
                {(!currentPhase || currentPhase === '2') && (
                  <PromptBlock
                    label="CONTEXT" color="#c8946e" keyword={ip['2'].keyword}
                    text={ip['2'].ko || ip['2'].prompt} promptText={ip['2'].prompt}
                  />
                )}
              </>
            ) : (
              <div style={{ fontSize: L_FONT_SM, color: 'rgba(255,255,255,0.2)', padding: 16 * L }}>
                이 책에 imagePrompts가 없습니다
              </div>
            )}
          </div>
        </div>
      )}
    </div>,
    document.body,
  )
}
