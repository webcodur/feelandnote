import React from 'react'
import { AbsoluteFill, Img } from 'remotion'
import type { FactionScript } from '../Faction/types'
import { FONT } from '../BookRecommend/fonts'
import { imgSrc } from '../Faction/utils'

type Props = {
  /** Root 의 calculateMetadata 가 편 파일을 읽어 넣는다. 열리기 전엔 없다. */
  script?: FactionScript
  episodeName: string
}

const GOLD = '#c8a46e'
const DARK = '#090807'

export const FactionLVThumbnail: React.FC<Props> = ({ script, episodeName }) => {
  if (!script) return null
  // Use the explicitly provided LV thumbnail image, or fallback to the very first person in the faction
  const allPeople = script.groups.flatMap(g => g.clusters.flatMap(c => c.people))
    .filter(person => person.isPerson !== false)
  const imageToUse = script.lvThumbnailImage ?? allPeople[0]?.image

  return (
    <AbsoluteFill style={{ backgroundColor: DARK, overflow: 'hidden' }}>
      
      {/* Background with strong vignette */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(ellipse at center 40%, transparent 10%, ${DARK} 90%)`,
        zIndex: 1
      }} />

      {/* Single Hero Image (Full Bleed) */}
      {imageToUse && (
        <div style={{
          position: 'absolute', inset: 0,
          zIndex: 0
        }}>
          <Img 
            src={imgSrc(episodeName, imageToUse)}
            style={{
              width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 20%',
              filter: 'grayscale(15%) contrast(1.15) brightness(1.2)',
            }} 
          />
          {/* Gradient mask for text readability (Top and Bottom) */}
          <div style={{
            position: 'absolute', inset: 0,
            background: `linear-gradient(to bottom, rgba(9,8,7,0.9) 0%, rgba(9,8,7,0.4) 25%, transparent 50%, transparent 70%, rgba(9,8,7,0.8) 100%)`
          }} />
        </div>
      )}

      {/* Typography Area (Restored to top) */}
      <div style={{
        position: 'absolute', top: 140, left: 60, right: 60,
        display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
        zIndex: 2,
        fontFamily: FONT.sans, textShadow: '0 4px 12px rgba(0,0,0,0.8)'
      }}>
        {/* Series Badge / Kicker */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '12px 40px',
          border: `2px solid ${GOLD}60`,
          borderRadius: 100,
          backgroundColor: `${GOLD}1A`,
          backdropFilter: 'blur(8px)',
          fontSize: 40, fontWeight: 800, color: GOLD,
          letterSpacing: '0.3em', marginBottom: 40,
          textShadow: 'none',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
        }}>
          세력도감
        </div>

        {/* Title */}
        <h1 style={{
          fontSize: 110, fontWeight: 900, color: '#fff',
          lineHeight: 1.1, margin: 0,
          wordBreak: 'keep-all', letterSpacing: '-0.03em'
        }}>
          {script.title.replace(/\n/g, ' ')}
        </h1>
      </div>

      {/* Footer Branding */}
      <div style={{
        position: 'absolute', bottom: 80, left: 0, right: 0,
        textAlign: 'center', zIndex: 2,
        fontFamily: FONT.serif,
        fontSize: 36, fontWeight: 700, color: GOLD,
        letterSpacing: '0.4em', opacity: 0.8
      }}>
        FEEL<span style={{ color: '#ffffff' }}>&amp;</span>NOTE
      </div>
    </AbsoluteFill>
  )
}
