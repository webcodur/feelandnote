/** Breadcrumb — 영상 전체 상단 내비게이션
 * 좌: 로고 | 시리즈명
 * 우: 섹션 명칭 (비도서 구간) 또는 도서 정보 + 페이즈 (도서 구간)
 * 영상 처음부터 끝까지 표시
 */
import React from 'react'
import { interpolate, useCurrentFrame } from 'remotion'
import { FONT } from '../fonts'
import { BrandLogo, useIsPortrait } from '../utils'
import { BRAND_FRAMES, RECAP_FRAMES, LOGO_FRAMES, f } from '../timing'
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
  const portrait = useIsPortrait()
  const i18n = t(script)
  const { host, books } = script

  // 영상 전체 표시 — 처음부터 끝까지
  const fadeIn = interpolate(frame, [0, f(1)], [0, 1], CL)
  const fadeOut = interpolate(frame, [tl.totalFrames - f(1), tl.totalFrames], [1, 0], CL)
  const barOp = Math.min(fadeIn, fadeOut)

  // 세로 영상에서는 상하단 바가 역할을 대신하므로 숨김
  if (portrait) return null
  if (barOp <= 0) return null

  // ── 현재 섹션 판별 ──
  let sectionName: string | null = null
  let activeBookIdx = -1
  let phase: string | null = null

  const outroEnd = tl.outroStart + tl.outroFrames

  if (frame < tl.brandStart + BRAND_FRAMES) {
    sectionName = i18n.secOpening
  } else if (tl.cont && tl.returnIntroFrames > 0 && frame >= tl.returnIntroStart && frame < tl.returnIntroStart + tl.returnIntroFrames) {
    sectionName = i18n.secReturn
  } else if (!tl.cont && tl.svcGreetingFrames > 0 && frame >= tl.svcGreetingStart && frame < tl.svcGreetingStart + tl.svcGreetingFrames) {
    sectionName = i18n.secGreeting
  } else if (!tl.cont && tl.svcIntroFrames > 0 && frame >= tl.svcIntroStart && frame < tl.svcIntroStart + tl.svcIntroFrames) {
    sectionName = i18n.secIntro
  } else if (tl.fQuoteFrames > 0 && frame >= tl.fQuoteStart && frame < tl.fQuoteStart + tl.fQuoteFrames) {
    sectionName = i18n.secFeaturedQuote
  } else if (tl.cont && tl.prevRecapFrames > 0 && frame >= tl.prevRecapStart && frame < tl.prevRecapStart + tl.prevRecapFrames) {
    sectionName = i18n.secPrevRecap
  } else if (!tl.cont && tl.hostIntroFrames > 0 && frame >= tl.hostIntroStart && frame < tl.hostIntroStart + tl.celebIntroFrames) {
    sectionName = i18n.secCelebIntro
  } else if (!tl.cont && tl.philosophyFrames > 0 && frame >= tl.hostIntroStart + tl.celebIntroFrames && frame < tl.hostIntroStart + tl.hostIntroFrames) {
    sectionName = i18n.secPhilosophy
  } else if (frame >= tl.bridgeStart && frame < tl.bridgeStart + tl.bridgeFrames) {
    sectionName = i18n.secBridge
  } else if (tl.hasInterlude && frame >= tl.midRecapStart && frame < tl.midRecapStart + RECAP_FRAMES) {
    sectionName = i18n.secMidRecap
  } else if (tl.hasInterlude && frame >= tl.interludeStart && frame < tl.interludeStart + tl.interludeFrames) {
    sectionName = i18n.secInterlude
  } else if (frame >= tl.recapStart && frame < tl.recapStart + RECAP_FRAMES) {
    sectionName = i18n.secRecap
  } else if (frame >= tl.outroStart && frame < outroEnd) {
    sectionName = i18n.secOutro
  } else if (frame >= outroEnd) {
    sectionName = i18n.secEnding
  } else {
    // 도서 구간 또는 도서 간 갭
    for (let i = 0; i < tl.bookStarts.length; i++) {
      const bs = tl.bookStarts[i]
      const bt = tl.bookTimings[i]
      if (frame >= bs && frame < bs + bt.total) {
        activeBookIdx = i
        const local = frame - bs
        const sLabelSummary = bt.titleFrames + tl.TITLE_SUMMARY_GAP_F
        const sSummaryEnd = sLabelSummary + tl.LABEL_SUMMARY_F + bt.summaryFrames
        if (local < sLabelSummary) phase = i18n.labelTitle
        else if (local < sSummaryEnd) phase = i18n.labelSummary
        else phase = i18n.labelContext
        break
      }
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
  const inBookZone = activeBookIdx >= 0 || (reachedBookIdx >= 0 && !sectionName)

  /*
   * 스타일 위계 (4단계)
   * ─────────────────────────────────────────
   * PRIMARY   #ffffff          — 도서 제목 (가장 눈에 띄는 정보)
   * LABEL     #e8e0d0          — 시리즈명, 인물명, 저자, 권수
   * MUTED     #e8e0d0 op 0.5   — 카운터, 부가 정보
   * SEP       #e8e0d0 op 0.3   — 구분자 (|, ·)
   * ACCENT    #c8a46e          — 페이즈/섹션명 (골드)
   */
  const BASE: React.CSSProperties = { fontSize: portrait ? 16 : 20, fontFamily: FONT.sans, fontWeight: 500, letterSpacing: '0.02em' }
  const PRIMARY: React.CSSProperties = { ...BASE, color: '#ffffff' }
  const LABEL: React.CSSProperties = { ...BASE, color: '#e8e0d0' }
  const MUTED: React.CSSProperties = { ...BASE, color: '#e8e0d0', opacity: 0.5 }
  const SEP: React.CSSProperties = { ...BASE, color: '#e8e0d0', opacity: 0.3, margin: '0 10px' }
  const ACCENT: React.CSSProperties = { ...BASE, color: '#c8a46e' }

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: portrait ? '32px 40px' : '44px 80px', zIndex: 30, opacity: barOp }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* 좌: 프로그램 정보 + 편수 */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <BrandLogo variant="watermark" fontSize={18} />
          <div style={SEP}>|</div>
          <div style={LABEL}>
            {i18n.libraryTour} - {host.nickname} {i18n.partLabel(part, totalParts)}
          </div>
        </div>

        {/* 우: 섹션 명칭 또는 도서 정보 */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {inBookZone ? (
            <>
              {bookNum > 0 && (
                <div style={MUTED}>{i18n.bookCounter(bookNum, books.length)}</div>
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
            </>
          ) : sectionName ? (
            <div style={ACCENT}>{sectionName}</div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
