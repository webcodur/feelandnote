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
import { SHORT_CTA_FRAMES, SHORT_LOGO_FRAMES, SHORT_LOGO_FRAMES_BGM, SHORT_REVEAL_FRAMES, shortTotalFrames, shortSegLayout, FPS, f } from './timing'
import { EPISODE_NAME, loadVoiceSelect, episodeDir } from './script'
import {
  SHORT_W as W, SHORT_HEADER_H as HEADER_H, SHORT_SAFE_BOTTOM as SAFE_BOTTOM,
  SHORT_MID_H as MID_H, SHORT_RIGHT_STRIP_W as RIGHT_STRIP_W,
  SHORT_CONTENT_PAD as CONTENT_PAD, REVEAL_BG, CTA_BG, CL,
} from './shorts-constants'

import { ShortDevOverlay } from './studio/ShortDevOverlay'
import { SubEditor } from './studio/SubEditor'
import { t } from './i18n'
import { vnShort, vnTimingKey } from './voice-names'
import { ShortCaption } from './sections/ShortCaption'
import { BgmAudio, BgmToggle } from './BgmAudio'
import { Typewriter } from './sections/Typewriter'
import { ShortsThumbnail } from '../Thumbnail/ShortsThumbnail'
import { CircleAvatar } from './sections/CircleAvatar'
import { ShortBackgroundLayer } from './sections/ShortBackgroundLayer'

/** 숏폼 배경 이미지 경로 — episodes/{status}/{person}/images/shorts-N.png */
const shortsImageBase = (epName: string) => {
  const person = epName.replace(/-en$/, '').replace(/-\d+(-en)?$/, '')
  const dir = episodeDir[epName] ?? episodeDir[person] ?? `todo/${person}`
  return `episodes/${dir}/images`
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
      ...segments.flatMap((seg, i) => (seg.duration && seg.visual !== 'cta') ? [vf(vnShort(i, seg.id, shortsIndex))] : []),
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
  const logoOp = fadeInOut(frame, logoStart, logoFrames)
  // LOGO 풀스크린 오버레이용(매거진 ShortsThumbnail) — CTA 끝/LOGO 시작에서 페이드 인, LOGO 끝에서 페이드 아웃
  const logoFadeOut = hasBgm ? f(1.5) : f(0.5)
  const logoContentOp = interpolate(frame,
    [logoStart - f(0.3), logoStart + f(0.3), logoStart + logoFrames - logoFadeOut, logoStart + logoFrames],
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

  // --- 우측 스트립: 아바타 ↔ 포스터 교차 페이드 (CTA 전 사라짐) ---
  const bookIdx = segments.findIndex(s => s.visual === 'book')
  const ctaIdx = segments.findIndex(s => s.visual === 'cta')
  const stripEnd = ctaIdx >= 0 ? segStarts[ctaIdx] : logoStart
  const stripBookStart = bookIdx >= 0 ? segStarts[bookIdx] : Infinity
  const stripBookEnd = bookIdx >= 0 ? segStarts[bookIdx] + segTimings[bookIdx] : 0

  const stripAvatarOp = (() => {
    const fadeOut = interpolate(frame, [stripEnd - f(0.4), stripEnd], [1, 0], CL)
    // hook + intro 구간 숨김 — intro 다음 세그먼트(보통 celeb-mid) 시작 시점에 텍스트와 동시 등장
    const showStart = introIdx >= 0 && introIdx + 1 < segments.length
      ? segStarts[introIdx + 1]
      : (introIdx >= 0
        ? segStarts[introIdx] + segTimings[introIdx]
        : (segments[0] ? segStarts[0] + segTimings[0] : 0))
    const introHide = interpolate(frame,
      [showStart, showStart + f(0.27)],
      [0, 1], CL)
    if (bookIdx >= 0) {
      const base = interpolate(frame, [0, f(0.6), stripBookStart - f(0.4), stripBookStart], [0, 1, 1, 0], CL)
      return Math.min(base, fadeOut, introHide)
    }
    return Math.min(interpolate(frame, [0, f(0.6)], [0, 1], CL), fadeOut, introHide)
  })()

  // 책 포스터는 책 세그먼트 시작 후 최대 7초만 노출 → 이후 우측 스트립 비움
  const POSTER_VISIBLE_S = 7
  const posterHardEnd = Math.min(stripBookStart + f(POSTER_VISIBLE_S), stripBookEnd)
  const posterFadeInEnd = stripBookStart + f(0.5)
  const posterFadeOutStart = Math.max(posterFadeInEnd + 1, posterHardEnd - f(0.4))
  const stripPosterOp = bookIdx >= 0
    ? Math.min(
        interpolate(frame, [stripBookStart, posterFadeInEnd, posterFadeOutStart, posterHardEnd], [0, 1, 1, 0], CL),
        interpolate(frame, [stripEnd - f(0.4), stripEnd], [1, 0], CL),
      )
    : 0

  // --- reveal ---
  const revealOp = interpolate(frame,
    [0, SHORT_REVEAL_FRAMES - f(0.3), SHORT_REVEAL_FRAMES],
    [1, 1, 0], CL,
  )

  // --- image groups (precomputed to prevent regex parse every frame) ---
  // hook/intro/celeb-mid/book 모든 세그먼트의 seg.image + imageChangeAt를 통합 시퀀스로 빌드
  const imageGroups = React.useMemo(() => {
    const groups: { image: string; start: number }[] = []
    const push = (image: string, start: number) => {
      const last = groups[groups.length - 1]
      if (last && last.image === image) return
      groups.push({ image, start })
    }
    segments.forEach((seg, i) => {
      if (!seg.image || seg.visual === 'cta') return
      const img1 = seg.image.startsWith('episodes/') ? seg.image : `${imgBase}/${seg.image}`
      push(img1, segStarts[i])
      if (seg.imageChangeAt) {
        const changes = Array.isArray(seg.imageChangeAt) ? seg.imageChangeAt : [seg.imageChangeAt]
        const timingKey = vnTimingKey(vnShort(i, seg.id, shortsIndex))
        const timings = script.voiceTimings?.[timingKey] as { start: number; end: number; text: string; words?: { text: string; start: number; end: number }[] }[] | undefined
        const segText = seg.text ?? ''
        const segDurSec = segTimings[i] / fps
        const stripPunct = (s: string) => s.replace(/[\s.,!?“"”'’《》\n\r]/g, '')

        // word-level fullText (있으면 우선) — 같은 sentence 내 여러 anchor 구분 가능
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

        // sentence-level fullText (폴백)
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
          // voiceTimings 없으면 이전 파이프라인의 stale t 값 무시 → 텍스트 위치 비율 폴백
          let resolved = (!timings || timings.length === 0) ? 0 : change.t
          if (change.text) {
            const normAnchor = stripPunct(change.text)
            let matched = false
            // 1순위: word-level 매칭 (같은 sentence 내 여러 anchor 구분)
            if (hasWordLevel && normAnchor) {
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
            // 2순위: sentence-level 매칭 (words 데이터 없을 때 폴백)
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
            if (!matched && resolved === 0 && normAnchor && normSegText.length > 0) {
              const pos = normSegText.indexOf(normAnchor)
              if (pos !== -1) {
                resolved = (pos / normSegText.length) * segDurSec
                matched = true
              }
            }
            if (!matched && resolved === 0) {
              const lastFrame = groups.length > 0 ? groups[groups.length - 1].start : segStarts[i]
              resolved = (lastFrame - segStarts[i]) / fps + 1.5
              if (typeof window !== 'undefined') console.warn(`[Shorts Image] "${change.text}" 매칭 실패 -> 강제 폴백 적용`)
            }
          }
          const img2 = change.image.startsWith('episodes/') ? change.image : `${imgBase}/${change.image}`
          push(img2, segStarts[i] + f(resolved))
        }
      }
    })
    // 책 세그먼트에 seg.image가 없으면서 bookBg(폴백)이 있으면 가상 그룹으로 추가.
    // hook/intro 이미지에서 자연스럽게 cross-fade 되도록 하기 위함.
    const bookHasImage = segments.some(s => s.visual === 'book' && s.image)
    if (bookSegIdx >= 0 && !bookHasImage && shorts?.bookBg) {
      const bookBgPath = shorts.bookBg.startsWith('episodes/') ? shorts.bookBg : `${imgBase}/${shorts.bookBg}`
      push(bookBgPath, segStarts[bookSegIdx])
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

  return (
    <AbsoluteFill style={{ backgroundColor: DARK.base }}>
      {/* BGM (쇼츠별) */}
      {shorts?.bgm?.length && <BgmAudio tracks={shorts.bgm} totalFrames={compFrames} />}

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
        if (seg.visual === 'cta' || !seg.duration) return null
        const audioFrom = i === 0 ? segStarts[i] - f(0.15) : segStarts[i]
        return (
          <Sequence key={seg.id} from={audioFrom} durationInFrames={segTimings[i]}>
            <Audio src={vf(vnShort(i, seg.id, shortsIndex))} />
          </Sequence>
        )
      })}
      {/* CTA chime — BGM 있으면 생략 */}
      {ctaIdx >= 0 && !shorts?.bgm?.length && (
        <Sequence from={segStarts[ctaIdx]} durationInFrames={SHORT_CTA_FRAMES}>
          <Audio src={sf('common/sfx/chime.wav')} volume={0.5} />
        </Sequence>
      )}

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
              <div style={{ margin: '20px auto 0' }}>
                <CircleAvatar avatarUrl={host.avatar_url} size={RIGHT_STRIP_W - 40} />
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
            <CircleAvatar avatarUrl={host.avatar_url} size={340} />
          </div>
        )
      })()}

      {/* ── 자막 (하단) ── */}
      {segments.map((seg, i) => {
        if (seg.visual === 'cta' || seg.visual === 'hook' || seg.role === 'celeb') return null
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

      {/* ── 훅 텍스트 (화면 중앙) ── */}
      {segments.map((seg, i) => {
        if (seg.visual !== 'hook') return null
        const op = segOp(i)
        if (op <= 0) return null
        const timingKey = vnTimingKey(vnShort(i, seg.id, shortsIndex))
        const timings = script.voiceTimings?.[timingKey]
        // 문장 분리: 마침표/물음표/느낌표 기준 (2그룹: primary + secondary)
        // \n은 개행만 담당 — Typewriter의 whiteSpace:pre-wrap이 처리
        const plainText = seg.text.replace(/\n/g, ' ')
        const hookSentences = plainText.split(/(?<=[.?!。])\s+/).filter(Boolean)
        const hasTwo = hookSentences.length >= 2
        const hlStart = segStarts[i] - f(0.15)
        const spreadFrames = seg.duration ? Math.ceil(seg.duration * FPS) : 150

        // 원본 텍스트(\n 보존)를 첫 문장/나머지로 분리
        let sent1Text = seg.text
        let sent2Text = ''
        if (hasTwo) {
          const s1Len = hookSentences[0].length
          let matched = 0; let splitPos = seg.text.length
          for (let ci = 0; ci < seg.text.length && matched < s1Len; ci++) {
            if (seg.text[ci] === '\n') continue
            matched++
            if (matched === s1Len) { splitPos = ci + 1; break }
          }
          sent1Text = seg.text.slice(0, splitPos).trim()
          sent2Text = seg.text.slice(splitPos).trim()
        }

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
                    text={sent1Text}
                    startFrame={hlStart}
                    spreadFrames={spreadFrames}
                    color="#c8a46e"
                    highlightColor="#f5e6c8"
                    fontSize={66}
                    style={{ fontFamily: FONT.serif, fontWeight: 800, textAlign: 'center', lineHeight: 1.4 }}
                    timings={timings1}
                  />
                </div>
                <div style={{ width: 60, height: 2, backgroundColor: '#c8a46e', opacity: 0.3 }} />
                <div style={{ maxWidth: 780, textAlign: 'center', textWrap: 'balance', wordBreak: 'keep-all' } as React.CSSProperties}>
                  <Typewriter
                    text={sent2Text}
                    startFrame={hlStart}
                    spreadFrames={spreadFrames}
                    color="#cec6b6"
                    fontSize={56}
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

      {/* ── 셀럽 인용구 (화면 중앙) — \n 문단 분할 시 페이지 전환 ── */}
      {segments.map((seg, i) => {
        if (seg.role !== 'celeb') return null
        const op = segOp(i)
        if (op <= 0) return null
        const timingKey = vnTimingKey(vnShort(i, seg.id, shortsIndex))
        const timings = script.voiceTimings?.[timingKey] as { start: number; end: number; text: string }[] | undefined
        const paragraphs = seg.text.split('\n').filter(Boolean)
        const hasParagraphs = paragraphs.length >= 2

        // 문단별 타이밍 분할: 공백 제거한 누적 글자수 기준으로 timings 분배
        type VTSeg = { start: number; end: number; text: string }
        const paraTimings: VTSeg[][] = []
        if (hasParagraphs && timings && timings.length > 0) {
          const strip = (s: string) => s.replace(/\s/g, '')
          // 각 문단의 누적 글자수 (공백 제거)
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

        // 문단별 프레임 범위
        // "..." whisper 아티팩트를 건너뛰고 실제 발화 시작으로 범위 산출
        // → imageChangeAt 앵커 타이밍과 정확히 일치시켜 이미지·텍스트 전환 동기화
        const isArtifact = (t: VTSeg) => /^[.…]+$/.test(t.text ?? '')
        const paraRanges: { start: number; end: number }[] = paraTimings.length > 0
          ? paraTimings.map((pt) => {
              if (!pt || pt.length === 0) return { start: segStarts[i], end: segStarts[i] + segTimings[i] }
              const realFirst = pt.find(t => !isArtifact(t)) ?? pt[0]
              return { start: segStarts[i] + Math.round(realFirst.start * FPS), end: segStarts[i] + Math.round(pt[pt.length - 1].end * FPS) }
            })
          : (() => {
              // voiceTimings 없을 때: 글자수 비율로 세그먼트 시간 분배
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
          <div key={`quote-${i}`} style={{
            position: 'absolute',
            top: HEADER_H, bottom: SAFE_BOTTOM,
            left: 0, right: 0,
            zIndex: 15,
            opacity: op,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            padding: `0 ${CONTENT_PAD}px`,
            paddingRight: `${CONTENT_PAD + 120}px`,
          }}>
            {hasParagraphs ? paragraphs.map((para, pi) => {
              const range = paraRanges[pi]
              const nextStart = pi < paragraphs.length - 1 ? paraRanges[pi + 1].start : Infinity
              const fadeIn = interpolate(frame, [range.start - f(0.3), range.start], [0, 1], CL)
              const fadeOut = pi < paragraphs.length - 1
                ? interpolate(frame, [nextStart - f(0.4), nextStart - f(0.1)], [1, 0], CL)
                : 1
              const paraOp = Math.min(fadeIn, fadeOut)
              if (paraOp <= 0) return null
              const riseY = interpolate(frame, [range.start - f(0.3), range.start], [20, 0], CL)
              return (
                <div key={pi} style={{
                  position: 'absolute', left: CONTENT_PAD, right: CONTENT_PAD + 120,
                  maxWidth: 780,
                  borderLeft: '4px solid rgba(200,164,110,0.4)',
                  paddingLeft: 24,
                  opacity: paraOp,
                  transform: `translateY(${riseY}px)`,
                }}>
                  <Typewriter
                    text={para}
                    startFrame={paraTimings[pi]?.length ? segStarts[i] : range.start}
                    spreadFrames={paraTimings[pi]?.length ? segTimings[i] : range.end - range.start}
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
                    timings={paraTimings[pi]?.length ? paraTimings[pi] : undefined}
                  />
                </div>
              )
            }) : (
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
                  timings={timings}
                />
              </div>
            )}
            {/* 인용 출처 — celeb 세그먼트 하단에 작은 글씨로 표시 */}
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

      {/* ══ CTA + Logo — 전폭, 공유 배경 ══ */}
      {(() => {
        const ctaStart = ctaIdx >= 0 ? segStarts[ctaIdx] : logoStart
        const endFrame = logoStart + logoFrames
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
        // logoContentOp는 상단 스코프에서 단일 정의 (풀스크린 오버레이도 동일 값을 참조)

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
            {/* LOGO 영역 배경/콘텐츠는 이 MID_H 블록에서 제거됨 — 풀스크린 ShortsThumbnail 오버레이로 분리 */}
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

          </div>
        )
      })()}

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
