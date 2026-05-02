/**
 * ShortsThumbnail -- 쇼츠 1프레임 썸네일 시안 (1080x1920)
 *
 * 최종 프리미엄 썸네일 레이아웃: The Classic Editorial (매거진 스타일)
 * - 최상단: 텍스트 (위쪽 UI에 가리지 않게 상하 여백 확보)
 * - 중앙: 인물 초상화 (시원한 세로 비율 유지)
 * - 우하단: 책 표지 (유튜브 하단 UI 영역을 피해 위로 안착)
 * - 좌하단: 거대한 도서명 영역 (유튜브 하단 텍스트 영역 완벽한 여백 보장)
 */
import React from 'react'
import { AbsoluteFill, Img, useCurrentFrame, interpolate } from 'remotion'
import { freshAvatarUrl } from '../../lib/avatar'
import { FONT } from '../BookRecommend/fonts'
import { safeImg, BALANCED } from '../BookRecommend/utils'
import type { BookRecommendScript } from '../BookRecommend/types'

type Props = {
  script: BookRecommendScript
  hideHeader?: boolean
  hideFooter?: boolean
  /** 쇼츠 번호 (1-based, 필수) */
  shortsIndex: number
}

const GOLD = '#c8a46e'
const CREAM = '#f0e8d8'
const DARK = '#080706'

// 책 표지에 깊이감을 더하는 글로우와 진한 그림자
const BookCover: React.FC<{
  src: string
  w: number
  h: number
  rotate?: number
  style?: React.CSSProperties
  imgStyle?: React.CSSProperties
}> = ({ src, w, h, rotate = 0, style, imgStyle }) => (
  <div style={{
    width: w, height: h,
    borderRadius: 16, overflow: 'hidden',
    transform: rotate ? `rotate(${rotate}deg)` : undefined,
    boxShadow: '0 40px 80px rgba(0,0,0,0.9), 0 0 0 1.5px rgba(200,164,110,0.3)',
    ...style,
  }}>
    <Img src={safeImg(src)} style={{
      width: '100%', height: '100%', objectFit: 'cover',
      ...imgStyle
    }} />
  </div>
)

export const ShortsThumbnail: React.FC<Props> = ({ script, hideHeader, hideFooter, shortsIndex }) => {
  const frame = useCurrentFrame()
  const { host, books } = script
  // shortsIndex는 1-based. 배열 접근 시 -1 변환
  const shorts = script.shorts?.[shortsIndex - 1]
  const bi = shorts?.featuredBookIndex ?? 0
  const book = books[bi]
  const displayTitle = shorts?.bookTitleOverride ?? book.title
  const isEn = script.locale === 'en'

  // 매거진의 텍스트 레이아웃은 고정된 채 인물과 오브제만 미세하게 호흡하듯 줌인
  const portraitScale = interpolate(frame, [0, 60], [1, 1.05], { extrapolateRight: 'clamp' })
  const bookScale = interpolate(frame, [0, 60], [1, 1.03], { extrapolateRight: 'clamp' })

  // 여백이 보장된 상단과 타이포그래피를 위한 하단, 그리고 유튜브 UI 안전영역 분리
  const TOP_H = 320 // 상단 블랙 박스를 텍스트 높이에 딱 맞게 조절해 인물 영역 확보
  const BOT_H = 460 // 유튜브 UI가 덮는 공간을 고려해 하단 블랙 패널 길이를 확보
  const SAFE_Z = 220 // 맨 아래 자막/UI가 덮는 절대 침범 금지 영역
  const SAFE_TOP = 120 // 맨 위쪽 천장에서 살짝 띄우기 위한 딱 알맞은 여백
  const MID_H = 1920 - TOP_H - BOT_H

  return (
    <AbsoluteFill style={{ backgroundColor: '#090807' }}>
      {/* ── 중단: 인물 (스케일 줌인 시 바깥으로 튀어나가지 않도록 마스킹) ── */}
      <div style={{ position: 'absolute', top: TOP_H, left: 0, right: 0, height: MID_H, overflow: 'hidden' }}>
        <Img
          src={freshAvatarUrl(host.avatar_url)}
          style={{
            position: 'absolute', top: 0, left: 0, // 컨테이너 내부 절대좌표
            width: '100%', height: '100%',
            objectFit: 'cover', objectPosition: 'center 10%',
            filter: 'contrast(1.1) brightness(0.95)',
            transform: `scale(${portraitScale})`,
            transformOrigin: 'center 20%', // 인물의 얼굴 부근을 중심으로 자연스럽게 줌
          }}
        />
      </div>
      {/* 인물 상/하단 자연스럽게 블랙 배경과 섞이도록 페이드 아웃 */}
      <div style={{
        position: 'absolute', top: TOP_H, left: 0, right: 0, height: 160,
        background: 'linear-gradient(to bottom, #090807, transparent)',
      }} />
      <div style={{
        position: 'absolute', bottom: BOT_H, left: 0, right: 0, height: 120,
        background: 'linear-gradient(to top, #090807, transparent)',
      }} />
      {/* 약간의 비네팅 효과로 시선 집중 */}
      <div style={{
        position: 'absolute', top: TOP_H, left: 0,
        width: '100%', height: MID_H,
        background: 'radial-gradient(ellipse 80% 70% at 50% 40%, transparent 35%, rgba(9,8,7,0.7) 100%)',
      }} />

      {/* ── 상단 타이포그래피 (독립 공간) ── */}
      {!hideHeader && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: TOP_H,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '0 80px', // 화면 좌우 끝에 텍스트가 달라붙지 않도록 넉넉한 보호 여백 추가
          zIndex: 10,
        }}>
          <div style={{
            fontSize: isEn ? 44 : 52, color: GOLD,
            fontFamily: FONT.sans, fontWeight: 700, letterSpacing: 4, marginBottom: 12,
            textAlign: 'center', wordBreak: 'keep-all'
          }}>
            {isEn ? 'LIBRARY TOUR' : '서재 탐방'}
          </div>
          <div style={{
            fontSize: isEn ? 94 : 110, fontWeight: 900,
            fontFamily: isEn ? FONT.serif : FONT.sans,
            color: CREAM, lineHeight: 1.0, textAlign: 'center',
            textShadow: '0 8px 40px rgba(0,0,0,0.9)', // 인물과 겹칠 때를 대비해 강력한 텍스트 그림자
            wordBreak: 'keep-all', // 너무 긴 이름은 자연스럽게 줄바꿈 보장
            ...BALANCED,
          }}>
            {host.nickname}
          </div>
        </div>
      )}

      {/* ── 우하단: 책 (유튜브 UI에 가리지 않게 안전영역 위로 안착) ── */}
      <div style={{
        position: 'absolute',
        bottom: SAFE_Z, right: 60,
        zIndex: 5,
        transform: `scale(${bookScale})`,
        transformOrigin: 'bottom right',
      }}>
        {/* 책 뒷편 은은한 글로우 효과 (유물 느낌 장착) */}
        <div style={{
          position: 'absolute', inset: -60,
          background: 'radial-gradient(circle, rgba(200,164,110,0.15) 0%, transparent 60%)',
        }} />
        <BookCover 
          src={book.thumbnail_url} w={350} h={500} rotate={6} 
          imgStyle={{ filter: 'blur(0.6px) contrast(1.05)' }}
        />
      </div>

      {/* 책제목 배경 음영 — 책 표지와 겹치는 구간에서 텍스트가 시각적 우위에 서도록
          zIndex 7: 책 표지(5) 위, 타이틀(10) 아래 */}
      {!hideFooter && (
        <div style={{
          position: 'absolute',
          top: TOP_H + MID_H - 80, left: 0, right: 0, height: 340,
          background: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.62) 38%, rgba(0,0,0,0.85) 100%)',
          zIndex: 7,
          pointerEvents: 'none',
        }} />
      )}

      {/* ── 하단 타이포그래피 (단단한 마감) ── */}
      {/* 인물 이미지 컨테이너 바닥(TOP_H + MID_H)에 앵커 — 갭 없이 바로 이어짐 */}
      {!hideFooter && (
        <div style={{
          position: 'absolute', top: TOP_H + MID_H, left: 80, right: 80,
          zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'flex-start'
        }}>
          {/* 유튜브 시청자에게 가장 명확히 소구할 콘텐츠 포맷 위치에 실제 책 제목 노출 */}
          <div style={{
            fontSize: isEn ? 52 : 60, color: CREAM, fontWeight: 900,
            fontFamily: FONT.sans, lineHeight: 1.3,
            wordBreak: 'keep-all', overflowWrap: 'break-word',
            textShadow: '0 4px 20px rgba(0,0,0,0.9)',
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'
          }}>
            {displayTitle}
          </div>
          
          {/* 프리미엄한 에디토리얼 마감 (워터마크 느낌) */}
          <div style={{
            fontSize: 22, color: 'rgba(232,224,208,0.4)',
            fontFamily: FONT.sans, fontWeight: 600, letterSpacing: 8,
            marginTop: 24, textTransform: 'uppercase',
          }}>
            FEEL & NOTE COLLECTION
          </div>
        </div>
      )}
    </AbsoluteFill>
  )
}
