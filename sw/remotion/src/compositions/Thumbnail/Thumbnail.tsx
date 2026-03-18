/**
 * Thumbnail -- YouTube longform thumbnail (1280x720)
 * Quote hook: avatar + featured quote
 */
import { AbsoluteFill, Img } from 'remotion'
import { FONT } from '../BookRecommend/fonts'
import { safeImg } from '../BookRecommend/utils'
import type { BookRecommendScript } from '../BookRecommend/types'
import { t } from '../BookRecommend/i18n'

type Props = {
  script: BookRecommendScript
}

export const Thumbnail: React.FC<Props> = ({ script }) => {
  const { host, books } = script
  const i18n = t(script)

  return (
    <AbsoluteFill style={{ backgroundColor: '#060504' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 25% 50%, #1e1810 0%, #0a0908 60%, #060504 100%)' }} />

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

      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', padding: '0 50px' }}>
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
          <div style={{ color: '#f0e8d8', fontSize: 44, fontWeight: 700, fontFamily: FONT.sans, textAlign: 'center' }}>{host.nickname}</div>
          <div style={{ color: '#888', fontSize: 20, fontFamily: FONT.cormorant, letterSpacing: 4, marginTop: 4 }}>{script.locale === 'en' ? host.title : host.nickname_en}</div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingLeft: 50 }}>
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', top: -70, left: -24, color: 'rgba(200,164,110,0.12)', fontSize: 180, fontFamily: FONT.serif, fontWeight: 700, lineHeight: 1 }}>
              &ldquo;
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
      </div>

      <div style={{ position: 'absolute', top: 28, left: 50 }}>
        <span style={{ color: '#c8a46e', fontSize: 22, fontFamily: FONT.cinzel, letterSpacing: 5, opacity: 0.8 }}>FEEL <span style={{ color: '#f0e8d8' }}>&amp;</span> NOTE</span>
      </div>
      <div style={{ position: 'absolute', bottom: 28, right: 40, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 40, height: 1, backgroundColor: '#c8a46e', opacity: 0.4 }} />
        <div style={{ color: '#c8a46e', fontSize: 22, fontFamily: FONT.cinzel, letterSpacing: 5, opacity: 0.7 }}>{i18n.libraryTour}</div>
      </div>
      <div style={{ position: 'absolute', top: 0, right: 0, width: 3, height: 120, background: 'linear-gradient(to bottom, rgba(200,164,110,0.4), transparent)' }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, width: 3, height: 120, background: 'linear-gradient(to top, rgba(200,164,110,0.4), transparent)' }} />
    </AbsoluteFill>
  )
}
