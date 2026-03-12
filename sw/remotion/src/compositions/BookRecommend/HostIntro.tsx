import { Img, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import type { CelebHost } from './types'
import { KoreanTypewriter } from './KoreanTypewriter'
import { FONT } from './fonts'

type Props = {
  host: CelebHost
  narratorText: string
  /** Section 1 프레임 수 (나레이터 셀럽 소개) */
  celebIntroFrames: number
  /** Section 1 + 2 합산 프레임 */
  totalFrames: number
}

/**
 * Sections 1+2 통합 컴포넌트
 * Phase 1: 나레이터 — "오늘의 인물" + 아바타 + 이름 + 자막
 * Phase 2: 셀럽 — 감상철학 타이핑
 */
export const HostIntro: React.FC<Props> = ({ host, narratorText, celebIntroFrames, totalFrames }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const inPhase1 = frame < celebIntroFrames
  const phase2Local = frame - celebIntroFrames
  const phase2Frames = totalFrames - celebIntroFrames

  // --- Phase 1: 순차 등장 (라벨 → 아바타 → 이름 → 자막) ---
  const labelOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' })

  const avatarScale = spring({ frame: Math.max(0, frame - 15), fps, config: { damping: 12, stiffness: 150 } })
  const avatarOpacity = interpolate(frame, [15, 30], [0, 1], { extrapolateRight: 'clamp' })

  const nameOpacity = interpolate(frame, [35, 50], [0, 1], { extrapolateRight: 'clamp' })
  const nameY = interpolate(frame, [35, 50], [25, 0], { extrapolateRight: 'clamp' })

  // 자막: 라벨+아바타+이름 충분히 노출된 후 (약 2.5초 후)
  const subtitleOpacity = interpolate(frame, [75, 90], [0, 1], { extrapolateRight: 'clamp' })

  // --- Phase 전환 ---
  const phase1FadeOut = !inPhase1
    ? interpolate(phase2Local, [0, 15], [1, 0], { extrapolateRight: 'clamp' })
    : 1
  const phase2FadeIn = !inPhase1
    ? interpolate(phase2Local, [10, 25], [0, 1], { extrapolateRight: 'clamp' })
    : 0

  // --- 전체 페이드아웃 ---
  const fadeOut = interpolate(frame, [totalFrames - 15, totalFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  return (
    <div style={{ position: 'absolute', inset: 0, opacity: fadeOut }}>
      {/* 메인 컨텐츠 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 24,
        }}
      >
        {/* "오늘의 인물" 라벨 — 타이핑 */}
        <div style={{ opacity: labelOpacity, fontFamily: FONT.sans }}>
          <KoreanTypewriter
            text="오늘의 인물"
            startFrame={5}
            spreadFrames={25}
            color="#c8a46e"
            fontSize={20}
            style={{ fontWeight: 600, letterSpacing: 6 }}
          />
        </div>

        {/* 아바타 */}
        <div
          style={{
            opacity: avatarOpacity,
            transform: `scale(${avatarScale})`,
          }}
        >
          <div
            style={{
              width: 260,
              height: 260,
              borderRadius: '50%',
              overflow: 'hidden',
              border: '3px solid #c8a46e',
              boxShadow: '0 0 60px rgba(200,164,110,0.25)',
            }}
          >
            <Img src={host.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        </div>

        {/* 이름 — 타이핑 */}
        <div
          style={{
            opacity: nameOpacity,
            transform: `translateY(${nameY}px)`,
            textAlign: 'center',
            fontFamily: FONT.sans,
          }}
        >
          <KoreanTypewriter
            text={host.nickname}
            startFrame={38}
            spreadFrames={30}
            color="#e8e0d0"
            fontSize={56}
            style={{ fontWeight: 700 }}
          />
          <div style={{ color: '#777', fontSize: 20, fontFamily: FONT.cormorant, marginTop: 4 }}>
            {host.nickname_en}
          </div>
          <div
            style={{
              color: '#c8a46e',
              fontSize: 16,
              fontFamily: FONT.sans,
              letterSpacing: 3,
              marginTop: 8,
              opacity: 0.8,
            }}
          >
            {host.title}
          </div>
        </div>

        {/* 감상철학 (Phase 2) */}
        {phase2FadeIn > 0 && (
          <div style={{ opacity: phase2FadeIn, maxWidth: 900, textAlign: 'center', marginTop: 16 }}>
            <div
              style={{
                width: interpolate(phase2Local, [5, 25], [0, 500], {
                  extrapolateLeft: 'clamp',
                  extrapolateRight: 'clamp',
                }),
                height: 1,
                backgroundColor: '#c8a46e',
                opacity: 0.4,
                margin: '0 auto 24px',
              }}
            />
            <div
              style={{
                color: '#c8a46e',
                fontSize: 14,
                fontWeight: 600,
                fontFamily: FONT.cinzel,
                letterSpacing: 4,
                marginBottom: 14,
              }}
            >
              VIEWING PHILOSOPHY
            </div>
            <div style={{ borderLeft: '3px solid rgba(200,164,110,0.4)', paddingLeft: 24, textAlign: 'left', fontFamily: FONT.serif }}>
              <KoreanTypewriter
                text={host.philosophy}
                startFrame={celebIntroFrames + 20}
                spreadFrames={phase2Frames - 60}
                color="#e8e0d0"
                fontSize={26}
                style={{ fontStyle: 'italic', lineHeight: 1.8 }}
              />
            </div>
          </div>
        )}
      </div>

      {/* 하단 자막 바 (Phase 1: 나레이터 스크립트) */}
      {inPhase1 && (
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '50px 160px',
            background: 'linear-gradient(transparent, rgba(0,0,0,0.85) 40%)',
            opacity: subtitleOpacity * phase1FadeOut,
            textAlign: 'center',
          }}
        >
          <div
            style={{
              color: '#e8e0d0',
              fontSize: 26,
              fontFamily: FONT.sans,
              lineHeight: 1.7,
            }}
          >
            {narratorText}
          </div>
        </div>
      )}
    </div>
  )
}
