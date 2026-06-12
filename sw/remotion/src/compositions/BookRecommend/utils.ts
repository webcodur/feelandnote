import React from 'react'
import { interpolate, staticFile, useVideoConfig } from 'remotion'
import { FONT } from './fonts'
import { f } from './timing'
import { parseEpName, resolveVoiceRelPath } from './voice-names'
import { episodeDir } from './script'

/** 세로 영상 여부 (height > width) — 컴포넌트 레이아웃 분기용 */
export const useIsPortrait = () => {
  const { width, height } = useVideoConfig()
  return height > width
}

export { SENTENCE_SPLIT, splitSentences, buildHighlightSegments, expandSubTimings, paginateSentences, slicePageTimings, splitSub, isTimingsStale, sliceOriginalByTimings } from './sentence-split'
export type { Sub } from './sentence-split'

/**
 * 화면 자막 표시용 구두점 정리.
 * - 끝에 붙은 마침표(.)·쉼표(,) 제거: 청크 마지막 구두점은 발화 흐름 단서이지 표시될 필요 없음.
 * - 중간 마침표는 보존: x.com·U.S.A 같은 값이 손상되지 않도록 문장 끝에서만 제거.
 * 모든 화면 자막(쇼츠 ShortCaption, 롱폼 LongSubtitles, dev Subtitles)이 동일 규칙 사용.
 */
export const stripCaptionPunct = (s: string) => s.replace(/[.,]+\s*$/, '')

/** 정적 파일 경로 헬퍼 — Remotion 내장 staticFile 사용.
 *  이미 변환된 경로(staticFile prefix·외부 URL·인라인 데이터)는 그대로 통과시켜
 *  이중 prefix("already prefixed with the static base") throw를 막는다. */
export const sf = (path: string) => {
  if (!path) return path
  if (/^(https?:|blob:|data:|\/)/.test(path)) return path
  return staticFile(path)
}

/**
 * dB 게인 → 곱셈 인자. BO `GainDbInput`이 저장하는 *GainDb 값을 Remotion `<Audio volume>`에 그대로 넘긴다.
 * 0(또는 빈 값)이면 원본 음량 그대로(=1).
 */
export const dbToLinear = (db: number | undefined | null): number => {
  if (db === undefined || db === null || !Number.isFinite(db) || db === 0) return 1
  return Math.pow(10, db / 20)
}


/** 에피소드별 음성 경로 팩토리 — resolveVoiceRelPath 단일원천 사용 */
export const makeVf = (epName: string, voiceSelect: { default: string; slots?: Record<string, string> } | null, locale?: 'ko' | 'en', hasElevenlabs?: boolean) => {
  const { person, locale: voiceLocale } = parseEpName(epName)
  const epDir = episodeDir[epName] ?? person
  return (file: string) => {
    const { dir, subPath } = resolveVoiceRelPath(file, voiceSelect, locale, hasElevenlabs)
    if (dir === 'common') return sf(`common/voice/ko/${subPath}`)
    if (dir === 'common-en') return sf(`common/voice/en/${subPath}`)
    return sf(`episodes/${epDir}/voice/${voiceLocale}/${subPath}`)
  }
}

/** 1x1 투명 PNG — 빈 thumbnail_url 폴백 */
const PLACEHOLDER = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

/** Remotion <Img>의 빈 src 방어 + 로컬 경로 자동 변환 */
export const safeImg = (src?: string) => {
  if (!src) return PLACEHOLDER
  return sf(src)
}

const CL = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const }

/**
 * 안전한 fadeInOut — inputRange 단조 증가 보장
 * [start, start+fadeIn, start+dur-fadeOut, start+dur] 패턴에서
 * dur이 짧으면 fadeIn/fadeOut을 자동 축소하여 겹침 방지
 */
export const fadeInOut = (
  frame: number,
  start: number,
  dur: number,
  fadeIn = f(0.27),
  fadeOut = f(0.33),
): number => {
  if (dur <= 0) return 0
  // dur의 1/3로 제한하되 최소 1프레임
  const fi = Math.max(1, Math.min(fadeIn, Math.floor(dur / 3)))
  const fo = Math.max(1, Math.min(fadeOut, Math.floor(dur / 3)))
  return interpolate(frame, [start, start + fi, start + dur - fo, start + dur], [0, 1, 1, 0], CL)
}

export const BRAND_LOGO_SIZE = 68

/** 수식어(nickname_en / title) 강조 스타일 */
export const SUBTITLE_COLOR = '#c8b078'
export const SUBTITLE_STYLE: React.CSSProperties = {
  color: SUBTITLE_COLOR, fontWeight: 500, fontFamily: 'Cormorant Garamond, serif',
  letterSpacing: 3, textShadow: '0 0 12px rgba(180,150,90,0.4)',
}

/** 셀럽 본인 발화 (감상철학 · 직접 인용문) 공통 스타일 */
export const CELEB_VOICE_COLOR = '#c8a46e'
export const CELEB_VOICE_HIGHLIGHT = '#f5d590'
export const CELEB_VOICE_FONT_SIZE = 44
export const CELEB_VOICE_BORDER = '3px solid rgba(200,164,110,0.4)'
export const CELEB_VOICE_PADDING_LEFT = 20

/** 줄바꿈 시 줄 길이 균등 분배 */
export const BALANCED: React.CSSProperties = { textWrap: 'balance' } as React.CSSProperties

/**
 * Feel & Note 로고 — 공통 컴포넌트
 * variant:
 *   'full'  — FEEL & NOTE + 구분선 + feelandnote.com (outro용)
 *   'brand' — FEEL & NOTE 단색 (BrandIntro용)
 *   'watermark' — FEEL & NOTE 소형 (Overlay용)
 */
type LogoProps = {
  variant?: 'full' | 'brand' | 'watermark'
  fontSize?: number
  style?: React.CSSProperties
}

export const BrandLogo: React.FC<LogoProps> = ({ variant = 'full', fontSize, style }) => {
  const ampGap = (sz: number) => Math.max(1, Math.round(sz * 0.06))

  if (variant === 'watermark') {
    const sz = fontSize ?? 10
    return React.createElement('span', {
      style: { fontSize: sz, fontFamily: FONT.cinzel, letterSpacing: 3, display: 'inline-flex', alignItems: 'center', gap: ampGap(sz), ...style },
    },
      React.createElement('span', { style: { color: '#c8a46e' } }, 'FEEL'),
      React.createElement('span', { style: { color: '#f8f4ed' } }, '&'),
      React.createElement('span', { style: { color: '#c8a46e' } }, 'NOTE'),
    )
  }

  if (variant === 'brand' || variant === 'full') {
    const goldStyle: React.CSSProperties = {
      backgroundImage: `url('${sf('common/images/noise.svg')}'), linear-gradient(180deg, #fad482 0%, #c1922c 40%, #856015 55%, #d6a848 100%)`,
      backgroundBlendMode: 'overlay', // texture 덮기
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      filter: 'drop-shadow(0px 4px 6px rgba(0,0,0,0.8)) drop-shadow(0px -1px 1px rgba(255,255,255,0.2))'
    }
    const silverStyle: React.CSSProperties = {
      backgroundImage: `url('${sf('common/images/noise.svg')}'), linear-gradient(180deg, #ffffff 0%, #dfdbd2 45%, #a8a49c 60%, #f2efe9 100%)`,
      backgroundBlendMode: 'overlay',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      filter: 'drop-shadow(0px 4px 6px rgba(0,0,0,0.8)) drop-shadow(0px -1px 1px rgba(255,255,255,0.2))'
    }

    if (variant === 'brand') {
      const sz = fontSize ?? 68
      return React.createElement('div', {
        style: { fontSize: sz, fontWeight: 700, fontFamily: FONT.brand, letterSpacing: Math.round(sz * 0.08), display: 'flex', alignItems: 'center', gap: ampGap(sz), ...style },
      },
        React.createElement('span', { style: goldStyle }, 'FEEL'),
        React.createElement('span', { style: { ...silverStyle, fontSize: Math.round(sz * 0.9) } }, '&'),
        React.createElement('span', { style: goldStyle }, 'NOTE'),
      )
    }

    // full — FEEL & NOTE (with URL)
    const sz = fontSize ?? BRAND_LOGO_SIZE
    return React.createElement('div', {
      style: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: Math.round(sz * 0.4), ...style },
    },
      React.createElement('div', {
        style: { fontSize: sz, fontWeight: 700, fontFamily: FONT.brand, letterSpacing: Math.round(sz * 0.08), display: 'flex', alignItems: 'center', gap: ampGap(sz) },
      },
        React.createElement('span', { style: goldStyle }, 'FEEL'),
        React.createElement('span', { style: { ...silverStyle, fontSize: Math.round(sz * 0.9) } }, '&'),
        React.createElement('span', { style: goldStyle }, 'NOTE'),
      ),
      React.createElement('div', {
        style: { fontSize: Math.round(sz * 0.28), fontFamily: FONT.sans, color: '#a0a0a0', letterSpacing: 4 },
      }, 'feelandnote.com'),
    )
  }

  return null
}
