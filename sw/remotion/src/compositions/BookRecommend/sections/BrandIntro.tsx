import React from 'react'
import { Img, staticFile } from 'remotion'
import { FONT } from '../fonts'
import { BrandLogo } from '../utils'
import type { BookRecommendScript } from '../types'
import { t } from '../i18n'

type BrandProps = {
  script?: BookRecommendScript
  durationFrames: number
  opacity?: number
  scale?: number
  locale?: 'ko' | 'en'
  style?: React.CSSProperties
}

/** 브랜드 콘텐츠 — 로고 + tagline + 사이트 도메인 (배경 없음) */
export const Brand: React.FC<BrandProps> = ({ script, opacity = 1, scale = 1, locale, style }) => {
  if (opacity <= 0) return null
  const s = (v: number) => Math.round(v * scale)
  const resolvedLocale = script?.locale ?? locale ?? 'ko'
  const strings = t(script ?? { locale: resolvedLocale } as BookRecommendScript)

  return (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      opacity,
      ...style,
    }}>
      <BrandLogo variant="brand" fontSize={s(56)} style={{ marginBottom: s(24), position: 'relative' }} />
      <div style={{
        position: 'relative',
        color: '#e8dcb8', fontSize: s(28), fontFamily: FONT.serif,
        fontWeight: 600, letterSpacing: s(2),
        textAlign: 'center', whiteSpace: 'pre-line', lineHeight: 1.6,
        textShadow: '0px 2px 8px rgba(0,0,0,0.8)',
        marginBottom: s(32),
      }}>
        {strings.tagline}
      </div>
      <div style={{
        position: 'relative',
        padding: `${s(14)}px ${s(40)}px`,
        border: '2px solid rgba(200, 164, 110, 0.4)',
        borderRadius: s(32),
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        color: '#d4b785', fontSize: s(22), fontFamily: FONT.sans,
        fontWeight: 600, letterSpacing: s(2), textAlign: 'center',
        boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
      }}>
        feelandnote.com
      </div>
    </div>
  )
}

/** 롱폼용 — 서재 배경 + Brand */
export const BrandLong: React.FC<BrandProps> = (props) => {
  if ((props.opacity ?? 1) <= 0) return null
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: props.opacity ?? 1, ...props.style }}>
      <Img src={staticFile('common/images/longform-ending-bg.jpg')} style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.4,
      }} />
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 60%, transparent 20%, rgba(0,0,0,0.7) 80%)' }} />
      <Brand {...props} opacity={1} style={{}} />
    </div>
  )
}

/** 쇼츠용 — 배경 없이 Brand만 (부모가 배경 제공) */
export const BrandShorts: React.FC<BrandProps> = (props) => <Brand {...props} />

// 하위호환 — 기존 import 유지
export const BrandIntro = BrandLong
