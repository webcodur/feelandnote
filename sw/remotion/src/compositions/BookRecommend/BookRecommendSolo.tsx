/**
 * BookRecommendSolo — 1권 모드 (16:9)
 *
 * 한 인물 · 한 권의 자유 서술 영상. 레이아웃은 두 단순 블록으로 이뤄진다.
 * - 중앙: 시네마틱 이미지(마디마다 교체)
 * - 하단: 자막(인용은 색·크기 차별화)
 *
 * 데이터: SoloScript (solo-build.ts). 마디 배열 순차 재생.
 * 음성: 마디별 wav를 <Audio>로 부착. voiceTimings가 있는 마디는 그 타이밍으로 동기,
 *       없는 마디(정형부 등 wav 미생성분)는 글자수 추정 폴백 + 무음.
 * 자막: ShortCaption(통자막) — 한 호흡 길이 구절이 통째로 떴다 교체. 16:9에 맞춰 크게·듬성듬성.
 */
import React from 'react'
import { AbsoluteFill, Audio, Img, Sequence, interpolate, useCurrentFrame } from 'remotion'
import { DARK, DARK_BG } from '../theme'
import { FONT } from './fonts'
import { BrandIntro } from './sections/BrandIntro'
import { ShortCaption } from './sections/ShortCaption'
import type { SoloScript, SoloSegment } from './solo-build'
import { resolveSoloImage } from './solo-build'
import { sf, fadeInOut, safeImg, makeVf, dbToLinear } from './utils'
import { loadVoiceSelect, episodeDir } from './script'
import { parseEpName, vnSolo } from './voice-names'
import { BRAND_FRAMES, LOGO_FRAMES, f } from './timing'

const SEG_GAP_F = f(0.3)            // 마디 사이 간격
const IMG_XFADE_F = f(0.4)          // 마디 안 이미지 전환 크로스페이드 길이
const W = 1920
const H = 1080
const CAPTION_BOTTOM_H = 280        // 하단 자막 영역 높이
const IMAGE_PAD = 60                 // 중앙 이미지 좌우 패딩

type Props = {
  script: SoloScript
}

/** 마디 배열을 받아 각 마디의 시작·종료 프레임 계산 */
function layoutSegments(segments: SoloSegment[], offsetFrames: number) {
  const starts: number[] = []
  const lengths: number[] = []
  let cur = offsetFrames
  for (const seg of segments) {
    starts.push(cur)
    const len = f(seg.duration)
    lengths.push(len)
    cur += len + SEG_GAP_F
  }
  return { starts, lengths, total: cur - SEG_GAP_F }
}

/** 총 길이 — Root에서 durationInFrames 계산용 */
export const calcSoloTotalFrames = (script: SoloScript): number => {
  const layout = layoutSegments(script.segments, BRAND_FRAMES)
  return layout.total + LOGO_FRAMES
}

export const BookRecommendSolo: React.FC<Props> = ({ script }) => {
  const frame = useCurrentFrame()
  const { segments, locale, epName } = script
  const layout = layoutSegments(segments, BRAND_FRAMES)
  const logoStart = layout.total

  // 음성 경로 팩토리 — 롱폼·쇼츠와 동일 출처(voice-select.json).
  const hasElevenlabs = !!script.host.elevenlabsVoiceId
  const vf = React.useMemo(
    () => makeVf(epName, loadVoiceSelect(epName), locale, hasElevenlabs),
    [epName, locale, hasElevenlabs],
  )
  // 성우(actor) 마디는 elevenlabs 하위 경로로 강제. solo 파일명은 -quote/-celeb 패턴이 아니라
  // isCelebVoiceFile에 안 걸리므로(voice-select default=gemini로 새 버림) 직접 구성한다.
  const elevenVf = React.useMemo(() => {
    const { person, locale: voiceLocale } = parseEpName(epName)
    const epDir = episodeDir[epName] ?? person
    return (file: string) => sf(`episodes/${epDir}/voice/${voiceLocale}/elevenlabs/${file}`)
  }, [epName])
  const audioSrc = (seg: SoloSegment): string => {
    const file = vnSolo(script.bookIndex, seg.segIndex, seg.id)
    return seg.voice === 'actor' ? elevenVf(file) : vf(file)
  }

  // 현재 마디 인덱스
  let curIdx = -1
  for (let i = 0; i < layout.starts.length; i++) {
    if (frame >= layout.starts[i] && frame < layout.starts[i] + layout.lengths[i]) {
      curIdx = i
      break
    }
  }

  return (
    <AbsoluteFill style={{ backgroundColor: DARK.base }}>
      <AbsoluteFill style={{ background: DARK_BG.radial }} />
      <AbsoluteFill
        style={{
          backgroundImage:
            'linear-gradient(rgba(200,164,110,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(200,164,110,0.03) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* 브랜드 인트로 */}
      <Sequence from={0} durationInFrames={BRAND_FRAMES}>
        <BrandIntro script={{ ...script, books: [script.book] } as any} durationFrames={BRAND_FRAMES} opacity={fadeInOut(frame, 0, BRAND_FRAMES)} />
      </Sequence>

      {/* 마디 음성 — voiceTimings(=wav 생성분)가 있는 마디만 부착. 없으면 무음. */}
      {segments.map((seg, i) => {
        if (!seg.voiceTimings || seg.voiceTimings.length === 0) return null
        return (
          <Sequence key={`audio-${seg.id}`} from={layout.starts[i]} durationInFrames={layout.lengths[i]}>
            <Audio src={audioSrc(seg)} volume={dbToLinear(undefined)} />
          </Sequence>
        )
      })}

      {/* 마디 순차 재생 (이미지 + 자막) */}
      {segments.map((seg, i) => (
        <Sequence key={seg.id} from={layout.starts[i]} durationInFrames={layout.lengths[i]}>
          <SoloSegmentView
            seg={seg}
            epName={epName}
            locale={locale}
            lengthFrames={layout.lengths[i]}
            segStartFrame={layout.starts[i]}
          />
        </Sequence>
      ))}

      {/* 로고 아웃트로 */}
      <Sequence from={logoStart} durationInFrames={LOGO_FRAMES}>
        {(() => {
          const op = interpolate(
            frame,
            [logoStart, logoStart + f(0.83), logoStart + LOGO_FRAMES - f(0.67), logoStart + LOGO_FRAMES],
            [0, 1, 1, 0],
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
          )
          return <BrandIntro script={{ ...script, books: [script.book] } as any} durationFrames={LOGO_FRAMES} opacity={op} />
        })()}
      </Sequence>

      {/* 진행 바 (하단) — 전체 흐름 가시화 */}
      {(() => {
        const totalF = logoStart + LOGO_FRAMES
        const progress = Math.min(1, Math.max(0, frame / totalF))
        return (
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            height: 3, background: 'rgba(200,164,110,0.1)',
          }}>
            <div style={{
              width: `${progress * 100}%`, height: '100%',
              background: 'rgba(200,164,110,0.45)',
            }} />
          </div>
        )
      })()}
    </AbsoluteFill>
  )
}

type SegProps = {
  seg: SoloSegment
  epName: string
  locale: 'ko' | 'en'
  lengthFrames: number
  segStartFrame: number
}

const SoloSegmentView: React.FC<SegProps> = ({ seg, epName, locale, lengthFrames, segStartFrame }) => {
  const frame = useCurrentFrame() // 이 Sequence 내 로컬 frame (0부터)
  const op = fadeInOut(frame, 0, lengthFrames, f(0.5), f(0.5))

  // 마디 안 이미지 레이어 — imageChangeAt이 있으면 구절별로 갈아끼우며 크로스페이드,
  // 없으면 단일 image 한 장. 전환 시각은 voiceTimings 단어 타이밍 우선,
  // 없으면 명시 t, 없으면 본문 내 글자 위치 비율로 폴백한다.
  const layers = React.useMemo(() => {
    const toSrc = (file: string | undefined) => {
      const r = file ? resolveSoloImage(epName, file) : undefined
      if (!r) return undefined
      return r.startsWith('http') ? r : sf(r)
    }
    const changes = seg.imageChangeAt
    if (!changes || changes.length === 0) {
      const src = toSrc(seg.image)
      return src ? [{ src, start: 0, end: lengthFrames + IMG_XFADE_F }] : []
    }

    // voiceTimings 단어 타이밍으로 앵커 텍스트의 시작 시각(초)을 찾는다(있으면).
    // stripPunct로 공백·구두점을 제거해 누적 텍스트에서 위치를 매칭한다.
    const timings = seg.voiceTimings
    const stripPunct = (s: string) => s.replace(/[\s.,!?“"”'’《》\n\r]/g, '')
    let wordFullText = ''
    const wordPos: { offset: number; start: number }[] = []
    if (timings) {
      for (const t of timings) {
        for (const w of t.words ?? []) {
          if (!w.text) continue
          wordPos.push({ offset: wordFullText.length, start: w.start })
          wordFullText += stripPunct(w.text)
        }
      }
    }
    const anchorSec = (anchor: string): number | undefined => {
      if (wordPos.length === 0) return undefined
      const pos = wordFullText.indexOf(stripPunct(anchor))
      if (pos < 0) return undefined
      for (let j = wordPos.length - 1; j >= 0; j--) {
        if (pos >= wordPos[j].offset) return wordPos[j].start
      }
      return undefined
    }

    const totalChars = seg.text.length || 1
    const ratios = changes.map((c, i) => {
      // 1순위: voiceTimings 단어 타이밍으로 앵커 시각 → 비율
      if (c.text && seg.duration > 0) {
        const sec = anchorSec(c.text)
        if (sec !== undefined) return Math.min(1, Math.max(0, sec / seg.duration))
      }
      // 2순위: 명시 t (t===0 은 "아직 정렬 안 됨", 0초 전환이 아니므로 폴백)
      if (typeof c.t === 'number' && c.t > 0 && seg.duration > 0) return Math.min(1, Math.max(0, c.t / seg.duration))
      // 3순위: 본문 내 글자 위치 비율
      if (c.text) {
        const idx = seg.text.indexOf(c.text)
        if (idx >= 0) return idx / totalChars
      }
      return i / changes.length
    })
    const out: { src: string; start: number; end: number }[] = []
    for (let i = 0; i < changes.length; i++) {
      const src = toSrc(changes[i].image)
      if (!src) continue
      const last = i + 1 >= changes.length
      out.push({
        src,
        start: ratios[i] * lengthFrames,
        end: last ? lengthFrames + IMG_XFADE_F : ratios[i + 1] * lengthFrames,
      })
    }
    return out
  }, [seg.imageChangeAt, seg.image, seg.text, seg.duration, seg.voiceTimings, epName, lengthFrames])

  // 자막 톤·크기 — 인용은 따뜻한 색·이탤릭, title은 중앙 큰 글씨로 유지
  const isQuote = seg.kind === 'quote'
  const isTitle = seg.kind === 'title'

  return (
    <AbsoluteFill style={{ opacity: op }}>
      {/* 중앙 이미지 영역 */}
      <div style={{
        position: 'absolute', top: 0, left: IMAGE_PAD, right: IMAGE_PAD,
        bottom: CAPTION_BOTTOM_H,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {layers.map((ly, i) => {
          const a = ly.start - IMG_XFADE_F
          const b = ly.start
          const c = Math.max(b + 1, ly.end - IMG_XFADE_F)
          const d = Math.max(c + 1, ly.end)
          const o = interpolate(frame, [a, b, c, d], [0, 1, 1, 0], {
            extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
          })
          return (
            <div key={i} style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: o,
            }}>
              <Img
                src={safeImg(ly.src)}
                style={{
                  maxWidth: '100%', maxHeight: '100%',
                  objectFit: 'contain',
                  borderRadius: 12,
                  boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
                }}
              />
            </div>
          )
        })}
      </div>

      {/* 하단 자막 */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: CAPTION_BOTTOM_H,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '0 120px 40px',
      }}>
        {isTitle ? (
          // 책 제목·저자 — 중앙 큰 세리프 (통자막 페이징 없이 그대로)
          <div style={{
            color: '#e8e0d0', fontSize: 64, fontWeight: 700, fontFamily: FONT.serif,
            textAlign: 'center', lineHeight: 1.4, maxWidth: 1500, whiteSpace: 'pre-wrap',
          }}>
            {seg.text}
          </div>
        ) : (
          // 통자막 — 한 호흡 길이 구절이 통째로 떴다 교체. 16:9에 맞춰 크게·듬성듬성.
          <ShortCaption
            text={seg.text}
            startFrame={0}
            spreadFrames={lengthFrames}
            timings={seg.voiceTimings}
            locale={locale}
            fontSize={isQuote ? 56 : 52}
            fontWeight={isQuote ? 600 : 500}
            color={isQuote ? '#f0d9a8' : '#e8e0d0'}
            charsPerPage={locale === 'en' ? 80 : 45}
            maxPanelWidth={1300}
            style={isQuote ? { fontFamily: FONT.serif, fontStyle: 'italic' } : { fontFamily: FONT.sans }}
          />
        )}
        {isQuote && seg.quoteSource && (
          <div style={{
            marginTop: 18,
            color: '#a09080', fontSize: 22, fontFamily: FONT.sans,
            letterSpacing: 1,
          }}>
            — {seg.quoteSource}
          </div>
        )}
      </div>
    </AbsoluteFill>
  )
}
