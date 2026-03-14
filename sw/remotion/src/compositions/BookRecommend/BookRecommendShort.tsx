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
import { AbsoluteFill, Audio, Img, interpolate, prefetch, Sequence, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import type { BookRecommendScript, ShortSegment } from './types'
import { safeImg, fadeInOut, BrandLogo, sf, makeVf } from './utils'
import { FONT } from './fonts'
import { toFrames, SHORT_GAP, SHORT_FALLBACK, SHORT_BRAND_FRAMES, SHORT_LOGO_FRAMES, shortTotalFrames } from './timing'
import { EPISODE_NAME, loadVoiceSelect } from './script'


const CL = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const }

/** 상단 20% = 384px, 하단 40% = 768px — 플랫폼 메타데이터 회피 */
const SAFE_TOP = 384
const SAFE_BOTTOM = 768
const SAFE_PAD = `${SAFE_TOP}px 80px ${SAFE_BOTTOM}px`

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
  body: 32,
  /** 책 설명 (표지 아래) */
  caption: 30,
  /** CTA 나레이터 */
  cta: 36,
  /** 로고 */
  logo: 42,
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
  }, [segments.length])

  // --- 세그먼트 opacity ---
  const segOp = (i: number) => fadeInOut(frame, segStarts[i], segTimings[i])
  const logoOp = fadeInOut(frame, logoStart, SHORT_LOGO_FRAMES)

  // 책 표지 spring (book 비주얼 첫 등장 시)
  const bookSegIdx = segments.findIndex(s => s.visual === 'book')
  const bookStart = bookSegIdx >= 0 ? segStarts[bookSegIdx] : 0
  const coverScale = spring({
    frame: Math.max(0, frame - bookStart - 3), fps,
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
            <div style={{
              width: 140, height: 140, borderRadius: '50%', overflow: 'hidden',
              border: '3px solid rgba(200,164,110,0.35)',
              boxShadow: '0 16px 50px rgba(0,0,0,0.5)',
            }}>
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
            <div style={{
              width: 160, height: 160, borderRadius: '50%', overflow: 'hidden',
              border: '3px solid rgba(200,164,110,0.35)',
              boxShadow: '0 16px 50px rgba(0,0,0,0.5)',
            }}>
              <Img src={host.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            {/* 이름 — narrator 세그먼트일 때만 */}
            {!isCeleb && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ color: '#e8e0d0', fontSize: SHORTS.name, fontWeight: 700, fontFamily: FONT.sans }}>
                  {host.nickname}
                </div>
                <div style={{ color: '#666', fontSize: SHORTS.meta, fontFamily: FONT.cormorant, letterSpacing: 3 }}>
                  {host.nickname_en}
                </div>
              </div>
            )}
            <div style={{
              color: textColor, fontSize: isCeleb ? SHORTS.quote : SHORTS.body,
              fontWeight: isCeleb ? 700 : 400,
              fontFamily: isCeleb ? FONT.serif : FONT.sans,
              textAlign: 'center', lineHeight: 1.7, maxWidth: 860,
              ...(isCeleb ? { borderLeft: '4px solid rgba(200,164,110,0.4)', paddingLeft: 24, textAlign: 'left' as const } : {}),
            }}>
              {seg.text}
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
                width: 240, height: 360, borderRadius: 12, overflow: 'hidden',
                boxShadow: '0 24px 60px rgba(0,0,0,0.7), 0 0 50px rgba(200,164,110,0.1)',
              }}>
                <Img src={safeImg(book.thumbnail_url)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            </div>
            <div style={{
              color: '#e8e0d0', fontSize: SHORTS.caption,
              fontFamily: FONT.sans, textAlign: 'center',
              lineHeight: 1.8, maxWidth: 880,
            }}>
              {seg.text}
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
              <div style={{
                width: 100, height: 100, borderRadius: '50%', overflow: 'hidden',
                border: '2px solid rgba(200,164,110,0.3)',
                boxShadow: '0 10px 36px rgba(0,0,0,0.5)',
              }}>
                <Img src={host.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            )}
            <div style={{
              color: isCeleb ? '#c8a46e' : '#ccc',
              fontSize: isCeleb ? SHORTS.quote : SHORTS.cta,
              fontWeight: isCeleb ? 700 : 400,
              fontFamily: isCeleb ? FONT.serif : FONT.sans,
              textAlign: 'center', lineHeight: 1.65, maxWidth: 860,
            }}>
              {seg.text}
            </div>
          </AbsoluteFill>
        )

      default:
        return null
    }
  }

  // --- 자막 ---
  const currentSeg = segments.findIndex((_, i) =>
    frame >= segStarts[i] && frame < segStarts[i] + segTimings[i]
  )
  const subText = currentSeg >= 0 ? segments[currentSeg].text : ''

  return (
    <AbsoluteFill style={{ backgroundColor: '#0a0a0a' }}>
      {/* 배경 이미지 — 롱폼 summary 이미지 재활용 */}
      <Img src={sf(`images/${epName}/book-${bi}-summary.png`)} style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%',
        objectFit: 'cover', filter: 'brightness(0.15) saturate(0.4)',
      }} />
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 30%, rgba(26,21,16,0.6) 0%, rgba(10,10,10,0.9) 70%)' }} />

      {/* 오디오 */}
      {segments.map((seg, i) => (
        <Sequence key={seg.id} from={segStarts[i]} durationInFrames={segTimings[i]}>
          {i === 0 && <Audio src={sf('sfx/whoosh.wav')} volume={0.1} />}
          <Audio src={vf(`short-${seg.id}.wav`)} />
        </Sequence>
      ))}
      {/* 채널 안내 — hook 직후 */}
      <Sequence from={brandStart} durationInFrames={SHORT_BRAND_FRAMES}>
        <Audio src={sf('sfx/chime.wav')} volume={0.5} />
      </Sequence>
      {fadeInOut(frame, brandStart, SHORT_BRAND_FRAMES) > 0 && (
        <AbsoluteFill style={{
          opacity: fadeInOut(frame, brandStart, SHORT_BRAND_FRAMES),
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: SAFE_PAD,
        }}>
          <BrandLogo fontSize={SHORTS.logo} />
        </AbsoluteFill>
      )}
      <Sequence from={logoStart} durationInFrames={SHORT_LOGO_FRAMES}>
        <Audio src={sf('sfx/chime.wav')} volume={0.5} />
      </Sequence>

      {/* 비주얼 */}
      {segments.map((seg, i) => renderVisual(seg, i))}

      {/* 로고 */}
      {logoOp > 0 && (
        <AbsoluteFill style={{
          opacity: logoOp,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: SAFE_PAD,
        }}>
          <BrandLogo fontSize={SHORTS.logo} />
        </AbsoluteFill>
      )}

      {/* 하단 자막 — 비활성화 */}
      {/* {subText && (
        <div style={{
          position: 'absolute', bottom: SAFE_BOTTOM + 12, left: 60, right: 60,
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
      )} */}
    </AbsoluteFill>
  )
}
