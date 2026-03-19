import React from 'react'
import { AbsoluteFill, Audio, getRemotionEnvironment, Img, interpolate, Sequence, Series, useCurrentFrame } from 'remotion'
import type { BookRecommendScript } from './types'
import { sf, fadeInOut, BrandLogo, BRAND_LOGO_SIZE, makeVf } from './utils'
import { BrandIntro } from './sections/BrandIntro'
import { HostIntro } from './sections/HostIntro'
import { BookCardVisual } from './sections/BookCardVisual'
import { BookRecap } from './sections/BookRecap'
import { FONT } from './fonts'
import { Overlay } from './sections/Overlay'
import {
  toFrames, BRAND_FRAMES, CELEB_VISUAL_DELAY,
  CONTEXT_QUOTE_GAP, QUOTE_CONTEXTAFTER_GAP,
  BOOK_GAP, RECAP_FRAMES, LOGO_FRAMES, f,
} from './timing'
import { EPISODE_NAME, loadVoiceSelect, isVoiceReady } from './script'
import { useTimeline } from './useTimeline'
import { usePrefetch } from './usePrefetch'
import { PreIntro } from './sections/PreIntro'
import { BookCarousel } from './sections/BookCarousel'
import { StudioSubtitles } from './studio/StudioSubtitles'
import { DevOverlay } from './studio/DevOverlay'
import {
  VN_SERVICE_GREETING, VN_SERVICE_INTRO, VN_FEATURED_QUOTE,
  VN_CELEB_INTRO, VN_PHILOSOPHY,
  VN_LABEL_SUMMARY, VN_LABEL_CONTEXT,
  vnBookTitle, vnBookSummary, vnBookContext, vnBookQuote, vnBookContextAfter,
  VN_OUTRO, VN_INTERLUDE, VN_RETURN_INTRO, VN_PREV_RECAP,
  vnTimingKey,
} from './voice-names'

export { calcTotalFrames } from './useTimeline'

type Props = {
  script: BookRecommendScript
  /** 에피소드 이름 (음성 경로용) */
  episodeName?: string
}

export const BookRecommend: React.FC<Props> = ({ script, episodeName }) => {
  const frame = useCurrentFrame()
  const epName = episodeName ?? EPISODE_NAME
  const vf = makeVf(epName, loadVoiceSelect(epName), script.locale)
  const { narrator, host, books } = script
  const hasVoice = isVoiceReady(script)
  const tl = useTimeline(script)

  usePrefetch(script, vf, hasVoice, tl.cont)

  // 배경
  const vignetteOpacity = interpolate(frame, [0, f(1)], [1, 0.6], { extrapolateRight: 'clamp' })

  // 브릿지
  const bridgeLocal = frame - tl.bridgeStart
  const bridgeOpacity = bridgeLocal >= 0 && bridgeLocal < tl.bridgeFrames
    ? fadeInOut(bridgeLocal, 0, tl.bridgeFrames, f(0.5), f(0.5))
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
      <Sequence from={tl.brandStart} durationInFrames={BRAND_FRAMES}>
        {hasVoice && <Audio src={sf('sfx/chime.wav')} volume={0.6} />}
        <BrandIntro durationFrames={BRAND_FRAMES} locale={script.locale} />
      </Sequence>

      {/* ===== Continuation: ReturnIntro + PrevRecap ===== */}
      {tl.cont && tl.returnIntroFrames > 0 && (
        <Sequence from={tl.returnIntroStart} durationInFrames={tl.returnIntroFrames}>
          {hasVoice && (narrator.returnIntroDuration ?? 0) > 0 && <Audio src={vf(VN_RETURN_INTRO)} />}
          {(() => {
            const local = frame - tl.returnIntroStart
            const op = local >= 0 && local < tl.returnIntroFrames
              ? fadeInOut(local, 0, tl.returnIntroFrames, f(0.67), f(0.5))
              : 0
            if (op <= 0) return null
            return (
              <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: op, gap: 20 }}>
                <Img src={host.avatar_url} style={{ width: 160, height: 160, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(200,164,110,0.3)', backgroundColor: 'rgba(30,24,16,0.9)' }} />
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
      {tl.cont && tl.prevRecapFrames > 0 && (
        <Sequence from={tl.prevRecapStart} durationInFrames={tl.prevRecapFrames}>
          {hasVoice && (narrator.prevRecapDuration ?? 0) > 0 && <Audio src={vf(VN_PREV_RECAP)} />}
          {(() => {
            const local = frame - tl.prevRecapStart
            const op = local >= 0 && local < tl.prevRecapFrames
              ? fadeInOut(local, 0, tl.prevRecapFrames, f(0.67), f(0.5))
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

      {/* 서비스 오디오 */}
      {!tl.cont && hasVoice && tl.svcGreetingFrames > 0 && (
        <Sequence from={tl.svcGreetingStart} durationInFrames={tl.svcGreetingFrames}>
          <Audio src={vf(VN_SERVICE_GREETING)} />
        </Sequence>
      )}
      {!tl.cont && hasVoice && tl.svcIntroFrames > 0 && (
        <Sequence from={tl.svcIntroStart} durationInFrames={tl.svcIntroFrames}>
          <Audio src={vf(VN_SERVICE_INTRO)} />
        </Sequence>
      )}
      {hasVoice && tl.fQuoteFrames > 0 && (
        <Sequence from={tl.fQuoteStart} durationInFrames={tl.fQuoteFrames}>
          <Sequence from={f(1)} durationInFrames={tl.fQuoteFrames}>
            <Audio src={vf(VN_FEATURED_QUOTE)} />
          </Sequence>
        </Sequence>
      )}

      {/* 프리인트로 비주얼 (Part 1) */}
      {!tl.cont && <PreIntro
        frame={frame}
        svcGreetingStart={tl.svcGreetingStart}
        svcGreetingFrames={tl.svcGreetingFrames}
        svcIntroFrames={tl.svcIntroFrames}
        fQuoteFrames={tl.fQuoteFrames}
        host={host}
        books={books}
        locale={script.locale}
        fQuoteAudioSrc={hasVoice && tl.fQuoteFrames > 0 ? vf(VN_FEATURED_QUOTE) : undefined}
      />}

      {/* 인물 소개 + 감상철학 (Part 1) */}
      {!tl.cont && tl.hostIntroFrames > 0 && (
        <Sequence from={tl.hostIntroStart} durationInFrames={tl.hostIntroFrames}>
          <Sequence from={0} durationInFrames={tl.celebIntroFrames}>
            {hasVoice && <Audio src={sf('sfx/type-reveal.wav')} volume={0.7} />}
            {hasVoice && (narrator.celebIntroDuration ?? 0) > 0 && (
              <Sequence from={CELEB_VISUAL_DELAY} durationInFrames={tl.celebIntroFrames - CELEB_VISUAL_DELAY}>
                <Audio src={vf(VN_CELEB_INTRO)} />
              </Sequence>
            )}
          </Sequence>
          {hasVoice && (
            <Sequence from={tl.celebIntroFrames + f(1)} durationInFrames={tl.philosophyFrames}>
              <Audio src={vf(VN_PHILOSOPHY)} />
            </Sequence>
          )}
          <HostIntro host={host} narratorText={narrator.celebIntro ?? ''} celebIntroFrames={tl.celebIntroFrames} totalFrames={tl.hostIntroFrames} narratorDuration={narrator.celebIntroDuration ?? 0} philosophyDuration={host.voiceDuration ?? 0} narratorTimings={script.voiceTimings?.[vnTimingKey(VN_CELEB_INTRO)]} philosophyTimings={script.voiceTimings?.[vnTimingKey(VN_PHILOSOPHY)]} philosophyAudioSrc={hasVoice ? vf(VN_PHILOSOPHY) : undefined} locale={script.locale} />
        </Sequence>
      )}

      {/* 브릿지 */}
      <Sequence from={tl.bridgeStart} durationInFrames={tl.bridgeFrames}>
        {hasVoice && <Audio src={sf('sfx/page-turn.wav')} volume={0.6} />}
        {hasVoice && (
          <Sequence from={f(0.5)} durationInFrames={tl.bridgeFrames - f(0.5)}>
            <Audio src={sf('sfx/whoosh.wav')} volume={0.4} />
          </Sequence>
        )}
      </Sequence>
      <BookCarousel books={books} localFrame={bridgeLocal} duration={tl.bridgeFrames} fromIdx={0} toIdx={0} opacity={bridgeOpacity} />

      {/* 중간 리캡 (10개 초과 시) */}
      {tl.hasInterlude && (
        <Sequence from={tl.midRecapStart} durationInFrames={RECAP_FRAMES}>
          {hasVoice && <Audio src={sf('sfx/whoosh.wav')} volume={0.3} />}
          <BookRecap books={tl.firstHalfBooks} host={host} totalFrames={RECAP_FRAMES} label="PART I" />
        </Sequence>
      )}

      {/* 중간안내 (10개 초과 시) */}
      {tl.hasInterlude && (() => {
        const intLocal = frame - tl.interludeStart
        const intOpacity = intLocal >= 0 && intLocal < tl.interludeFrames
          ? fadeInOut(intLocal, 0, tl.interludeFrames, f(0.5), f(0.5))
          : 0
        return (
          <>
            <Sequence from={tl.interludeStart} durationInFrames={tl.interludeFrames}>
              {hasVoice && <Audio src={sf('sfx/page-turn.wav')} volume={0.6} />}
              {hasVoice && (
                <Sequence from={f(0.5)} durationInFrames={tl.interludeFrames - f(0.5)}>
                  <Audio src={sf('sfx/whoosh.wav')} volume={0.4} />
                </Sequence>
              )}
              {hasVoice && narrator.interludeDuration && narrator.interludeDuration > 0 && (
                <Sequence from={f(0.67)} durationInFrames={tl.interludeFrames - f(0.67)}>
                  <Audio src={vf(VN_INTERLUDE)} />
                </Sequence>
              )}
            </Sequence>
            {intOpacity > 0 && (
              <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: intOpacity, gap: 20 }}>
                <div style={{ width: interpolate(intLocal, [f(0.17), f(1.33)], [0, 600], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }), height: 1, backgroundColor: '#c8a46e', opacity: 0.5 }} />
                <div style={{ color: '#c8a46e', fontSize: 18, fontFamily: FONT.cinzel, letterSpacing: 6, fontWeight: 600, opacity: fadeInOut(intLocal, f(0.5), tl.interludeFrames - f(0.83), f(0.67), f(0.5)) }}>
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
        const bt = tl.bookTimings[i]
        const gapStart = i > 0 ? tl.bookStarts[i] - BOOK_GAP : -1

        return (
          <React.Fragment key={i}>
            {/* 책 사이 전환 */}
            {i > 0 && (
              <Sequence from={gapStart} durationInFrames={BOOK_GAP}>
                {hasVoice && <Audio src={sf('sfx/page-turn.wav')} volume={0.4} />}
                {(() => {
                  const gapLocal = frame - gapStart
                  const op = gapLocal >= 0 && gapLocal < BOOK_GAP
                    ? interpolate(gapLocal, [0, f(0.4), BOOK_GAP - f(0.33), BOOK_GAP], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
                    : 0
                  return <BookCarousel books={books} localFrame={gapLocal} duration={BOOK_GAP} fromIdx={i - 1} toIdx={i} opacity={op} />
                })()}
              </Sequence>
            )}
            <Sequence from={tl.bookStarts[i]} durationInFrames={bt.total}>
              {hasVoice && i === 0 && <Audio src={sf('sfx/page-turn.wav')} volume={0.5} />}
              {hasVoice && (
                <Series>
                  <Series.Sequence durationInFrames={bt.titleFrames}>
                    <Audio src={vf(vnBookTitle(i))} />
                  </Series.Sequence>
                  <Series.Sequence offset={tl.TITLE_SUMMARY_GAP_F} durationInFrames={tl.LABEL_SUMMARY_F}>
                    <Audio src={vf(VN_LABEL_SUMMARY)} />
                  </Series.Sequence>
                  <Series.Sequence offset={0} durationInFrames={bt.summaryFrames}>
                    <Audio src={sf('sfx/whoosh.wav')} volume={0.25} />
                    <Audio src={vf(vnBookSummary(i))} />
                  </Series.Sequence>
                  <Series.Sequence offset={tl.SUMMARY_CONTEXT_GAP_F} durationInFrames={tl.LABEL_CONTEXT_F}>
                    <Audio src={vf(VN_LABEL_CONTEXT)} />
                  </Series.Sequence>
                  <Series.Sequence offset={0} durationInFrames={bt.contextFrames}>
                    <Audio src={sf('sfx/whoosh.wav')} volume={0.2} />
                    <Audio src={vf(vnBookContext(i))} />
                  </Series.Sequence>
                  {bt.hasQuote && (
                    <Series.Sequence offset={CONTEXT_QUOTE_GAP} durationInFrames={bt.quoteFrames}>
                      <Audio src={sf('sfx/whoosh.wav')} volume={0.3} />
                      <Audio src={vf(vnBookQuote(i))} />
                    </Series.Sequence>
                  )}
                  {bt.hasContextAfter && (
                    <Series.Sequence offset={QUOTE_CONTEXTAFTER_GAP} durationInFrames={bt.contextAfterFrames}>
                      <Audio src={vf(vnBookContextAfter(i))} />
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
                labelSummaryF={tl.LABEL_SUMMARY_F}
                labelContextF={tl.LABEL_CONTEXT_F}
                titleSummaryGapF={tl.TITLE_SUMMARY_GAP_F}
                summaryContextGapF={tl.SUMMARY_CONTEXT_GAP_F}
                episodeName={epName}
                timings={script.voiceTimings}
                script={script}
              />
            </Sequence>
          </React.Fragment>
        )
      })}

      {/* 리캡 */}
      <Sequence from={tl.recapStart} durationInFrames={RECAP_FRAMES}>
        {hasVoice && <Audio src={sf('sfx/whoosh.wav')} volume={0.3} />}
        <BookRecap books={tl.secondHalfBooks} host={host} totalFrames={RECAP_FRAMES} />
      </Sequence>

      {/* 아웃트로 + 로고 */}
      {(() => {
        const narrationEnd = tl.outroStart + tl.outroFrames
        const logoStart = narrationEnd
        const narOp = fadeInOut(frame, tl.outroStart, tl.outroFrames, f(0.67), f(0.83))
        const logoOp = interpolate(frame,
          [logoStart, logoStart + f(0.83), logoStart + LOGO_FRAMES - f(0.67), logoStart + LOGO_FRAMES],
          [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
        return (
          <>
            <Sequence from={tl.outroStart} durationInFrames={tl.outroFrames}>
              {hasVoice && narrator.outroDuration > 0 && <Audio src={vf(VN_OUTRO)} />}
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

      {/* 스튜디오 전용 */}
      {!getRemotionEnvironment().isRendering && <StudioSubtitles script={script} tl={tl} />}
      {!getRemotionEnvironment().isRendering && <DevOverlay frame={frame} tl={tl} books={books} />}
    </AbsoluteFill>
  )
}
