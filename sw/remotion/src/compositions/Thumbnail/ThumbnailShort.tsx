/**
 * ThumbnailShort — 유튜브 쇼츠 썸네일 (1080×1920)
 * C variant 세로 레이아웃
 */
import { AbsoluteFill, Img } from 'remotion'
import { FONT } from '../BookRecommend/fonts'
import { safeImg } from '../BookRecommend/utils'
import type { BookRecommendScript } from '../BookRecommend/types'

type Props = {
  script: BookRecommendScript
}

export const ThumbnailShort: React.FC<Props> = ({ script }) => {
  const { host, books } = script

  return (
    <AbsoluteFill style={{ backgroundColor: '#060504' }}>
      {/* 배경 그라디언트 */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 35%, #1e1810 0%, #0a0908 60%, #060504 100%)' }} />

      {/* 배경 책 블러 */}
      {books.slice(0, 3).map((b, i) => (
        <div key={i} style={{
          position: 'absolute',
          left: 100 + i * 250, top: 600 + (i % 2) * 200,
          width: 350, height: 520, opacity: 0.05,
          transform: `rotate(${(i - 1) * 5}deg)`,
        }}>
          <Img src={safeImg(b.thumbnail_url)} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(14px) saturate(0.3)' }} />
        </div>
      ))}

      {/* 메인 컨텐츠 — 세로 중앙 정렬 */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '0 60px',
      }}>
        {/* 아바타 */}
        <div style={{ position: 'relative', marginBottom: 30 }}>
          <div style={{
            position: 'absolute', inset: -40,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(200,164,110,0.12) 0%, transparent 60%)',
          }} />
          <div style={{
            position: 'relative',
            width: 360, height: 360, borderRadius: '50%', overflow: 'hidden',
            border: '3px solid rgba(200,164,110,0.4)',
            boxShadow: '0 24px 70px rgba(0,0,0,0.7)',
          }}>
            <Img src={host.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        </div>

        {/* 이름 */}
        <div style={{ color: '#f0e8d8', fontSize: 56, fontWeight: 700, fontFamily: FONT.sans, marginBottom: 6 }}>{host.nickname}</div>
        <div style={{ color: '#888', fontSize: 24, fontFamily: FONT.cormorant, letterSpacing: 4, marginBottom: 50 }}>{host.nickname_en}</div>

        {/* 명언 */}
        <div style={{ position: 'relative', maxWidth: 900, textAlign: 'center' }}>
          <div style={{ position: 'absolute', top: -80, left: -10, color: 'rgba(200,164,110,0.1)', fontSize: 200, fontFamily: FONT.serif, fontWeight: 700, lineHeight: 1 }}>
            "
          </div>
          <div style={{ color: '#f0e8d8', fontSize: 48, fontWeight: 700, fontFamily: FONT.serif, lineHeight: 1.6, position: 'relative' }}>
            {host.featuredQuote}
          </div>
        </div>

        {/* 출처 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 36 }}>
          <div style={{ width: 50, height: 3, backgroundColor: '#c8a46e', opacity: 0.5 }} />
          <div style={{ color: '#c8a46e', fontSize: 24, fontFamily: FONT.sans, fontWeight: 600 }}>{host.nickname}</div>
          <div style={{ width: 50, height: 3, backgroundColor: '#c8a46e', opacity: 0.5 }} />
        </div>
      </div>

      {/* 상단 브랜드 */}
      <div style={{ position: 'absolute', top: 60, left: 0, right: 0, textAlign: 'center' }}>
        <span style={{ color: '#c8a46e', fontSize: 24, fontFamily: FONT.cinzel, letterSpacing: 6, opacity: 0.8 }}>
          FEEL <span style={{ color: '#f0e8d8' }}>&</span> NOTE
        </span>
      </div>

      {/* 하단 라벨 */}
      <div style={{ position: 'absolute', bottom: 60, left: 0, right: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 40, height: 1, backgroundColor: '#c8a46e', opacity: 0.4 }} />
        <div style={{ color: '#c8a46e', fontSize: 24, fontFamily: FONT.cinzel, letterSpacing: 6, opacity: 0.7 }}>서재 탐방</div>
        <div style={{ width: 40, height: 1, backgroundColor: '#c8a46e', opacity: 0.4 }} />
      </div>

      {/* 장식선 */}
      <div style={{ position: 'absolute', top: 0, right: 0, width: 3, height: 160, background: 'linear-gradient(to bottom, rgba(200,164,110,0.3), transparent)' }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, width: 3, height: 160, background: 'linear-gradient(to top, rgba(200,164,110,0.3), transparent)' }} />
    </AbsoluteFill>
  )
}
