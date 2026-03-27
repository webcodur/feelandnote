/** Breadcrumb — 영상 전체 상단 내비게이션
 * 좌: 로고 | 시리즈명
 * 우: 도서 정보 + 페이즈 (summary / context)
 * 하단: 진행도 바
 */
import React from 'react'
import { interpolate, useCurrentFrame } from 'remotion'
import { FONT } from '../fonts'
import { BrandLogo } from '../utils'
import { BRAND_FRAMES, f } from '../timing'
import type { Timeline } from '../useTimeline'
import type { BookRecommendScript } from '../types'
import { t } from '../i18n'

const CL = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const }

type Props = {
  script: BookRecommendScript
  tl: Timeline
}

export const Breadcrumb: React.FC<Props> = ({ script, tl }) => {
  const frame = useCurrentFrame()
  const i18n = t(script)
  const { host, books } = script

  // 브랜드 인트로 이후 등장, 아웃트로 끝에서 퇴장
  const showStart = tl.brandStart + BRAND_FRAMES
  const fadeIn = interpolate(frame, [showStart, showStart + f(1)], [0, 1], CL)
  const fadeOut = interpolate(frame, [tl.totalFrames - f(2), tl.totalFrames - f(0.5)], [1, 0], CL)
  const barOp = Math.min(fadeIn, fadeOut)

  if (barOp <= 0) return null

  // 현재 도서 구간 + 페이즈
  let activeBookIdx = -1
  let phase: string | null = null

  for (let i = 0; i < tl.bookStarts.length; i++) {
    const bs = tl.bookStarts[i]
    const bt = tl.bookTimings[i]
    if (frame >= bs && frame < bs + bt.total) {
      activeBookIdx = i
      const local = frame - bs
      const sLabelSummary = bt.titleFrames + tl.TITLE_SUMMARY_GAP_F
      const sSummaryEnd = sLabelSummary + tl.LABEL_SUMMARY_F + bt.summaryFrames
      const sContextEnd = sSummaryEnd + tl.SUMMARY_CONTEXT_GAP_F + tl.LABEL_CONTEXT_F + bt.contextFrames

      if (local < sLabelSummary) phase = i18n.labelTitle
      else if (local < sSummaryEnd) phase = i18n.labelSummary
      else if (local < sContextEnd) phase = i18n.labelContext
      else phase = null
      break
    }
  }

  // 도달한 도서 번호 (gap/interlude에서도 카운터 표시)
  let reachedBookIdx = -1
  for (let i = 0; i < tl.bookStarts.length; i++) {
    if (frame >= tl.bookStarts[i]) reachedBookIdx = i
  }

  const book = activeBookIdx >= 0 ? books[activeBookIdx] : null
  const bookNum = (activeBookIdx >= 0 ? activeBookIdx : reachedBookIdx) + 1
  const part = script.series?.part ?? 1
  const totalParts = script.series?.totalParts ?? 1

  /*
   * 스타일 위계 (4단계)
   * ─────────────────────────────────────────
   * PRIMARY   #ffffff          — 도서 제목 (가장 눈에 띄는 정보)
   * LABEL     #e8e0d0          — 시리즈명, 인물명, 저자, 권수
   * MUTED     #e8e0d0 op 0.5   — 카운터, 부가 정보
   * SEP       #e8e0d0 op 0.3   — 구분자 (|, ·)
   * ACCENT    #c8a46e          — 페이즈 (골드)
   */
  const BASE: React.CSSProperties = { fontSize: 20, fontFamily: FONT.sans, fontWeight: 500, letterSpacing: '0.02em' }
  const PRIMARY: React.CSSProperties = { ...BASE, color: '#ffffff' }
  const LABEL: React.CSSProperties = { ...BASE, color: '#e8e0d0' }
  const MUTED: React.CSSProperties = { ...BASE, color: '#e8e0d0', opacity: 0.5 }
  const SEP: React.CSSProperties = { ...BASE, color: '#e8e0d0', opacity: 0.3, margin: '0 10px' }
  const ACCENT: React.CSSProperties = { ...BASE, color: '#c8a46e' }

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '36px 80px 0', zIndex: 30, opacity: barOp }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* 좌: 프로그램 정보 + 편수 */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <BrandLogo variant="watermark" fontSize={18} />
          <div style={SEP}>|</div>
          <div style={LABEL}>
            {i18n.libraryTour} - {host.nickname} {part}/{totalParts}편
          </div>
        </div>

        {/* 우: 도서 정보 + 페이즈 */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {bookNum > 0 && (
            <div style={MUTED}>{bookNum}/{books.length}권</div>
          )}
          {book && (
            <>
              <div style={SEP}>|</div>
              <div style={PRIMARY}>
                {book.title} <span style={MUTED}>({book.creator})</span>
              </div>
            </>
          )}
          {phase && (
            <>
              <div style={SEP}>·</div>
              <div style={ACCENT}>{phase}</div>
            </>
          )}
        </div>
      </div>

    </div>
  )
}
