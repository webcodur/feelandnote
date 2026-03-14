import React, { useEffect } from 'react'
import { AbsoluteFill, Audio, Img, interpolate, prefetch, Sequence, useCurrentFrame } from 'remotion'
import type { BookRecommendScript } from './types'
import { safeImg, fadeInOut, BrandLogo, sf, makeVf } from './utils'
import { BrandIntro } from './BrandIntro'
import { HostIntro } from './HostIntro'
import { BookCard } from './BookCard'
import { BookCardVisual } from './BookCardVisual'
import { BookRecap } from './BookRecap'
import { FONT } from './fonts'
import { Overlay } from './Overlay'
import {
  toFrames, BRAND_FRAMES, CELEB_VISUAL_DELAY,
  CONTEXT_QUOTE_GAP, QUOTE_CONTEXTAFTER_GAP,
  BOOK_GAP, RECAP_FRAMES, INTERLUDE_FRAMES, LOGO_FRAMES, PRE_LABEL_GAP,
  CELEB_INTRO_FALLBACK, BRIDGE_FALLBACK, OUTRO_FALLBACK,
  titleSummaryGap, summaryContextGap, labelSummaryFrames, labelContextFrames,
  summaryPhaseEnd, contextPhaseEnd, quotePhaseEnd, bookTotalFrames,
  type LabelDurations,
} from './timing'
import { EPISODE_NAME, loadVoiceSelect } from './script'

type Props = {
  script: BookRecommendScript
  visual?: boolean
  /** 에피소드 이름 (음성 경로용) */
  episodeName?: string
}


export const calcTotalFrames = (script: BookRecommendScript) => {
  const { narrator, host, books } = script
  const ld: LabelDurations = { labelSummaryDuration: narrator.labelSummaryDuration, labelContextDuration: narrator.labelContextDuration }
  const svcIntro = narrator.serviceIntroDuration > 0 ? toFrames(narrator.serviceIntroDuration) : 0
  const fQuote = host.featuredQuoteDuration && host.featuredQuoteDuration > 0 ? toFrames(host.featuredQuoteDuration) : 0
  const celebIntro = CELEB_VISUAL_DELAY + (narrator.celebIntroDuration > 0 ? toFrames(narrator.celebIntroDuration) : CELEB_INTRO_FALLBACK)
  const philosophy = toFrames(host.voiceDuration)
  const bridge = narrator.bridgeDuration > 0 ? toFrames(narrator.bridgeDuration) : BRIDGE_FALLBACK
  const booksTotal = books.reduce((sum, b) => sum + bookTotalFrames(b, ld), 0)
  const bookGaps = Math.max(0, books.length - 1) * BOOK_GAP
  const interlude = books.length > 10 ? INTERLUDE_FRAMES : 0
  const midRecap = books.length > 10 ? RECAP_FRAMES : 0
  const outro = narrator.outroDuration > 0 ? toFrames(narrator.outroDuration) : OUTRO_FALLBACK
  return BRAND_FRAMES + svcIntro + fQuote + celebIntro + philosophy + bridge + booksTotal + bookGaps + midRecap + interlude + RECAP_FRAMES + outro + LOGO_FRAMES
}

export const BookRecommend: React.FC<Props> = ({ script, visual = false, episodeName }) => {
  const frame = useCurrentFrame()
  const epName = episodeName ?? EPISODE_NAME
  const vf = makeVf(epName, loadVoiceSelect(epName))
  const { narrator, host, books } = script

  // 모든 오디오 프리페치 — Sequence 진입 전에 미리 로드
  useEffect(() => {
    const urls: string[] = [
      sf('sfx/chime.wav'),
      sf('sfx/type-reveal.wav'),
      sf('sfx/page-turn.wav'),
      sf('sfx/whoosh.wav'),
      ...(narrator.serviceIntroDuration > 0 ? [vf('service-intro.wav')] : []),
      ...(host.featuredQuoteDuration && host.featuredQuoteDuration > 0 ? [vf('featured-quote.wav')] : []),
      vf('narrator-celeb-intro.wav'),
      vf('philosophy.wav'),
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
    const cleanups = urls.map((url) => {
      const { free } = prefetch(url, { method: 'blob-url', contentType: 'audio/wav' })
      return free
    })
    return () => cleanups.forEach((fn) => fn())
  }, [books])

  const celebIntroFrames = CELEB_VISUAL_DELAY + (narrator.celebIntroDuration > 0 ? toFrames(narrator.celebIntroDuration) : CELEB_INTRO_FALLBACK)
  const philosophyFrames = toFrames(host.voiceDuration)
  const hostIntroFrames = celebIntroFrames + philosophyFrames
  const bridgeFrames = narrator.bridgeDuration > 0 ? toFrames(narrator.bridgeDuration) : BRIDGE_FALLBACK

  const svcIntroFrames = narrator.serviceIntroDuration > 0 ? toFrames(narrator.serviceIntroDuration) : 0
  const fQuoteFrames = host.featuredQuoteDuration && host.featuredQuoteDuration > 0 ? toFrames(host.featuredQuoteDuration) : 0

  let cursor = 0
  const brandStart = cursor
  cursor += BRAND_FRAMES
  const svcIntroStart = cursor
  cursor += svcIntroFrames
  const fQuoteStart = cursor
  cursor += fQuoteFrames
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
    total: bookTotalFrames(b, ld),
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
  const vignetteOpacity = interpolate(frame, [0, 30], [1, 0.6], { extrapolateRight: 'clamp' })

  // 브릿지
  const bridgeLocal = frame - bridgeStart
  const bridgeOpacity = bridgeLocal >= 0 && bridgeLocal < bridgeFrames
    ? fadeInOut(bridgeLocal, 0, bridgeFrames, 15, 15)
    : 0


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
        <Audio src={sf('sfx/chime.wav')} volume={0.6} />
        <BrandIntro durationFrames={BRAND_FRAMES} />
      </Sequence>

      {/* 서비스 인트로 + 명언 — 3단 시퀀스 */}
      {/* 오디오 */}
      {svcIntroFrames > 0 && (
        <Sequence from={svcIntroStart} durationInFrames={svcIntroFrames}>
          <Audio src={vf('service-intro.wav')} />
        </Sequence>
      )}
      {fQuoteFrames > 0 && (
        <Sequence from={fQuoteStart} durationInFrames={fQuoteFrames}>
          <Audio src={vf('featured-quote.wav')} />
        </Sequence>
      )}

      {/* ===== 통합 프리인트로: ServiceIntro + FeaturedQuote =====
           아바타를 고정 앵커로 유지, 하단 텍스트만 크로스페이드.
           레이아웃 변경(수평↔수직) 없이 세로 단일 축 유지. */}
      {(() => {
        const totalPreIntro = svcIntroFrames + fQuoteFrames
        if (totalPreIntro <= 0) return null
        const local = frame - svcIntroStart
        if (local < -5 || local > totalPreIntro + 5) return null

        const CL = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const }

        // ── 아바타: 전체 구간 고정 위치 ──
        const avatarIn = interpolate(local, [8, 30], [0, 1], CL)
        const avatarOut = interpolate(local, [totalPreIntro - 25, totalPreIntro], [1, 0], CL)
        const avatarOp = Math.min(avatarIn, avatarOut)

        // 실루엣 → reveal (svcIntro 70% 시점)
        const revealAt = Math.round(svcIntroFrames * 0.7)
        const revealProgress = interpolate(local, [revealAt, revealAt + 25], [0, 1], CL)
        const imgBrightness = interpolate(revealProgress, [0, 1], [0.08, 1])
        const borderAlpha = interpolate(revealProgress, [0, 1], [0.15, 0.35])
        const questionOp = interpolate(revealProgress, [0, 0.5], [1, 0], CL)

        // ── 이름: reveal 후 등장, 끝까지 유지 ──
        const nameOp = interpolate(local,
          [revealAt + 10, revealAt + 30, totalPreIntro - 25, totalPreIntro],
          [0, 1, 1, 0], CL)

        // ── "서재 탐방" 라벨 (svcIntro 구간) ──
        const labelOp = fadeInOut(local, 5, svcIntroFrames - 5, 20, 20)

        // ── 책 표지 미리보기 (svcIntro 구간, 순차 등장) ──
        const shelfOp = fadeInOut(local, 15, svcIntroFrames - 15, 25, 15)
        // reveal 시 표지 밝기도 약간 상승
        const shelfBrightness = interpolate(revealProgress, [0, 1], [0.15, 0.35])

        // ── 명언 텍스트 (fQuote 구간, 부드러운 크로스페이드) ──
        const hasFQ = fQuoteFrames > 0 && !!host.featuredQuote
        const quoteOp = hasFQ
          ? interpolate(local,
              [svcIntroFrames + 5, svcIntroFrames + 30, totalPreIntro - 25, totalPreIntro],
              [0, 1, 1, 0], CL)
          : 0

        if (avatarOp <= 0 && labelOp <= 0 && shelfOp <= 0 && quoteOp <= 0) return null

        return (
          <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            {/* 아바타 블록 — 위치 고정, 크기 고정 */}
            <div style={{ opacity: avatarOp, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, marginBottom: 12 }}>
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
              {/* 이름 슬롯 — 고정 크기, ??? ↔ 실명 크로스페이드 */}
              <div style={{ minHeight: 48, minWidth: 300, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {/* ??? 플레이스홀더 — reveal 전 */}
                <div style={{ position: 'absolute', opacity: questionOp, color: '#c8a46e', fontSize: 24, fontWeight: 700, fontFamily: FONT.serif, letterSpacing: 6, whiteSpace: 'nowrap' }}>
                  ???
                </div>
                {/* 실명 — reveal 후 */}
                <div style={{ position: 'absolute', opacity: nameOp, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
                  <div style={{ color: '#e8e0d0', fontSize: 26, fontWeight: 700, fontFamily: FONT.sans }}>{host.nickname}</div>
                  <div style={{ color: '#777', fontSize: 14, fontFamily: FONT.cormorant, letterSpacing: 2 }}>{host.nickname_en}</div>
                </div>
              </div>
            </div>

            {/* 하단 슬롯 — 서재탐방→명언 전환 시 높이 부드럽게 축소 */}
            <div style={{
              position: 'relative', width: '100%',
              minHeight: interpolate(
                local,
                [svcIntroFrames - 10, svcIntroFrames + 20],
                [200, 80], CL),
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {/* 서재 탐방 라벨 + 책 표지 미리보기 */}
              <div style={{
                position: 'absolute', opacity: Math.max(labelOp, shelfOp),
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
              }}>
                {/* 라벨 */}
                <div style={{ opacity: labelOp, display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 40, height: 1, backgroundColor: '#c8a46e', opacity: 0.4 }} />
                  <div style={{ color: '#c8a46e', fontSize: 18, fontWeight: 600, fontFamily: FONT.cinzel, letterSpacing: 6 }}>
                    서재 탐방
                  </div>
                  <div style={{ width: 40, height: 1, backgroundColor: '#c8a46e', opacity: 0.4 }} />
                </div>
                {/* 책 표지 — 어둡고 미스터리하게, 순차 등장 */}
                <div style={{
                  opacity: shelfOp, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
                  gap: 10, perspective: 800,
                }}>
                  {books.slice(0, Math.min(books.length, 7)).map((b, i) => {
                    // 순차 등장: 중앙부터 바깥으로
                    const mid = Math.min(books.length, 7) / 2
                    const dist = Math.abs(i - mid)
                    const delay = 20 + dist * 6
                    const bookOp = interpolate(local, [delay, delay + 20], [0, 1], CL)
                    // 중앙 책이 약간 더 크고 밝게
                    const scaleFactor = interpolate(dist, [0, 3], [1.05, 0.9], CL)
                    const brightness = shelfBrightness * interpolate(dist, [0, 3], [1.3, 0.8], CL)
                    return (
                      <div key={i} style={{
                        opacity: bookOp,
                        transform: `scale(${scaleFactor})`,
                        transformOrigin: 'bottom center',
                      }}>
                        <div style={{
                          width: 64, height: 96, borderRadius: 4, overflow: 'hidden',
                          boxShadow: '0 6px 20px rgba(0,0,0,0.6)',
                          border: '1px solid rgba(200,164,110,0.1)',
                        }}>
                          <Img src={safeImg(b.thumbnail_url)} style={{
                            width: '100%', height: '100%', objectFit: 'cover',
                            filter: `brightness(${brightness}) saturate(0.5)`,
                          }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
                {/* 권수 표시 */}
                <div style={{ opacity: shelfOp, color: '#666', fontSize: 14, fontFamily: FONT.sans, letterSpacing: 2 }}>
                  {books.length} BOOKS
                </div>
              </div>
              {/* 명언 */}
              <div style={{
                position: 'absolute', opacity: quoteOp,
                maxWidth: 800, textAlign: 'center', padding: '0 40px',
              }}>
                <div style={{ color: '#c8a46e', fontSize: 30, fontWeight: 700, fontFamily: FONT.serif, lineHeight: 1.7 }}>
                  "{host.featuredQuote}"
                </div>
                <div style={{ color: '#777', fontSize: 14, fontFamily: FONT.sans, marginTop: 14 }}>
                  — {host.nickname}
                </div>
              </div>
            </div>
          </AbsoluteFill>
        )
      })()}

      {/* 인물 소개 + 감상철학 */}
      <Sequence from={hostIntroStart} durationInFrames={hostIntroFrames}>
        <Sequence from={0} durationInFrames={celebIntroFrames}>
          <Audio src={sf('sfx/type-reveal.wav')} volume={0.7} />
          {narrator.celebIntroDuration > 0 && (
            <Sequence from={CELEB_VISUAL_DELAY} durationInFrames={celebIntroFrames - CELEB_VISUAL_DELAY}>
              <Audio src={vf('narrator-celeb-intro.wav')} />
            </Sequence>
          )}
        </Sequence>
        <Sequence from={celebIntroFrames} durationInFrames={philosophyFrames}>
          <Audio src={vf('philosophy.wav')} />
        </Sequence>
        <HostIntro host={host} narratorText={narrator.celebIntro} celebIntroFrames={celebIntroFrames} totalFrames={hostIntroFrames} narratorDuration={narrator.celebIntroDuration} philosophyDuration={host.voiceDuration} />
      </Sequence>

      {/* 브릿지 */}
      <Sequence from={bridgeStart} durationInFrames={bridgeFrames}>
        <Audio src={sf('sfx/page-turn.wav')} volume={0.6} />
        <Sequence from={15} durationInFrames={bridgeFrames - 15}>
          <Audio src={sf('sfx/whoosh.wav')} volume={0.4} />
        </Sequence>
      </Sequence>
      {bridgeOpacity > 0 && (
        <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: bridgeOpacity, gap: 20 }}>
          <div style={{ width: interpolate(bridgeLocal, [5, 40], [0, 600], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }), height: 1, backgroundColor: '#c8a46e', opacity: 0.5 }} />
          <div style={{ color: '#c8a46e', fontSize: 18, fontFamily: FONT.cinzel, letterSpacing: 6, fontWeight: 600, opacity: fadeInOut(bridgeLocal, 15, bridgeFrames - 25, 20, 15) }}>
            BOOK SHELF
          </div>
          <div style={{ width: interpolate(bridgeLocal, [5, 40], [0, 600], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }), height: 1, backgroundColor: '#c8a46e', opacity: 0.5 }} />
        </AbsoluteFill>
      )}

      {/* 중간 리캡 (10개 초과 시 — 전반부 정리) */}
      {hasInterlude && (
        <Sequence from={midRecapStart} durationInFrames={RECAP_FRAMES}>
          <Audio src={sf('sfx/whoosh.wav')} volume={0.3} />
          <BookRecap books={firstHalfBooks} host={host} totalFrames={RECAP_FRAMES} label="PART I" />
        </Sequence>
      )}

      {/* 중간안내 (10개 초과 시) */}
      {hasInterlude && (() => {
        const intLocal = frame - interludeStart
        const intOpacity = intLocal >= 0 && intLocal < interludeFrames
          ? fadeInOut(intLocal, 0, interludeFrames, 15, 15)
          : 0
        return (
          <>
            <Sequence from={interludeStart} durationInFrames={interludeFrames}>
              <Audio src={sf('sfx/page-turn.wav')} volume={0.6} />
              <Sequence from={15} durationInFrames={interludeFrames - 15}>
                <Audio src={sf('sfx/whoosh.wav')} volume={0.4} />
              </Sequence>
              {narrator.interludeDuration && narrator.interludeDuration > 0 && (
                <Sequence from={20} durationInFrames={interludeFrames - 20}>
                  <Audio src={vf('interlude.wav')} />
                </Sequence>
              )}
            </Sequence>
            {intOpacity > 0 && (
              <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: intOpacity, gap: 20 }}>
                <div style={{ width: interpolate(intLocal, [5, 40], [0, 600], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }), height: 1, backgroundColor: '#c8a46e', opacity: 0.5 }} />
                <div style={{ color: '#c8a46e', fontSize: 18, fontFamily: FONT.cinzel, letterSpacing: 6, fontWeight: 600, opacity: fadeInOut(intLocal, 15, interludeFrames - 25, 20, 15) }}>
                  PART II
                </div>
                <div style={{ width: interpolate(intLocal, [5, 40], [0, 600], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }), height: 1, backgroundColor: '#c8a46e', opacity: 0.5 }} />
              </AbsoluteFill>
            )}
          </>
        )
      })()}

      {/* 도서 소개 */}
      {books.map((book, i) => {
        const bt = bookTimings[i]
        const gapStart = i > 0 ? bookStarts[i] - BOOK_GAP : -1
        // visual 모드: 라벨 → 본문 순차. 라벨은 2열 전환 완료 후 재생, 본문은 라벨 뒤.
        const labelSummaryFrom = visual
          ? bt.titleFrames + TITLE_SUMMARY_GAP_F
          : bt.titleFrames + PRE_LABEL_GAP
        const summaryAudioStart = visual
          ? labelSummaryFrom + LABEL_SUMMARY_F
          : bt.titleFrames + TITLE_SUMMARY_GAP_F
        // visual 모드: context도 라벨 → 본문 순차
        const labelContextFrom = visual
          ? bt.summaryEnd + SUMMARY_CONTEXT_GAP_F
          : bt.summaryEnd + PRE_LABEL_GAP
        const contextAudioStart = visual
          ? labelContextFrom + LABEL_CONTEXT_F
          : bt.summaryEnd + SUMMARY_CONTEXT_GAP_F
        const quoteAudioStart = bt.hasQuote ? bt.contextEnd + CONTEXT_QUOTE_GAP : 0

        return (
          <React.Fragment key={i}>
            {i > 0 && (
              <Sequence from={gapStart} durationInFrames={BOOK_GAP}>
                <Audio src={sf('sfx/page-turn.wav')} volume={0.4} />
                {(() => {
                  const gapLocal = frame - gapStart
                  const gapOpacity = gapLocal >= 0 && gapLocal < BOOK_GAP
                    ? interpolate(gapLocal, [0, 15, BOOK_GAP - 12, BOOK_GAP], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
                    : 0
                  const lineW = interpolate(gapLocal, [5, 25], [0, 400], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
                  const textOp = interpolate(gapLocal, [10, 25, BOOK_GAP - 15, BOOK_GAP], [0, 0.8, 0.8, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
                  const coverOp = interpolate(gapLocal, [5, 20, BOOK_GAP - 15, BOOK_GAP], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
                  const coverY = interpolate(gapLocal, [5, 25], [15, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
                  return gapOpacity > 0 ? (
                    <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: gapOpacity }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                        <div style={{ width: lineW, height: 1, backgroundColor: '#c8a46e', opacity: 0.4 }} />
                        <div style={{ opacity: textOp, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                          <div style={{ color: '#c8a46e', fontSize: 15, fontFamily: FONT.cinzel, letterSpacing: 3, fontWeight: 600 }}>
                            {i + 1}/{books.length}
                          </div>
                          <div style={{ color: '#e8e0d0', fontSize: 22, fontFamily: FONT.serif, fontWeight: 600, textAlign: 'center' }}>
                            {book.title}
                          </div>
                        </div>
                        <div style={{ width: lineW, height: 1, backgroundColor: '#c8a46e', opacity: 0.4 }} />
                      </div>
                    </AbsoluteFill>
                  ) : null
                })()}
              </Sequence>
            )}
            <Sequence from={bookStarts[i]} durationInFrames={bt.total}>
              {i === 0 && <Audio src={sf('sfx/page-turn.wav')} volume={0.5} />}
              {/* 나레이터: 제목+저자 */}
              <Sequence from={0} durationInFrames={bt.titleFrames}>
                <Audio src={vf(`book-${i}-title.wav`)} />
              </Sequence>
              {/* 라벨: "핵심 요약" — visual 모드: 화면 전환 후 재생 */}
              <Sequence from={labelSummaryFrom} durationInFrames={LABEL_SUMMARY_F}>
                <Audio src={vf('label-summary.wav')} />
              </Sequence>
              {/* 요약맨: 책 소개 + 핵심 */}
              <Sequence from={summaryAudioStart} durationInFrames={bt.summaryFrames}>
                <Audio src={sf('sfx/whoosh.wav')} volume={0.25} />
                <Audio src={vf(`book-${i}-summary.wav`)} />
              </Sequence>
              {/* 라벨: "추천 경위" — visual 모드: 크로스페이드 후 재생 */}
              <Sequence from={labelContextFrom} durationInFrames={LABEL_CONTEXT_F}>
                <Audio src={vf('label-context.wav')} />
              </Sequence>
              {/* 나레이터: 추천 경위 + 맥락 */}
              <Sequence from={contextAudioStart} durationInFrames={bt.contextFrames}>
                <Audio src={sf('sfx/whoosh.wav')} volume={0.2} />
                <Audio src={vf(`book-${i}-context.wav`)} />
              </Sequence>
              {/* 셀럽: 직접 인용문 (있을 때만) */}
              {bt.hasQuote && (
                <Sequence from={quoteAudioStart} durationInFrames={bt.quoteFrames}>
                  <Audio src={sf('sfx/whoosh.wav')} volume={0.3} />
                  <Audio src={vf(`book-${i}-quote.wav`)} />
                </Sequence>
              )}
              {/* 나레이터: 후속 맥락 (있을 때만) */}
              {bt.hasContextAfter && (
                <Sequence from={bt.quoteEnd + QUOTE_CONTEXTAFTER_GAP} durationInFrames={bt.contextAfterFrames}>
                  <Audio src={vf(`book-${i}-context-after.wav`)} />
                </Sequence>
              )}
              {visual ? (
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
                />
              ) : (
                <BookCard
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
                />
              )}
            </Sequence>
          </React.Fragment>
        )
      })}

      {/* 리캡 */}
      <Sequence from={recapStart} durationInFrames={RECAP_FRAMES}>
        <Audio src={sf('sfx/whoosh.wav')} volume={0.3} />
        <BookRecap books={secondHalfBooks} host={host} totalFrames={RECAP_FRAMES} />
      </Sequence>

      {/* 아웃트로: 안내문 → 로고 분리 */}
      {(() => {
        const narrationEnd = outroStart + outroFrames
        const logoStart = narrationEnd
        // 안내문
        const narOp = fadeInOut(frame, outroStart, outroFrames, 20, 25)
        // 로고
        const logoOp = interpolate(frame,
          [logoStart, logoStart + 25, logoStart + LOGO_FRAMES - 20, logoStart + LOGO_FRAMES],
          [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
        return (
          <>
            <Sequence from={outroStart} durationInFrames={outroFrames}>
              {narrator.outroDuration > 0 && <Audio src={vf('narrator-outro.wav')} />}
            </Sequence>
            <Sequence from={logoStart} durationInFrames={LOGO_FRAMES}>
              <Audio src={sf('sfx/chime.wav')} volume={0.5} />
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
                <BrandLogo fontSize={42} />
              </AbsoluteFill>
            )}
          </>
        )
      })()}

      <Overlay script={script} />
    </AbsoluteFill>
  )
}
