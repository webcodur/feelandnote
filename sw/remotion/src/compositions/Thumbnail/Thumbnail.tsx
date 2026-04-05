/**
 * Thumbnail -- YouTube longform thumbnail (1280x720)
 * Split layout: left = clear face, right = faded image + text overlay
 */
import { AbsoluteFill, Img } from 'remotion'
import { staticFile } from 'remotion'
import { freshAvatarUrl } from '../../lib/avatar'
import { FONT } from '../BookRecommend/fonts'
import { BALANCED } from '../BookRecommend/utils'
import type { BookRecommendScript } from '../BookRecommend/types'
import { t } from '../BookRecommend/i18n'
import { DARK } from '../theme'

type Props = {
  script: BookRecommendScript
}

export const Thumbnail: React.FC<Props> = ({ script }) => {
  const { host } = script
  const i18n = t(script)
  const isEn = script.locale === 'en'

  return (
    <AbsoluteFill style={{ backgroundColor: '#151312' }}>
      {/* 벽지 질감 — 부드러운 얼룩 패턴 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: [
            'radial-gradient(ellipse at 75% 25%, #1c1918 0%, transparent 45%)',
            'radial-gradient(ellipse at 55% 75%, #191716 0%, transparent 40%)',
            'radial-gradient(ellipse at 90% 60%, #181615 0%, transparent 35%)',
            'radial-gradient(ellipse at 65% 45%, #1b1918 0%, #151312 100%)',
          ].join(', '),
        }}
      />

      {/* 장식: 좌측 세로 금선 */}
      <div
        style={{
          position: 'absolute',
          left: 28,
          top: 60,
          bottom: 60,
          width: 1.5,
          background: 'linear-gradient(to bottom, transparent, rgba(200,164,110,0.3) 20%, rgba(200,164,110,0.3) 80%, transparent)',
        }}
      />

      {/* 장식: 대각선 금선 — 이미지와 텍스트 경계 */}
      <div
        style={{
          position: 'absolute',
          left: '42%',
          top: 0,
          width: 1,
          height: '100%',
          background: 'linear-gradient(to bottom, transparent 10%, rgba(200,164,110,0.12) 30%, rgba(200,164,110,0.2) 50%, rgba(200,164,110,0.12) 70%, transparent 90%)',
          transform: 'rotate(2deg)',
          transformOrigin: 'top center',
        }}
      />

      {/* 인물 이미지 — 전체 깔기 */}
      <Img
        src={freshAvatarUrl(host.avatar_url)}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          objectPosition: 'left center',
          filter: 'contrast(1.1) brightness(1.05)',
        }}
      />

      {/* 우측 절반 fade out — 이미지를 서서히 배경색으로 녹임 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to right, transparent 45%, #151312 58%)',
        }}
      />

      {/* 하단 비네팅 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to top, rgba(6,5,3,0.5) 0%, transparent 30%)',
        }}
      />

      {/* 우측 텍스트 영역 */}
      <div
        style={{
          position: 'absolute',
          right: 20,
          top: 0,
          bottom: 0,
          width: 640,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {/* 직함 */}
        <div
          style={{
            color: '#c8a46e',
            fontSize: 36,
            fontWeight: 500,
            fontFamily: FONT.sans,
            letterSpacing: 4,
            marginBottom: 16,
            textAlign: 'center',
            textShadow: '0 2px 16px rgba(0,0,0,0.6)',
          }}
        >
          {host.title}
        </div>

        {/* 이름 */}
        <div
          style={{
            color: '#f0e8d8',
            fontSize: isEn ? 110 : 116,
            fontWeight: 700,
            fontFamily: isEn ? FONT.serif : FONT.sans,
            lineHeight: 1.1,
            textAlign: 'center',
            wordBreak: 'keep-all',
            textShadow: '0 4px 30px rgba(0,0,0,0.9), 0 0 80px rgba(200,164,110,0.15)',
            ...BALANCED,
          }}
        >
          {host.nickname}
        </div>

        {/* 구분선 */}
        <div
          style={{
            width: 110,
            height: 2,
            background: 'linear-gradient(to right, rgba(200,164,110,0.1), #c8a46e 50%, rgba(200,164,110,0.1))',
            marginTop: 44,
            marginBottom: 44,
          }}
        />

        {/* 시리즈명 */}
        <div
          style={{
            color: '#c8a46e',
            fontSize: 48,
            fontFamily: FONT.cinzel,
            letterSpacing: 6,
            fontWeight: 600,
            textAlign: 'center',
            textShadow: '0 2px 16px rgba(0,0,0,0.6)',
          }}
        >
          {i18n.libraryTour}
        </div>
      </div>

      {/* 장식: 우측 코너 장식 (상단) */}
      <div
        style={{
          position: 'absolute',
          right: 28,
          top: 48,
          width: 36,
          height: 36,
          borderTop: '1.5px solid rgba(200,164,110,0.35)',
          borderRight: '1.5px solid rgba(200,164,110,0.35)',
        }}
      />
      {/* 장식: 우측 코너 장식 (하단) */}
      <div
        style={{
          position: 'absolute',
          right: 28,
          bottom: 48,
          width: 36,
          height: 36,
          borderBottom: '1.5px solid rgba(200,164,110,0.35)',
          borderRight: '1.5px solid rgba(200,164,110,0.35)',
        }}
      />

      {/* 좌하단 브랜드 */}
      <div
        style={{
          position: 'absolute',
          left: 48,
          bottom: 32,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 22,
          fontWeight: 700,
          fontFamily: FONT.brand,
          letterSpacing: 4,
        }}
      >
        <span style={{ color: '#c8a46e' }}>FEEL</span>
        <span style={{ color: '#f8f4ed', fontSize: 20 }}>&</span>
        <span style={{ color: '#c8a46e' }}>NOTE</span>
      </div>
    </AbsoluteFill>
  )
}
