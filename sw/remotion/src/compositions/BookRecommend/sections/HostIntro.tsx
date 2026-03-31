import { Img, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import type { CelebHost, VoiceTimingSegment } from '../types'
import { Typewriter } from './Typewriter'
import { FONT } from '../fonts'
import { toAudioFrames, CELEB_VISUAL_DELAY, f, FPS } from '../timing'
import { SpeakingIndicator } from './SpeakingIndicator'
import { SUBTITLE_COLOR, SUBTITLE_STYLE, CELEB_VOICE_COLOR, CELEB_VOICE_HIGHLIGHT, CELEB_VOICE_FONT_SIZE, CELEB_VOICE_BORDER, CELEB_VOICE_PADDING_LEFT, paginateSentences, slicePageTimings } from '../utils'

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
  /** 감상철학 오디오 URL (SpeakingIndicator 파형용) */
  philosophyAudioSrc?: string
  locale?: 'ko' | 'en'
}

/**
 * Sections 1+2 통합 — 좌우 레이아웃
 * 좌측: 아바타 (항상 유지)
 * 우측 Phase 1: "서재 탐방" + 이름 + biography (나레이터)
 * 우측 Phase 2: 감상철학 (셀럽 본인)
 */
export const HostIntro: React.FC<Props> = ({ host, narratorText, celebIntroFrames, totalFrames, narratorDuration, philosophyDuration, narratorTimings, philosophyTimings, philosophyAudioSrc, locale }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const inPhase1 = frame < celebIntroFrames
  const phase2Local = frame - celebIntroFrames
  const phase2Frames = totalFrames - celebIntroFrames

  // --- 감상철학 멀티페이지 ---
  const PHILO_LINE_H = 44 * 1.8
  const PHILO_CPL = locale === 'en' ? 40 : 22
  const PHILO_VISIBLE_H = 620
  const PHILO_LINES = Math.floor(PHILO_VISIBLE_H / PHILO_LINE_H)
  const PHILO_MAX_CHARS = PHILO_LINES * PHILO_CPL
  const FLIP_F = f(0.4)
  const CL = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const }

  const philoText = host.philosophy ?? ''
  const { pages: philoPages, ranges: philoRanges } = paginateSentences(philoText, PHILO_MAX_CHARS, philosophyTimings)
  const philoPT = slicePageTimings(philoRanges, philosophyTimings)
  const philoStart = celebIntroFrames + f(1)
  const philoSpread = toAudioFrames(philosophyDuration)

  // --- 등장 애니메이션 ---
  const avatarEnter = spring({ frame: Math.max(0, frame - f(0.17)), fps, config: { damping: 14, stiffness: 160 } })
  const avatarY = interpolate(frame, [0, f(0.5)], [30, 0], { extrapolateRight: 'clamp' })
  const infoOpacity = interpolate(frame, [f(0.5), f(1)], [0, 1], { extrapolateRight: 'clamp' })
  const bioTextOpacity = interpolate(frame, [CELEB_VISUAL_DELAY, CELEB_VISUAL_DELAY + f(0.67)], [0, 1], { extrapolateRight: 'clamp' })

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
      {/* 메인 레이아웃: 좌측 아바타 + 우측 정보 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '140px 90px 108px',
          gap: 70,
        }}
      >
        {/* ===== 좌측: 아바타 (항상 유지) ===== */}
        <div
          style={{
            flexShrink: 0,
            opacity: avatarEnter,
            transform: `translateY(${avatarY}px) scale(${avatarEnter})`,
          }}
        >
          <div style={{ position: 'relative', width: 400, height: 400 }}>
            <div
              style={{
                width: 400,
                height: 400,
                borderRadius: '50%',
                overflow: 'hidden',
                border: '3px solid #c8a46e',
                backgroundColor: 'rgba(30,24,16,0.9)',
                boxShadow: '0 25px 70px rgba(0,0,0,0.6), 0 0 40px rgba(200,164,110,0.15)',
              }}
            >
              <Img src={host.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            {phase2FadeIn > 0 && <SpeakingIndicator size={48} opacity={phase2FadeIn} audioSrc={philosophyAudioSrc} audioStartFrame={celebIntroFrames + f(1)} />}
          </div>
        </div>

        {/* ===== 우측: 인물 정보(유지) + 화자 영역(전환) ===== */}
        <div style={{ flex: 1, maxWidth: 1020, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          {/* 인물 메타 정보 — 항상 표시 */}
          <div style={{ opacity: infoOpacity }}>
            <div style={{ ...SUBTITLE_STYLE, fontSize: 34, marginBottom: 8 }}>
              {host.title}
            </div>
            <div
              style={{
                color: '#e8e0d0',
                fontSize: 82,
                fontWeight: 700,
                fontFamily: FONT.sans,
                lineHeight: 1.3,
                marginBottom: 6,
              }}
            >
              {host.nickname}
            </div>
            {locale !== 'en' && (
              <div style={{ ...SUBTITLE_STYLE, fontSize: 36, marginBottom: 22 }}>
                {host.nickname_en}
              </div>
            )}
            <div
              style={{
                width: interpolate(frame, [f(0.83), f(1.5)], [0, 500], { extrapolateRight: 'clamp' }),
                height: 1,
                backgroundColor: '#c8a46e',
                opacity: 0.3,
                marginBottom: 24,
              }}
            />
          </div>

          {/* 화자 영역 — 나레이터 bio / 셀럽 감상철학 크로스페이드 (grid 겹침) */}
          <div style={{ display: 'grid' }}>
            {/* Phase 1: 나레이터 biography — 항상 렌더링하여 공간 확보 (레이아웃 점프 방지) */}
            <div style={{ gridRow: 1, gridColumn: 1, opacity: phase1TextOpacity, fontFamily: FONT.sans }}>
              <Typewriter
                text={narratorText}
                startFrame={CELEB_VISUAL_DELAY}
                spreadFrames={toAudioFrames(narratorDuration)}
                color="#ccc"
                fontSize={42}
                style={{ lineHeight: 1.8 }}
                timings={narratorTimings}
              />
            </div>

            {/* Phase 2: 셀럽 감상철학 (멀티페이지) */}
            {phase2FadeIn > 0 && (
              <div style={{ gridRow: 1, gridColumn: 1, opacity: phase2FadeIn }}>
                <div style={{ borderLeft: CELEB_VOICE_BORDER, paddingLeft: CELEB_VOICE_PADDING_LEFT, fontFamily: FONT.serif }}>
                  {(philoPages.length === 1 || philoSpread <= 0) ? (
                    <Typewriter
                      text={philoText}
                      startFrame={philoStart}
                      spreadFrames={philoSpread}
                      color={CELEB_VOICE_COLOR}
                      highlightColor={CELEB_VOICE_HIGHLIGHT}
                      fontSize={CELEB_VOICE_FONT_SIZE}
                      style={{ lineHeight: 1.8 }}
                      timings={philosophyTimings}
                    />
                  ) : (
                    <div style={{ position: 'relative' }}>
                      {philoPages.map((pt, pi) => {
                        const ppt = philoPT?.[pi]
                        const cb = philoPages.slice(0, pi).reduce((s, p) => s + p.length, 0)
                        const ratio = cb / philoText.length
                        const endRatio = (cb + pt.length) / philoText.length
                        const ps = ppt ? philoStart + Math.round(ppt.absStart * FPS) : philoStart + Math.round(philoSpread * ratio)
                        const pe = ppt ? philoStart + Math.round(ppt.absEnd * FPS) : philoStart + Math.round(philoSpread * endRatio)
                        const isFirst = pi === 0, isLast = pi === philoPages.length - 1
                        const pIn = isFirst ? 1 : interpolate(frame, [ps - FLIP_F, ps], [0, 1], CL)
                        const pOut = isLast ? 1 : interpolate(frame, [pe, pe + FLIP_F], [1, 0], CL)
                        const op = Math.min(pIn, pOut)
                        const xIn = isFirst ? 0 : interpolate(frame, [ps - FLIP_F, ps], [80, 0], CL)
                        const xOut = isLast ? 0 : interpolate(frame, [pe, pe + FLIP_F], [0, -80], CL)
                        if (op <= 0 && pi > 0) return null
                        return (
                          <div key={pi} style={{
                            position: pi === 0 ? 'relative' as const : 'absolute' as const,
                            top: pi === 0 ? undefined : 0, left: 0, right: 0,
                            opacity: Math.max(op, 0), transform: `translateX(${xIn + xOut}px)`,
                          }}>
                            <Typewriter text={pt} startFrame={ps} spreadFrames={pe - ps} color={CELEB_VOICE_COLOR} highlightColor={CELEB_VOICE_HIGHLIGHT} fontSize={CELEB_VOICE_FONT_SIZE} style={{ lineHeight: 1.8 }} timings={ppt?.timings} />
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
