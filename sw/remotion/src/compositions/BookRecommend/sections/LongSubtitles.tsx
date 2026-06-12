/**
 * LongSubtitles — 롱폼 하단 자막
 *
 * buildLongSubs로 생성한 Sub 배열에서 현재 프레임에 해당하는 자막을 찾아 표시한다.
 * - 가로(16:9): 책 구간에만, 하단 자막 전용 띠 안에 표시. 인물소개·철학·아웃트로
 *   구간은 각 섹션 컴포넌트가 자체 텍스트를 그리므로 자막을 끈다(이중 표시 방지).
 * - 세로(portrait): 전 구간, Glass Tablet 스타일.
 */
import React from 'react'
import { useCurrentFrame } from 'remotion'
import type { BookRecommendScript } from '../types'
import type { Timeline } from '../useTimeline'
import { buildLongSubs } from '../studio/StudioSubtitles'
import { FONT } from '../fonts'
import { formatCaption } from '../caption-format'
import { CAPTION_BAND_H } from './BookCardVisual'

interface Props {
  script: BookRecommendScript
  tl: Timeline
  /** 세로 영상 여부 — 자막 위치·스타일 결정 */
  portrait?: boolean
}

export const LongSubtitles: React.FC<Props> = ({ script, tl, portrait }) => {
  const frame = useCurrentFrame()
  const subs = buildLongSubs(script, tl)
  const current = subs.find(s => frame >= s.start && frame < s.end)
  if (!current) return null

  // ── 세로: 전 구간 Glass Tablet ──
  if (portrait) {
    return (
      <div style={{
        position: 'absolute', bottom: 380, left: 40, right: 40,
        display: 'flex', justifyContent: 'center', zIndex: 80,
      }}>
        <div style={{
          fontSize: 44, fontWeight: 600, fontFamily: FONT.sans, lineHeight: 1.35,
          whiteSpace: 'pre-wrap', textAlign: 'center', wordBreak: 'keep-all', color: '#e8e0d0',
          background: 'rgba(10, 9, 7, 0.72)',
          backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(200, 164, 110, 0.1)', borderRadius: 14,
          padding: '12px 26px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.03)',
          textShadow: '0 1px 4px rgba(0,0,0,0.4)', maxWidth: 960,
        }}>
          {formatCaption(current.text)}
        </div>
      </div>
    )
  }

  // ── 가로: 책 구간 전용 자막 띠 안에만 ──
  const inBookZone = tl.bookStarts.length > 0
    && frame >= tl.bookStarts[0] && frame < tl.recapStart
  if (!inBookZone) return null

  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, bottom: 0, height: CAPTION_BAND_H,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '0 120px', zIndex: 80,
    }}>
      <div style={{
        fontSize: 46, fontWeight: 600, fontFamily: FONT.sans, lineHeight: 1.4,
        whiteSpace: 'pre-wrap', textAlign: 'center', wordBreak: 'keep-all',
        color: '#f0e8d8', textShadow: '0 2px 12px rgba(0,0,0,0.9)',
        maxWidth: 1500,
      }}>
        {formatCaption(current.text)}
      </div>
    </div>
  )
}
