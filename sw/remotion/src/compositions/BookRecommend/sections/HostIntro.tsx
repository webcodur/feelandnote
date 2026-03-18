import { Img, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import type { CelebHost, VoiceTimingSegment } from '../types'
import { KoreanTypewriter } from './KoreanTypewriter'
import { FONT } from '../fonts'
import { toAudioFrames, CELEB_VISUAL_DELAY, f } from '../timing'

type Props = {
  host: CelebHost
  narratorText: string
  /** Section 1 프레임 수 (나레이터 셀럽 소개) */
  celebIntroFrames: number
  /** Section 1 + 2 합산 프레임 */
  totalFrames: number
  /** 나레이터 소개 오디오 초 */
  narratorDuration: number
  /** 감상철학 오디오 초 */
  philosophyDuration: number
  /** 나레이터 소개 파형 타이밍 */
  narratorTimings?: VoiceTimingSegment[]
  /** 감상철학 파형 타이밍 */
  philosophyTimings?: VoiceTimingSegment[]
  locale?: 'ko' | 'en'
}

/**
 * Sections 1+2 통합 — 좌우 레이아웃
 * 좌측: 아바타 (항상 유지)
 * 우측 Phase 1: "서재 탐방" + 이름 + biography (나레이터)
 * 우측 Phase 2: 감상철학 (셀럽 본인)
 */
export const HostIntro: React.FC<Props> = ({ host, narratorText, celebIntroFrames, totalFrames, narratorDuration, philosophyDuration, narratorTimings, philosophyTimings, locale }) => {
  const libraryTourText = locale === 'en' ? 'Library Tour' : '서재 탐방'
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const inPhase1 = frame < celebIntroFrames
  const phase2Local = frame - celebIntroFrames
  const phase2Frames = totalFrames - celebIntroFrames

  // --- 등장 애니메이션 ---
  const avatarEnter = spring({ frame: Math.max(0, frame - f(0.17)), fps, config: { damping: 14, stiffness: 160 } })
  const avatarY = interpolate(frame, [0, f(0.5)], [30, 0], { extrapolateRight: 'clamp' })
  const infoOpacity = interpolate(frame, [f(0.5), f(1)], [0, 1], { extrapolateRight: 'clamp' })
  const bioTextOpacity = interpolate(frame, [f(1.33), f(1.83)], [0, 1], { extrapolateRight: 'clamp' })

  // --- Phase 전환: bio fadeOut → 감상철학 fadeIn ---
  const phase1TextOpacity = inPhase1
    ? bioTextOpacity
    : interpolate(phase2Local, [0, f(0.83)], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const phase2FadeIn = !inPhase1
    ? interpolate(phase2Local, [f(1), f(1.5)], [0, 1], { extrapolateRight: 'clamp' })
    : 0

  // --- 전체 페이드아웃 ---
  const fadeOut = interpolate(frame, [totalFrames - f(1), totalFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  return (
    <div style={{ position: 'absolute', inset: 0, opacity: fadeOut }}>
      {/* 상단 라벨 */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          padding: '40px 120px 0',
          opacity: interpolate(frame, [f(0.17), f(0.67)], [0, 1], { extrapolateRight: 'clamp' }),
        }}
      >
        <div style={{ fontFamily: FONT.sans }}>
          <KoreanTypewriter
            text={libraryTourText}
            startFrame={f(0.17)}
            spreadFrames={f(0.83)}
            color="#c8a46e"
            fontSize={16}
            style={{ fontWeight: 600, letterSpacing: 6 }}
          />
        </div>
      </div>

      {/* 메인 레이아웃: 좌측 아바타 + 우측 정보 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px 120px 0',
          gap: 80,
        }}
      >
        {/* ===== 좌측: 아바타 (항상 유지) ===== */}
        <div
          style={{
            flexShrink: 0,
            position: 'relative',
            opacity: avatarEnter,
            transform: `translateY(${avatarY}px) scale(${avatarEnter})`,
          }}
        >
          <div
            style={{
              width: 280,
              height: 280,
              borderRadius: '50%',
              overflow: 'hidden',
              border: '3px solid #c8a46e',
              boxShadow: '0 25px 70px rgba(0,0,0,0.6), 0 0 40px rgba(200,164,110,0.15)',
            }}
          >
            <Img src={host.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        </div>

        {/* ===== 우측: 인물 정보(유지) + 화자 영역(전환) ===== */}
        <div style={{ flex: 1, maxWidth: 850, display: 'flex', flexDirection: 'column' }}>
          {/* 인물 메타 정보 — 항상 표시 */}
          <div style={{ opacity: infoOpacity }}>
            <div style={{ color: '#c8a46e', fontSize: 18, fontFamily: FONT.sans, marginBottom: 6 }}>
              {host.title}
            </div>
            <div
              style={{
                color: '#e8e0d0',
                fontSize: 48,
                fontWeight: 700,
                fontFamily: FONT.sans,
                lineHeight: 1.3,
                marginBottom: 4,
              }}
            >
              {host.nickname}
            </div>
            {locale !== 'en' && (
              <div style={{ color: '#777', fontSize: 20, fontFamily: FONT.cormorant, marginBottom: 20 }}>
                {host.nickname_en}
              </div>
            )}
            <div
              style={{
                width: interpolate(frame, [f(0.83), f(1.5)], [0, 400], { extrapolateRight: 'clamp' }),
                height: 1,
                backgroundColor: '#c8a46e',
                opacity: 0.3,
                marginBottom: 24,
              }}
            />
          </div>

          {/* 화자 영역 — 나레이터 bio / 셀럽 감상철학 크로스페이드 */}
          <div style={{ position: 'relative', minHeight: 200 }}>
            {/* Phase 1: 나레이터 biography */}
            {phase1TextOpacity > 0 && (
              <div style={{ opacity: phase1TextOpacity, fontFamily: FONT.sans }}>
                <KoreanTypewriter
                  text={narratorText}
                  startFrame={CELEB_VISUAL_DELAY}
                  spreadFrames={toAudioFrames(narratorDuration)}
                  color="#ccc"
                  fontSize={22}
                  style={{ lineHeight: 1.8 }}
                  timings={narratorTimings}
                />
              </div>
            )}

            {/* Phase 2: 셀럽 감상철학 */}
            {phase2FadeIn > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  opacity: phase2FadeIn,
                }}
              >
                <div style={{ borderLeft: '3px solid rgba(200,164,110,0.4)', paddingLeft: 20, fontFamily: FONT.serif }}>
                  <KoreanTypewriter
                    text={host.philosophy ?? ''}
                    startFrame={celebIntroFrames + f(1)}
                    spreadFrames={toAudioFrames(philosophyDuration)}
                    color="#e8e0d0"
                    fontSize={24}
                    style={{ lineHeight: 1.8 }}
                    timings={philosophyTimings}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
