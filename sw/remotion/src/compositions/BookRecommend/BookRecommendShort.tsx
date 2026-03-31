/**
 * BookRecommendShort -- shorts (9:16)
 *
 * segment array driven. narration flows, visuals follow.
 * 2-column middle: left = text, right = avatar/cover crossfade.
 *
 * @see docs/project/remotion/shorts.md
 */
import React, { useEffect } from 'react'
import { AbsoluteFill, Audio, getRemotionEnvironment, Img, interpolate, prefetch, Sequence, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import type { BookRecommendScript } from './types'
import { fadeInOut, safeImg, sf, makeVf } from './utils'
import { DARK } from '../theme'
import { BrandShorts } from './sections/BrandIntro'
import { FONT } from './fonts'
import { SHORT_CTA_FRAMES, SHORT_LOGO_FRAMES, SHORT_REVEAL_FRAMES, shortTotalFrames, shortSegLayout, FPS, f } from './timing'
import { EPISODE_NAME, loadVoiceSelect, episodeDir } from './script'

import { ShortDevOverlay } from './studio/ShortDevOverlay'
import { SubEditor } from './studio/SubEditor'
import { t } from './i18n'
import { vnShort, vnTimingKey } from './voice-names'
import { ShortCaption } from './sections/ShortCaption'
import { Typewriter } from './sections/Typewriter'

/** safe zone */
/** 숏폼 배경 이미지 경로 — episodes/{status}/{person}/images/shorts-N.png */
const shortsImageBase = (epName: string) => {
  const person = epName.replace(/-en$/, '').replace(/-\d+(-en)?$/, '')
  const dir = episodeDir[epName] ?? episodeDir[person] ?? `todo/${person}`
  return `episodes/${dir}/images`
}

const SAFE_TOP = 230
const SAFE_BOTTOM = 400
const HEADER_H = Math.round((Math.round(SAFE_TOP * 1.5) + 140) * 0.8)
const W = 1080
const MID_H = 1920 - HEADER_H - SAFE_BOTTOM
const RIGHT_STRIP_W = 280
const CONTENT_PAD = 48
const SAFE_PAD = `60px ${CONTENT_PAD}px 40px`
const SERIES_BG = 'common/images/series-bg.jpg'
const REVEAL_BG = 'common/images/reveal-bg.jpg'
const CTA_BG = 'common/images/cta-bg.jpg'
const CL = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const }

type Props = { script: BookRecommendScript; episodeName?: string }

export const calcShortTotalFrames = (script: BookRecommendScript) => {
  if (!script.shorts?.segments) return 300
  return shortTotalFrames(script.shorts.segments)
}

export const BookRecommendShort: React.FC<Props> = ({ script, episodeName }) => {
  const frame = useCurrentFrame()
  const { fps, durationInFrames: compFrames } = useVideoConfig()
  const epName = episodeName ?? EPISODE_NAME
  const vf = makeVf(epName, loadVoiceSelect(epName), script.locale)
  const { host, books } = script
  const segments = script.shorts?.segments ?? []
  const hasVoice = segments.some(s => (s.duration ?? 0) > 0)
  const bi = script.shorts?.featuredBookIndex ?? 0
  const book = books[bi]
  const imgBase = shortsImageBase(epName)
  const revealBgUrl = script.shorts?.revealBg ? sf(`${imgBase}/${script.shorts.revealBg}`) : null
  const bookBgUrl = script.shorts?.bookBg ? sf(`${imgBase}/${script.shorts.bookBg}`) : null

  // --- segment timing (timing.ts SSoT) ---
  const { segTimings, segStarts, logoStart } = shortSegLayout(segments)

  // --- prefetch ---
  useEffect(() => {
    if (!hasVoice) return
    const urls = [
      sf('common/sfx/chime.wav'),
      ...(revealBgUrl ? [revealBgUrl] : []),
      ...(bookBgUrl ? [bookBgUrl] : []),
      ...segments.flatMap(seg => seg.image ? [sf(seg.image)] : []),
      ...segments.flatMap((seg, i) => (seg.duration && seg.visual !== 'cta') ? [vf(vnShort(i, seg.id))] : []),
    ]
    const cleanups = urls.map(u => {
      const { free } = prefetch(u, { method: 'blob-url', contentType: 'audio/wav' })
      return free
    })
    return () => cleanups.forEach(fn => fn())
  }, [segments.length, hasVoice])

  // --- helpers ---
  const segOp = (i: number) => {
    if (i === 0) {
      // 텍스트는 gap 끝 0.6초 전에 등장, 하이라이팅은 오디오와 동기
      const riseStart = segStarts[0] - f(0.6)
      const segEnd = segStarts[0] + segTimings[0]
      if (frame < riseStart || frame >= segEnd) return 0
      if (frame >= segEnd - f(0.5)) return (segEnd - frame) / f(0.5)
      return 1
    }
    return fadeInOut(frame, segStarts[i], segTimings[i])
  }
  const logoOp = fadeInOut(frame, logoStart, SHORT_LOGO_FRAMES)

  const bookSegIdx = segments.findIndex(s => s.visual === 'book')
  const bookStart = bookSegIdx >= 0 ? segStarts[bookSegIdx] : 0
  const coverScale = spring({
    frame: Math.max(0, frame - bookStart - f(0.1)), fps,
    config: { damping: 14, stiffness: 140 },
  })

  const currentSeg = segments.findIndex((_, i) =>
    frame >= segStarts[i] && frame < segStarts[i] + segTimings[i]
  )

  // --- 우측 스트립: 아바타 ↔ 포스터 교차 페이드 (CTA 전 사라짐) ---
  const bookIdx = segments.findIndex(s => s.visual === 'book')
  const ctaIdx = segments.findIndex(s => s.visual === 'cta')
  const stripEnd = ctaIdx >= 0 ? segStarts[ctaIdx] : logoStart
  const stripBookStart = bookIdx >= 0 ? segStarts[bookIdx] : Infinity
  const stripBookEnd = bookIdx >= 0 ? segStarts[bookIdx] + segTimings[bookIdx] : 0

  const introIdx = segments.findIndex(s => s.id === 'intro')
  const stripAvatarOp = (() => {
    const fadeOut = interpolate(frame, [stripEnd - f(0.4), stripEnd], [1, 0], CL)
    // hook + intro 구간 숨김 — intro 끝나면 복귀
    const hideEnd = introIdx >= 0
      ? segStarts[introIdx] + segTimings[introIdx]
      : (segments[0] ? segStarts[0] + segTimings[0] : 0)
    const introHide = interpolate(frame,
      [hideEnd - f(0.3), hideEnd],
      [0, 1], CL)
    if (bookIdx >= 0) {
      const base = interpolate(frame, [0, f(0.6), stripBookStart - f(0.4), stripBookStart], [0, 1, 1, 0], CL)
      return Math.min(base, fadeOut, introHide)
    }
    return Math.min(interpolate(frame, [0, f(0.6)], [0, 1], CL), fadeOut, introHide)
  })()

  const stripPosterOp = bookIdx >= 0
    ? Math.min(
        interpolate(frame, [stripBookStart, stripBookStart + f(0.5), stripBookEnd - f(0.4), stripBookEnd], [0, 1, 1, 0], CL),
        interpolate(frame, [stripEnd - f(0.4), stripEnd], [1, 0], CL),
      )
    : 0

  // --- reveal ---
  const revealOp = interpolate(frame,
    [0, SHORT_REVEAL_FRAMES - f(0.3), SHORT_REVEAL_FRAMES],
    [1, 1, 0], CL,
  )

  return (
    <AbsoluteFill style={{ backgroundColor: DARK.base }}>
      {/* 중단 1열(텍스트) 배경 — gap부터 밝게 시작 → hook까지 어두워짐 → 마지막 콘텐츠 세그먼트와 함께 fade-out */}
      {(() => {
        const gapStart = SHORT_REVEAL_FRAMES
        const hookStart = segStarts[0] ?? gapStart
        const lastContentIdx = segments.reduce((last, s, i) => s.visual !== 'cta' ? i : last, -1)
        const contentEnd = lastContentIdx >= 0 ? segStarts[lastContentIdx] + segTimings[lastContentIdx] : logoStart
        const bgOp = interpolate(frame, [contentEnd - f(0.5), contentEnd], [1, 0], CL)
        if (bgOp <= 0) return null
        const bright = interpolate(frame, [gapStart, hookStart], [0.8, 0.42], CL)
        const sat = interpolate(frame, [gapStart, hookStart], [0.9, 0.65], CL)
        // 셀럽 인용구 구간 — 배경 명도/채도 감소
        const celebDim = segments.reduce((d, s, i) => (s.role === 'celeb' || s.visual === 'hook') ? Math.max(d, segOp(i)) : d, 0)
        const imgBright = interpolate(celebDim, [0, 1], [1, 0.35], CL)
        const imgSat = interpolate(celebDim, [0, 1], [1, 0.5], CL)
        const dimFilter = celebDim > 0 ? `brightness(${imgBright}) saturate(${imgSat})` : undefined
        return (
          <>
            {/* 배경 이미지 1 — hook~celeb-mid */}
            {(() => {
              const blend = bookSegIdx >= 0
                ? interpolate(frame, [segStarts[bookSegIdx] - f(0.3), segStarts[bookSegIdx] + f(0.2)], [1, 0], CL)
                : 1
              return (blend > 0 && revealBgUrl) ? (
                <Img src={revealBgUrl} style={{
                  position: 'absolute', top: HEADER_H, left: 0,
                  width: W, height: MID_H,
                  objectFit: 'cover',
                  filter: dimFilter,
                  zIndex: 1, opacity: bgOp * blend,
                }} />
              ) : null
            })()}
            {/* 배경 이미지 2 — book 구간 폴백. seg.image가 있으면 렌더 생략 */}
            {bookSegIdx >= 0 && !segments.some(s => s.visual === 'book' && s.image) && (() => {
              const blend = interpolate(frame, [segStarts[bookSegIdx] - f(0.3), segStarts[bookSegIdx] + f(0.2)], [0, 1], CL)
              return (blend > 0 && bookBgUrl) ? (
                <Img src={bookBgUrl} style={{
                  position: 'absolute', top: HEADER_H, left: 0,
                  width: W, height: MID_H,
                  objectFit: 'cover',
                  filter: dimFilter,
                  zIndex: 1, opacity: bgOp * blend,
                }} />
              ) : null
            })()}
            {/* seg.image — 같은 이미지를 쓰는 연속 구간을 그루핑 + imageChangeAt으로 세그먼트 내 전환 */}
            {(() => {
              const groups: { image: string; start: number }[] = []
              const push = (image: string, start: number) => {
                const last = groups[groups.length - 1]
                if (last && last.image === image) return
                groups.push({ image, start })
              }
              segments.forEach((seg, i) => {
                if (!seg.image || seg.visual !== 'book') return
                push(seg.image, segStarts[i])
                if (seg.imageChangeAt) {
                  const changes = Array.isArray(seg.imageChangeAt) ? seg.imageChangeAt : [seg.imageChangeAt]
                  for (const change of changes) {
                    push(change.image, segStarts[i] + f(change.t))
                  }
                }
              })
              return groups.map(({ image, start }, gi) => {
                const fadeIn = interpolate(frame, [start - f(0.3), start + f(0.2)], [0, 1], CL)
                // 다음 그룹이 완전히 올라오면 이전 그룹 숨김 (bgOp 페이드아웃 시 하위 레이어 비침 방지)
                const nextStart = gi < groups.length - 1 ? groups[gi + 1].start : null
                const fadeOut = nextStart != null ? interpolate(frame, [nextStart, nextStart + f(0.2)], [1, 0], CL) : 1
                const op = Math.min(bgOp, fadeIn, fadeOut)
                if (op <= 0) return null
                return (
                  <Img key={`${image}-${start}`} src={sf(image)} style={{
                    position: 'absolute', top: HEADER_H, left: 0,
                    width: W, height: MID_H,
                    objectFit: 'cover',
                    filter: dimFilter,
                    zIndex: 1, opacity: op,
                  }} />
                )
              })
            })()}
            <div style={{ position: 'absolute', top: HEADER_H, left: 0, width: W, height: MID_H, background: 'radial-gradient(ellipse at 50% 30%, rgba(26,21,16,0.3) 0%, rgba(10,10,10,0.6) 70%)', zIndex: 2, opacity: bgOp }} />
          </>
        )
      })()}

      {/* ── fixed header (top safe zone) ── */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: HEADER_H,
        background: DARK.surface,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '156px 60px 0',
        zIndex: 10,
      }}>
        <div style={{ color: '#e8e0d0', fontSize: script.locale === 'en' ? 68 : 88, fontWeight: 700, fontFamily: FONT.sans, textAlign: 'center', lineHeight: 1.3, textWrap: 'balance', wordBreak: 'keep-all' } as React.CSSProperties}>
          {t(script).headerTitle(host.title, host.nickname)}
        </div>
      </div>

      {/* ── fixed footer (bottom safe zone) ── */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: SAFE_BOTTOM,
        background: DARK.surface,
        zIndex: 10,
      }} />

      {/* audio — reveal chime */}
      <Sequence from={0} durationInFrames={SHORT_REVEAL_FRAMES}>
        <Audio src={sf('common/sfx/chime.wav')} volume={0.7} />
      </Sequence>
      {/* audio — segments (hook은 rise 중 겹쳐서 시작) */}
      {hasVoice && segments.map((seg, i) => {
        if (seg.visual === 'cta' || !seg.duration) return null
        const audioFrom = i === 0 ? segStarts[i] - f(0.15) : segStarts[i]
        return (
          <Sequence key={seg.id} from={audioFrom} durationInFrames={segTimings[i]}>
            <Audio src={vf(vnShort(i, seg.id))} />
          </Sequence>
        )
      })}
      {/* CTA chime — voice 없이 효과음만 */}
      {ctaIdx >= 0 && (
        <Sequence from={segStarts[ctaIdx]} durationInFrames={SHORT_CTA_FRAMES}>
          <Audio src={sf('common/sfx/chime.wav')} volume={0.5} />
        </Sequence>
      )}

      {/* ── 오프닝 리빌: 아바타 + 책 포스터 ── */}
      {revealOp > 0 && (() => {
        const beat1Scale = interpolate(frame, [0, f(0.8)], [1.06, 1], CL)
        return (
          <div style={{
            position: 'absolute', top: HEADER_H, left: 0, width: W, height: MID_H,
            zIndex: 8, opacity: revealOp, overflow: 'hidden',
          }}>
            <Img src={sf(REVEAL_BG)} style={{
              position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
              objectFit: 'cover', filter: 'brightness(0.35) saturate(0.5)',
            }} />
            <div style={{
              position: 'absolute', inset: 0,
              background: 'radial-gradient(ellipse 80% 70% at 50% 50%, transparent 30%, rgba(6,4,2,0.7) 100%)',
            }} />
            {/* 책 포스터 */}
            <div style={{
              position: 'absolute',
              top: '50%', left: 420,
              transform: `translateY(-50%) rotate(-3deg) scale(${beat1Scale})`,
              zIndex: 1,
            }}>
              <div style={{
                width: 380, height: 570, borderRadius: 10, overflow: 'hidden',
                boxShadow: '0 24px 64px rgba(0,0,0,0.7), 0 0 0 1px rgba(200,164,110,0.15)',
              }}>
                <Img src={safeImg(book.thumbnail_url)} style={{
                  width: '100%', height: '100%', objectFit: 'cover',
                }} />
              </div>
            </div>
            {/* 아바타 — 원형 */}
            <div style={{
              position: 'absolute',
              top: '50%', left: 140,
              transform: `translateY(-38%) scale(${beat1Scale})`,
              zIndex: 2,
            }}>
              <div style={{
                position: 'absolute', inset: -6,
                borderRadius: '50%',
                background: DARK.surface,
                boxShadow: `0 0 20px 10px ${DARK.surface}`,
              }} />
              <div style={{
                position: 'relative',
                width: 380, height: 380,
                overflow: 'hidden',
                borderRadius: '50%',
                boxShadow: '0 16px 50px rgba(0,0,0,0.6)',
                border: '3px solid rgba(200,164,110,0.25)',
              }}>
                <Img src={host.avatar_url} style={{
                  width: '100%', height: '100%', objectFit: 'cover',
                  filter: 'brightness(0.9) contrast(1.05)',
                }} />
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── middle section — 2-column: text (left) + visual strip (right) ── */}
      {/* CTA 이전 세그먼트만 2컬럼 */}
      <div style={{
        position: 'absolute', top: HEADER_H, bottom: SAFE_BOTTOM,
        left: 0, right: 0, display: 'flex', zIndex: 5,
      }}>
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }} />

        {/* col 2: right visual strip — 아바타 ↔ 책포스터 교차 */}
        <div style={{
          width: RIGHT_STRIP_W, flexShrink: 0,
          background: 'transparent',
          position: 'relative', overflow: 'hidden',
        }}>
          {stripAvatarOp > 0 && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
              opacity: stripAvatarOp,
            }}>
              <div style={{ position: 'relative', margin: '20px auto 0' }}>
                <div style={{
                  position: 'absolute', inset: -6,
                  borderRadius: '50%',
                  background: DARK.surface,
                  boxShadow: `0 0 20px 10px ${DARK.surface}`,
                }} />
                <div style={{
                  position: 'relative',
                  width: RIGHT_STRIP_W - 40, height: RIGHT_STRIP_W - 40,
                  borderRadius: '50%', overflow: 'hidden',
                  border: '3px solid rgba(200,164,110,0.25)',
                  boxShadow: '0 16px 50px rgba(0,0,0,0.6)',
                }}>
                  <Img src={host.avatar_url} style={{
                    width: '100%', height: '100%', objectFit: 'cover',
                    filter: 'brightness(0.9) contrast(1.05)',
                  }} />
                </div>
              </div>
            </div>
          )}
          {stripPosterOp > 0 && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
              opacity: stripPosterOp,
            }}>
              <div style={{
                width: RIGHT_STRIP_W - 40, height: Math.round((RIGHT_STRIP_W - 40) * 1.5),
                margin: '20px auto 0',
                borderRadius: 12, overflow: 'hidden',
                transform: `scale(${coverScale})`, transformOrigin: 'top center',
                boxShadow: '0 12px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(200,164,110,0.15)',
                maskImage: 'linear-gradient(to bottom, black 75%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to bottom, black 75%, transparent 100%)',
              }}>
                <Img src={safeImg(book.thumbnail_url)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── intro 중앙 아바타 ── */}
      {introIdx >= 0 && (() => {
        const op = segOp(introIdx)
        if (op <= 0) return null
        return (
          <div style={{
            position: 'absolute',
            top: HEADER_H + Math.round((MID_H - 340) / 2),
            left: Math.round((W - 340) / 2),
            zIndex: 12,
            opacity: op,
          }}>
            <div style={{ position: 'relative' }}>
              <div style={{
                position: 'absolute', inset: -6,
                borderRadius: '50%',
                background: DARK.surface,
                boxShadow: `0 0 20px 10px ${DARK.surface}`,
              }} />
              <div style={{
                position: 'relative',
                width: 340, height: 340,
                borderRadius: '50%',
                overflow: 'hidden',
                border: '3px solid rgba(200,164,110,0.25)',
                boxShadow: '0 16px 50px rgba(0,0,0,0.6)',
              }}>
                <Img src={host.avatar_url} style={{
                  width: '100%', height: '100%', objectFit: 'cover',
                  filter: 'brightness(0.9) contrast(1.05)',
                }} />
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── 자막 (하단) ── */}
      {segments.map((seg, i) => {
        if (seg.visual === 'cta' || seg.visual === 'hook' || seg.role === 'celeb') return null
        const op = segOp(i)
        if (op <= 0) return null
        const timingKey = vnTimingKey(vnShort(i, seg.id))
        const capStart = i === 0 ? segStarts[i] - f(0.15) : segStarts[i]
        return (
          <div key={`cap-${i}`} style={{
            position: 'absolute',
            bottom: SAFE_BOTTOM + 60,
            left: CONTENT_PAD,
            right: CONTENT_PAD,
            zIndex: 20,
            opacity: op,
            display: 'flex',
            justifyContent: 'center',
          }}>
            <ShortCaption
              text={seg.text}
              startFrame={capStart}
              spreadFrames={segTimings[i]}
              timings={script.voiceTimings?.[timingKey]}
              locale={script.locale}
            />
          </div>
        )
      })}

      {/* ── 훅 텍스트 (화면 중앙) ── */}
      {segments.map((seg, i) => {
        if (seg.visual !== 'hook') return null
        const op = segOp(i)
        if (op <= 0) return null
        const timingKey = vnTimingKey(vnShort(i, seg.id))
        const timings = script.voiceTimings?.[timingKey]
        const hookSentences = seg.text.split(/(?<=[.?!。])\s+/).filter(Boolean)
        const hasTwo = hookSentences.length >= 2
        const hlStart = segStarts[i] - f(0.15)
        const spreadFrames = seg.duration ? Math.ceil(seg.duration * FPS) : 150

        let timings1 = timings
        let timings2: typeof timings
        if (hasTwo && timings && timings.length > 1) {
          let acc = ''
          let splitIdx = timings.length
          for (let ti = 0; ti < timings.length; ti++) {
            if (ti > 0) acc += ' '
            acc += timings[ti].text ?? ''
            if (acc.length >= hookSentences[0].length) { splitIdx = ti + 1; break }
          }
          timings1 = timings.slice(0, splitIdx)
          timings2 = timings.slice(splitIdx)
        }

        const riseStart = segStarts[i] - f(0.6)
        const elapsed = frame - riseStart
        const riseOp = interpolate(elapsed, [0, f(0.6)], [0, 1], CL)
        const riseY = interpolate(elapsed, [0, f(0.6)], [30, 0], CL)

        return (
          <div key={`hook-${i}`} style={{
            position: 'absolute',
            top: HEADER_H, bottom: SAFE_BOTTOM,
            left: 0, right: 0,
            zIndex: 15,
            opacity: op,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 24,
            padding: `0 ${CONTENT_PAD}px`,
          }}>
            {hasTwo ? (
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
                opacity: riseOp, transform: `translateY(${riseY}px)`,
              }}>
                <div style={{ maxWidth: 780, textAlign: 'center', textWrap: 'balance', wordBreak: 'keep-all' } as React.CSSProperties}>
                  <Typewriter
                    text={hookSentences[0]}
                    startFrame={hlStart}
                    spreadFrames={spreadFrames}
                    color="#c8a46e"
                    highlightColor="#f5e6c8"
                    fontSize={72}
                    style={{ fontFamily: FONT.serif, fontWeight: 800, textAlign: 'center', lineHeight: 1.4 }}
                    timings={timings1}
                  />
                </div>
                <div style={{ width: 60, height: 2, backgroundColor: '#c8a46e', opacity: 0.3 }} />
                <div style={{ maxWidth: 780, textAlign: 'center', textWrap: 'balance', wordBreak: 'keep-all' } as React.CSSProperties}>
                  <Typewriter
                    text={hookSentences.slice(1).join(' ')}
                    startFrame={hlStart}
                    spreadFrames={spreadFrames}
                    color="#cec6b6"
                    fontSize={52}
                    style={{ fontFamily: FONT.sans, fontWeight: 500, textAlign: 'center', lineHeight: 1.6, letterSpacing: '0.01em' }}
                    timings={timings2}
                  />
                </div>
              </div>
            ) : (
              <div style={{
                maxWidth: 780, textAlign: 'center', textWrap: 'balance',
                opacity: riseOp, transform: `translateY(${riseY}px)`,
              } as React.CSSProperties}>
                <Typewriter
                  text={seg.text}
                  startFrame={hlStart}
                  spreadFrames={spreadFrames}
                  color="#c8a46e"
                  highlightColor="#f5e6c8"
                  fontSize={68}
                  style={{ fontFamily: FONT.serif, fontWeight: 800, textAlign: 'center', lineHeight: 1.5 }}
                  timings={timings}
                />
              </div>
            )}
          </div>
        )
      })}

      {/* ── 셀럽 인용구 (화면 중앙) ── */}
      {segments.map((seg, i) => {
        if (seg.role !== 'celeb') return null
        const op = segOp(i)
        if (op <= 0) return null
        return (
          <div key={`quote-${i}`} style={{
            position: 'absolute',
            top: HEADER_H, bottom: SAFE_BOTTOM,
            left: 0, right: 0,
            zIndex: 15,
            opacity: op,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: `0 ${CONTENT_PAD + 16}px`,
            paddingRight: `${CONTENT_PAD + 16 + 120}px`,
          }}>
            <div style={{
              maxWidth: 780,
              borderLeft: '4px solid rgba(200,164,110,0.4)',
              paddingLeft: 24,
            }}>
              <Typewriter
                text={seg.text}
                startFrame={segStarts[i]}
                spreadFrames={segTimings[i]}
                color="#c8a46e"
                highlightColor="#f5e6c8"
                fontSize={54}
                style={{
                  fontFamily: FONT.serif,
                  fontWeight: 700,
                  textAlign: 'left',
                  lineHeight: 1.7,
                  wordBreak: 'keep-all',
                }}
                timings={script.voiceTimings?.[vnTimingKey(vnShort(i, seg.id))]}
              />
            </div>
          </div>
        )
      })}

      {/* ══ CTA + Logo — 전폭, 공유 배경 ══ */}
      {(() => {
        const ctaStart = ctaIdx >= 0 ? segStarts[ctaIdx] : logoStart
        const endFrame = logoStart + SHORT_LOGO_FRAMES
        const blockOp = interpolate(frame,
          [ctaStart - f(0.15), ctaStart],
          [0, 1], CL,
        )
        if (blockOp <= 0) return null

        const ctaContentOp = ctaIdx >= 0
          ? interpolate(frame,
              [ctaStart, ctaStart + f(0.5), logoStart - f(0.5), logoStart],
              [0, 1, 1, 0], CL)
          : 0
        const logoContentOp = interpolate(frame,
          [logoStart - f(0.3), logoStart + f(0.3), endFrame - f(0.5), endFrame],
          [0, 1, 1, 0], CL)

        const bgZoom = interpolate(frame, [ctaStart, endFrame], [1, 1.06], CL)

        // CTA 텍스트는 i18n 단일원천 — line1 / pillPrefix ▶ [label] / after 3줄
        const ctaText = t(script).ctaDefault
        const line1 = ctaText.split('[')[0].trim()
        const label = ctaText.split('[')[1]?.split(']')[0] ?? ''
        const rawAfter = ctaText.split(']')[1] ?? ''
        const pillSuffix = rawAfter.match(/^\S*/)?.[0] ?? ''
        const line3 = rawAfter.slice(pillSuffix.length).trim()

        const ctaLocal = ctaIdx >= 0 ? frame - segStarts[ctaIdx] : 0
        const bounce = interpolate(
          ctaLocal % f(1.2), [0, f(0.6), f(1.2)], [0, 6, 0], CL,
        )

        return (
          <div style={{
            position: 'absolute', top: HEADER_H, left: 0,
            width: W, height: MID_H,
            zIndex: 30, overflow: 'hidden',
            opacity: blockOp,
            backgroundColor: DARK.surface,
          }}>
            {/* CTA 배경 — 책에서 피어오르는 연출 */}
            {ctaContentOp > 0 && (
              <Img src={sf(CTA_BG)} style={{
                position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                objectFit: 'cover', filter: 'brightness(0.45) saturate(0.6)',
                transform: `scale(${bgZoom})`,
                opacity: ctaContentOp,
              }} />
            )}
            {/* Logo 배경 */}
            {logoContentOp > 0 && (
              <Img src={sf(SERIES_BG)} style={{
                position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                objectFit: 'cover', filter: 'brightness(0.45) saturate(0.6)',
                transform: `scale(${bgZoom})`,
                opacity: logoContentOp,
              }} />
            )}
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'radial-gradient(ellipse at 50% 50%, transparent 30%, rgba(10,10,10,0.6) 80%)' }} />

            {/* CTA 콘텐츠 */}
            {ctaContentOp > 0 && (
              <div style={{
                position: 'absolute', inset: 0, zIndex: 1,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 36, opacity: ctaContentOp,
              }}>
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24,
                  fontFamily: FONT.sans, textAlign: 'center',
                }}>
                  {line1 && (
                    <div style={{ fontSize: 36, color: 'rgba(232,224,208,0.7)', fontWeight: 500 }}>
                      {line1}
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 40, fontWeight: 600 }}>
                    <div style={{
                      width: 0, height: 0,
                      borderTop: '14px solid transparent',
                      borderBottom: '14px solid transparent',
                      borderLeft: '22px solid #c8a46e',
                    }} />
                    <span style={{ color: '#c8a46e', fontWeight: 700 }}>[{label}]</span>
                    {pillSuffix && <span style={{ color: 'rgba(232,224,208,0.7)' }}>{pillSuffix}</span>}
                  </div>
                  {line3 && (
                    <div style={{ fontSize: 36, color: 'rgba(232,224,208,0.7)', fontWeight: 500 }}>
                      {line3}
                    </div>
                  )}
                </div>
                {/* 하단 화살표 */}
                <div style={{
                  opacity: 0.6,
                  transform: `translateY(${bounce}px)`,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                }}>
                  {[0, 1].map(i => (
                    <div key={i} style={{
                      width: 0, height: 0,
                      borderLeft: '12px solid transparent',
                      borderRight: '12px solid transparent',
                      borderTop: `12px solid rgba(200,164,110,${0.5 - i * 0.2})`,
                    }} />
                  ))}
                </div>
              </div>
            )}

            {/* Logo — CTA 위에 크로스페이드 */}
            {logoContentOp > 0 && (
              <BrandShorts
                script={script}
                durationFrames={SHORT_LOGO_FRAMES}
                opacity={logoContentOp}
                scale={1.4}
                style={{ padding: `${CONTENT_PAD}px`, zIndex: 2 }}
              />
            )}
          </div>
        )
      })()}

      {/* studio-only dev overlay */}
      {!getRemotionEnvironment().isRendering && (
        <ShortDevOverlay
          frame={frame}
          totalFrames={compFrames}
          logoStart={logoStart}
          logoFrames={SHORT_LOGO_FRAMES}
          currentSeg={currentSeg}
          segments={segments}
          segStarts={segStarts}
          segTimings={segTimings}
          voiceTimings={script.voiceTimings}
        />
      )}
      {!getRemotionEnvironment().isRendering && (
        <SubEditor
          voiceTimings={script.voiceTimings}
          episodeName={epName}
          locale={script.locale ?? 'ko'}
          currentTimingKey={currentSeg >= 0 ? vnTimingKey(vnShort(currentSeg, segments[currentSeg].id)) : undefined}
        />
      )}
    </AbsoluteFill>
  )
}
