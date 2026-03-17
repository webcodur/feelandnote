import React, { useEffect, useMemo } from 'react'
import { AbsoluteFill, Audio, getRemotionEnvironment, Img, interpolate, prefetch, Sequence, Series, useCurrentFrame } from 'remotion'
import type { BookRecommendScript, VoiceTimingSegment } from './types'
import { safeImg, fadeInOut, BrandLogo, BRAND_LOGO_SIZE, sf, makeVf } from './utils'
import { BrandIntro } from './BrandIntro'
import { HostIntro } from './HostIntro'
import { BookCardVisual } from './BookCardVisual'
import { BookRecap } from './BookRecap'
import { FONT } from './fonts'
import { Overlay } from './Overlay'
import { Subtitles, type Sub } from './Subtitles'
import {
  toFrames, toAudioFrames, BRAND_FRAMES, CELEB_VISUAL_DELAY,
  CONTEXT_QUOTE_GAP, QUOTE_CONTEXTAFTER_GAP, SENTENCE_BREATH,
  BOOK_GAP, RECAP_FRAMES, INTERLUDE_FRAMES, LOGO_FRAMES,
  CELEB_INTRO_FALLBACK, BRIDGE_FALLBACK, OUTRO_FALLBACK,
  TITLE_SUMMARY_GAP, SUMMARY_CONTEXT_GAP,
  titleSummaryGap, summaryContextGap, labelSummaryFrames, labelContextFrames,
  summaryPhaseEnd, contextPhaseEnd, quotePhaseEnd, bookTotalFrames,
  type LabelDurations, f, FPS,
} from './timing'
import { EPISODE_NAME, loadVoiceSelect, isVoiceReady, isContinuation } from './script'
import { RETURN_INTRO_FALLBACK, PREV_RECAP_FALLBACK } from './timing'

type Props = {
  script: BookRecommendScript
  /** 에피소드 이름 (음성 경로용) */
  episodeName?: string
}


export const calcTotalFrames = (script: BookRecommendScript) => {
  const { narrator, host, books } = script
  const cont = isContinuation(script)
  const ld: LabelDurations = { labelSummaryDuration: narrator.labelSummaryDuration, labelContextDuration: narrator.labelContextDuration }

  // --- Part 1 전용 섹션 ---
  const sgd = narrator.serviceGreetingDuration ?? 0
  const svcGreeting = cont ? 0 : (sgd > 0 ? toFrames(sgd) : 0)
  const svcIntro = cont ? 0 : ((narrator.serviceIntroDuration ?? 0) > 0 ? toFrames(narrator.serviceIntroDuration!) : 0)
  const celebIntro = cont ? 0 : (CELEB_VISUAL_DELAY + ((narrator.celebIntroDuration ?? 0) > 0 ? toFrames(narrator.celebIntroDuration!) : CELEB_INTRO_FALLBACK))
  const philosophy = cont ? 0 : toFrames(host.voiceDuration ?? 0)
  const hostIntroTotal = cont ? 0 : celebIntro + f(1) + philosophy

  // --- Continuation 전용 섹션 ---
  const returnIntro = cont ? ((narrator.returnIntroDuration ?? 0) > 0 ? toFrames(narrator.returnIntroDuration!) : RETURN_INTRO_FALLBACK) : 0
  const prevRecap = cont ? ((narrator.prevRecapDuration ?? 0) > 0 ? toFrames(narrator.prevRecapDuration!) : PREV_RECAP_FALLBACK) : 0

  // --- 공통 섹션 ---
  const fQuoteRaw = host.featuredQuoteDuration && host.featuredQuoteDuration > 0 ? toFrames(host.featuredQuoteDuration) : 0
  const fQuote = fQuoteRaw > 0 ? fQuoteRaw + f(1.5) : 0
  const bridge = narrator.bridgeDuration > 0 ? toFrames(narrator.bridgeDuration) : BRIDGE_FALLBACK
  const LSF = labelSummaryFrames(narrator.labelSummaryDuration)
  const LCF = labelContextFrames(narrator.labelContextDuration)
  const visualExtra = (LSF + LCF) * books.length
  const booksTotal = books.reduce((sum, b) => sum + bookTotalFrames(b, ld), 0)
  const bookGaps = Math.max(0, books.length - 1) * BOOK_GAP
  const interlude = books.length > 10 ? INTERLUDE_FRAMES : 0
  const midRecap = books.length > 10 ? RECAP_FRAMES : 0
  const outro = narrator.outroDuration > 0 ? toFrames(narrator.outroDuration) : OUTRO_FALLBACK
  return BRAND_FRAMES + svcGreeting + svcIntro + fQuote + returnIntro + prevRecap + hostIntroTotal + bridge + booksTotal + visualExtra + bookGaps + midRecap + interlude + RECAP_FRAMES + outro + LOGO_FRAMES
}

export const BookRecommend: React.FC<Props> = ({ script, episodeName }) => {
  const frame = useCurrentFrame()
  const epName = episodeName ?? EPISODE_NAME
  const vf = makeVf(epName, loadVoiceSelect(epName))
  const { narrator, host, books } = script
  const cont = isContinuation(script)

  /** 음성 준비 완료 여부 — false면 Audio/프리페치 전부 스킵 */
  const hasVoice = isVoiceReady(script)

  // 오디오 프리페치 — 음성 준비된 에피소드만
  useEffect(() => {
    if (!hasVoice) return
    const urls: string[] = [
      sf('sfx/chime.wav'),
      sf('sfx/page-turn.wav'),
      sf('sfx/whoosh.wav'),
      vf('label-summary.wav'),
      vf('label-context.wav'),
      ...(narrator.outroDuration > 0 ? [vf('narrator-outro.wav')] : []),
      ...(narrator.interludeDuration && narrator.interludeDuration > 0 ? [vf('interlude.wav')] : []),
      ...books.flatMap((_, i) => [
        vf(`book-${i}-title.wav`),
        vf(`book-${i}-summary.wav`),
        vf(`book-${i}-context.wav`),
        ...(books[i].directQuote ? [vf(`book-${i}-quote.wav`)] : []),
        ...(books[i].contextAfter ? [vf(`book-${i}-context-after.wav`)] : []),
      ]),
    ]
    if (cont) {
      // continuation 전용
      if ((narrator.returnIntroDuration ?? 0) > 0) urls.push(vf('return-intro.wav'))
      if ((narrator.prevRecapDuration ?? 0) > 0) urls.push(vf('prev-recap.wav'))
    } else {
      // Part 1 전용
      urls.push(sf('sfx/type-reveal.wav'))
      if ((narrator.serviceGreetingDuration ?? 0) > 0) {
        urls.push(vf('service-greeting.wav'))
      }
      if ((narrator.serviceIntroDuration ?? 0) > 0) urls.push(vf('service-intro.wav'))
      urls.push(vf('narrator-celeb-intro.wav'))
      urls.push(vf('philosophy.wav'))
    }
    if (host.featuredQuoteDuration && host.featuredQuoteDuration > 0) urls.push(vf('featured-quote.wav'))
    const cleanups = urls.map((url) => {
      const { free } = prefetch(url, { method: 'blob-url', contentType: 'audio/wav' })
      return free
    })
    return () => cleanups.forEach((fn) => fn())
  }, [books, hasVoice])

  // --- Part 1 전용 프레임 ---
  const celebIntroFrames = cont ? 0 : (CELEB_VISUAL_DELAY + ((narrator.celebIntroDuration ?? 0) > 0 ? toFrames(narrator.celebIntroDuration!) : CELEB_INTRO_FALLBACK))
  const philosophyFrames = cont ? 0 : toFrames(host.voiceDuration ?? 0)
  const hostIntroFrames = cont ? 0 : (celebIntroFrames + f(1) + philosophyFrames) // 1초 여유 후 감상철학

  const sgdR = narrator.serviceGreetingDuration ?? 0
  const svcGreetingFrames = cont ? 0 : (sgdR > 0 ? toFrames(sgdR) : 0)
  const svcIntroFrames = cont ? 0 : ((narrator.serviceIntroDuration ?? 0) > 0 ? toFrames(narrator.serviceIntroDuration!) : 0)

  // --- Continuation 전용 프레임 ---
  const returnIntroFrames = cont ? ((narrator.returnIntroDuration ?? 0) > 0 ? toFrames(narrator.returnIntroDuration!) : RETURN_INTRO_FALLBACK) : 0
  const prevRecapFrames = cont ? ((narrator.prevRecapDuration ?? 0) > 0 ? toFrames(narrator.prevRecapDuration!) : PREV_RECAP_FALLBACK) : 0

  // --- 공통 ---
  const bridgeFrames = narrator.bridgeDuration > 0 ? toFrames(narrator.bridgeDuration) : BRIDGE_FALLBACK
  const fQuoteFramesRaw = host.featuredQuoteDuration && host.featuredQuoteDuration > 0 ? toFrames(host.featuredQuoteDuration) : 0
  const fQuoteFrames = fQuoteFramesRaw > 0 ? fQuoteFramesRaw + f(1.5) : 0 // reveal 대기 + 엔딩 여유

  let cursor = 0
  const brandStart = cursor
  cursor += BRAND_FRAMES
  // continuation: ReturnIntro → FeaturedQuote → PrevRecap → Bridge → Books
  // Part 1: SvcGreeting → SvcIntro → FeaturedQuote → HostIntro → Bridge → Books
  const returnIntroStart = cursor
  cursor += returnIntroFrames
  const svcGreetingStart = cursor
  cursor += svcGreetingFrames
  const svcIntroStart = cursor
  cursor += svcIntroFrames
  const fQuoteStart = cursor
  cursor += fQuoteFrames
  const prevRecapStart = cursor
  cursor += prevRecapFrames
  const hostIntroStart = cursor
  cursor += hostIntroFrames
  const bridgeStart = cursor
  cursor += bridgeFrames

  const ld: LabelDurations = { labelSummaryDuration: narrator.labelSummaryDuration, labelContextDuration: narrator.labelContextDuration }
  const TITLE_SUMMARY_GAP_F = titleSummaryGap(ld.labelSummaryDuration)
  const SUMMARY_CONTEXT_GAP_F = summaryContextGap(ld.labelContextDuration)
  const LABEL_SUMMARY_F = labelSummaryFrames(ld.labelSummaryDuration)
  const LABEL_CONTEXT_F = labelContextFrames(ld.labelContextDuration)

  const bookTimings = books.map((b) => ({
    titleFrames: toFrames(b.titleDuration),
    summaryFrames: toFrames(b.summaryDuration),
    contextFrames: toFrames(b.contextDuration),
    quoteFrames: b.quoteDuration ? toFrames(b.quoteDuration) : 0,
    contextAfterFrames: b.contextAfterDuration ? toFrames(b.contextAfterDuration) : 0,
    summaryEnd: summaryPhaseEnd(b, ld),
    contextEnd: contextPhaseEnd(b, ld),
    quoteEnd: quotePhaseEnd(b, ld),
    total: bookTotalFrames(b, ld) + LABEL_SUMMARY_F + LABEL_CONTEXT_F,
    hasQuote: !!b.quoteDuration,
    hasContextAfter: !!b.contextAfterDuration,
  }))

  const hasInterlude = books.length > 10
  const interludeIndex = hasInterlude ? Math.ceil(books.length / 2) : -1
  const interludeFrames = hasInterlude
    ? (narrator.interludeDuration && narrator.interludeDuration > 0 ? toFrames(narrator.interludeDuration) : INTERLUDE_FRAMES)
    : 0

  const bookStarts: number[] = []
  let interludeStart = 0
  let midRecapStart = 0
  for (let bi = 0; bi < bookTimings.length; bi++) {
    if (bi > 0) cursor += BOOK_GAP
    if (bi === interludeIndex) {
      // 중간 리캡 → 인터루드 순서
      midRecapStart = cursor
      cursor += RECAP_FRAMES
      interludeStart = cursor
      cursor += interludeFrames
    }
    bookStarts.push(cursor)
    cursor += bookTimings[bi].total
  }

  // 리캡 대상 분할: 인터루드 있으면 후반부만, 없으면 전체
  const firstHalfBooks = hasInterlude ? books.slice(0, interludeIndex) : []
  const secondHalfBooks = hasInterlude ? books.slice(interludeIndex) : books

  const recapStart = cursor
  cursor += RECAP_FRAMES

  const outroStart = cursor
  const outroFrames = narrator.outroDuration > 0 ? toFrames(narrator.outroDuration) : OUTRO_FALLBACK

  // 배경
  const vignetteOpacity = interpolate(frame, [0, f(1)], [1, 0.6], { extrapolateRight: 'clamp' })

  // 브릿지
  const bridgeLocal = frame - bridgeStart
  const bridgeOpacity = bridgeLocal >= 0 && bridgeLocal < bridgeFrames
    ? fadeInOut(bridgeLocal, 0, bridgeFrames, f(0.5), f(0.5))
    : 0

  // --- 캐러셀 전환 헬퍼 ---
  const renderBookCarousel = (localFrame: number, duration: number, fromIdx: number, toIdx: number, opacity: number) => {
    if (opacity <= 0) return null
    const CARD_W = 100, CARD_H = 150, CARD_GAP = 24
    const CARD_STEP = CARD_W + CARD_GAP
    const VIEWPORT_W = CARD_STEP * 5
    const POINTER_W = 120

    // 타이밍: 정지(15%) → 스크롤(35%) → 정지(50%)
    const holdEnd = Math.round(duration * 0.15)
    const scrollEnd = Math.round(duration * 0.5)
    const scrollProgress = interpolate(localFrame, [holdEnd, scrollEnd], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    const centerPos = interpolate(scrollProgress, [0, 1], [fromIdx, toIdx])
    const scrollX = centerPos * CARD_STEP

    const numStyle = { color: '#c8a46e', fontSize: 24, fontFamily: FONT.cinzel, fontWeight: 600 } as const
    const numFrom = fromIdx + 1
    const numTo = toIdx + 1
    const numProgress = scrollProgress
    const maxNum = Math.max(numFrom, numTo)
    const slotW = maxNum >= 10 ? 32 : 18
    const slotH = 28

    // "BOOK SHELF" 라벨 opacity
    const labelOp = fadeInOut(localFrame, f(0.17), duration - f(0.33), f(0.5), f(0.5))

    return (
      <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity, gap: 0 }}>
        {/* BOOK SHELF 라벨 */}
        <div style={{ color: '#c8a46e', fontSize: 14, fontFamily: FONT.cinzel, letterSpacing: 8, fontWeight: 600, opacity: labelOp, marginBottom: 16 }}>
          BOOK SHELF
        </div>

        {/* 넘버링 — fade in/out */}
        <div style={{ marginBottom: 20 }}>
          <span style={{
            ...numStyle,
            opacity: fromIdx === toIdx ? 1 : interpolate(numProgress, [0, 0.4, 0.6, 1], [1, 0, 0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
          }}>
            {fromIdx === toIdx || numProgress < 0.5 ? numFrom : numTo}/{books.length}
          </span>
        </div>

        {/* 상단 포인터 */}
        <div style={{ width: POINTER_W, height: 2, backgroundColor: '#c8a46e', opacity: 0.5, marginBottom: 16 }} />

        {/* 캐러셀 */}
        <div style={{
          width: VIEWPORT_W, overflow: 'hidden', position: 'relative',
          maskImage: 'linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)',
        }}>
          <div style={{ display: 'flex', gap: CARD_GAP, alignItems: 'center', transform: `translateX(${-scrollX + VIEWPORT_W / 2 - CARD_W / 2}px)` }}>
            {books.map((b, bi) => {
              const dist = Math.abs(bi - centerPos)
              if (dist > 4) return <div key={bi} style={{ width: CARD_W, flexShrink: 0 }} />
              const isCurrent = Math.round(centerPos) === bi
              const scale = interpolate(dist, [0, 1, 2], [1.05, 0.9, 0.75], { extrapolateRight: 'clamp' })
              return (
                <div key={bi} style={{ flexShrink: 0, width: CARD_W, transform: `scale(${scale})` }}>
                  <div style={{
                    width: CARD_W, height: CARD_H, borderRadius: 6, overflow: 'hidden',
                    boxShadow: isCurrent ? '0 8px 30px rgba(200,164,110,0.25)' : '0 4px 12px rgba(0,0,0,0.4)',
                    border: isCurrent ? '2px solid rgba(200,164,110,0.6)' : '1px solid rgba(200,164,110,0.08)',
                  }}>
                    <Img src={safeImg(b.thumbnail_url)} style={{
                      width: '100%', height: '100%', objectFit: 'cover',
                      filter: isCurrent ? 'brightness(1)' : 'brightness(0.4)',
                    }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 하단 포인터 */}
        <div style={{ width: POINTER_W, height: 2, backgroundColor: '#c8a46e', opacity: 0.5, marginTop: 16 }} />
      </AbsoluteFill>
    )
  }


  return (
    <AbsoluteFill style={{ backgroundColor: '#0a0a0a' }}>
      {/* 배경 */}
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 40%, #1a1510 0%, #0a0a0a 70%)' }} />
      <AbsoluteFill
        style={{
          backgroundImage:
            'linear-gradient(rgba(200,164,110,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(200,164,110,0.03) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
      <AbsoluteFill
        style={{ background: `radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,${vignetteOpacity}) 100%)` }}
      />

      {/* 브랜드 */}
      <Sequence from={brandStart} durationInFrames={BRAND_FRAMES}>
        {hasVoice && <Audio src={sf('sfx/chime.wav')} volume={0.6} />}
        <BrandIntro durationFrames={BRAND_FRAMES} />
      </Sequence>

      {/* ===== Continuation: ReturnIntro + PrevRecap ===== */}
      {cont && returnIntroFrames > 0 && (
        <Sequence from={returnIntroStart} durationInFrames={returnIntroFrames}>
          {hasVoice && (narrator.returnIntroDuration ?? 0) > 0 && <Audio src={vf('return-intro.wav')} />}
          {(() => {
            const local = frame - returnIntroStart
            const op = local >= 0 && local < returnIntroFrames
              ? fadeInOut(local, 0, returnIntroFrames, f(0.67), f(0.5))
              : 0
            if (op <= 0) return null
            return (
              <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: op, gap: 20 }}>
                <Img src={host.avatar_url} style={{ width: 160, height: 160, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(200,164,110,0.3)' }} />
                <div style={{ color: '#e8e0d0', fontSize: 26, fontFamily: FONT.sans, textAlign: 'center', maxWidth: 800, lineHeight: 1.7 }}>
                  {narrator.returnIntro}
                </div>
                {script.series && (
                  <div style={{ color: '#c8a46e', fontSize: 16, fontFamily: FONT.cinzel, letterSpacing: 4 }}>
                    PART {script.series.part} / {script.series.totalParts}
                  </div>
                )}
              </AbsoluteFill>
            )
          })()}
        </Sequence>
      )}
      {cont && prevRecapFrames > 0 && (
        <Sequence from={prevRecapStart} durationInFrames={prevRecapFrames}>
          {hasVoice && (narrator.prevRecapDuration ?? 0) > 0 && <Audio src={vf('prev-recap.wav')} />}
          {(() => {
            const local = frame - prevRecapStart
            const op = local >= 0 && local < prevRecapFrames
              ? fadeInOut(local, 0, prevRecapFrames, f(0.67), f(0.5))
              : 0
            if (op <= 0) return null
            return (
              <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: op, gap: 16 }}>
                <div style={{ color: '#c8a46e', fontSize: 14, fontFamily: FONT.cinzel, letterSpacing: 6 }}>PREVIOUSLY</div>
                <div style={{ width: 400, height: 1, backgroundColor: '#c8a46e', opacity: 0.3 }} />
                <div style={{ color: '#ccc', fontSize: 22, fontFamily: FONT.sans, textAlign: 'center', maxWidth: 900, lineHeight: 1.8, marginTop: 8 }}>
                  {narrator.prevRecap}
                </div>
              </AbsoluteFill>
            )
          })()}
        </Sequence>
      )}

      {/* 서비스 인사 — 단일 오디오 */}
      {!cont && hasVoice && svcGreetingFrames > 0 && (
        <Sequence from={svcGreetingStart} durationInFrames={svcGreetingFrames}>
          <Audio src={vf('service-greeting.wav')} />
        </Sequence>
      )}
      {!cont && hasVoice && svcIntroFrames > 0 && (
        <Sequence from={svcIntroStart} durationInFrames={svcIntroFrames}>
          <Audio src={vf('service-intro.wav')} />
        </Sequence>
      )}
      {hasVoice && fQuoteFrames > 0 && (
        <Sequence from={fQuoteStart} durationInFrames={fQuoteFrames}>
          <Sequence from={f(1)} durationInFrames={fQuoteFrames}>
            <Audio src={vf('featured-quote.wav')} />
          </Sequence>
        </Sequence>
      )}

      {/* ===== 통합 프리인트로: ServiceIntro + FeaturedQuote (Part 1 only) =====
           나레이션 문장에 동기화된 비주얼 시퀀스:
           1. "필앤노트 서재 탐방 코너에서는" → 라벨 + 책 등장(어둡게)
           2. "한 인물의 서재를 열어" → 책 밝아짐
           3. "그들이 사랑한 것들과" → 책 점프
           4. "오늘 함께할 인물은 알렉산더 대왕입니다" → 아바타 등장 → reveal */}
      {!cont && (() => {
        const totalPreIntro = svcGreetingFrames + svcIntroFrames + fQuoteFrames
        if (totalPreIntro <= 0) return null
        const local = frame - svcGreetingStart
        if (local < -5 || local > totalPreIntro + 5) return null

        const CL = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const }

        // ── parts 기반 정확한 타이밍 ──
        // 비율 기반 타이밍 (단일 오디오)
        const gf = svcGreetingFrames
        const CORNER = 0                              // "feelandnote 서재 탐방 코너에서는,"
        const LIBRARY = Math.round(gf * 0.35)         // "한 인물의 서재를 열어,"
        const INTRODUCE = Math.round(gf * 0.55)       // "그들이 사랑한 것들과 그 이유를 소개합니다."

        // 책 등장 — 첫 파트부터 바로
        const shelfAppear = f(0.17)
        // 책 밝게 — "그들이 사랑한 것들과"
        const shelfBright = INTRODUCE
        // 아바타 등장 — serviceIntro "오늘 함께할 인물은"
        const svcTotalEnd = svcGreetingFrames + svcIntroFrames
        const avatarAppear = svcGreetingFrames
        // reveal — "알렉산더 대왕입니다" 발화 중간에 reveal
        const revealAt = svcGreetingFrames + Math.round(svcIntroFrames * 0.5)

        // ── "서재 탐방" 라벨 ──
        const labelOp = fadeInOut(local, CORNER, svcTotalEnd - CORNER, f(0.67), f(0.67))

        // ── 책 표지: shelfAppear에서 등장, shelfBright에서 밝아짐 ──
        const shelfOp = interpolate(local,
          [shelfAppear, shelfAppear + f(0.67), svcTotalEnd - f(0.5), svcTotalEnd],
          [0, 1, 1, 0], CL)
        const brightStart = Math.max(shelfAppear + 1, LIBRARY)
        const baseBrightness = interpolate(local, [shelfAppear, brightStart, brightStart + f(0.67)], [0.35, 0.35, 0.85], CL)
        const shelfBrightness = Math.max(0.3, baseBrightness)

        // ── 책 순차 점프: "그들이 사랑한...소개합니다" 구간 ──
        const jumpStart = shelfBright
        const jumpEnd = svcGreetingFrames
        const jumpDuration = jumpEnd - jumpStart
        const bookCount = Math.min(books.length, 7)

        // ── 아바타: avatarAppear에서 등장, revealAt에서 밝아짐 ──
        const avatarIn = interpolate(local, [avatarAppear, avatarAppear + f(0.67)], [0, 1], CL)
        const avatarOut = interpolate(local, [totalPreIntro - f(0.83), totalPreIntro], [1, 0], CL)
        const avatarOp = Math.min(avatarIn, avatarOut)
        const revealProgress = interpolate(local, [revealAt, revealAt + f(0.83)], [0, 1], CL)
        const imgBrightness = interpolate(revealProgress, [0, 1], [0.08, 1])
        const borderAlpha = interpolate(revealProgress, [0, 1], [0.15, 0.35])
        const questionOp = interpolate(revealProgress, [0, 0.5], [1, 0], CL)

        // ── 이름: reveal 후 등장 ──
        const nameOp = interpolate(local,
          [revealAt + f(0.33), revealAt + f(1), totalPreIntro - f(0.83), totalPreIntro],
          [0, 1, 1, 0], CL)

        // ── 명언 (fQuote 구간) — reveal 완료 후 등장, 끝나고 45프레임 여유 ──
        const hasFQ = fQuoteFrames > 0 && !!host.featuredQuote
        const quoteVisualStart = svcTotalEnd + f(0.5) // serviceIntro 오디오 종료 + 여유 후 페이드인
        const quoteOp = hasFQ
          ? interpolate(local,
              [quoteVisualStart, quoteVisualStart + f(0.83), totalPreIntro - f(1.5), totalPreIntro - f(0.5)],
              [0, 1, 1, 0], CL)
          : 0

        if (avatarOp <= 0 && labelOp <= 0 && shelfOp <= 0 && quoteOp <= 0) return null

        return (
          <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            {/* 아바타 블록 — 하단 요소가 먼저 내려간 뒤 페이드인 */}
            {(() => {
              // 아바타 공간 확보: avatarAppear 15프레임 전부터 높이 확장
              const spaceStart = avatarAppear - f(0.5)
              const avatarHeight = 180 + 14 + 48 + 12 // 아바타 + gap + 이름 + margin
              const spaceH = interpolate(local, [spaceStart, avatarAppear], [0, avatarHeight], CL)
              // 아바타 자체는 공간 확보 후 페이드인
              const avatarDelay = f(0.33)
              const avatarFadeIn = interpolate(local, [avatarAppear + avatarDelay, avatarAppear + avatarDelay + f(0.5)], [0, 1], CL)
              const showSpace = local >= spaceStart && (avatarOp > 0 || spaceH > 0)
              if (!showSpace) return null
              return <div style={{ height: spaceH, minHeight: 0, overflow: 'visible', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end' }}>
                {avatarOp > 0 && <div style={{ opacity: Math.min(avatarFadeIn, avatarOp), display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, marginBottom: 12 }}>
                <div style={{ position: 'relative' }}>
                  <div style={{
                    width: 180, height: 180, borderRadius: '50%', overflow: 'hidden',
                    border: `2px solid rgba(200,164,110,${borderAlpha})`,
                    boxShadow: revealProgress > 0.5
                      ? '0 16px 50px rgba(0,0,0,0.5)'
                      : '0 8px 30px rgba(0,0,0,0.3)',
                  }}>
                    <Img src={host.avatar_url} style={{
                      width: '100%', height: '100%', objectFit: 'cover',
                      filter: `brightness(${imgBrightness})`,
                    }} />
                  </div>
                  {/* "?" 오버레이 */}
                  <div style={{
                    position: 'absolute', inset: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    opacity: questionOp,
                  }}>
                    <div style={{ color: '#c8a46e', fontSize: 48, fontWeight: 700, fontFamily: FONT.serif }}>?</div>
                  </div>
                </div>
                {/* 이름 슬롯 */}
                <div style={{ minHeight: 48, minWidth: 300, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ position: 'absolute', opacity: questionOp, color: '#c8a46e', fontSize: 24, fontWeight: 700, fontFamily: FONT.serif, letterSpacing: 6, whiteSpace: 'nowrap' }}>
                    ???
                  </div>
                  <div style={{ position: 'absolute', opacity: nameOp, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
                    <div style={{ color: '#e8e0d0', fontSize: 26, fontWeight: 700, fontFamily: FONT.sans }}>{host.nickname}</div>
                    <div style={{ color: '#777', fontSize: 14, fontFamily: FONT.cormorant, letterSpacing: 2 }}>{host.nickname_en}</div>
                  </div>
                </div>
              </div>}
              </div>
            })()}

            {/* 하단 슬롯 */}
            <div style={{
              position: 'relative', width: '100%',
              minHeight: interpolate(local, [svcTotalEnd - f(0.33), svcTotalEnd + f(0.67)], [300, 80], CL),
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {/* 서재 탐방 라벨 + 책 표지 */}
              <div style={{
                position: 'absolute', opacity: Math.max(labelOp, shelfOp),
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
              }}>
                <div style={{ opacity: labelOp, display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 40, height: 1, backgroundColor: '#c8a46e', opacity: 0.4 }} />
                  <div style={{ color: '#c8a46e', fontSize: 18, fontWeight: 600, fontFamily: FONT.cinzel, letterSpacing: 6 }}>
                    서재 탐방
                  </div>
                  <div style={{ width: 40, height: 1, backgroundColor: '#c8a46e', opacity: 0.4 }} />
                </div>
                {/* 책 표지 — 나레이션 동기화: 어둡게 등장 → 밝게 전환 */}
                {shelfOp > 0 && (
                  <div style={{
                    opacity: shelfOp, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
                    gap: 10, perspective: 800,
                  }}>
                    {books.slice(0, bookCount).map((b, bi) => {
                      const mid = bookCount / 2
                      const dist = Math.abs(bi - mid)
                      const delay = shelfAppear + dist * f(0.2)
                      const bookOp = interpolate(local, [delay, delay + f(0.67)], [0, 1], CL)
                      const scaleFactor = 1
                      const brightness = shelfBrightness
                      // 순차 점프: 1번부터 n번까지 가볍게 올라갔다 내려옴
                      const jumpDelay = jumpStart + Math.round((bi / bookCount) * jumpDuration * 0.8)
                      const jumpLocal = local - jumpDelay
                      const jumpY = jumpLocal >= 0 && jumpLocal < f(0.67)
                        ? -Math.sin((jumpLocal / f(0.67)) * Math.PI) * 10
                        : 0
                      return (
                        <div key={bi} style={{
                          opacity: bookOp,
                          transform: `scale(${scaleFactor}) translateY(${jumpY}px)`,
                          transformOrigin: 'bottom center',
                        }}>
                          <div style={{
                            width: 120, height: 180, borderRadius: 6, overflow: 'hidden',
                            boxShadow: '0 6px 20px rgba(0,0,0,0.6)',
                            border: '1px solid rgba(200,164,110,0.1)',
                          }}>
                            <Img src={safeImg(b.thumbnail_url)} style={{
                              width: '100%', height: '100%', objectFit: 'cover',
                              filter: `brightness(${brightness}) saturate(0.75)`,
                            }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
                <div style={{ opacity: shelfOp, color: '#666', fontSize: 14, fontFamily: FONT.sans, letterSpacing: 2 }}>
                  {books.length} BOOKS
                </div>
              </div>
              {/* 명언 */}
              {quoteOp > 0 && (
                <div style={{
                  position: 'absolute', top: 20, opacity: quoteOp,
                  maxWidth: 800, textAlign: 'center', padding: '0 40px',
                }}>
                  <div style={{ color: '#c8a46e', fontSize: 30, fontWeight: 700, fontFamily: FONT.serif, lineHeight: 1.7 }}>
                    "{host.featuredQuote}"
                  </div>
                  <div style={{ color: '#777', fontSize: 14, fontFamily: FONT.sans, marginTop: 14 }}>
                    — {host.nickname}
                  </div>
                </div>
              )}
            </div>
          </AbsoluteFill>
        )
      })()}

      {/* 인물 소개 + 감상철학 (Part 1 only) */}
      {!cont && hostIntroFrames > 0 && (
        <Sequence from={hostIntroStart} durationInFrames={hostIntroFrames}>
          <Sequence from={0} durationInFrames={celebIntroFrames}>
            {hasVoice && <Audio src={sf('sfx/type-reveal.wav')} volume={0.7} />}
            {hasVoice && (narrator.celebIntroDuration ?? 0) > 0 && (
              <Sequence from={CELEB_VISUAL_DELAY} durationInFrames={celebIntroFrames - CELEB_VISUAL_DELAY}>
                <Audio src={vf('narrator-celeb-intro.wav')} />
              </Sequence>
            )}
          </Sequence>
          {hasVoice && (
            <Sequence from={celebIntroFrames + f(1)} durationInFrames={philosophyFrames}>
              <Audio src={vf('philosophy.wav')} />
            </Sequence>
          )}
          <HostIntro host={host} narratorText={narrator.celebIntro ?? ''} celebIntroFrames={celebIntroFrames} totalFrames={hostIntroFrames} narratorDuration={narrator.celebIntroDuration ?? 0} philosophyDuration={host.voiceDuration ?? 0} narratorTimings={script.voiceTimings?.['narrator-celeb-intro']} philosophyTimings={script.voiceTimings?.['philosophy']} />
        </Sequence>
      )}

      {/* 브릿지 */}
      <Sequence from={bridgeStart} durationInFrames={bridgeFrames}>
        {hasVoice && <Audio src={sf('sfx/page-turn.wav')} volume={0.6} />}
        {hasVoice && (
          <Sequence from={f(0.5)} durationInFrames={bridgeFrames - f(0.5)}>
            <Audio src={sf('sfx/whoosh.wav')} volume={0.4} />
          </Sequence>
        )}
      </Sequence>
      {renderBookCarousel(bridgeLocal, bridgeFrames, 0, 0, bridgeOpacity)}

      {/* 중간 리캡 (10개 초과 시 — 전반부 정리) */}
      {hasInterlude && (
        <Sequence from={midRecapStart} durationInFrames={RECAP_FRAMES}>
          {hasVoice && <Audio src={sf('sfx/whoosh.wav')} volume={0.3} />}
          <BookRecap books={firstHalfBooks} host={host} totalFrames={RECAP_FRAMES} label="PART I" />
        </Sequence>
      )}

      {/* 중간안내 (10개 초과 시) */}
      {hasInterlude && (() => {
        const intLocal = frame - interludeStart
        const intOpacity = intLocal >= 0 && intLocal < interludeFrames
          ? fadeInOut(intLocal, 0, interludeFrames, f(0.5), f(0.5))
          : 0
        return (
          <>
            <Sequence from={interludeStart} durationInFrames={interludeFrames}>
              {hasVoice && <Audio src={sf('sfx/page-turn.wav')} volume={0.6} />}
              {hasVoice && (
                <Sequence from={f(0.5)} durationInFrames={interludeFrames - f(0.5)}>
                  <Audio src={sf('sfx/whoosh.wav')} volume={0.4} />
                </Sequence>
              )}
              {hasVoice && narrator.interludeDuration && narrator.interludeDuration > 0 && (
                <Sequence from={f(0.67)} durationInFrames={interludeFrames - f(0.67)}>
                  <Audio src={vf('interlude.wav')} />
                </Sequence>
              )}
            </Sequence>
            {intOpacity > 0 && (
              <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: intOpacity, gap: 20 }}>
                <div style={{ width: interpolate(intLocal, [f(0.17), f(1.33)], [0, 600], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }), height: 1, backgroundColor: '#c8a46e', opacity: 0.5 }} />
                <div style={{ color: '#c8a46e', fontSize: 18, fontFamily: FONT.cinzel, letterSpacing: 6, fontWeight: 600, opacity: fadeInOut(intLocal, f(0.5), interludeFrames - f(0.83), f(0.67), f(0.5)) }}>
                  PART II
                </div>
                <div style={{ width: interpolate(intLocal, [f(0.17), f(1.33)], [0, 600], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }), height: 1, backgroundColor: '#c8a46e', opacity: 0.5 }} />
              </AbsoluteFill>
            )}
          </>
        )
      })()}

      {/* 도서 소개 */}
      {books.map((book, i) => {
        const bt = bookTimings[i]
        const gapStart = i > 0 ? bookStarts[i] - BOOK_GAP : -1

        return (
          <React.Fragment key={i}>
            {/* 책 사이 전환 — 캐러셀 + SFX */}
            {i > 0 && (
              <Sequence from={gapStart} durationInFrames={BOOK_GAP}>
                {hasVoice && <Audio src={sf('sfx/page-turn.wav')} volume={0.4} />}
                {(() => {
                  const gapLocal = frame - gapStart
                  const op = gapLocal >= 0 && gapLocal < BOOK_GAP
                    ? interpolate(gapLocal, [0, f(0.4), BOOK_GAP - f(0.33), BOOK_GAP], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
                    : 0
                  return renderBookCarousel(gapLocal, BOOK_GAP, i - 1, i, op)
                })()}
              </Sequence>
            )}
            <Sequence from={bookStarts[i]} durationInFrames={bt.total}>
              {hasVoice && i === 0 && <Audio src={sf('sfx/page-turn.wav')} volume={0.5} />}
              {/* 오디오 배치: Series로 순차 재생 — 음성 미준비 시 통째로 스킵 */}
              {hasVoice && (
                <Series>
                  <Series.Sequence durationInFrames={bt.titleFrames}>
                    <Audio src={vf(`book-${i}-title.wav`)} />
                  </Series.Sequence>
                  <Series.Sequence
                    offset={TITLE_SUMMARY_GAP_F}
                    durationInFrames={LABEL_SUMMARY_F}
                  >
                    <Audio src={vf('label-summary.wav')} />
                  </Series.Sequence>
                  <Series.Sequence
                    offset={0}
                    durationInFrames={bt.summaryFrames}
                  >
                    <Audio src={sf('sfx/whoosh.wav')} volume={0.25} />
                    <Audio src={vf(`book-${i}-summary.wav`)} />
                  </Series.Sequence>
                  <Series.Sequence
                    offset={SUMMARY_CONTEXT_GAP_F}
                    durationInFrames={LABEL_CONTEXT_F}
                  >
                    <Audio src={vf('label-context.wav')} />
                  </Series.Sequence>
                  <Series.Sequence
                    offset={0}
                    durationInFrames={bt.contextFrames}
                  >
                    <Audio src={sf('sfx/whoosh.wav')} volume={0.2} />
                    <Audio src={vf(`book-${i}-context.wav`)} />
                  </Series.Sequence>
                  {bt.hasQuote && (
                    <Series.Sequence
                      offset={CONTEXT_QUOTE_GAP}
                      durationInFrames={bt.quoteFrames}
                    >
                      <Audio src={sf('sfx/whoosh.wav')} volume={0.3} />
                      <Audio src={vf(`book-${i}-quote.wav`)} />
                    </Series.Sequence>
                  )}
                  {bt.hasContextAfter && (
                    <Series.Sequence
                      offset={QUOTE_CONTEXTAFTER_GAP}
                      durationInFrames={bt.contextAfterFrames}
                    >
                      <Audio src={vf(`book-${i}-context-after.wav`)} />
                    </Series.Sequence>
                  )}
                </Series>
              )}
              <BookCardVisual
                book={book}
                host={host}
                index={i}
                totalFrames={bt.total}
                titleFrames={bt.titleFrames}
                summaryFrames={bt.summaryFrames}
                summaryEnd={bt.summaryEnd}
                contextFrames={bt.contextFrames}
                contextEnd={bt.contextEnd}
                hasQuote={bt.hasQuote}
                quoteFrames={bt.quoteFrames}
                hasContextAfter={bt.hasContextAfter}
                contextAfterFrames={bt.contextAfterFrames}
                contextAfterText={book.contextAfter}
                totalBooks={books.length}
                labelSummaryF={LABEL_SUMMARY_F}
                labelContextF={LABEL_CONTEXT_F}
                titleSummaryGapF={TITLE_SUMMARY_GAP_F}
                summaryContextGapF={SUMMARY_CONTEXT_GAP_F}
                episodeName={epName}
                timings={script.voiceTimings}
              />
            </Sequence>
          </React.Fragment>
        )
      })}

      {/* 리캡 */}
      <Sequence from={recapStart} durationInFrames={RECAP_FRAMES}>
        {hasVoice && <Audio src={sf('sfx/whoosh.wav')} volume={0.3} />}
        <BookRecap books={secondHalfBooks} host={host} totalFrames={RECAP_FRAMES} />
      </Sequence>

      {/* 아웃트로: 안내문 → 로고 분리 */}
      {(() => {
        const narrationEnd = outroStart + outroFrames
        const logoStart = narrationEnd
        // 안내문
        const narOp = fadeInOut(frame, outroStart, outroFrames, f(0.67), f(0.83))
        // 로고
        const logoOp = interpolate(frame,
          [logoStart, logoStart + f(0.83), logoStart + LOGO_FRAMES - f(0.67), logoStart + LOGO_FRAMES],
          [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
        return (
          <>
            <Sequence from={outroStart} durationInFrames={outroFrames}>
              {hasVoice && narrator.outroDuration > 0 && <Audio src={vf('narrator-outro.wav')} />}
            </Sequence>
            <Sequence from={logoStart} durationInFrames={LOGO_FRAMES}>
              {hasVoice && <Audio src={sf('sfx/chime.wav')} volume={0.5} />}
            </Sequence>
            {narOp > 0 && (
              <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: narOp }}>
                <div style={{ color: '#ccc', fontSize: 26, fontFamily: FONT.sans, textAlign: 'center', maxWidth: 900, lineHeight: 1.7 }}>
                  {narrator.outro}
                </div>
              </AbsoluteFill>
            )}
            {logoOp > 0 && (
              <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: logoOp }}>
                <BrandLogo fontSize={BRAND_LOGO_SIZE} />
              </AbsoluteFill>
            )}
          </>
        )
      })()}

      <Overlay script={script} />

      {/* 스튜디오 전용 자막 프리뷰 — BookRecommend의 실제 프레임 위치로 생성 */}
      {!getRemotionEnvironment().isRendering && (() => {
        const vtk = (key: string): VoiceTimingSegment[] | undefined => (script as any).voiceTimings?.[key]

        const splitSub = (start: number, end: number, speaker: string, text: string, timings?: VoiceTimingSegment[]): Sub[] => {
          const sentences = text.split(/(?<=[.?!,。])\s+/).filter(Boolean)
          if (sentences.length <= 1) return [{ start, end, speaker, text }]
          const MIN_F = Math.round(1.5 * FPS), MAX_F = Math.round(8 * FPS)
          let raw: Sub[]
          if (timings && timings.length === sentences.length) {
            raw = timings.map((t, i) => ({ start: start + Math.round(t.start * FPS), end: start + Math.round(t.end * FPS), speaker, text: sentences[i] }))
          } else {
            const total = end - start, breath = (sentences.length - 1) * SENTENCE_BREATH
            const dist = Math.max(total - breath, total * 0.7), chars = sentences.reduce((s, x) => s + x.length, 0)
            raw = []; let c = start
            for (let i = 0; i < sentences.length; i++) {
              if (i > 0) c += SENTENCE_BREATH
              const fr = Math.round((sentences[i].length / chars) * dist)
              raw.push({ start: c, end: c + fr, speaker, text: sentences[i] }); c += fr
            }
          }
          // 병합
          const merged: Sub[] = []
          for (const s of raw) { if (merged.length > 0 && (s.end - s.start) < MIN_F) { merged[merged.length-1].text += ' ' + s.text; merged[merged.length-1].end = s.end } else merged.push({...s}) }
          // 분할
          const result: Sub[] = []
          for (const s of merged) {
            if ((s.end - s.start) <= MAX_F) { result.push(s); continue }
            const mid = Math.floor(s.text.length / 2)
            let sp = -1
            for (let d = 0; d < mid; d++) { if (/[,，、]/.test(s.text[mid+d]||'')) { sp = mid+d+1; break } if (/[,，、]/.test(s.text[mid-d]||'')) { sp = mid-d+1; break } }
            if (sp < 0) for (let d = 0; d < mid; d++) { if (s.text[mid+d]===' ') { sp = mid+d+1; break } if (s.text[mid-d]===' ') { sp = mid-d+1; break } }
            if (sp > 0 && sp < s.text.length) { const r = sp / s.text.length, sf = s.start + Math.round((s.end-s.start)*r); result.push({start:s.start,end:sf,speaker,text:s.text.slice(0,sp).trim()}); result.push({start:sf,end:s.end,speaker,text:s.text.slice(sp).trim()}) }
            else result.push(s)
          }
          return result
        }

        const subs: Sub[] = []

        // 서비스 인사
        if (!cont && svcGreetingFrames > 0 && narrator.serviceGreeting)
          subs.push(...splitSub(svcGreetingStart, svcGreetingStart + toAudioFrames(narrator.serviceGreetingDuration ?? 0), '나레이터', narrator.serviceGreeting, vtk('service-greeting')))
        // 서비스 인트로
        if (!cont && svcIntroFrames > 0 && narrator.serviceIntro)
          subs.push(...splitSub(svcIntroStart, svcIntroStart + toAudioFrames(narrator.serviceIntroDuration!), '나레이터', narrator.serviceIntro, vtk('service-intro')))
        // 명언
        if (fQuoteFrames > 0 && host.featuredQuote)
          subs.push(...splitSub(fQuoteStart + f(1), fQuoteStart + f(1) + toAudioFrames(host.featuredQuoteDuration!), host.nickname, host.featuredQuote))
        // 셀럽 소개
        if (!cont && narrator.celebIntro) {
          const cs = hostIntroStart + CELEB_VISUAL_DELAY
          subs.push(...splitSub(cs, cs + toAudioFrames(narrator.celebIntroDuration ?? 0), '나레이터', narrator.celebIntro, vtk('narrator-celeb-intro')))
        }
        // 감상철학
        if (!cont && host.philosophy) {
          const ps = hostIntroStart + celebIntroFrames + f(1)
          subs.push(...splitSub(ps, ps + toAudioFrames(host.voiceDuration ?? 0), host.nickname, host.philosophy, vtk('philosophy')))
        }
        // 책 — Series 레이아웃과 동일한 커서 워킹
        for (let i = 0; i < books.length; i++) {
          const bs = bookStarts[i], b = books[i], bt = bookTimings[i]
          let c = bs

          // title
          const titleText = [b.title, b.creator, b.stats?.publishYear].filter(Boolean).join(', ')
          subs.push({ start: c, end: c + toAudioFrames(b.titleDuration), speaker: '나레이터', text: titleText })
          c += bt.titleFrames

          // offset → label-summary
          c += TITLE_SUMMARY_GAP_F
          c += LABEL_SUMMARY_F

          // offset(0) → summary
          const smStart = c
          subs.push(...splitSub(smStart, smStart + toAudioFrames(b.summaryDuration), '요약', b.summary, vtk(`book-${i}-summary`)))
          c += bt.summaryFrames

          // offset → label-context
          c += SUMMARY_CONTEXT_GAP_F
          c += LABEL_CONTEXT_F

          // offset(0) → context
          const ctStart = c
          subs.push(...splitSub(ctStart, ctStart + toAudioFrames(b.contextDuration), '나레이터', b.context, vtk(`book-${i}-context`)))
          c += bt.contextFrames

          // quote
          if (bt.hasQuote && b.directQuote && b.quoteDuration) {
            c += CONTEXT_QUOTE_GAP
            subs.push(...splitSub(c, c + toAudioFrames(b.quoteDuration), host.nickname, `"${b.directQuote}"`, vtk(`book-${i}-quote`)))
            c += bt.quoteFrames

            // contextAfter
            if (bt.hasContextAfter && b.contextAfter && b.contextAfterDuration) {
              c += QUOTE_CONTEXTAFTER_GAP
              subs.push(...splitSub(c, c + toAudioFrames(b.contextAfterDuration), '나레이터', b.contextAfter, vtk(`book-${i}-context-after`)))
            }
          }
        }
        // 아웃트로
        if (narrator.outroDuration > 0)
          subs.push(...splitSub(outroStart, outroStart + toAudioFrames(narrator.outroDuration), '나레이터', narrator.outro, vtk('narrator-outro')))

        return <Subtitles subs={subs} />
      })()}

      {/* 스튜디오 전용 DEV UI — 렌더 시 미포함 */}
      {!getRemotionEnvironment().isRendering && (() => {
        const outroEnd = outroStart + outroFrames

        // 섹션 정의: [끝 프레임, 라벨, 보조] — 순서대로 매칭
        const sections: [number, string, string][] = [
          [brandStart + BRAND_FRAMES, 'BRAND', '로고 + 태그라인'],
          ...(cont ? [
            [returnIntroStart + returnIntroFrames, 'RETURN INTRO', '복귀 인사'] as [number, string, string],
          ] : [
            [svcGreetingStart + svcGreetingFrames, 'GREETING', '인사 + 촛불'] as [number, string, string],
            [svcIntroStart + svcIntroFrames, 'SVC INTRO', '서재탐방 본문'] as [number, string, string],
          ]),
          [fQuoteStart + fQuoteFrames, 'FEATURED QUOTE', '대표 명언'],
          ...(cont ? [
            [prevRecapStart + prevRecapFrames, 'PREV RECAP', '이전 파트 요약'] as [number, string, string],
          ] : [
            [hostIntroStart + celebIntroFrames, 'CELEB INTRO', '나레이터 인물소개'] as [number, string, string],
            [hostIntroStart + hostIntroFrames, 'PHILOSOPHY', '셀럽 감상철학'] as [number, string, string],
          ]),
          [bridgeStart + bridgeFrames, 'BRIDGE', '서재 이동'],
          [recapStart, 'BOOKS', '도서 구간'],
          [recapStart + RECAP_FRAMES, 'RECAP', '리캡'],
          [outroEnd, 'OUTRO', '아웃트로'],
          [Infinity, 'LOGO', '엔딩'],
        ]

        const match = sections.find(([end]) => frame < end)
        let label = match?.[1] ?? '—'
        let sub = match?.[2] ?? ''

        // GREETING
        if (label === 'GREETING') {
          sub = '서재 탐방 소개'
        }

        // SVC INTRO 단순화
        if (label === 'SVC INTRO') {
          label = 'SVC INTRO'
          sub = '인물 소개'
        }

        // BOOKS 세부 분할
        if (label === 'BOOKS') {
          const bi2 = bookStarts.findIndex((s, i) => frame >= s && frame < s + bookTimings[i].total)
          if (bi2 >= 0) {
            const bLocal = frame - bookStarts[bi2]
            const bt2 = bookTimings[bi2]
            const phase = bLocal >= bt2.contextEnd && bt2.hasQuote ? 'QUOTE'
              : bLocal >= bt2.summaryEnd ? 'CONTEXT'
              : bLocal >= bt2.titleFrames ? 'SUMMARY' : 'TITLE'
            label = `BOOK ${bi2 + 1}/${books.length}`
            sub = `${books[bi2].title} · ${phase}`
          } else {
            label = 'BOOK GAP'
            sub = '전환'
          }
        }

        return (
          <div style={{
            position: 'absolute', top: 16, right: 16, zIndex: 999,
            backgroundColor: 'rgba(0,0,0,0.85)', borderRadius: 10,
            padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: 4,
          }}>
            <div style={{ color: '#c8a46e', fontSize: 18, fontFamily: 'monospace', fontWeight: 700 }}>
              {label}
            </div>
            {sub && <div style={{ color: '#aaa', fontSize: 13, fontFamily: 'monospace' }}>{sub}</div>}
          </div>
        )
      })()}
    </AbsoluteFill>
  )
}
