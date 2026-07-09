/**
 * ThumbBrand — 세력도 썸네일 공통 브랜딩(상단 「세력도감」 배지 + 하단 「FEEL&NOTE」 푸터).
 * GEM·후보 시안이 공유해 시리즈 정체성을 통일한다.
 */
import React from 'react'
import { FONT } from '../BookRecommend/fonts'

const GOLD = '#c8a46e'

/** 상단 중앙 시리즈 배지(기본 「세력도감」) */
export const SeriesBadge: React.FC<{ label?: string; top?: number }> = ({ label = '세력도감', top = 88 }) => (
  <div style={{ position: 'absolute', top, left: 0, right: 0, zIndex: 30, display: 'flex', justifyContent: 'center' }}>
    <div style={{
      padding: '16px 40px 16px 56px',
      border: `2px solid ${GOLD}60`,
      borderRadius: 100,
      backgroundColor: 'rgba(12,10,8,0.96)',
      fontFamily: FONT.sans, fontSize: 44, fontWeight: 800, color: GOLD,
      letterSpacing: '0.16em',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    }}>
      {label}
    </div>
  </div>
)

/** 하단 중앙 브랜드 푸터 */
export const BrandFooter: React.FC<{ bottom?: number }> = ({ bottom = 72 }) => (
  <div style={{
    position: 'absolute', bottom, left: 0, right: 0, textAlign: 'center', zIndex: 30,
    fontFamily: FONT.serif, fontSize: 36, fontWeight: 700, color: GOLD,
    letterSpacing: '0.4em', opacity: 0.85,
  }}>
    FEEL<span style={{ color: '#fff' }}>&amp;</span>NOTE
  </div>
)

/** 상단 배지 + 하단 푸터 한 세트 */
export const ThumbBrand: React.FC<{ label?: string; badgeTop?: number; footerBottom?: number }> = ({
  label, badgeTop, footerBottom,
}) => (
  <>
    <SeriesBadge label={label} top={badgeTop} />
    <BrandFooter bottom={footerBottom} />
  </>
)
