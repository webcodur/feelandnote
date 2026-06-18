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
import { fadeInOut, safeImg, sf, makeVf, dbToLinear } from './utils'
import { expandSubTimings } from './sentence-split'
import { safePrefetch } from './safe-prefetch'
import { DARK } from '../theme'
import { FONT } from './fonts'
import {
  SHORT_REVEAL_ENABLED, SHORT_REVEAL_FRAMES,
  SHORT_OUTRO_OPEN,
  SHORT_LOGO_FADE_OUT, SHORT_LOGO_FADE_OUT_BGM,
  shortTotalFrames, shortSegLayout, resolveShortLogoFrames, FPS, f,
} from './timing'
import { EPISODE_NAME, loadVoiceSelect, episodeDir, resolveImageFile } from './script'
import {
  SHORT_W as W, SHORT_HEADER_H as HEADER_H, SHORT_SAFE_BOTTOM as SAFE_BOTTOM,
  SHORT_MID_H as MID_H, SHORT_RIGHT_STRIP_W as RIGHT_STRIP_W,
  SHORT_CONTENT_PAD as CONTENT_PAD, REVEAL_BG, CL,
} from './shorts-constants'

import { ShortDevOverlay } from './studio/ShortDevOverlay'
import { SubEditor } from './studio/SubEditor'
import { vnShort, vnTimingKey } from './voice-names'
import { clampRate } from './playback-rate'
import { ShortCaption } from './sections/ShortCaption'
import { BgmAudio, BgmToggle } from './BgmAudio'
import { Typewriter } from './sections/Typewriter'
import { ShortsThumbnail } from '../Thumbnail/ShortsThumbnail'
import { CircleAvatar } from './sections/CircleAvatar'
import { ShortBackgroundLayer } from './sections/ShortBackgroundLayer'
import { SfxAudioLayer } from './sections/SfxAudioLayer'
import { buildSfxRenderItems, type SfxSection } from './sfx-build'

/** 사운드 이펙트 폴더 경로 — episodes/{status}/{person}/soundeffect/{file} */
const shortsSfxBase = (epName: string) => {
  const person = epName.replace(/-en$/, '').replace(/-\d+(-en)?$/, '')
  const dir = episodeDir[epName] ?? episodeDir[person] ?? person
  return `episodes/${dir}/soundeffect`
}

type Props = { script: BookRecommendScript; episodeName?: string; shortsIndex: number }

/** 쇼츠 총 프레임 계산. shortsIndex는 1-based (필수) */
export const calcShortTotalFrames = (script: BookRecommendScript, shortsIndex: number) => {
  const shorts = script.shorts?.[shortsIndex - 1]
  if (!shorts?.segments) return 300
  return shortTotalFrames(shorts.segments, !!(shorts.bgm?.length), shorts.logoDurationSec)
}

export const BookRecommendShort: React.FC<Props> = ({ script, episodeName, shortsIndex }) => {
  const frame = useCurrentFrame()
  const { fps, durationInFrames: compFrames } = useVideoConfig()
  const epName = episodeName ?? EPISODE_NAME
  const vf = makeVf(epName, loadVoiceSelect(epName), script.locale, !!script.host.elevenlabsVoiceId)
  const { host, books } = script
  // shortsIndex: 배열 위치(1-based, 데이터 접근용) → 배열 접근 시 -1 변환
  const shorts = script.shorts?.[shortsIndex - 1]
  // slot: 고정 출력 번호. 음성 파일·voiceTimings 키가 모두 slot 기준(shorts-{slot}/…)이므로
  // 발행 순서로 배열 위치와 slot 이 어긋날 때(예: 아틀라스 배열4위·slot8) 음성 경로는 반드시 slot 을 쓴다.
  const slot = shorts?.slot ?? shortsIndex
  const segments = shorts?.segments ?? []
  const hasVoice = segments.some(s => (s.duration ?? 0) > 0)
  const hasBgm = !!(shorts?.bgm?.length)
  const logoFrames = resolveShortLogoFrames(shorts?.logoDurationSec, hasBgm)
  const bi = shorts?.featuredBookIndex ?? 0
  const book = books[bi]
  const sfxBase = shortsSfxBase(epName)
  const revealBgUrl = shorts?.revealBg ? sf(resolveImageFile(epName, shorts.revealBg)) : null
  const bookBgUrl = shorts?.bookBg ? sf(resolveImageFile(epName, shorts.bookBg)) : null

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
  const { segTimings, segStarts, logoStart, revealStart } = shortSegLayout(segments)

  // --- prefetch ---
  useEffect(() => {
    if (!hasVoice) return
    const audioUrls = [
      ...segments.flatMap((seg, i) => seg.duration && !seg.disabled ? [vf(vnShort(i, seg.id, slot))] : []),
      ...segments.flatMap(seg => seg.disabled ? [] : (seg.sfx ?? []).map(sx =>
        sf(sx.file.startsWith('episodes/') ? sx.file : `${sfxBase}/${sx.file}`),
      )),
    ]
    const imageUrls = [
      ...(revealBgUrl ? [revealBgUrl] : []),
      ...(bookBgUrl ? [bookBgUrl] : []),
      ...segments.flatMap(seg => {
        const img1 = seg.image ? resolveImageFile(epName, seg.image) : null
        const imgs = img1 ? [sf(img1)] : []
        if (seg.imageChangeAt) {
          const changes = Array.isArray(seg.imageChangeAt) ? seg.imageChangeAt : [seg.imageChangeAt]
          imgs.push(...changes.map(c => sf(resolveImageFile(epName, c.image))))
        }
        return imgs
      }),
    ]
    const cleanups = [
      ...audioUrls.map(u => safePrefetch(u, { method: 'blob-url', contentType: 'audio/wav' }).free),
      ...imageUrls.map(u => safePrefetch(u, { method: 'blob-url' }).free),
    ]
    return () => cleanups.forEach(fn => fn())
  }, [segments.length, hasVoice, epName])

  // --- helpers ---
  const introIdx = segments.findIndex(s => s.id === 'intro' && !s.disabled)
  const segOp = (i: number) => {
    // 영상 제외 세그먼트 — 자막·우상단·텍스트오버레이·인용출처가 모두 segOp 기반이라 여기서 한 번에 차단.
    if (segments[i]?.disabled) return 0
    if (i === 0) {
      // 훅이 영상 첫 프레임에 등장할 수 있어 페이드인을 0.3초 부여한다.
      // segStarts[0]이 0이 아닐 때(폴백 흐름)도 동작하도록 Math.max로 클램프.
      const riseDur = f(0.3)
      const riseStart = Math.max(0, segStarts[0] - riseDur)
      const segEnd = segStarts[0] + segTimings[0]
      if (frame < riseStart || frame >= segEnd) return 0
      if (frame < riseStart + riseDur) return (frame - riseStart) / riseDur
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

  const bookSegIdx = segments.findIndex(s => s.visual === 'book' && !s.disabled)
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
  // 훅 → 리빌 → 다음 세그먼트 흐름에서, 리빌이 일찍 사라지면 갭 동안 훅 배경 이미지가
  // 다시 노출되어 깜빡임이 발생한다. 따라서 리빌은 다음 세그먼트(인트로 등) 시작 시점까지
  // 유지하고, 그 직전 0.5초간 페이드아웃하여 imageGroup 페이드인과 자연스럽게 교차한다.
  // revealStart가 0이면(훅 없는 폴백) 첫 프레임부터 표시 + 종전 페이드아웃 유지.
  const hookFirstFlow = revealStart > 0
  const revealFadeIn = hookFirstFlow ? f(0.5) : 0
  const revealFadeOut = f(0.8)
  const revealEnd = hookFirstFlow && segStarts.length > 1
    ? segStarts[1]
    : revealStart + SHORT_REVEAL_FRAMES
  // 단조성 보장: 페이드아웃 시작점이 페이드인 종료보다 항상 뒤에 오도록 클램프
  const revealHoldEnd = Math.max(revealStart + revealFadeIn + 1, revealEnd - revealFadeOut)
  const revealFadeInSafe = Math.max(1, revealFadeIn)
  // SHORT_REVEAL_ENABLED=false면 리빌 오버레이를 그리지 않는다 (timing.ts에서 시간도 제거됨)
  const revealOp = !SHORT_REVEAL_ENABLED ? 0 : interpolate(frame,
    [revealStart, revealStart + revealFadeInSafe, revealHoldEnd, revealEnd],
    [revealFadeIn > 0 ? 0 : 1, 1, 1, 0], CL,
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
      if (seg.disabled) return  // 영상 제외 세그먼트의 배경 이미지는 그룹에 넣지 않는다.
      // 줌인: zoomIn === false면 강제 OFF. 그 외(true/undefined)는 ON.
      const segNoZoom = seg.zoomIn === false
      // seg.image 없음(dedup) → 직전 그룹의 이미지를 승계. 승계할 이미지도 없으면 skip.
      const inheritedImage = groups.length > 0 ? groups[groups.length - 1].image : null
      const baseImage = seg.image
        ? resolveImageFile(epName, seg.image)
        : inheritedImage
      if (!baseImage) return
      push(baseImage, segStarts[i], segNoZoom)
      // imageChangeAt 처리 경로는 seg.image 가 존재할 때만 의미 있음 (앵커 텍스트는 seg.text 기반)
      if (!seg.image) return
      if (seg.imageChangeAt) {
        const changes = Array.isArray(seg.imageChangeAt) ? seg.imageChangeAt : [seg.imageChangeAt]
        const timingKey = vnTimingKey(vnShort(i, seg.id, slot))
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
            // 1순위: sub-level 매칭 — 유저가 VoiceTimingEditor 에서 sub 경계(cyan 선)를 옮긴 교정값을
            //   존중. words(Whisper 자동) 보다 우선해야 수동 수정이 영상에 반영된다.
            //   anchor-resolve.ts 의 resolveAnchorTime 과 동일 정책.
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
            // 2순위: word-level 매칭 (Whisper word-timing — sub 가 없거나 매칭 실패 시 단어 단위 정밀 폴백)
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
          const img2 = resolveImageFile(epName, change.image)
          push(img2, segStarts[i] + f(resolved), segNoZoom)
        }
      }
    })
    // 책 세그먼트에 seg.image가 없으면서 bookBg(폴백)이 있으면 가상 그룹으로 추가.
    // hook/intro 이미지에서 자연스럽게 cross-fade 되도록 하기 위함.
    const bookHasImage = segments.some(s => s.visual === 'book' && s.image && !s.disabled)
    if (bookSegIdx >= 0 && !bookHasImage && shorts?.bookBg) {
      const bookBgPath = resolveImageFile(epName, shorts.bookBg)
      push(bookBgPath, segStarts[bookSegIdx], segments[bookSegIdx]?.zoomIn === false)
    }
    // 훅 → 리빌 → 다음 세그먼트 흐름에서, 다음 세그먼트의 첫 이미지 그룹을 리빌이
    // 완전히 덮은 시점으로 옮긴다. 페이드인 선행(약 0.3초)을 고려하여 시작점을
    // `revealStart + 0.8초` (= 리빌 페이드인 0.5초 + 페이드인 선행 0.3초)로 잡으면
    // 인트로 이미지의 페이드인 전 구간이 리빌 오버레이 뒤에 가려진다. 또한 훅 이미지의
    // 페이드아웃(인트로 시작과 동시)도 리빌이 불투명한 동안 진행되어 노출되지 않는다.
    if (revealStart > 0 && segments.length > 1) {
      const introSegStart = segStarts[1]
      const idx = groups.findIndex(g => g.start >= introSegStart)
      if (idx > 0) {
        groups[idx] = { ...groups[idx], start: revealStart + f(0.8) }
      }
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
  }, [segments, segStarts, script.voiceTimings, segTimings, fps, epName, bookSegIdx, shorts?.bookBg, revealStart])

  // --- SFX items: 텍스트 앵커 + offset → 절대 프레임으로 해상. 길이 제한·페이드아웃 포함. ---
  const sfxItems = React.useMemo(() => {
    const sections: SfxSection[] = segments.map((seg, i) => ({
      timingsKey: vnTimingKey(vnShort(i, seg.id, slot)),
      text: seg.text ?? '',
      startFrame: segStarts[i],
      durationFrames: segTimings[i],
      sfx: seg.disabled ? undefined : seg.sfx,  // 영상 제외 세그먼트의 효과음은 재생하지 않는다.
      keyPrefix: `sfx-${i}`,
    }))
    return buildSfxRenderItems({
      sections,
      voiceTimings: script.voiceTimings,
      fps,
      resolveSrc: file => file.startsWith('episodes/') ? sf(file) : sf(`${sfxBase}/${file}`),
    })
  }, [segments, segStarts, segTimings, script.voiceTimings, fps, sfxBase, shortsIndex])

  return (
    <AbsoluteFill style={{ backgroundColor: DARK.base }}>
      {/* BGM (쇼츠별) — 마지막 대사 오디오 끝 이후 볼륨 100% */}
      {shorts?.bgm?.length && (() => {
        const lastVoice = [...segments.entries()].filter(([, s]) => (s.duration ?? 0) > 0 && !s.disabled).at(-1)
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

      {/* audio — segments (hook은 rise 중 겹쳐서 시작) */}
      {hasVoice && segments.map((seg, i) => {
        if (!seg.duration || seg.disabled) return null
        const audioFrom = i === 0 ? Math.max(0, segStarts[i] - f(0.15)) : segStarts[i]
        return (
          <Sequence key={seg.id} from={audioFrom} durationInFrames={segTimings[i]}>
            <Audio src={vf(vnShort(i, seg.id, slot))} volume={(seg.volume ?? 1) * dbToLinear(seg.gainDb)} playbackRate={clampRate(seg.playbackRate)} />
          </Sequence>
        )
      })}

      {/* audio — soundeffect (단발, 선택적 길이 제한 + 페이드인/아웃) */}
      <SfxAudioLayer items={sfxItems} />

      {/* ── 오프닝 리빌: 무대/원형 인물 + 회전 책 포스터 (구버전 디자인) ──
          revealBgUrl(에피소드별)이 있으면 우선, 없으면 공용 reveal-bg.jpg.
          MID_H 영역에만 그려서 상단 타이포(zIndex 115)와 하단 블랙 마진(zIndex 10)이 겹치지 않게 한다. */}
      {revealOp > 0 && (() => {
        // 비트 줌 — 리빌 시작 시점부터 0.8초간 1.06 → 1.00
        const beatScale = interpolate(frame, [revealStart, revealStart + f(0.8)], [1.06, 1], CL)
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
        const timingKey = vnTimingKey(vnShort(i, seg.id, slot))
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

      {/* ── 인용 출처 (우상단) — 자막 종류와 무관하게 공통 위치. 메인 영역 zoom과 분리되어 항상 고정. ── */}
      {segments.map((seg, i) => {
        if (!seg.quoteSource) return null
        const op = segOp(i)
        if (op <= 0) return null
        return (
          <div key={`qs-${i}`} style={{
            position: 'absolute',
            top: HEADER_H + 24,
            right: CONTENT_PAD,
            zIndex: 25,
            opacity: op,
            maxWidth: 480,
            fontSize: 26,
            fontFamily: FONT.sans,
            fontWeight: 700,
            color: 'rgba(232, 210, 160, 0.98)',
            letterSpacing: 0.2,
            textAlign: 'right',
            wordBreak: 'keep-all',
            lineHeight: 1.35,
            WebkitTextStroke: '1.2px rgba(0,0,0,0.95)',
            paintOrder: 'stroke fill',
            textShadow: '0 2px 6px rgba(0,0,0,0.95), 0 0 12px rgba(0,0,0,0.8), 0 0 24px rgba(0,0,0,0.5)',
          }}>
            — {seg.quoteSource}
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
        const timingKey = vnTimingKey(vnShort(i, seg.id, slot))
        const timings = script.voiceTimings?.[timingKey] as { start: number; end: number; text: string; sub?: string[]; subTimings?: number[]; words?: { text: string; start: number; end: number }[] }[] | undefined
        // ── 문단 분할 정책 ───────────────────────────────────────────
        // paragraph 분할 = 본문 \n (작가가 화면 전환 위치를 명시적으로 제어).
        // 음원 timing은 먼저 sub 단위로 펼쳐(expandSubTimings) 평면 배열로 만든 뒤
        // paragraph에 분배한다 → 각 paragraph 안에서 sub 단위 sweep이 자연스럽게 작동.
        // paragraph 경계 시간은 글자 비례로 추정한 뒤 가장 가까운 sub 경계로 snap →
        // 작가 \n 위치와 sub 경계가 약간 어긋나도 매핑 누락 없이 정렬됨.
        type VTSeg = { start: number; end: number; text: string; sub?: string[]; subTimings?: number[]; words?: { text: string; start: number; end: number }[] }
        const isArtifact = (t: VTSeg) => /^[.…]+$/.test(t.text ?? '')
        const stripWS = (s: string) => s.replace(/\s/g, '')

        const paragraphs = seg.text.split('\n').filter(Boolean)
        const hasParagraphs = paragraphs.length >= 2

        let paraRanges: { start: number; end: number }[] = []
        const paraTimings: VTSeg[][] = paragraphs.map(() => [])

        if (hasParagraphs && timings && timings.length > 0) {
          const realChunks = timings.filter(t => !isArtifact(t))
          const chunks = realChunks.length > 0 ? realChunks : timings
          // sub 단위로 평면화 — 자막 sweep의 기본 단위가 sub.
          const expanded = expandSubTimings(chunks) as VTSeg[]
          const expLens = expanded.map(t => stripWS(t.text ?? '').length)
          const expCum: number[] = []
          { let cc = 0; for (const len of expLens) { cc += len; expCum.push(cc) } }
          const totalExpChars = expCum[expCum.length - 1] || 0

          const paraCum: number[] = []
          { let pc = 0; for (const p of paragraphs) { pc += stripWS(p).length; paraCum.push(pc) } }
          const totalParaChars = paraCum[paraCum.length - 1] || 0
          const scale = totalParaChars > 0 ? totalExpChars / totalParaChars : 1

          // 글자 위치(c, expanded 좌표계) → 시간(초)
          const charToSec = (c: number): number => {
            if (c <= 0) return expanded[0].start
            if (c >= totalExpChars) return expanded[expanded.length - 1].end
            let prev = 0
            for (let ei = 0; ei < expanded.length; ei++) {
              const expEnd = expCum[ei]
              if (c <= expEnd) {
                const inLen = c - prev
                const len = expEnd - prev
                const r = len > 0 ? inLen / len : 0
                return expanded[ei].start + r * (expanded[ei].end - expanded[ei].start)
              }
              prev = expEnd
            }
            return expanded[expanded.length - 1].end
          }

          // sub 경계 후보(각 expanded.end + 시작점)
          const subBoundaries: number[] = [expanded[0].start, ...expanded.map(t => t.end)]

          // paragraph 경계 시간을 추정한 뒤 가장 가까운 sub 경계로 snap
          const snapToSubBoundary = (sec: number): number => {
            let best = sec
            let bestDist = Infinity
            for (const b of subBoundaries) {
              const d = Math.abs(b - sec)
              if (d < bestDist) { bestDist = d; best = b }
            }
            return best
          }

          const rawBoundaries = paraCum.slice(0, -1).map(c => charToSec(c * scale))
          const snappedBoundaries = rawBoundaries.map(snapToSubBoundary)
          const paraBoundarySec: number[] = [
            expanded[0].start,
            ...snappedBoundaries,
            expanded[expanded.length - 1].end,
          ]

          paraRanges = paragraphs.map((_, pi) => ({
            start: segStarts[i] + Math.round(paraBoundarySec[pi] * FPS),
            end: segStarts[i] + Math.round(paraBoundarySec[pi + 1] * FPS),
          }))

          // expanded sub 단위 분배 — paragraph 경계가 sub 경계에 snap되어 있으므로
          // 각 expanded sub는 정확히 한 paragraph에 귀속된다.
          for (const exp of expanded) {
            for (let pi = 0; pi < paragraphs.length; pi++) {
              const pStart = paraBoundarySec[pi]
              const pEnd = paraBoundarySec[pi + 1]
              // sub 시작이 paragraph 범위 안이면 그 paragraph에 귀속
              if (exp.start >= pStart - 1e-3 && exp.start < pEnd - 1e-3) {
                paraTimings[pi].push(exp)
                break
              }
            }
          }
        }

        if (paraRanges.length === 0) {
          // 폴백 2: 음원 timing 부재 시 글자 비례 분배
          const totalLen = paragraphs.reduce((sum, p) => sum + stripWS(p).length, 0) || 1
          let acc = 0
          paraRanges = paragraphs.map((p) => {
            const ratio = stripWS(p).length / totalLen
            const start = segStarts[i] + Math.round(acc * segTimings[i])
            acc += ratio
            const end = segStarts[i] + Math.round(acc * segTimings[i])
            return { start, end }
          })
        }

        // active paragraph — 전환 시점을 그 단락의 첫 음성 발화 시작 프레임에 맞춘다.
        // paraRanges[pi].start는 sub 경계 snap 결과라 실제 첫 chunk보다 약간 일찍 잡힐 수 있는데,
        // 그대로 두면 앞 단락 텍스트가 일찍 사라지고 갭 동안 빈 박스만 보인다.
        // 첫 chunk start로 미루면 앞 단락 텍스트가 다음 발화 직전까지 그대로 유지된다.
        let activeIdx = 0
        if (hasParagraphs) {
          for (let pi = 0; pi < paragraphs.length; pi++) {
            const utteranceStartSec = paraTimings[pi]?.[0]?.start
            const transitionFrame = utteranceStartSec !== undefined
              ? segStarts[i] + Math.round(utteranceStartSec * FPS)
              : paraRanges[pi].start
            if (frame >= transitionFrame) activeIdx = pi
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

        // 활성 단락의 첫 음성 발화 시작 프레임 — 발화 전 lead silence 동안 빈 검은 박스만
        // 뜨던 문제를 막기 위해, 이 프레임 이전엔 박스+인용출처를 통째로 숨긴다.
        const activeUtteranceSec = activeTimings && activeTimings.length > 0
          ? activeTimings[0].start
          : undefined
        const activeUtteranceFrame = activeUtteranceSec !== undefined
          ? segStarts[i] + Math.round(activeUtteranceSec * FPS)
          : activeRange.start
        if (frame < activeUtteranceFrame) return null

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
              const txtPaintStyle: React.CSSProperties = {
                fontFamily: FONT.serif,
                fontWeight: 800,
                textAlign: 'left',
                lineHeight: 1.7,
                wordBreak: 'keep-all',
                // Chromium 117+ — 짧은 어절이 라인 끝에 단독으로 떨어지는 widow 회피
                textWrap: 'pretty' as const,
                WebkitTextStroke: '1.6px rgba(0,0,0,0.9)',
                paintOrder: 'stroke fill',
                textShadow: '0 0 8px rgba(0,0,0,0.95), 0 0 24px rgba(0,0,0,0.75), 0 4px 16px rgba(0,0,0,0.55)',
              }
              return (
                <div style={{
                  width: 780,
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
          </div>
        )
      })}

      {/* ── 훅 시각 신호 비활성화 (26.06.13 쇼츠 개편) — 화면 가장자리 골드 vignette 펄스.
            복원하려면 아래 블록의 주석을 해제한다.

      {(() => {
        const hookIdx = segments.findIndex(s => s.visual === 'hook' && !s.disabled)
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

      */}

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
          shortsIndex={slot}
        />
      )}
      {!getRemotionEnvironment().isRendering && (
        <SubEditor
           voiceTimings={script.voiceTimings}
           episodeName={epName}
           locale={script.locale ?? 'ko'}
           currentTimingKey={currentSeg >= 0 ? vnTimingKey(vnShort(currentSeg, segments[currentSeg].id, slot)) : undefined}
         />
       )}
      <BgmToggle hasBgm={!!shorts?.bgm?.length} />
    </AbsoluteFill>
  )
}
