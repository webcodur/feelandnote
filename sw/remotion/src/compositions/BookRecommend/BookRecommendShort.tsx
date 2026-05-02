/**
 * BookRecommendShort -- shorts (9:16)
 *
 * segment array driven. narration flows, visuals follow.
 * 2-column middle: left = text, right = avatar/cover crossfade.
 *
 * @see docs/project/remotion/shorts.md
 */
import React, { useEffect } from 'react'
import { AbsoluteFill, Audio, getRemotionEnvironment, Img, interpolate, Sequence, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import type { BookRecommendScript } from './types'
import { fadeInOut, safeImg, sf, makeVf } from './utils'
import { safePrefetch } from './safe-prefetch'
import { DARK } from '../theme'
import { FONT } from './fonts'
import {
  SHORT_LOGO_FRAMES, SHORT_LOGO_FRAMES_BGM, SHORT_REVEAL_FRAMES,
  SHORT_OUTRO_OPEN,
  SHORT_LOGO_FADE_OUT, SHORT_LOGO_FADE_OUT_BGM,
  shortTotalFrames, shortSegLayout, FPS, f,
} from './timing'
import { EPISODE_NAME, loadVoiceSelect, episodeDir } from './script'
import {
  SHORT_W as W, SHORT_HEADER_H as HEADER_H, SHORT_SAFE_BOTTOM as SAFE_BOTTOM,
  SHORT_MID_H as MID_H, SHORT_RIGHT_STRIP_W as RIGHT_STRIP_W,
  SHORT_CONTENT_PAD as CONTENT_PAD, REVEAL_BG, CL,
} from './shorts-constants'

import { ShortDevOverlay } from './studio/ShortDevOverlay'
import { SubEditor } from './studio/SubEditor'
import { vnShort, vnTimingKey } from './voice-names'
import { ShortCaption } from './sections/ShortCaption'
import { BgmAudio, BgmToggle } from './BgmAudio'
import { Typewriter } from './sections/Typewriter'
import { ShortsThumbnail } from '../Thumbnail/ShortsThumbnail'
import { CircleAvatar } from './sections/CircleAvatar'
import { ShortBackgroundLayer } from './sections/ShortBackgroundLayer'
import { resolveAnchorTime } from './anchor-resolve'

/** 숏폼 배경 이미지 경로 — episodes/{status}/{person}/images/shorts-N.png */
const shortsImageBase = (epName: string) => {
  const person = epName.replace(/-en$/, '').replace(/-\d+(-en)?$/, '')
  const dir = episodeDir[epName] ?? episodeDir[person] ?? `todo/${person}`
  return `episodes/${dir}/images`
}

/** 사운드 이펙트 폴더 경로 — episodes/{status}/{person}/soundeffect/{file} */
const shortsSfxBase = (epName: string) => {
  const person = epName.replace(/-en$/, '').replace(/-\d+(-en)?$/, '')
  const dir = episodeDir[epName] ?? episodeDir[person] ?? `todo/${person}`
  return `episodes/${dir}/soundeffect`
}

type Props = { script: BookRecommendScript; episodeName?: string; shortsIndex: number }

/** 쇼츠 총 프레임 계산. shortsIndex는 1-based (필수) */
export const calcShortTotalFrames = (script: BookRecommendScript, shortsIndex: number) => {
  const shorts = script.shorts?.[shortsIndex - 1]
  if (!shorts?.segments) return 300
  return shortTotalFrames(shorts.segments, !!(shorts.bgm?.length))
}

export const BookRecommendShort: React.FC<Props> = ({ script, episodeName, shortsIndex }) => {
  const frame = useCurrentFrame()
  const { fps, durationInFrames: compFrames } = useVideoConfig()
  const epName = episodeName ?? EPISODE_NAME
  const vf = makeVf(epName, loadVoiceSelect(epName), script.locale, !!script.host.elevenlabsVoiceId)
  const { host, books } = script
  // shortsIndex: 1-based (외부 노출) → 배열 접근 시 -1 변환
  const shorts = script.shorts?.[shortsIndex - 1]
  const segments = shorts?.segments ?? []
  const hasVoice = segments.some(s => (s.duration ?? 0) > 0)
  const hasBgm = !!(shorts?.bgm?.length)
  const logoFrames = hasBgm ? SHORT_LOGO_FRAMES_BGM : SHORT_LOGO_FRAMES
  const bi = shorts?.featuredBookIndex ?? 0
  const book = books[bi]
  const imgBase = shortsImageBase(epName)
  const sfxBase = shortsSfxBase(epName)
  const revealBgUrl = shorts?.revealBg ? sf(`${imgBase}/${shorts.revealBg}`) : null
  const bookBgUrl = shorts?.bookBg ? sf(`${imgBase}/${shorts.bookBg}`) : null

  // --- "인물명의 서재" / "N's Library" 단일 블록의 길이 기반 적응형 fontSize ──
  // 수식어(~60) + 본문(1~2줄) 2단 구성. HEADER_H 320 한도 안에서 2줄까지 안전하게 수용.
  // 가용 폭: 1080 - padding 160 = 920px. 서체: 영문 serif weight 900(≈0.5×fs/char), 한글 sans weight 900(≈0.95×fs/glyph).
  const libraryLabel = script.locale === 'en' ? "'s Library" : '의 서재'
  const libraryText = `${host.nickname}${libraryLabel}`
  const nameFontSize = (() => {
    if (script.locale === 'en') {
      const len = libraryText.length
      if (len <= 20) return 92   // e.g. "Lincoln's Library", "Confucius's Library"
      if (len <= 30) return 78   // e.g. "Marcus Aurelius's Library", "Alexander the Great's Library"
      return 66                   // e.g. "Wolfgang Amadeus Mozart's Library"
    }
    // 한국어: 공백 제외 글자수 기준
    const len = libraryText.replace(/\s/g, '').length
    if (len <= 7) return 112   // e.g. "공자의 서재", "링컨의 서재"
    if (len <= 11) return 96   // e.g. "알렉산더 대왕의 서재", "세종대왕의 서재"
    return 80                   // e.g. "마르쿠스 아우렐리우스의 서재", "레오나르도 다 빈치의 서재"
  })()

  // --- segment timing (timing.ts SSoT) ---
  const { segTimings, segStarts, logoStart } = shortSegLayout(segments)

  // --- prefetch ---
  useEffect(() => {
    if (!hasVoice) return
    const audioUrls = [
      sf('common/sfx/chime.wav'),
      ...segments.flatMap((seg, i) => seg.duration ? [vf(vnShort(i, seg.id, shortsIndex))] : []),
      ...segments.flatMap(seg => (seg.sfx ?? []).map(sx =>
        sf(sx.file.startsWith('episodes/') ? sx.file : `${sfxBase}/${sx.file}`),
      )),
    ]
    const imageUrls = [
      ...(revealBgUrl ? [revealBgUrl] : []),
      ...(bookBgUrl ? [bookBgUrl] : []),
      ...segments.flatMap(seg => {
        const img1 = seg.image ? (seg.image.startsWith('episodes/') ? seg.image : `${imgBase}/${seg.image}`) : null
        const imgs = img1 ? [sf(img1)] : []
        if (seg.imageChangeAt) {
          const changes = Array.isArray(seg.imageChangeAt) ? seg.imageChangeAt : [seg.imageChangeAt]
          imgs.push(...changes.map(c => {
            const img2 = c.image.startsWith('episodes/') ? c.image : `${imgBase}/${c.image}`
            return sf(img2)
          }))
        }
        return imgs
      }),
    ]
    const cleanups = [
      ...audioUrls.map(u => safePrefetch(u, { method: 'blob-url', contentType: 'audio/wav' }).free),
      ...imageUrls.map(u => safePrefetch(u, { method: 'blob-url' }).free),
    ]
    return () => cleanups.forEach(fn => fn())
  }, [segments.length, hasVoice, imgBase])

  // --- helpers ---
  const introIdx = segments.findIndex(s => s.id === 'intro')
  const segOp = (i: number) => {
    if (i === 0) {
      // 텍스트는 gap 끝 0.6초 전에 등장, 하이라이팅은 오디오와 동기
      const riseStart = segStarts[0] - f(0.6)
      const segEnd = segStarts[0] + segTimings[0]
      if (frame < riseStart || frame >= segEnd) return 0
      if (frame >= segEnd - f(0.5)) return (segEnd - frame) / f(0.5)
      return 1
    }
    if (i === introIdx && introIdx === 1) {
      // hook 직후 intro — 부드럽게 등장 (fade-in 길게)
      return fadeInOut(frame, segStarts[i], segTimings[i], f(0.6), f(0.33))
    }
    return fadeInOut(frame, segStarts[i], segTimings[i])
  }
  // LOGO 풀스크린 오버레이용(매거진 ShortsThumbnail)
  // 닫힘 페이즈(SHORT_OUTRO_CLOSE) 동안 BG가 페이드아웃되고, logoStart부터 열림 페이즈(OPEN)에서 로고 페이드인
  const logoFadeOut = hasBgm ? SHORT_LOGO_FADE_OUT_BGM : SHORT_LOGO_FADE_OUT
  const logoContentOp = interpolate(frame,
    [logoStart, logoStart + SHORT_OUTRO_OPEN, logoStart + logoFrames - logoFadeOut, logoStart + logoFrames],
    [0, 1, 1, 0], CL,
  )

  const bookSegIdx = segments.findIndex(s => s.visual === 'book')
  const bookStart = bookSegIdx >= 0 ? segStarts[bookSegIdx] : 0
  const coverScale = spring({
    frame: Math.max(0, frame - bookStart - f(0.1)), fps,
    config: { damping: 14, stiffness: 140 },
  })

  const currentSeg = segments.findIndex((_, i) =>
    frame >= segStarts[i] && frame < segStarts[i] + segTimings[i]
  )

  // --- 우측 스트립: topRight 명시 세그먼트만 표시 ('avatar' | 'book' | 'none') ---
  // 명시 세그먼트 활성도를 페이드 포함 op로 누적.
  const finalStripAvatarOp = segments.reduce((m, s, i) => s.topRight === 'avatar' ? Math.max(m, segOp(i)) : m, 0)
  const finalStripPosterOp = segments.reduce((m, s, i) => s.topRight === 'book' ? Math.max(m, segOp(i)) : m, 0)

  // --- reveal ---
  const revealOp = interpolate(frame,
    [0, SHORT_REVEAL_FRAMES - f(0.3), SHORT_REVEAL_FRAMES],
    [1, 1, 0], CL,
  )

  // --- image groups (precomputed to prevent regex parse every frame) ---
  // hook/intro/celeb-mid/book 모든 세그먼트의 seg.image + imageChangeAt를 통합 시퀀스로 빌드
  const imageGroups = React.useMemo(() => {
    const groups: { image: string; start: number; noZoom: boolean }[] = []
    /** 같은 image + 같은 noZoom 조합이 연속되면 병합, 다르면 새 그룹 push.
     *  이미지를 명시하지 않은 세그먼트(dedup)에서도 noZoom이 바뀌면 이전 이미지를
     *  새 그룹으로 재push하여 줌 동작이 세그먼트 경계에서 즉시 전환되게 한다. */
    const push = (image: string, start: number, noZoom: boolean) => {
      const last = groups[groups.length - 1]
      if (last && last.image === image && last.noZoom === noZoom) return
      groups.push({ image, start, noZoom })
    }
    segments.forEach((seg, i) => {
      // 줌인: zoomIn === false면 강제 OFF. 그 외(true/undefined)는 ON.
      const segNoZoom = seg.zoomIn === false
      // seg.image 없음(dedup) → 직전 그룹의 이미지를 승계. 승계할 이미지도 없으면 skip.
      const inheritedImage = groups.length > 0 ? groups[groups.length - 1].image : null
      const baseImage = seg.image
        ? (seg.image.startsWith('episodes/') ? seg.image : `${imgBase}/${seg.image}`)
        : inheritedImage
      if (!baseImage) return
      push(baseImage, segStarts[i], segNoZoom)
      // imageChangeAt 처리 경로는 seg.image 가 존재할 때만 의미 있음 (앵커 텍스트는 seg.text 기반)
      if (!seg.image) return
      if (seg.imageChangeAt) {
        const changes = Array.isArray(seg.imageChangeAt) ? seg.imageChangeAt : [seg.imageChangeAt]
        const timingKey = vnTimingKey(vnShort(i, seg.id, shortsIndex))
        const timings = script.voiceTimings?.[timingKey] as { start: number; end: number; text: string; sub?: string[]; subTimings?: number[]; words?: { text: string; start: number; end: number }[] }[] | undefined
        const segText = seg.text ?? ''
        const segDurSec = segTimings[i] / fps
        const stripPunct = (s: string) => s.replace(/[\s.,!?“"”'’《》\n\r]/g, '')

        // sub-level fullText (최우선) — 유저가 VoiceTimingEditor에서 subTimings를 편집하면 즉시 반영되므로
        // 자막 타이밍과 이미지 전환 타이밍을 동일 원천(sub 경계)으로 묶는다.
        let subFullText = ''
        const subPositions: { offset: number; start: number }[] = []
        if (timings) {
          for (const sen of timings) {
            const subs = (sen.sub ?? []) as string[]
            const subT = (sen.subTimings ?? []) as number[]
            if (subs.length === 0) {
              // sub 분할 없음 → 문장 전체를 하나의 sub로 취급
              subPositions.push({ offset: subFullText.length, start: sen.start })
              subFullText += stripPunct(sen.text ?? '')
              continue
            }
            for (let si = 0; si < subs.length; si++) {
              const subStart = si === 0 ? sen.start : subT[si - 1]
              subPositions.push({ offset: subFullText.length, start: subStart })
              subFullText += stripPunct(subs[si])
            }
          }
        }
        const hasSubLevel = subPositions.length > 0

        // word-level fullText (sub 데이터 없을 때 폴백) — whisper 원본이라 유저 편집 미반영
        let wordFullText = ''
        const wordPositions: { offset: number; start: number }[] = []
        if (timings) {
          for (const seg of timings) {
            if (!seg.words) continue
            for (const w of seg.words) {
              if (!w.text) continue
              wordPositions.push({ offset: wordFullText.length, start: w.start })
              wordFullText += stripPunct(w.text)
            }
          }
        }
        const hasWordLevel = wordPositions.length > 0

        // sentence-level fullText (최후 폴백)
        let fullText = ''
        const positions: { offset: number; start: number }[] = []
        if (timings) {
          for (const w of timings) {
            if (!w.text) continue
            positions.push({ offset: fullText.length, start: w.start })
            fullText += stripPunct(w.text)
          }
        }
        const normSegText = stripPunct(segText)

        for (const change of changes) {
          // voiceTimings 없거나 stale이면 change.t 무시 → 텍스트 위치 비율 폴백.
          // 초기값이 유한수가 아니면 "미결" 상태로 두고 매칭/폴백이 채우도록 한다.
          const initial = (!timings || timings.length === 0)
            ? 0
            : (typeof change.t === 'number' && Number.isFinite(change.t) ? change.t : NaN)
          let resolved: number = initial
          const needFallback = () => !Number.isFinite(resolved) || resolved === 0
          if (change.text) {
            const normAnchor = stripPunct(change.text)
            let matched = false
            // 1순위: sub-level 매칭 (자막과 동일 원천, 유저 편집 즉시 반영)
            if (hasSubLevel && normAnchor) {
              const pos = subFullText.indexOf(normAnchor)
              if (pos !== -1) {
                for (let j = subPositions.length - 1; j >= 0; j--) {
                  if (pos >= subPositions[j].offset) {
                    resolved = subPositions[j].start
                    matched = true
                    break
                  }
                }
              }
            }
            // 2순위: word-level 매칭 (sub 없을 때)
            if (!matched && hasWordLevel && normAnchor) {
              const pos = wordFullText.indexOf(normAnchor)
              if (pos !== -1) {
                for (let j = wordPositions.length - 1; j >= 0; j--) {
                  if (pos >= wordPositions[j].offset) {
                    resolved = wordPositions[j].start
                    matched = true
                    break
                  }
                }
              }
            }
            // 3순위: sentence-level 매칭 (sub·word 모두 매칭 실패)
            if (!matched && timings && normAnchor) {
              const pos = fullText.indexOf(normAnchor)
              if (pos !== -1) {
                for (let j = positions.length - 1; j >= 0; j--) {
                  if (pos >= positions[j].offset) {
                    resolved = positions[j].start
                    matched = true
                    break
                  }
                }
              }
            }
            // 4순위: 세그먼트 텍스트 내 위치 비율 폴백 (timing이 stale이어도 동작)
            if (!matched && needFallback() && normAnchor && normSegText.length > 0) {
              const pos = normSegText.indexOf(normAnchor)
              if (pos !== -1) {
                resolved = (pos / normSegText.length) * segDurSec
                matched = true
              }
            }
            // 5순위: 마지막 이미지 이후 강제 간격
            if (!matched && needFallback()) {
              const lastFrame = groups.length > 0 ? groups[groups.length - 1].start : segStarts[i]
              resolved = (lastFrame - segStarts[i]) / fps + 1.5
              if (typeof window !== 'undefined') console.warn(`[Shorts Image] "${change.text}" 매칭 실패 -> 강제 폴백 적용`)
            }
          }
          // 최종 안전장치: 여전히 비-유한수면 0으로 고정 (interpolate NaN 크래시 방지)
          if (!Number.isFinite(resolved)) resolved = 0
          const img2 = change.image.startsWith('episodes/') ? change.image : `${imgBase}/${change.image}`
          push(img2, segStarts[i] + f(resolved), segNoZoom)
        }
      }
    })
    // 책 세그먼트에 seg.image가 없으면서 bookBg(폴백)이 있으면 가상 그룹으로 추가.
    // hook/intro 이미지에서 자연스럽게 cross-fade 되도록 하기 위함.
    const bookHasImage = segments.some(s => s.visual === 'book' && s.image)
    if (bookSegIdx >= 0 && !bookHasImage && shorts?.bookBg) {
      const bookBgPath = shorts.bookBg.startsWith('episodes/') ? shorts.bookBg : `${imgBase}/${shorts.bookBg}`
      push(bookBgPath, segStarts[bookSegIdx], segments[bookSegIdx]?.zoomIn === false)
    }
    groups.sort((a, b) => a.start - b.start)
    // 최소 간격 보정 — 간격이 너무 짧으면 앞 이미지가 순간 스침 → 앞 이미지 제거
    // (기존: 뒤 이미지를 밀어서 오히려 0.15초 스침 발생)
    const MIN_GROUP_GAP = f(0.15)
    for (let gi = groups.length - 1; gi > 0; gi--) {
      if (groups[gi].start - groups[gi - 1].start < MIN_GROUP_GAP) {
        groups.splice(gi - 1, 1)
      }
    }
    return groups
  }, [segments, segStarts, script.voiceTimings, segTimings, fps, imgBase, bookSegIdx, shorts?.bookBg])

  // --- SFX items: 텍스트 앵커 + offset → 절대 프레임으로 해상. 길이 제한·페이드아웃 포함. ---
  const sfxItems = React.useMemo(() => {
    type Item = {
      src: string
      startFrame: number
      volume: number
      durationFrames: number | null
      fadeInFrames: number
      fadeOutFrames: number
      key: string
    }
    const items: Item[] = []
    segments.forEach((seg, i) => {
      const list = seg.sfx ?? []
      if (list.length === 0) return
      const timingKey = vnTimingKey(vnShort(i, seg.id, shortsIndex))
      const timings = script.voiceTimings?.[timingKey]
      const segDurSec = segTimings[i] / fps
      list.forEach((sx, sIdx) => {
        const offset = Number.isFinite(sx.offset) ? (sx.offset as number) : 0
        let baseSec = 0
        if (sx.text) {
          const resolved = resolveAnchorTime({
            anchorText: sx.text, segText: seg.text ?? '',
            segDurSec, timings,
          })
          if (resolved != null) baseSec = resolved
        }
        const tSec = baseSec + offset
        const startFrame = Math.max(0, segStarts[i] + Math.round(tSec * fps))
        const src = sx.file.startsWith('episodes/')
          ? sf(sx.file)
          : sf(`${sfxBase}/${sx.file}`)
        const durSec = (Number.isFinite(sx.duration) && (sx.duration as number) > 0) ? (sx.duration as number) : null
        const fadeInSec = (Number.isFinite(sx.fadeIn) && (sx.fadeIn as number) > 0) ? (sx.fadeIn as number) : 0
        const fadeOutSec = (Number.isFinite(sx.fadeOut) && (sx.fadeOut as number) > 0) ? (sx.fadeOut as number) : 0
        const durationFrames = durSec != null ? Math.max(1, Math.round(durSec * fps)) : null
        // 페이드는 전체 길이를 넘지 못하게 클램프
        const fadeInFrames = durationFrames != null
          ? Math.min(Math.round(fadeInSec * fps), durationFrames)
          : Math.round(fadeInSec * fps)
        const fadeOutFrames = durationFrames != null
          ? Math.min(Math.round(fadeOutSec * fps), durationFrames)
          : 0
        items.push({
          src, startFrame, volume: sx.volume ?? 0.7,
          durationFrames, fadeInFrames, fadeOutFrames,
          key: `sfx-${i}-${sIdx}`,
        })
      })
    })
    return items
  }, [segments, segStarts, segTimings, script.voiceTimings, fps, sfxBase, shortsIndex])

  return (
    <AbsoluteFill style={{ backgroundColor: DARK.base }}>
      {/* BGM (쇼츠별) — 마지막 대사 오디오 끝 이후 볼륨 100% */}
      {shorts?.bgm?.length && (() => {
        const lastVoice = [...segments.entries()].filter(([, s]) => (s.duration ?? 0) > 0).at(-1)
        const voiceEndFrame = lastVoice != null ? segStarts[lastVoice[0]] + segTimings[lastVoice[0]] : undefined
        return <BgmAudio tracks={shorts.bgm} totalFrames={compFrames} voiceEndFrame={voiceEndFrame} />
      })()}

      <ShortBackgroundLayer
        segOp={segOp} segments={segments} segStarts={segStarts} segTimings={segTimings}
        bookSegIdx={bookSegIdx} logoStart={logoStart} imageGroups={imageGroups} revealBgUrl={revealBgUrl}
      />


      {/* ── FIXED FRAME BACKGROUNDS ── */}
      {/* 영상 스크롤을 막아주고 썸네일과 완벽히 오버랩되는 상/하단 완전 블랙 마진 */}
      {/* zIndex 10으로 낮춰서 오프닝(zIndex 100)의 책 이미지가 하단 마진을 침범하여 자연스럽게 그려질 수 있도록 허용 */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: HEADER_H, background: DARK.surface, zIndex: 10 }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: SAFE_BOTTOM, background: DARK.surface, zIndex: 10 }} />

      {/* ── FIXED TOP TYPOGRAPHY ──
          구조: host.title(수식어, 트래킹 골드) → "인물명의 서재"/"N's Library" 단일 블록 (적응형 fontSize, 자연 래핑) */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: HEADER_H,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '0 80px',
        zIndex: 115,
      }}>
        {/* 수식어 — 영문은 ALL CAPS 트래킹 */}
        <div style={{
          fontSize: script.locale === 'en' ? 58 : 68, color: '#c8a46e', // GOLD
          fontFamily: FONT.hahmlet, fontWeight: 700, letterSpacing: 4, marginBottom: 20,
          textAlign: 'center', wordBreak: 'keep-all',
          textTransform: script.locale === 'en' ? 'uppercase' : undefined,
        }}>
          {host.title}
        </div>
        {/* "인물명의 서재" 단일 텍스트 블록 — 긴 이름은 자연 래핑 */}
        {/* Do Hyeon은 단일 weight 폰트라 fontWeight를 명시하지 않는다 (synthetic bold 방지) */}
        <div style={{
          fontSize: nameFontSize,
          fontWeight: script.locale === 'en' ? 900 : 400,
          fontFamily: script.locale === 'en' ? FONT.serif : FONT.doHyeon,
          color: '#e8e0d0', lineHeight: 1.05, textAlign: 'center', // CREAM
          textShadow: '0 8px 40px rgba(0,0,0,0.9)',
          wordBreak: 'keep-all',
          textWrap: 'balance',
        } as React.CSSProperties}>
          {libraryText}
        </div>
      </div>

      {/* (FIXED BOTTOM TYPOGRAPHY는 영상 내내 유지하지 않는다. 오프닝 리빌 구간에만 상단 타이포가 보이고, 본문에서는 자막/책 정보로 대체된다.) */}

      {/* audio — reveal chime */}
      <Sequence from={0} durationInFrames={SHORT_REVEAL_FRAMES}>
        <Audio src={sf('common/sfx/chime.wav')} volume={0.7} />
      </Sequence>
      {/* audio — segments (hook은 rise 중 겹쳐서 시작) */}
      {hasVoice && segments.map((seg, i) => {
        if (!seg.duration) return null
        const audioFrom = i === 0 ? segStarts[i] - f(0.15) : segStarts[i]
        return (
          <Sequence key={seg.id} from={audioFrom} durationInFrames={segTimings[i]}>
            <Audio src={vf(vnShort(i, seg.id, shortsIndex))} volume={seg.volume ?? 1} />
          </Sequence>
        )
      })}

      {/* audio — soundeffect (단발, 선택적 길이 제한 + 페이드인/아웃) */}
      {sfxItems.map(it => {
        const hasFadeIn = it.fadeInFrames > 0
        const hasFadeOut = it.fadeOutFrames > 0 && it.durationFrames != null
        const volProp = (hasFadeIn || hasFadeOut)
          ? (lf: number) => {
              let v = it.volume
              if (hasFadeIn && lf < it.fadeInFrames) {
                v *= interpolate(lf, [0, it.fadeInFrames], [0, 1], CL)
              }
              if (hasFadeOut) {
                const dur = it.durationFrames as number
                const fadeStart = dur - it.fadeOutFrames
                if (lf > fadeStart) {
                  v *= interpolate(lf, [fadeStart, dur], [1, 0], CL)
                }
              }
              return v
            }
          : it.volume
        return (
          <Sequence
            key={it.key}
            from={it.startFrame}
            durationInFrames={it.durationFrames ?? undefined}
          >
            <Audio src={it.src} volume={volProp} />
          </Sequence>
        )
      })}

      {/* ── 오프닝 리빌: 무대/원형 인물 + 회전 책 포스터 (구버전 디자인) ──
          revealBgUrl(에피소드별)이 있으면 우선, 없으면 공용 reveal-bg.jpg.
          MID_H 영역에만 그려서 상단 타이포(zIndex 115)와 하단 블랙 마진(zIndex 10)이 겹치지 않게 한다. */}
      {revealOp > 0 && (() => {
        const beatScale = interpolate(frame, [0, f(0.8)], [1.06, 1], CL)
        const bgUrl = revealBgUrl ?? sf(REVEAL_BG)
        return (
          <div style={{
            position: 'absolute',
            top: HEADER_H, left: 0, width: W, height: MID_H,
            zIndex: 100, opacity: revealOp, overflow: 'hidden',
            backgroundColor: DARK.base,
          }}>
            <Img src={bgUrl} style={{
              position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
              objectFit: 'cover', filter: 'brightness(0.35) saturate(0.5)',
            }} />
            <div style={{
              position: 'absolute', inset: 0,
              background: 'radial-gradient(ellipse 80% 70% at 50% 50%, transparent 30%, rgba(6,4,2,0.7) 100%)',
            }} />
            {/* 책 포스터 — 우측, 살짝 회전 */}
            <div style={{
              position: 'absolute',
              top: '50%', left: 420,
              transform: `translateY(-50%) rotate(-3deg) scale(${beatScale})`,
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
            {/* 아바타 — 좌측, 원형 */}
            <div style={{
              position: 'absolute',
              top: '50%', left: 140,
              transform: `translateY(-38%) scale(${beatScale})`,
              zIndex: 2,
            }}>
              <CircleAvatar avatarUrl={host.avatar_url} size={440} filter="brightness(1.15) contrast(1.08)" />
            </div>
          </div>
        )
      })()}

      {/* ── middle section — 2-column: text (left) + visual strip (right) ── */}
      {/* 본문 전체 2컬럼 */}
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
          {finalStripAvatarOp > 0 && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
              opacity: finalStripAvatarOp,
            }}>
              <div style={{ margin: '20px auto 0' }}>
                <CircleAvatar avatarUrl={host.avatar_url} size={RIGHT_STRIP_W - 40} />
              </div>
            </div>
          )}
          {finalStripPosterOp > 0 && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
              opacity: finalStripPosterOp,
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

      {/* ── 자막 (하단) — textOverlay 세그먼트만 제외 (hook도 일반 자막으로 처리). ── */}
      {segments.map((seg, i) => {
        if (seg.textOverlay) return null
        const op = segOp(i)
        if (op <= 0) return null
        const timingKey = vnTimingKey(vnShort(i, seg.id, shortsIndex))
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

      {/* ── 텍스트 덮기 오버레이 (textOverlay) — 좌측 정렬 + 골드 라인 + Typewriter 하이라이팅. \n 문단 분리 시 페이지 전환.
            모드: true(=fullscreen, 중앙 54px) | 'bottom'(하단 50px) ── */}
      {segments.map((seg, i) => {
        if (!seg.textOverlay) return null
        const op = segOp(i)
        if (op <= 0) return null
        const isBottomMode = seg.textOverlay === 'bottom'
        const overlayFontSize = isBottomMode ? 50 : 54
        const timingKey = vnTimingKey(vnShort(i, seg.id, shortsIndex))
        const timings = script.voiceTimings?.[timingKey] as { start: number; end: number; text: string }[] | undefined
        const paragraphs = seg.text.split('\n').filter(Boolean)
        const hasParagraphs = paragraphs.length >= 2

        // 문단별 타이밍 분할: 공백 제거한 누적 글자수 기준으로 timings 분배
        type VTSeg = { start: number; end: number; text: string }
        const paraTimings: VTSeg[][] = []
        if (hasParagraphs && timings && timings.length > 0) {
          const strip = (s: string) => s.replace(/\s/g, '')
          const cumLen: number[] = []
          let total = 0
          for (const p of paragraphs) { total += strip(p).length; cumLen.push(total) }

          let tIdx = 0
          let accLen = 0
          for (let pi = 0; pi < paragraphs.length; pi++) {
            const slice: VTSeg[] = []
            while (tIdx < timings.length) {
              slice.push(timings[tIdx])
              accLen += strip(timings[tIdx].text ?? '').length
              tIdx++
              if (accLen >= cumLen[pi]) break
            }
            paraTimings.push(slice)
          }
        }

        // 문단별 프레임 범위 — "..." whisper 아티팩트 건너뛰기
        const isArtifact = (t: VTSeg) => /^[.…]+$/.test(t.text ?? '')
        const paraRanges: { start: number; end: number }[] = paraTimings.length > 0
          ? paraTimings.map((pt) => {
              if (!pt || pt.length === 0) return { start: segStarts[i], end: segStarts[i] + segTimings[i] }
              const realFirst = pt.find(t => !isArtifact(t)) ?? pt[0]
              return { start: segStarts[i] + Math.round(realFirst.start * FPS), end: segStarts[i] + Math.round(pt[pt.length - 1].end * FPS) }
            })
          : (() => {
              const strip = (s: string) => s.replace(/\s/g, '')
              const totalLen = paragraphs.reduce((sum, p) => sum + strip(p).length, 0)
              let acc = 0
              return paragraphs.map((p) => {
                const ratio = strip(p).length / totalLen
                const start = segStarts[i] + Math.round(acc * segTimings[i])
                acc += ratio
                const end = segStarts[i] + Math.round(acc * segTimings[i])
                return { start, end }
              })
            })()

        return (
          <div key={`text-overlay-${i}`} style={{
            position: 'absolute',
            top: HEADER_H, bottom: SAFE_BOTTOM,
            left: 0, right: 0,
            zIndex: 18,
            opacity: op,
            display: 'flex',
            alignItems: isBottomMode ? 'flex-end' : 'center',
            justifyContent: 'flex-start',
            padding: `0 ${CONTENT_PAD}px`,
            paddingRight: `${CONTENT_PAD + 120}px`,
            paddingBottom: isBottomMode ? CONTENT_PAD : 0,
          }}>
            {(() => {
              // active paragraph — 박스 사이즈는 현재 보이는 paragraph 기준으로 가변, 박스 하단은 화면 하단 고정
              let activeIdx = 0
              if (hasParagraphs) {
                for (let pi = 0; pi < paragraphs.length; pi++) {
                  if (frame >= paraRanges[pi].start) activeIdx = pi
                }
              }
              const activePara = hasParagraphs ? paragraphs[activeIdx] : seg.text
              const activeRange = hasParagraphs
                ? paraRanges[activeIdx]
                : { start: segStarts[i], end: segStarts[i] + segTimings[i] }
              const activeTimings = hasParagraphs
                ? (paraTimings[activeIdx]?.length ? paraTimings[activeIdx] : undefined)
                : timings
              const activeStartFrame = hasParagraphs && paraTimings[activeIdx]?.length
                ? segStarts[i]
                : activeRange.start
              const activeSpread = hasParagraphs && paraTimings[activeIdx]?.length
                ? segTimings[i]
                : (activeRange.end - activeRange.start)
              const txtPaintStyle: React.CSSProperties = {
                fontFamily: FONT.serif,
                fontWeight: 800,
                textAlign: 'left',
                lineHeight: 1.7,
                wordBreak: 'keep-all',
                WebkitTextStroke: '1.6px rgba(0,0,0,0.9)',
                paintOrder: 'stroke fill',
                textShadow: '0 0 8px rgba(0,0,0,0.95), 0 0 24px rgba(0,0,0,0.75), 0 4px 16px rgba(0,0,0,0.55)',
              }
              return (
                <div style={{
                  maxWidth: 780,
                  borderLeft: '4px solid rgba(200,164,110,0.6)',
                  paddingLeft: 28,
                  paddingTop: 14, paddingBottom: 14, paddingRight: 28,
                  background: 'rgba(0,0,0,0.45)',
                  borderRadius: 4,
                }}>
                  <Typewriter
                    key={activeIdx}
                    text={activePara}
                    startFrame={activeStartFrame}
                    spreadFrames={activeSpread}
                    color="#c8a46e"
                    highlightColor="#f5e6c8"
                    fontSize={overlayFontSize}
                    style={txtPaintStyle}
                    timings={activeTimings}
                  />
                </div>
              )
            })()}
            {/* 인용 출처 — 좌측 하단 작은 글씨 */}
            {seg.quoteSource && (
              <div style={{
                position: 'absolute',
                bottom: 80,
                left: CONTENT_PAD,
                right: CONTENT_PAD + 120,
                color: 'rgba(200, 164, 110, 0.55)',
                fontSize: 28,
                fontFamily: FONT.sans,
                fontWeight: 500,
                textAlign: 'left',
                paddingLeft: 28,
              }}>
                — {seg.quoteSource}
              </div>
            )}
          </div>
        )
      })}

      {/* ── 훅 시각 신호: 화면 가장자리 골드 vignette 펄스 + chime ──
            훅 텍스트는 일반 자막으로 처리. 훅임을 알 수 있게 가장자리에서 골드 빛이 옅게 호흡한다. */}
      {(() => {
        const hookIdx = segments.findIndex(s => s.visual === 'hook')
        if (hookIdx < 0) return null
        const hookStart = segStarts[hookIdx]
        const hookEnd = hookStart + segTimings[hookIdx]
        if (hookEnd <= hookStart) return null
        // 0.4초 페이드인 → 1.0초/1.6초 호흡(1→0.65→1) → 종료 0.5초 페이드아웃
        const breath1 = Math.min(hookStart + f(1.0), hookEnd - f(0.6))
        const breath2 = Math.min(hookStart + f(1.7), hookEnd - f(0.5))
        const fadeIn = Math.min(hookStart + f(0.4), breath1)
        const fadeOutStart = hookEnd - f(0.5)
        // 단조성 보장: 정렬해서 중복 제거
        const stops: number[] = [hookStart, fadeIn, breath1, breath2, fadeOutStart, hookEnd]
        for (let k = 1; k < stops.length; k++) {
          if (stops[k] <= stops[k - 1]) stops[k] = stops[k - 1] + 1
        }
        const glowOp = interpolate(frame, stops, [0, 1, 0.65, 1, 1, 0], CL)
        if (glowOp <= 0) return null
        return (
          <div style={{
            position: 'absolute',
            top: HEADER_H, left: 0, width: W, height: MID_H,
            pointerEvents: 'none',
            zIndex: 17,
            opacity: glowOp,
            // 4면 inset 골드 글로우 — 가장자리에서 안쪽으로 부드럽게 사라짐
            boxShadow: 'inset 0 0 220px 60px rgba(200,164,110,0.32), inset 0 0 60px 0 rgba(200,164,110,0.18)',
          }} />
        )
      })()}

      {/* 셀럽 자동 인용 오버레이 폐기 — 풀스크린 텍스트는 textOverlay 토글로 표시. */}

      {/* ── LOGO 풀스크린 오버레이: 매거진 ShortsThumbnail (오프닝의 무대 디자인과 교대로 사용) ──
          쇼츠 오프닝은 무대(원형 인물+회전 책), 마지막은 매거진 레이아웃으로 두 백업본을 모두 활용한다.
          hideHeader=true: 상단 수식어/이름 타이포는 FIXED TOP TYPOGRAPHY가 이미 zIndex 115로 표시중이므로 중복 방지. */}
      {logoContentOp > 0 && (
        <div style={{
          position: 'absolute', inset: 0,
          zIndex: 100, opacity: logoContentOp, overflow: 'hidden',
          backgroundColor: '#090807',
        }}>
          <ShortsThumbnail script={script} hideHeader shortsIndex={shortsIndex} />
        </div>
      )}

      {/* studio-only dev overlay */}
      {!getRemotionEnvironment().isRendering && (
        <ShortDevOverlay
          frame={frame}
          totalFrames={compFrames}
          logoStart={logoStart}
          logoFrames={logoFrames}
          currentSeg={currentSeg}
          segments={segments}
          segStarts={segStarts}
          segTimings={segTimings}
          voiceTimings={script.voiceTimings}
          shortsIndex={shortsIndex}
        />
      )}
      {!getRemotionEnvironment().isRendering && (
        <SubEditor
           voiceTimings={script.voiceTimings}
           episodeName={epName}
           locale={script.locale ?? 'ko'}
           currentTimingKey={currentSeg >= 0 ? vnTimingKey(vnShort(currentSeg, segments[currentSeg].id, shortsIndex)) : undefined}
         />
       )}
      <BgmToggle hasBgm={!!shorts?.bgm?.length} />
    </AbsoluteFill>
  )
}
