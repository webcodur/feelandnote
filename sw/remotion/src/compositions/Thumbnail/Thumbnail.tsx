/**
 * Thumbnail — 유튜브 롱폼 썸네일 (1280×720)
 *
 * A: 인물 중심 — 좌측 아바타 + 우측 대표 책
 * B: 서재 느낌 — 상단 아바타 + 하단 책 선반
 * C: 명언 훅 — 아바타 + 대표 명언
 * D: 미스터리 — 실루엣 + "이 사람의 서재를 열다"
 * E: 매거진 — 큰 아바타 반신 + 타이포 오버레이
 */
import { AbsoluteFill, Img } from 'remotion'
import { FONT } from '../BookRecommend/fonts'
import { safeImg } from '../BookRecommend/utils'
import type { BookRecommendScript } from '../BookRecommend/types'

type Variant = 'A' | 'B' | 'C' | 'D' | 'E'

type Props = {
  script: BookRecommendScript
  variant?: Variant
}

export const Thumbnail: React.FC<Props> = ({ script, variant = 'A' }) => {
  const { host, books } = script
  const topBooks = books.slice(0, 5)

  switch (variant) {
    case 'B': return <VariantB host={host} books={topBooks} />
    case 'C': return <VariantC host={host} books={books} />
    case 'D': return <VariantD host={host} books={books} />
    case 'E': return <VariantE host={host} books={books} />
    default:  return <VariantA host={host} books={topBooks} />
  }
}

/** A — 인물 중심: 좌측 아바타 크게 + 우측 책 */
const VariantA: React.FC<{ host: any; books: any[] }> = ({ host, books }) => (
  <AbsoluteFill style={{ backgroundColor: '#080808' }}>
    <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 30% 50%, #1a1510 0%, #080808 70%)' }} />
    <div style={{ position: 'absolute', left: 60, top: 0, bottom: 0, width: 480, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{
        width: 340, height: 340, borderRadius: '50%', overflow: 'hidden',
        border: '4px solid rgba(200,164,110,0.5)',
        boxShadow: '0 0 80px rgba(200,164,110,0.2), 0 20px 60px rgba(0,0,0,0.7)',
      }}>
        <Img src={host.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
    </div>
    <div style={{ position: 'absolute', left: 60, bottom: 50, width: 480, textAlign: 'center' }}>
      <div style={{ color: '#e8e0d0', fontSize: 42, fontWeight: 700, fontFamily: FONT.sans }}>{host.nickname}</div>
      <div style={{ color: '#777', fontSize: 18, fontFamily: FONT.cormorant, letterSpacing: 3, marginTop: 4 }}>{host.nickname_en}</div>
    </div>
    <div style={{
      position: 'absolute', right: 40, top: 0, bottom: 0, width: 680,
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14,
    }}>
      {books.slice(0, 4).map((b, i) => {
        const rotate = (i - 1.5) * 6
        const y = Math.abs(i - 1.5) * 12
        return (
          <div key={i} style={{ transform: `rotate(${rotate}deg) translateY(${y}px)` }}>
            <div style={{
              width: 130, height: 195, borderRadius: 8, overflow: 'hidden',
              boxShadow: '0 12px 40px rgba(0,0,0,0.7), 0 0 20px rgba(200,164,110,0.1)',
              border: '1px solid rgba(200,164,110,0.15)',
            }}>
              <Img src={safeImg(b.thumbnail_url)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          </div>
        )
      })}
    </div>
    <div style={{ position: 'absolute', right: 60, bottom: 50, display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ color: '#c8a46e', fontSize: 16, fontFamily: FONT.cinzel, letterSpacing: 4, fontWeight: 600 }}>서재 탐방</div>
      <div style={{ width: 1, height: 16, backgroundColor: '#c8a46e', opacity: 0.4 }} />
      <div style={{ color: '#888', fontSize: 16, fontFamily: FONT.cinzel }}>{books.length} BOOKS</div>
    </div>
    <div style={{ position: 'absolute', top: 28, left: 60 }}>
      <span style={{ color: '#c8a46e', fontSize: 13, fontFamily: FONT.cinzel, letterSpacing: 4 }}>FEEL & NOTE</span>
    </div>
  </AbsoluteFill>
)

/** B — 서재 느낌: 상단 아바타 + 하단 책 선반 (겹침 해결) */
const VariantB: React.FC<{ host: any; books: any[] }> = ({ host, books }) => (
  <AbsoluteFill style={{ backgroundColor: '#080808' }}>
    <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 30%, #1a1510 0%, #080808 70%)' }} />

    {/* 상단: 아바타 + 이름 */}
    <div style={{ position: 'absolute', top: 40, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{
        width: 200, height: 200, borderRadius: '50%', overflow: 'hidden',
        border: '3px solid rgba(200,164,110,0.5)',
        boxShadow: '0 0 60px rgba(200,164,110,0.15), 0 16px 50px rgba(0,0,0,0.7)',
      }}>
        <Img src={host.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
      <div style={{ color: '#e8e0d0', fontSize: 36, fontWeight: 700, fontFamily: FONT.sans, marginTop: 16 }}>{host.nickname}</div>
      <div style={{ color: '#777', fontSize: 15, fontFamily: FONT.cormorant, letterSpacing: 3, marginTop: 4 }}>{host.nickname_en}</div>
    </div>

    {/* 하단: 책 선반 */}
    <div style={{
      position: 'absolute', bottom: 60, left: 0, right: 0,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 16,
    }}>
      {books.map((b, i) => {
        const mid = (books.length - 1) / 2
        const offset = i - mid
        const rotate = offset * 5
        return (
          <div key={i} style={{ transform: `rotate(${rotate}deg)` }}>
            <div style={{
              width: 110, height: 165, borderRadius: 6, overflow: 'hidden',
              boxShadow: '0 10px 35px rgba(0,0,0,0.7)',
              border: '1px solid rgba(200,164,110,0.15)',
            }}>
              <Img src={safeImg(b.thumbnail_url)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          </div>
        )
      })}
    </div>

    {/* 중앙 라벨 */}
    <div style={{ position: 'absolute', top: 340, left: 0, right: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 50, height: 1, backgroundColor: '#c8a46e', opacity: 0.5 }} />
      <div style={{ color: '#c8a46e', fontSize: 16, fontFamily: FONT.cinzel, letterSpacing: 5 }}>서재 탐방 · {books.length} BOOKS</div>
      <div style={{ width: 50, height: 1, backgroundColor: '#c8a46e', opacity: 0.5 }} />
    </div>

    <div style={{ position: 'absolute', top: 28, left: 40 }}>
      <span style={{ color: '#c8a46e', fontSize: 13, fontFamily: FONT.cinzel, letterSpacing: 4 }}>FEEL & NOTE</span>
    </div>
  </AbsoluteFill>
)

/** C — 명언 훅: 아바타 + 대표 명언 (강화) */
const VariantC: React.FC<{ host: any; books: any[] }> = ({ host, books }) => (
  <AbsoluteFill style={{ backgroundColor: '#060504' }}>
    {/* 배경: 따뜻한 그라디언트 */}
    <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 25% 50%, #1e1810 0%, #0a0908 60%, #060504 100%)' }} />

    {/* 배경 책 블러 — 더 크고 드라마틱 */}
    {books.slice(0, 4).map((b, i) => (
      <div key={i} style={{
        position: 'absolute',
        left: 350 + i * 180, top: 40 + (i % 2) * 120,
        width: 280, height: 420, opacity: 0.06,
        transform: `rotate(${(i - 1.5) * 4}deg)`,
      }}>
        <Img src={safeImg(b.thumbnail_url)} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(12px) saturate(0.3)' }} />
      </div>
    ))}

    {/* 중앙 컨테이너 — 아바타+명언을 세로 중앙 가로 정렬 */}
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', padding: '0 50px' }}>

      {/* 좌측: 아바타 + 이름 */}
      <div style={{ width: 420, display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
        <div style={{ position: 'relative', marginBottom: 20 }}>
          <div style={{
            position: 'absolute', inset: -36,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(200,164,110,0.12) 0%, transparent 60%)',
            zIndex: 0,
          }} />
          <div style={{
            position: 'relative', zIndex: 1,
            width: 300, height: 300, borderRadius: '50%', overflow: 'hidden',
            border: '3px solid rgba(200,164,110,0.4)',
            boxShadow: '0 24px 70px rgba(0,0,0,0.7)',
          }}>
            <Img src={host.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        </div>
        <div style={{ color: '#f0e8d8', fontSize: 44, fontWeight: 700, fontFamily: FONT.sans }}>{host.nickname}</div>
        <div style={{ color: '#888', fontSize: 20, fontFamily: FONT.cormorant, letterSpacing: 4, marginTop: 4 }}>{host.nickname_en}</div>
      </div>

      {/* 우측: 명언 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingLeft: 50 }}>
        <div style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', top: -70, left: -24, color: 'rgba(200,164,110,0.12)', fontSize: 180, fontFamily: FONT.serif, fontWeight: 700, lineHeight: 1 }}>
            "
          </div>
          <div style={{ color: '#f0e8d8', fontSize: 52, fontWeight: 700, fontFamily: FONT.serif, lineHeight: 1.55, maxWidth: 700, position: 'relative' }}>
            {host.featuredQuote}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 30 }}>
          <div style={{ width: 50, height: 3, backgroundColor: '#c8a46e', opacity: 0.5 }} />
          <div style={{ color: '#c8a46e', fontSize: 22, fontFamily: FONT.sans, fontWeight: 600 }}>{host.nickname}</div>
        </div>
      </div>
    </div>{/* /중앙 컨테이너 */}

    {/* 상단 브랜드 */}
    <div style={{ position: 'absolute', top: 28, left: 50 }}>
      <span style={{ color: '#c8a46e', fontSize: 22, fontFamily: FONT.cinzel, letterSpacing: 5, opacity: 0.8 }}>FEEL <span style={{ color: '#f0e8d8' }}>&</span> NOTE</span>
    </div>

    {/* 하단 라벨 */}
    <div style={{ position: 'absolute', bottom: 28, right: 40, display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 40, height: 1, backgroundColor: '#c8a46e', opacity: 0.4 }} />
      <div style={{ color: '#c8a46e', fontSize: 22, fontFamily: FONT.cinzel, letterSpacing: 5, opacity: 0.7 }}>서재 탐방</div>
    </div>

    {/* 상단 우측 장식선 */}
    <div style={{ position: 'absolute', top: 0, right: 0, width: 3, height: 120, background: 'linear-gradient(to bottom, rgba(200,164,110,0.4), transparent)' }} />
    <div style={{ position: 'absolute', bottom: 0, left: 0, width: 3, height: 120, background: 'linear-gradient(to top, rgba(200,164,110,0.4), transparent)' }} />
  </AbsoluteFill>
)

/** D — 미스터리: 어둡게 처리된 아바타 + 질문형 텍스트 */
const VariantD: React.FC<{ host: any; books: any[] }> = ({ host, books }) => (
  <AbsoluteFill style={{ backgroundColor: '#050505' }}>
    <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 50%, #12100d 0%, #050505 70%)' }} />

    {/* 배경: 큰 아바타 블러 */}
    <div style={{ position: 'absolute', inset: -40, opacity: 0.12 }}>
      <Img src={host.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(30px) brightness(0.5)' }} />
    </div>

    {/* 좌측 아바타 — 어둡게 */}
    <div style={{ position: 'absolute', left: 80, top: 0, bottom: 0, width: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{
        width: 300, height: 300, borderRadius: '50%', overflow: 'hidden',
        border: '2px solid rgba(200,164,110,0.25)',
        boxShadow: '0 0 100px rgba(0,0,0,0.8)',
      }}>
        <Img src={host.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.35) saturate(0.3)' }} />
      </div>
    </div>

    {/* 우측 텍스트 */}
    <div style={{ position: 'absolute', right: 60, top: 0, bottom: 0, width: 700, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 40px' }}>
      <div style={{ color: '#c8a46e', fontSize: 18, fontFamily: FONT.cinzel, letterSpacing: 6, marginBottom: 20 }}>서재 탐방</div>
      <div style={{ color: '#f0e8d8', fontSize: 52, fontWeight: 700, fontFamily: FONT.sans, lineHeight: 1.4, marginBottom: 16 }}>
        {host.nickname}의{'\n'}서재를 열다
      </div>
      <div style={{ color: '#888', fontSize: 20, fontFamily: FONT.sans }}>
        {books.length}권의 책이 말해주는 한 인물의 세계
      </div>
    </div>

    {/* 하단 책 미니 */}
    <div style={{ position: 'absolute', bottom: 30, left: 80, display: 'flex', gap: 8 }}>
      {books.slice(0, 6).map((b, i) => (
        <div key={i} style={{ width: 40, height: 60, borderRadius: 3, overflow: 'hidden', opacity: 0.4 }}>
          <Img src={safeImg(b.thumbnail_url)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      ))}
    </div>

    <div style={{ position: 'absolute', top: 28, right: 40 }}>
      <span style={{ color: '#c8a46e', fontSize: 13, fontFamily: FONT.cinzel, letterSpacing: 4 }}>FEEL & NOTE</span>
    </div>
  </AbsoluteFill>
)

/** E — 매거진: 아바타 반신 커버 + 타이포 오버레이 */
const VariantE: React.FC<{ host: any; books: any[] }> = ({ host, books }) => (
  <AbsoluteFill style={{ backgroundColor: '#080808' }}>
    {/* 배경: 아바타 풀 커버 */}
    <div style={{ position: 'absolute', inset: 0 }}>
      <Img src={host.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.3) saturate(0.5)' }} />
    </div>
    {/* 그라디언트 오버레이 — 우측 어둡게 */}
    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, transparent 20%, rgba(8,8,8,0.85) 55%, rgba(8,8,8,0.95) 100%)' }} />
    {/* 하단 그라디언트 */}
    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(8,8,8,0.9) 0%, transparent 40%)' }} />

    {/* 우측 텍스트 블록 */}
    <div style={{ position: 'absolute', right: 60, top: 0, bottom: 0, width: 600, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <div style={{ color: '#c8a46e', fontSize: 15, fontFamily: FONT.cinzel, letterSpacing: 6, marginBottom: 14 }}>서재 탐방</div>
      <div style={{ color: '#f0e8d8', fontSize: 54, fontWeight: 700, fontFamily: FONT.sans, lineHeight: 1.35, marginBottom: 12 }}>
        {host.nickname}
      </div>
      <div style={{ color: '#999', fontSize: 18, fontFamily: FONT.cormorant, letterSpacing: 3, marginBottom: 24 }}>{host.nickname_en}</div>
      <div style={{ width: 60, height: 2, backgroundColor: '#c8a46e', opacity: 0.6, marginBottom: 24 }} />
      <div style={{ color: '#aaa', fontSize: 18, fontFamily: FONT.sans, lineHeight: 1.6 }}>
        {host.title ?? ''} · {books.length}권의 책
      </div>
    </div>

    {/* 하단 책 나열 */}
    <div style={{ position: 'absolute', bottom: 30, right: 60, display: 'flex', gap: 10 }}>
      {books.slice(0, 5).map((b, i) => (
        <div key={i} style={{ width: 52, height: 78, borderRadius: 4, overflow: 'hidden', border: '1px solid rgba(200,164,110,0.15)' }}>
          <Img src={safeImg(b.thumbnail_url)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      ))}
    </div>

    <div style={{ position: 'absolute', top: 28, right: 40 }}>
      <span style={{ color: '#c8a46e', fontSize: 13, fontFamily: FONT.cinzel, letterSpacing: 4 }}>FEEL & NOTE</span>
    </div>
  </AbsoluteFill>
)
