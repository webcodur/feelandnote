/**
 * ThumbnailShort -- YouTube Shorts thumbnail (1080x1920)
 */
import { AbsoluteFill, Img } from 'remotion'
import { FONT } from '../BookRecommend/fonts'
import { safeImg } from '../BookRecommend/utils'
import type { BookRecommendScript } from '../BookRecommend/types'
import { t } from '../BookRecommend/i18n'

const SAFE_TOP = 230
const SAFE_BOTTOM = 368

type Props = {
  script: BookRecommendScript
}

export const ThumbnailShort: React.FC<Props> = ({ script }) => {
  const { host, books } = script
  const i18n = t(script)

  return (
    <AbsoluteFill style={{ backgroundColor: '#060504' }}>
      {/* background gradient */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 35%, #1e1810 0%, #0a0908 60%, #060504 100%)' }} />

      {/* background book blur */}
      {books.slice(0, 3).map((b, i) => (
        <div key={i} style={{
          position: 'absolute',
          left: 100 + i * 250, top: 500 + (i % 2) * 150,
          width: 350, height: 520, opacity: 0.05,
          transform: `rotate(${(i - 1) * 5}deg)`,
        }}>
          <Img src={safeImg(b.thumbnail_url)} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(14px) saturate(0.3)' }} />
        </div>
      ))}

      {/* ── fixed header (top safe zone) ── */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: SAFE_TOP,
        background: '#080604',
        borderBottom: '1px solid rgba(200,164,110,0.25)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 10, zIndex: 10,
      }}>
        <div style={{ color: '#c8a46e', fontSize: 20, fontFamily: FONT.cinzel, letterSpacing: 8, opacity: 0.7 }}>
          FEEL <span style={{ color: '#f0e8d8' }}>&amp;</span> NOTE
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 40, height: 1, backgroundColor: '#c8a46e', opacity: 0.3 }} />
          <div style={{ color: '#c8a46e', fontSize: 20, fontFamily: FONT.cinzel, letterSpacing: 6, opacity: 0.6 }}>
            {i18n.libraryTour}
          </div>
          <div style={{ width: 40, height: 1, backgroundColor: '#c8a46e', opacity: 0.3 }} />
        </div>
        <div style={{ color: '#e8e0d0', fontSize: 32, fontWeight: 600, fontFamily: FONT.sans, marginTop: 2 }}>
          {host.nickname}
        </div>
      </div>

      {/* ── content area (between header and footer) ── */}
      <div style={{
        position: 'absolute', top: SAFE_TOP, left: 0, right: 0, bottom: SAFE_BOTTOM,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '0 60px',
      }}>
        {/* avatar */}
        <div style={{ position: 'relative', marginBottom: 24 }}>
          <div style={{
            position: 'absolute', inset: -40,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(200,164,110,0.12) 0%, transparent 60%)',
          }} />
          <div style={{
            position: 'relative',
            width: 280, height: 280, borderRadius: '50%', overflow: 'hidden',
            border: '3px solid rgba(200,164,110,0.4)',
            boxShadow: '0 24px 70px rgba(0,0,0,0.7)',
          }}>
            <Img src={host.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        </div>

        {/* quote */}
        {host.featuredQuote && (
          <div style={{ position: 'relative', maxWidth: 860, textAlign: 'center' }}>
            <div style={{ position: 'absolute', top: -60, left: -10, color: 'rgba(200,164,110,0.1)', fontSize: 160, fontFamily: FONT.serif, fontWeight: 700, lineHeight: 1 }}>
              &ldquo;
            </div>
            <div style={{ color: '#f0e8d8', fontSize: 42, fontWeight: 700, fontFamily: FONT.serif, lineHeight: 1.6, position: 'relative' }}>
              {host.featuredQuote}
            </div>
          </div>
        )}

        {/* attribution */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 28 }}>
          <div style={{ width: 50, height: 2, backgroundColor: '#c8a46e', opacity: 0.4 }} />
          <div style={{ color: '#c8a46e', fontSize: 22, fontFamily: FONT.sans, fontWeight: 600 }}>{host.nickname}</div>
          <div style={{ width: 50, height: 2, backgroundColor: '#c8a46e', opacity: 0.4 }} />
        </div>
      </div>

      {/* ── fixed footer (bottom safe zone — empty for YouTube metadata) ── */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: SAFE_BOTTOM,
        background: '#050505',
        borderTop: '1px solid rgba(200,164,110,0.15)',
        zIndex: 10,
      }} />

      {/* decorative lines */}
      <div style={{ position: 'absolute', top: 0, right: 0, width: 3, height: 120, background: 'linear-gradient(to bottom, rgba(200,164,110,0.3), transparent)', zIndex: 11 }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, width: 3, height: 120, background: 'linear-gradient(to top, rgba(200,164,110,0.15), transparent)', zIndex: 11 }} />
    </AbsoluteFill>
  )
}
