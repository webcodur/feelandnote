import React from 'react'
import { AbsoluteFill, Audio, interpolate, Sequence, useCurrentFrame } from 'remotion'
import type { BookRecommendScript } from './types'
import { BrandIntro } from './BrandIntro'
import { HostIntro } from './HostIntro'
import { BookCard } from './BookCard'
import { BookRecap } from './BookRecap'
import { FONT } from './fonts'
import { Subtitles } from './Subtitles'
import { Overlay } from './Overlay'
import {
  toFrames, BRAND_FRAMES, CELEB_VISUAL_DELAY,
  TITLE_SUMMARY_GAP, SUMMARY_CONTEXT_GAP, CONTEXT_QUOTE_GAP, QUOTE_CONTEXTAFTER_GAP,
  BOOK_GAP, RECAP_FRAMES, PRE_LABEL_GAP, LABEL_FRAMES,
  summaryPhaseEnd, contextPhaseEnd, quotePhaseEnd, bookTotalFrames,
} from './timing'
import { EPISODE_NAME } from './script'

type Props = {
  script: BookRecommendScript
}

const STATIC = 'http://localhost:3005'
const CACHE_BUST = Date.now()
const sf = (path: string) => `${STATIC}/${path}?v=${CACHE_BUST}`
/** 에피소드별 음성 경로 */
const vf = (file: string) => sf(`voice/${EPISODE_NAME}/${file}`)

export const calcTotalFrames = (script: BookRecommendScript) => {
  const { narrator, host, books } = script
  const celebIntro = CELEB_VISUAL_DELAY + (narrator.celebIntroDuration > 0 ? toFrames(narrator.celebIntroDuration) : 150)
  const philosophy = toFrames(host.voiceDuration)
  const bridge = narrator.bridgeDuration > 0 ? toFrames(narrator.bridgeDuration) : 105
  const booksTotal = books.reduce((sum, b) => sum + bookTotalFrames(b), 0)
  const bookGaps = Math.max(0, books.length - 1) * BOOK_GAP
  const outro = narrator.outroDuration > 0 ? toFrames(narrator.outroDuration) : 120
  return BRAND_FRAMES + celebIntro + philosophy + bridge + booksTotal + bookGaps + RECAP_FRAMES + outro
}

export const BookRecommend: React.FC<Props> = ({ script }) => {
  const frame = useCurrentFrame()
  const { narrator, host, books } = script

  const celebIntroFrames = CELEB_VISUAL_DELAY + (narrator.celebIntroDuration > 0 ? toFrames(narrator.celebIntroDuration) : 150)
  const philosophyFrames = toFrames(host.voiceDuration)
  const hostIntroFrames = celebIntroFrames + philosophyFrames
  const bridgeFrames = narrator.bridgeDuration > 0 ? toFrames(narrator.bridgeDuration) : 105

  let cursor = 0
  const brandStart = cursor
  cursor += BRAND_FRAMES
  const hostIntroStart = cursor
  cursor += hostIntroFrames
  const bridgeStart = cursor
  cursor += bridgeFrames

  const bookTimings = books.map((b) => ({
    titleFrames: toFrames(b.titleDuration),
    summaryFrames: toFrames(b.summaryDuration),
    contextFrames: toFrames(b.contextDuration),
    quoteFrames: b.quoteDuration ? toFrames(b.quoteDuration) : 0,
    contextAfterFrames: b.contextAfterDuration ? toFrames(b.contextAfterDuration) : 0,
    summaryEnd: summaryPhaseEnd(b),
    contextEnd: contextPhaseEnd(b),
    quoteEnd: quotePhaseEnd(b),
    total: bookTotalFrames(b),
    hasQuote: !!b.quoteDuration,
    hasContextAfter: !!b.contextAfterDuration,
  }))

  const bookStarts: number[] = []
  for (let bi = 0; bi < bookTimings.length; bi++) {
    if (bi > 0) cursor += BOOK_GAP
    bookStarts.push(cursor)
    cursor += bookTimings[bi].total
  }

  const recapStart = cursor
  cursor += RECAP_FRAMES

  const outroStart = cursor
  const outroFrames = narrator.outroDuration > 0 ? toFrames(narrator.outroDuration) : 120

  // 배경
  const vignetteOpacity = interpolate(frame, [0, 30], [1, 0.6], { extrapolateRight: 'clamp' })

  // 브릿지
  const bridgeLocal = frame - bridgeStart
  const bridgeOpacity =
    bridgeLocal >= 0 && bridgeLocal < bridgeFrames
      ? interpolate(bridgeLocal, [0, 15, bridgeFrames - 15, bridgeFrames], [0, 1, 1, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })
      : 0

  // 아웃트로
  const outroOpacity = interpolate(
    frame,
    [outroStart, outroStart + 20, outroStart + outroFrames - 20, outroStart + outroFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  )

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
          <div style={{ color: '#c8a46e', fontSize: 18, fontFamily: FONT.cinzel, letterSpacing: 6, fontWeight: 600, opacity: interpolate(bridgeLocal, [15, 35, bridgeFrames - 25, bridgeFrames - 10], [0, 0.8, 0.8, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) }}>
            BOOK SHELF
          </div>
          <div style={{ width: interpolate(bridgeLocal, [5, 40], [0, 600], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }), height: 1, backgroundColor: '#c8a46e', opacity: 0.5 }} />
        </AbsoluteFill>
      )}

      {/* 도서 소개 */}
      {books.map((book, i) => {
        const bt = bookTimings[i]
        const gapStart = i > 0 ? bookStarts[i] - BOOK_GAP : -1
        const summaryAudioStart = bt.titleFrames + TITLE_SUMMARY_GAP
        const contextAudioStart = bt.summaryEnd + SUMMARY_CONTEXT_GAP
        const quoteAudioStart = bt.hasQuote ? bt.contextEnd + CONTEXT_QUOTE_GAP : 0

        return (
          <React.Fragment key={i}>
            {i > 0 && (
              <Sequence from={gapStart} durationInFrames={BOOK_GAP}>
                <Audio src={sf('sfx/page-turn.wav')} volume={0.4} />
                {(() => {
                  const gapLocal = frame - gapStart
                  const gapOpacity = gapLocal >= 0 && gapLocal < BOOK_GAP
                    ? interpolate(gapLocal, [0, 20, BOOK_GAP - 10, BOOK_GAP], [0, 0.6, 0.6, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
                    : 0
                  return gapOpacity > 0 ? (
                    <AbsoluteFill style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: gapOpacity }}>
                      <div style={{ width: interpolate(gapLocal, [5, 30], [0, 300], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }), height: 1, backgroundColor: '#c8a46e', opacity: 0.4 }} />
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
              {/* 라벨: "핵심 요약" — 갭 내부: 제목 끝 + PRE_LABEL_GAP 후 */}
              <Sequence from={bt.titleFrames + PRE_LABEL_GAP} durationInFrames={LABEL_FRAMES}>
                <Audio src={vf('label-summary.wav')} />
              </Sequence>
              {/* 요약맨: 책 소개 + 핵심 */}
              <Sequence from={summaryAudioStart} durationInFrames={bt.summaryFrames}>
                <Audio src={sf('sfx/whoosh.wav')} volume={0.25} />
                <Audio src={vf(`book-${i}-summary.wav`)} />
              </Sequence>
              {/* 라벨: "추천 경위" — 갭 내부: 요약 끝 + PRE_LABEL_GAP 후 */}
              <Sequence from={bt.summaryEnd + PRE_LABEL_GAP} durationInFrames={LABEL_FRAMES}>
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
            </Sequence>
          </React.Fragment>
        )
      })}

      {/* 리캡 */}
      <Sequence from={recapStart} durationInFrames={RECAP_FRAMES}>
        <Audio src={sf('sfx/whoosh.wav')} volume={0.3} />
        <BookRecap books={books} host={host} totalFrames={RECAP_FRAMES} />
      </Sequence>

      {/* 아웃트로 */}
      {frame >= outroStart && (
        <>
          <Sequence from={outroStart} durationInFrames={outroFrames}>
            <Audio src={sf('sfx/chime.wav')} volume={0.5} />
            {narrator.outroDuration > 0 && <Audio src={vf('narrator-outro.wav')} />}
          </Sequence>
          <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: outroOpacity, gap: 24 }}>
            <div style={{ color: '#ccc', fontSize: 26, fontFamily: FONT.sans, textAlign: 'center', maxWidth: 900, lineHeight: 1.7, marginBottom: 40 }}>
              {narrator.outro}
            </div>
            <div style={{ color: '#c8a46e', fontSize: 42, fontWeight: 700, fontFamily: FONT.brand, letterSpacing: 6 }}>FEEL AND NOTE</div>
            <div style={{ width: 120, height: 1, backgroundColor: '#c8a46e', opacity: 0.5, margin: '4px 0' }} />
            <div style={{ color: '#666', fontSize: 20, fontFamily: FONT.cinzel, letterSpacing: 4 }}>feelandnote.com</div>
          </AbsoluteFill>
        </>
      )}

      <Overlay script={script} />
      <Subtitles script={script} />
    </AbsoluteFill>
  )
}
