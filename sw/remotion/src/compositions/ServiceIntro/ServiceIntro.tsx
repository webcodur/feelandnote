import { AbsoluteFill, Sequence, interpolate, useCurrentFrame } from 'remotion'
import { scenes } from './types'
import { SceneText } from './SceneText'
import { AvatarGrid } from './AvatarGrid'
import { Particles } from './Particles'
import { SwordAndScroll } from './visuals/SwordAndScroll'
import { TombScene } from './visuals/TombScene'
import { LetterScene } from './visuals/LetterScene'
import { UIPreview } from './visuals/UIPreview'
import { BookShelf } from './visuals/BookShelf'
import { LogoReveal } from './visuals/LogoReveal'
import { OrnamentFrame } from './visuals/OrnamentFrame'

const sceneBg: Record<string, string> = {
  hook: 'radial-gradient(ellipse at 50% 55%, #1a1510 0%, #08060a 70%)',
  quote: 'radial-gradient(ellipse at 40% 45%, #14100c 0%, #060608 70%)',
  philosophy: 'radial-gradient(ellipse at 60% 50%, #120e0a 0%, #06060a 70%)',
  bridge: 'radial-gradient(ellipse at 50% 50%, #0e0e10 0%, #060606 80%)',
  scale: 'radial-gradient(ellipse at 50% 45%, #0f0d08 0%, #040404 70%)',
  connect: 'radial-gradient(ellipse at 50% 55%, #18140e 0%, #08060a 70%)',
  cta: '#0a0a0a',
}

const particleColor: Record<string, string> = {
  hook: '200, 164, 110',
  quote: '180, 160, 120',
  philosophy: '160, 140, 110',
  bridge: '120, 120, 130',
  scale: '200, 164, 110',
  connect: '200, 170, 120',
  cta: '200, 164, 110',
}

/** 장면별 비주얼 요소 매핑 */
const sceneVisuals: Record<string, React.FC> = {
  hook: SwordAndScroll,
  quote: TombScene,
  philosophy: LetterScene,
  bridge: UIPreview,
  connect: BookShelf,
  cta: LogoReveal,
}

const SceneRenderer: React.FC<{ sceneIndex: number }> = ({ sceneIndex }) => {
  const scene = scenes[sceneIndex]
  const frame = useCurrentFrame()

  // 전환 효과
  let transitionIn = 1
  if (scene.transition === 'fade') {
    transitionIn = interpolate(frame, [0, 40], [0, 1], { extrapolateRight: 'clamp' })
  } else if (scene.transition === 'dissolve') {
    transitionIn = interpolate(frame, [0, 25], [0, 1], { extrapolateRight: 'clamp' })
  }

  const Visual = sceneVisuals[scene.id]

  return (
    <AbsoluteFill style={{ opacity: transitionIn }}>
      {/* 배경 */}
      <AbsoluteFill style={{ background: sceneBg[scene.id] || '#0a0a0a' }} />

      {/* Neo-Pantheon 격자 */}
      <AbsoluteFill
        style={{
          backgroundImage:
            'linear-gradient(rgba(200,164,110,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(200,164,110,0.015) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      {/* 비네트 */}
      <AbsoluteFill
        style={{
          background: 'radial-gradient(ellipse at center, transparent 20%, rgba(0,0,0,0.6) 100%)',
        }}
      />

      {/* 파티클 */}
      <Particles
        count={scene.id === 'cta' ? 20 : scene.id === 'scale' ? 12 : 30}
        color={particleColor[scene.id]}
      />

      {/* 장면별 비주얼 요소 */}
      {Visual && <Visual />}

      {/* 규모 장면: 아바타 그리드 */}
      {scene.id === 'scale' && <AvatarGrid durationFrames={scene.durationFrames} />}

      {/* 장식 프레임 (hook, quote, cta에 표시) */}
      {['hook', 'quote', 'cta'].includes(scene.id) && <OrnamentFrame delay={scene.id === 'cta' ? 10 : 5} />}

      {/* 텍스트 */}
      <SceneText scene={scene} />
    </AbsoluteFill>
  )
}

export const ServiceIntro: React.FC = () => {
  let cursor = 0

  return (
    <AbsoluteFill style={{ backgroundColor: '#0a0a0a' }}>
      {scenes.map((scene, i) => {
        const from = cursor
        cursor += scene.durationFrames
        return (
          <Sequence key={scene.id} from={from} durationInFrames={scene.durationFrames}>
            <SceneRenderer sceneIndex={i} />
          </Sequence>
        )
      })}
    </AbsoluteFill>
  )
}
