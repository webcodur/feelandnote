/**
 * BookRecommendShort — 쇼츠(9:16)
 *
 * 세그먼트 배열로 구성. 나레이션이 흐르고 비주얼이 따라간다.
 * 각 세그먼트의 visual 타입에 따라 화면이 결정된다:
 *   hook  — 아바타 + 훅 텍스트
 *   intro — 아바타 + 이름 + 자막
 *   book  — 책 표지 + 자막
 *   cta   — 셀럽 대사 + 로고
 *
 * @see docs/project/shorts-design.md
 */
import React, { useEffect } from 'react'
import { AbsoluteFill, Audio, getRemotionEnvironment, Img, prefetch, Sequence, Series, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import type { BookRecommendScript, ShortSegment } from './types'
import { safeImg, fadeInOut, BrandLogo, BRAND_LOGO_SIZE, sf, makeVf } from './utils'
import { FONT } from './fonts'
import { toFrames, SHORT_GAP, SHORT_FALLBACK, SHORT_BRAND_FRAMES, SHORT_LOGO_FRAMES, shortTotalFrames, FPS, f } from './timing'
import { KoreanTypewriter } from './KoreanTypewriter'
import { EPISODE_NAME, loadVoiceSelect, isVoiceReady } from './script'


/** 상단 20% = 384px, 하단 40% = 768px — 플랫폼 메타데이터 회피 */
const SAFE_TOP = 384
const SAFE_BOTTOM = 768
const SAFE_PAD = `${SAFE_TOP}px 80px ${SAFE_BOTTOM}px`

/** 쇼츠 아바타 크기 */
const AVATAR = 200
/** 아바타 공통 스타일 */
const avatarStyle = {
  width: AVATAR, height: AVATAR, borderRadius: '50%', overflow: 'hidden' as const,
  border: '3px solid rgba(200,164,110,0.35)',
  boxShadow: '0 16px 50px rgba(0,0,0,0.5)',
}
/** 쇼츠 책 표지 크기 */
const COVER = { w: 240, h: 360 } as const

/** 쇼츠 텍스트 크기 (1080×1920, 콘텐츠 영역 768px 기준) */
const SHORTS = {
  /** 훅 헤드라인 */
  headline: 56,
  /** 셀럽 이름 */
  name: 44,
  /** 영문명·메타 */
  meta: 22,
  /** 셀럽 독백·인용 (골드) */
  quote: 40,
  /** 나레이터 본문 */
  body: 38,
  /** 책 설명 (표지 아래) */
  caption: 30,
  /** CTA 나레이터 */
  cta: 36,
} as const

type Props = { script: BookRecommendScript; episodeName?: string }

export const calcShortTotalFrames = (script: BookRecommendScript) => {
  if (!script.shorts?.segments) return 300
  return shortTotalFrames(script.shorts.segments)
}

export const BookRecommendShort: React.FC<Props> = ({ script, episodeName }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const epName = episodeName ?? EPISODE_NAME
  const vf = makeVf(epName, loadVoiceSelect(epName))
  const { host, books } = script
  const hasVoice = isVoiceReady(script)
  const bi = script.shorts?.featuredBookIndex ?? 0
  const book = books[bi]
  const segments = script.shorts?.segments ?? []

  // --- 세그먼트별 타이밍 계산 ---
  const segTimings = segments.map(seg => {
    const dur = seg.duration ? toFrames(seg.duration) : SHORT_FALLBACK
    return dur
  })

  const segStarts: number[] = []
  let cursor = 0
  let brandStart = 0
  for (let i = 0; i < segTimings.length; i++) {
    segStarts.push(cursor)
    cursor += segTimings[i] + SHORT_GAP
    // hook(첫 세그먼트) 뒤에 BrandIntro 삽입
    if (i === 0) {
      brandStart = cursor
      cursor += SHORT_BRAND_FRAMES + SHORT_GAP
    }
  }
  const logoStart = cursor
  const total = cursor + SHORT_LOGO_FRAMES

  // --- 프리페치 ---
  useEffect(() => {
    if (!hasVoice) return
    const urls = [
      sf('sfx/whoosh.wav'), sf('sfx/chime.wav'),
      sf(`images/${epName}/book-${bi}-summary.png`),
      ...segments.map(seg => vf(`short-${seg.id}.wav`)),
    ]
    const cleanups = urls.map(u => {
      const { free } = prefetch(u, { method: 'blob-url', contentType: 'audio/wav' })
      return free
    })
    return () => cleanups.forEach(fn => fn())
  }, [segments.length, hasVoice])

  // --- 세그먼트 opacity ---
  const segOp = (i: number) => fadeInOut(frame, segStarts[i], segTimings[i])
  const logoOp = fadeInOut(frame, logoStart, SHORT_LOGO_FRAMES)

  // 책 표지 spring (book 비주얼 첫 등장 시)
  const bookSegIdx = segments.findIndex(s => s.visual === 'book')
  const bookStart = bookSegIdx >= 0 ? segStarts[bookSegIdx] : 0
  const coverScale = spring({
    frame: Math.max(0, frame - bookStart - f(0.1)), fps,
    config: { damping: 14, stiffness: 140 },
  })

  // --- 비주얼 렌더링 ---
  const renderVisual = (seg: ShortSegment, i: number) => {
    const op = segOp(i)
    if (op <= 0) return null

    const isCeleb = seg.role === 'celeb'
    const textColor = isCeleb ? '#c8a46e' : '#e8e0d0'

    switch (seg.visual) {
      case 'hook':
        return (
          <AbsoluteFill key={i} style={{
            opacity: op,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 32, padding: SAFE_PAD,
          }}>
            <div style={avatarStyle}>
              <Img src={host.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div style={{
              color: '#f0ece4', fontSize: SHORTS.headline, fontWeight: 800,
              fontFamily: FONT.serif, textAlign: 'center', lineHeight: 1.4,
            }}>
              {seg.text}
            </div>
          </AbsoluteFill>
        )

      case 'intro':
        return (
          <AbsoluteFill key={i} style={{
            opacity: op,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 20, padding: SAFE_PAD,
          }}>
            <div style={avatarStyle}>
              <Img src={host.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            {/* 이름 — narrator 세그먼트일 때만 */}
            {!isCeleb && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ color: '#e8e0d0', fontSize: SHORTS.name, fontWeight: 700, fontFamily: FONT.sans }}>
                  {host.nickname}
                </div>
                <div style={{ color: '#c8a46e', fontSize: 28, fontWeight: 700, fontFamily: FONT.cormorant, letterSpacing: 5 }}>
                  {host.nickname_en}
                </div>
              </div>
            )}
            <div style={{
              maxWidth: 860,
              ...(isCeleb ? { borderLeft: '4px solid rgba(200,164,110,0.4)', paddingLeft: 24 } : {}),
            }}>
              <KoreanTypewriter
                text={seg.text}
                startFrame={segStarts[i]}
                spreadFrames={seg.duration ? Math.ceil(seg.duration * FPS) : SHORT_FALLBACK}
                color={textColor}
                fontSize={isCeleb ? SHORTS.quote : SHORTS.body}
                style={{
                  fontFamily: isCeleb ? FONT.serif : FONT.sans,
                  fontWeight: isCeleb ? 700 : 400,
                  textAlign: isCeleb ? 'left' : 'center',
                  lineHeight: 1.7,
                }}
              />
            </div>
          </AbsoluteFill>
        )

      case 'book':
        return (
          <AbsoluteFill key={i} style={{
            opacity: op,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: SAFE_PAD,
          }}>
            <div style={{ transform: `scale(${coverScale})`, marginBottom: 24 }}>
              <div style={{
                width: COVER.w, height: COVER.h, borderRadius: 12, overflow: 'hidden',
                boxShadow: '0 24px 60px rgba(0,0,0,0.7), 0 0 50px rgba(200,164,110,0.1)',
              }}>
                <Img src={safeImg(book.thumbnail_url)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            </div>
            <div style={{ maxWidth: 880, textAlign: 'center' }}>
              <KoreanTypewriter
                text={seg.text}
                startFrame={segStarts[i]}
                spreadFrames={seg.duration ? Math.ceil(seg.duration * FPS) : SHORT_FALLBACK}
                color="#e8e0d0"
                fontSize={SHORTS.caption}
                style={{ fontFamily: FONT.sans, lineHeight: 1.8 }}
              />
            </div>
          </AbsoluteFill>
        )

      case 'cta':
        return (
          <AbsoluteFill key={i} style={{
            opacity: op,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 24, padding: SAFE_PAD,
          }}>
            {isCeleb && (
              <div style={avatarStyle}>
                <Img src={host.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            )}
            <div style={{ maxWidth: 860 }}>
              <KoreanTypewriter
                text={seg.text}
                startFrame={segStarts[i]}
                spreadFrames={seg.duration ? Math.ceil(seg.duration * FPS) : SHORT_FALLBACK}
                color={isCeleb ? '#c8a46e' : '#ccc'}
                fontSize={isCeleb ? SHORTS.quote : SHORTS.cta}
                style={{
                  fontFamily: isCeleb ? FONT.serif : FONT.sans,
                  fontWeight: isCeleb ? 700 : 400,
                  textAlign: 'center',
                  lineHeight: 1.65,
                }}
              />
            </div>
          </AbsoluteFill>
        )

      default:
        return null
    }
  }

  // --- 자막 (문장 단위) ---
  const BREATH = f(0.27)
  const currentSeg = segments.findIndex((_, i) =>
    frame >= segStarts[i] && frame < segStarts[i] + segTimings[i]
  )
  const subText = (() => {
    if (currentSeg < 0) return ''
    const seg = segments[currentSeg]
    const localFrame = frame - segStarts[currentSeg]
    const audioDur = seg.duration ? Math.ceil(seg.duration * FPS) : SHORT_FALLBACK
    const sentences = seg.text.split(/(?<=[.?!。,])\s+/).filter(Boolean)
    if (sentences.length <= 1) return seg.text
    const totalChars = sentences.reduce((sum, s) => sum + s.length, 0)
    const breathTotal = (sentences.length - 1) * BREATH
    const distributable = Math.max(audioDur - breathTotal, audioDur * 0.7)
    let cursor = 0
    for (const s of sentences) {
      const frames = Math.round((s.length / totalChars) * distributable)
      if (localFrame >= cursor && localFrame < cursor + frames + BREATH) return s
      cursor += frames + BREATH
    }
    return sentences[sentences.length - 1]
  })()

  return (
    <AbsoluteFill style={{ backgroundColor: '#0a0a0a' }}>
      {/* 배경 이미지 — 롱폼 summary 이미지 재활용 */}
      <Img src={sf(`images/${epName}/book-${bi}-summary.png`)} style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%',
        objectFit: 'cover', filter: 'brightness(0.4) saturate(0.6)',
      }} />
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 30%, rgba(26,21,16,0.3) 0%, rgba(10,10,10,0.6) 70%)' }} />

      {/* 오디오 — Series로 순차 배치 — 음성 미준비 시 통째로 스킵 */}
      {hasVoice && (
        <Series>
          {segments.map((seg, i) => (
            <React.Fragment key={seg.id}>
              <Series.Sequence durationInFrames={segTimings[i]} offset={i > 0 ? SHORT_GAP : 0}>
                {i === 0 && <Audio src={sf('sfx/whoosh.wav')} volume={0.1} />}
                <Audio src={vf(`short-${seg.id}.wav`)} />
              </Series.Sequence>
              {i === 0 && (
                <Series.Sequence durationInFrames={SHORT_BRAND_FRAMES} offset={SHORT_GAP}>
                  <Audio src={sf('sfx/chime.wav')} volume={0.5} />
                </Series.Sequence>
              )}
            </React.Fragment>
          ))}
          <Series.Sequence durationInFrames={SHORT_LOGO_FRAMES} offset={SHORT_GAP}>
            <Audio src={sf('sfx/chime.wav')} volume={0.5} />
          </Series.Sequence>
        </Series>
      )}
      {fadeInOut(frame, brandStart, SHORT_BRAND_FRAMES) > 0 && (
        <AbsoluteFill style={{
          opacity: fadeInOut(frame, brandStart, SHORT_BRAND_FRAMES),
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'flex-end',
          padding: `${SAFE_TOP}px 80px ${SAFE_BOTTOM + 120}px`,
        }}>
          {/* 제목 — 상단 강조 */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, marginBottom: 48 }}>
            <div style={{ color: '#c8a46e', fontSize: SHORTS.headline, fontWeight: 800, fontFamily: FONT.serif, textAlign: 'center', lineHeight: 1.4 }}>
              {host.nickname}의 서재를 함께한
            </div>
            <div style={{ color: '#e8e0d0', fontSize: SHORTS.headline + 8, fontWeight: 800, fontFamily: FONT.serif }}>
              {books.length}권의 책
            </div>
          </div>
          {/* 로고 — 하단 */}
          <BrandLogo fontSize={BRAND_LOGO_SIZE} />
        </AbsoluteFill>
      )}
      {/* 비주얼 */}
      {segments.map((seg, i) => renderVisual(seg, i))}

      {/* 로고 + 안내 문구 */}
      {logoOp > 0 && (
        <AbsoluteFill style={{
          opacity: logoOp,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: 32, padding: SAFE_PAD,
        }}>
          <BrandLogo fontSize={BRAND_LOGO_SIZE} />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div style={{ color: '#e8e0d0', fontSize: 26, fontFamily: FONT.sans, fontWeight: 600 }}>
              한 줄의 기록, 천 년의 울림
            </div>
            <div style={{ color: '#999', fontSize: 20, fontFamily: FONT.sans }}>
              더 많은 서재 탐방은 프로필에서
            </div>
          </div>
        </AbsoluteFill>
      )}

      {/* 스튜디오 전용 디버그 라벨 — 렌더 시 미포함 */}
      {!getRemotionEnvironment().isRendering && (() => {
        const brandActive = frame >= brandStart && frame < brandStart + SHORT_BRAND_FRAMES
        const logoActive = frame >= logoStart && frame < logoStart + SHORT_LOGO_FRAMES
        // 세그먼트 번호 (brand/logo 제외, 1부터)
        const segNum = currentSeg >= 0 ? currentSeg + 1 : 0
        const totalSegs = segments.length
        let label = '—'
        let sub = ''
        if (brandActive) {
          label = 'BRAND'
          sub = 'hook → intro 사이'
        } else if (logoActive) {
          label = 'LOGO'
          sub = '엔딩'
        } else if (currentSeg >= 0) {
          const seg = segments[currentSeg]
          const names: Record<string, string> = {
            hook: 'HOOK',
            intro: seg.role === 'celeb' ? '독백' : 'INTRO',
            book: 'BOOK',
            cta: 'CTA',
          }
          label = `${segNum}/${totalSegs}  ${names[seg.visual] ?? seg.visual}`
          sub = seg.role === 'celeb' ? '셀럽' : '나레이터'
        }
        return (
          <div style={{
            position: 'absolute', top: 24, right: 24, zIndex: 999,
            backgroundColor: 'rgba(0,0,0,0.85)', borderRadius: 10,
            padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 6,
          }}>
            <div style={{ color: '#c8a46e', fontSize: 36, fontFamily: 'monospace', fontWeight: 700 }}>
              {label}
            </div>
            {sub && <div style={{ color: '#aaa', fontSize: 24, fontFamily: 'monospace' }}>{sub}</div>}
          </div>
        )
      })()}

      {/* 하단 자막 */}
      {subText && (
        <div style={{
          position: 'absolute', bottom: SAFE_BOTTOM - 80, left: 60, right: 60,
          display: 'flex', justifyContent: 'center', zIndex: 50,
        }}>
          <div style={{
            backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: 12,
            padding: '12px 24px', maxWidth: 920,
          }}>
            <div style={{
              color: '#fff', fontSize: 32, fontWeight: 600,
              fontFamily: FONT.sans, textAlign: 'center',
              lineHeight: 1.55, textShadow: '0 2px 4px rgba(0,0,0,0.8)',
            }}>
              {subText}
            </div>
          </div>
        </div>
      )}
    </AbsoluteFill>
  )
}
