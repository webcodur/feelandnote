/**
 * Thumbnail -- YouTube longform thumbnail (1280x720)
 * Quote hook: avatar + featured quote
 */
import { AbsoluteFill, Img } from 'remotion'
import { FONT } from '../BookRecommend/fonts'
import { safeImg, BALANCED } from '../BookRecommend/utils'
import type { BookRecommendScript } from '../BookRecommend/types'
import { t } from '../BookRecommend/i18n'
import { DARK } from '../theme'

type Props = {
  script: BookRecommendScript
}

export const Thumbnail: React.FC<Props> = ({ script }) => {
  const { host, books } = script
  const i18n = t(script)

  return (
    <AbsoluteFill style={{ backgroundColor: DARK.surface }}>
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 25% 50%, #1e1810 0%, ${DARK.base} 60%, ${DARK.surface} 100%)` }} />

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

      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center' }}>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', paddingLeft: 40 }}>
          <div style={{ position: 'relative' }}>
            <div style={{
              position: 'absolute', inset: -50,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(200,164,110,0.12) 0%, transparent 60%)',
              zIndex: 0,
            }} />
            <div style={{
              position: 'relative', zIndex: 1,
              width: 440, height: 440, borderRadius: '50%', overflow: 'hidden',
              border: '3px solid rgba(200,164,110,0.55)',
              boxShadow: '0 24px 70px rgba(0,0,0,0.7), 0 0 40px rgba(200,164,110,0.18), 0 0 80px rgba(200,164,110,0.08)',
            }}>
              <Img src={host.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', paddingRight: 60 }}>
          <div style={{ color: '#c8a46e', fontSize: 36, fontWeight: 500, fontFamily: FONT.sans, letterSpacing: 2, marginBottom: 12, textAlign: 'center' }}>
            {host.title}
          </div>
          <div style={{ color: '#f0e8d8', fontSize: 110, fontWeight: 700, fontFamily: script.locale === 'en' ? FONT.serif : FONT.sans, lineHeight: 1.15, wordBreak: 'keep-all', textAlign: 'center', ...BALANCED }}>
            {host.nickname}
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 40, marginBottom: 24 }}>
            <div style={{ width: 80, height: 1, background: 'linear-gradient(to right, transparent, rgba(200,164,110,0.6))' }} />
            <div style={{ width: 10, height: 10, border: '1.5px solid rgba(200,164,110,0.7)', transform: 'rotate(45deg)', flexShrink: 0 }} />
            <div style={{ width: 80, height: 1, background: 'linear-gradient(to left, transparent, rgba(200,164,110,0.6))' }} />
          </div>
          <div style={{ color: '#c8a46e', fontSize: 56, fontFamily: FONT.cinzel, letterSpacing: 6, fontWeight: 600, textAlign: 'center' }}>
            {i18n.libraryTour}
          </div>
        </div>
      </div>

      {/* 고급스러운 액자 프레임 */}
      <div style={{
        position: 'absolute', inset: 40,
        border: '1px solid rgba(200,164,110,0.3)',
        pointerEvents: 'none', zIndex: 10
      }}>
        <div style={{ position: 'absolute', top: -2, left: -2, width: 40, height: 40, borderTop: '3px solid rgba(200,164,110,0.9)', borderLeft: '3px solid rgba(200,164,110,0.9)' }} />
        <div style={{ position: 'absolute', top: -2, right: -2, width: 40, height: 40, borderTop: '3px solid rgba(200,164,110,0.9)', borderRight: '3px solid rgba(200,164,110,0.9)' }} />
        <div style={{ position: 'absolute', bottom: -2, left: -2, width: 40, height: 40, borderBottom: '3px solid rgba(200,164,110,0.9)', borderLeft: '3px solid rgba(200,164,110,0.9)' }} />
        <div style={{ position: 'absolute', bottom: -2, right: -2, width: 40, height: 40, borderBottom: '3px solid rgba(200,164,110,0.9)', borderRight: '3px solid rgba(200,164,110,0.9)' }} />
        
        {/* 이너 보더 */}
        <div style={{ position: 'absolute', inset: 12, border: '1px solid rgba(200,164,110,0.1)' }} />
      </div>
    </AbsoluteFill>
  )
}
