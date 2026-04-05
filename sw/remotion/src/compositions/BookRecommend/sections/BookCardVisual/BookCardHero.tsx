/** BookCardHero — 제목 페이즈: 표지 spring + 제목·저자·메타 */
import React from 'react'
import { Img, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import type { BookEntry } from '../../types'
import { FONT } from '../../fonts'
import { f } from '../../timing'
import { safeImg, useIsPortrait } from '../../utils'
import { PosterCategoryBadge, getCategoryAccent } from './CategoryBadge'

const CL = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const }

type Props = {
  book: BookEntry
  locale?: 'ko' | 'en'
  publishYearLabel: (year: string) => string
  /** 제목→요약 전환 프레임 (titleFrames + titleSummaryGapF) */
  sLabelSummary: number
}

export const BookCardHero: React.FC<Props> = ({ book, locale, publishYearLabel, sLabelSummary }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const portrait = useIsPortrait()
  const accent = getCategoryAccent(book.category ?? 'BOOK')

  const titlePhaseOp = interpolate(frame,
    [0, f(0.33), sLabelSummary - f(0.67), sLabelSummary],
    [0, 1, 1, 0], CL)

  if (titlePhaseOp <= 0) return null

  const coverScale = spring({ frame: Math.max(0, frame - f(0.17)), fps, config: { damping: 14, stiffness: 140 } })
  const coverY = interpolate(frame, [0, f(0.67)], [40, 0], CL)
  const infoOp = interpolate(frame, [f(0.5), f(1.17)], [0, 1], CL)

  return (
    <div style={{ position: 'absolute', inset: 0, opacity: titlePhaseOp, zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ transform: `translateY(${coverY}px) scale(${coverScale})`, marginBottom: 24 }}>
        <div style={{
          width: portrait ? 340 : 480, height: portrait ? 510 : 720, borderRadius: 14, overflow: 'hidden', position: 'relative',
          boxShadow: `0 36px 90px rgba(0,0,0,0.7), 0 0 70px ${accent.glow}`,
        }}>
          <Img src={safeImg(book.thumbnail_url)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <PosterCategoryBadge category={book.category ?? 'BOOK'} size={portrait ? 38 : 44} />
        </div>
      </div>
      <div style={{
        opacity: infoOp,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
      }}>
        <div style={{ color: '#e8e0d0', fontSize: portrait ? 48 : 60, fontWeight: 700, fontFamily: FONT.serif, textAlign: 'center' }}>
          {locale === 'en' ? `\u201C${book.title}\u201D` : `\u300C${book.title}\u300D`}
        </div>
        <div style={{ color: accent.color, fontSize: portrait ? 30 : 34, fontFamily: FONT.sans }}>
          {book.creator}
        </div>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginTop: 6, justifyContent: 'center' }}>
          {book.source && <span style={{ color: '#666', fontSize: portrait ? 22 : 24, fontFamily: FONT.sans }}>{book.source}</span>}
          {book.stats.publisher && (
            <><span style={{ color: '#444', fontSize: portrait ? 22 : 24 }}>·</span><span style={{ color: '#666', fontSize: portrait ? 22 : 24, fontFamily: FONT.sans }}>{book.stats.publisher}</span></>
          )}
          {book.stats.publishYear && (
            <><span style={{ color: '#444', fontSize: portrait ? 22 : 24 }}>·</span><span style={{ color: '#666', fontSize: portrait ? 22 : 24, fontFamily: FONT.sans }}>{publishYearLabel(book.stats.publishYear!)}</span></>
          )}
        </div>
      </div>
    </div>
  )
}
