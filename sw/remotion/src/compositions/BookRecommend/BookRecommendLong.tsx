import React from 'react'
import { AbsoluteFill, Audio, getRemotionEnvironment, Img, interpolate, Sequence, Series, staticFile, useCurrentFrame } from 'remotion'
import { freshAvatarUrl } from '../../lib/avatar'
import type { BookRecommendScript } from './types'
import { sf, fadeInOut, BrandLogo, makeVf, useIsPortrait, safeImg } from './utils'
import { DARK, DARK_BG } from '../theme'
import { BrandIntro } from './sections/BrandIntro'
import { HostIntro } from './sections/HostIntro'
import { BookCardVisual, CINEM_PAD } from './sections/BookCardVisual'
import { BookRecap } from './sections/BookRecap'
import { Typewriter } from './sections/Typewriter'
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
import { Breadcrumb } from './sections/Breadcrumb'
import { StudioSubtitles } from './studio/StudioSubtitles'
import { PortraitSubtitles } from './sections/PortraitSubtitles'
import { PromptPanel } from './studio/PromptPanel'
import { SubEditor } from './studio/SubEditor'
import {
  VN_SERVICE_GREETING, VN_SERVICE_INTRO, VN_FEATURED_QUOTE,
  VN_CELEB_INTRO, VN_PHILOSOPHY,
  VN_LABEL_SUMMARY, VN_LABEL_CONTEXT,
  vnBookTitle, vnBookSummary, vnBookContext, vnBookQuote, vnBookContextAfter, vnBookQuote2, vnBookContextAfter2,
  VN_OUTRO, VN_INTERLUDE, VN_RETURN_INTRO, VN_PREV_RECAP,
  vnTimingKey,
} from './voice-names'

export { calcTotalFrames } from './useTimeline'

// 세로 롱폼 프레임 치수 (쇼츠 참고)
const P_HEADER_H = 300
const P_BOTTOM_H = 360

type Props = {
  script: BookRecommendScript
  /** 에피소드 이름 (음성 경로용) */
  episodeName?: string
}

export const BookRecommend: React.FC<Props> = ({ script, episodeName }) => {
  const frame = useCurrentFrame()
  const portrait = useIsPortrait()
  const epName = episodeName ?? EPISODE_NAME
  const vf = makeVf(epName, loadVoiceSelect(epName), script.locale, !!script.host.elevenlabsVoiceId)
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
    <AbsoluteFill style={{ backgroundColor: DARK.base }}>
      {/* 배경 */}
      <AbsoluteFill style={{ background: DARK_BG.radial }} />
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

      {/* 콘텐츠 영역 */}
      <div style={{ position: 'absolute', top: portrait ? P_HEADER_H : 0, left: 0, right: 0, bottom: portrait ? P_BOTTOM_H : 0, overflow: 'hidden' }}>

      {/* 브랜드 */}
      <Sequence from={tl.brandStart} durationInFrames={BRAND_FRAMES}>
        {hasVoice && <Audio src={sf('common/sfx/chime.wav')} volume={0.6} />}
        <BrandIntro script={script} durationFrames={BRAND_FRAMES} opacity={fadeInOut(frame, tl.brandStart, BRAND_FRAMES)} />
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
                <Img src={freshAvatarUrl(host.avatar_url)} style={{ width: portrait ? 200 : 260, height: portrait ? 200 : 260, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(200,164,110,0.3)', backgroundColor: 'rgba(30,24,16,0.9)' }} />
                <div style={{ color: '#e8e0d0', fontSize: portrait ? 30 : 36, fontFamily: FONT.sans, textAlign: 'center', maxWidth: portrait ? 800 : 1000, lineHeight: 1.7 }}>
                  {narrator.returnIntro}
                </div>
                {script.series && (
                  <div style={{ color: '#c8a46e', fontSize: 22, fontFamily: FONT.cinzel, letterSpacing: 4 }}>
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
                <div style={{ color: '#c8a46e', fontSize: 20, fontFamily: FONT.cinzel, letterSpacing: 6 }}>PREVIOUSLY</div>
                <div style={{ width: portrait ? 400 : 500, height: 1, backgroundColor: '#c8a46e', opacity: 0.3 }} />
                <div style={{ color: '#ccc', fontSize: 30, fontFamily: FONT.sans, textAlign: 'center', maxWidth: portrait ? 850 : 1050, lineHeight: 1.8, marginTop: 8 }}>
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
            {hasVoice && <Audio src={sf('common/sfx/type-reveal.wav')} volume={0.7} />}
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
        {hasVoice && <Audio src={sf('common/sfx/page-turn.wav')} volume={0.6} />}
        {hasVoice && (
          <Sequence from={f(0.5)} durationInFrames={tl.bridgeFrames - f(0.5)}>
            <Audio src={sf('common/sfx/whoosh.wav')} volume={0.4} />
          </Sequence>
        )}
      </Sequence>
      <BookCarousel books={books} localFrame={bridgeLocal} duration={tl.bridgeFrames} fromIdx={0} toIdx={0} opacity={bridgeOpacity} />

      {/* 중간 리캡 (10개 초과 시) */}
      {tl.hasInterlude && (
        <Sequence from={tl.midRecapStart} durationInFrames={RECAP_FRAMES}>
          {hasVoice && <Audio src={sf('common/sfx/whoosh.wav')} volume={0.3} />}
          <BookRecap books={tl.firstHalfBooks} totalFrames={RECAP_FRAMES} />
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
              {hasVoice && <Audio src={sf('common/sfx/page-turn.wav')} volume={0.6} />}
              {hasVoice && (
                <Sequence from={f(0.5)} durationInFrames={tl.interludeFrames - f(0.5)}>
                  <Audio src={sf('common/sfx/whoosh.wav')} volume={0.4} />
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
                <div style={{ width: interpolate(intLocal, [f(0.17), f(1.33)], [0, portrait ? 500 : 700], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }), height: 1, backgroundColor: '#c8a46e', opacity: 0.5 }} />
                <div style={{ color: '#c8a46e', fontSize: 24, fontFamily: FONT.cinzel, letterSpacing: 6, fontWeight: 600, opacity: fadeInOut(intLocal, f(0.5), tl.interludeFrames - f(0.83), f(0.67), f(0.5)) }}>
                  PART II
                </div>
                <div style={{ width: interpolate(intLocal, [f(0.17), f(1.33)], [0, portrait ? 500 : 700], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }), height: 1, backgroundColor: '#c8a46e', opacity: 0.5 }} />
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
                {hasVoice && <Audio src={sf('common/sfx/page-turn.wav')} volume={0.4} />}
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
              {hasVoice && i === 0 && <Audio src={sf('common/sfx/page-turn.wav')} volume={0.5} />}
              {hasVoice && (
                <Series>
                  <Series.Sequence durationInFrames={bt.titleFrames}>
                    <Audio src={vf(vnBookTitle(i))} />
                  </Series.Sequence>
                  <Series.Sequence offset={tl.TITLE_SUMMARY_GAP_F} durationInFrames={tl.LABEL_SUMMARY_F}>
                    <Audio src={vf(VN_LABEL_SUMMARY)} />
                  </Series.Sequence>
                  <Series.Sequence offset={0} durationInFrames={bt.summaryFrames}>
                    <Audio src={sf('common/sfx/whoosh.wav')} volume={0.25} />
                    <Audio src={vf(vnBookSummary(i))} />
                  </Series.Sequence>
                  <Series.Sequence offset={tl.SUMMARY_CONTEXT_GAP_F} durationInFrames={tl.LABEL_CONTEXT_F}>
                    <Audio src={vf(VN_LABEL_CONTEXT)} />
                  </Series.Sequence>
                  <Series.Sequence offset={0} durationInFrames={bt.contextFrames}>
                    <Audio src={sf('common/sfx/whoosh.wav')} volume={0.2} />
                    <Audio src={vf(vnBookContext(i))} />
                  </Series.Sequence>
                  {bt.hasQuote && script.voiceTimings?.[vnTimingKey(vnBookQuote(i))] && (
                    <Series.Sequence offset={CONTEXT_QUOTE_GAP} durationInFrames={bt.quoteFrames}>
                      <Audio src={sf('common/sfx/whoosh.wav')} volume={0.3} />
                      <Audio src={vf(vnBookQuote(i))} />
                    </Series.Sequence>
                  )}
                  {bt.hasContextAfter && (book.contextAfterDuration ?? 0) > 0 && script.voiceTimings?.[vnTimingKey(vnBookContextAfter(i))] && (
                    <Series.Sequence offset={QUOTE_CONTEXTAFTER_GAP} durationInFrames={bt.contextAfterFrames}>
                      <Audio src={vf(vnBookContextAfter(i))} />
                    </Series.Sequence>
                  )}
                  {bt.hasQuote2 && script.voiceTimings?.[vnTimingKey(vnBookQuote2(i))] && (
                    <Series.Sequence offset={CONTEXT_QUOTE_GAP} durationInFrames={bt.quote2Frames}>
                      <Audio src={sf('common/sfx/whoosh.wav')} volume={0.3} />
                      <Audio src={vf(vnBookQuote2(i))} />
                    </Series.Sequence>
                  )}
                  {bt.hasContextAfter2 && (book.contextAfterDuration2 ?? 0) > 0 && script.voiceTimings?.[vnTimingKey(vnBookContextAfter2(i))] && (
                    <Series.Sequence offset={QUOTE_CONTEXTAFTER_GAP} durationInFrames={bt.contextAfter2Frames}>
                      <Audio src={vf(vnBookContextAfter2(i))} />
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
                hasQuote2={bt.hasQuote2}
                quote2Frames={bt.quote2Frames}
                hasContextAfter2={bt.hasContextAfter2}
                contextAfter2Frames={bt.contextAfter2Frames}
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
        {hasVoice && <Audio src={sf('common/sfx/whoosh.wav')} volume={0.3} />}
        <BookRecap books={tl.secondHalfBooks} totalFrames={RECAP_FRAMES} />
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
              {hasVoice && <Audio src={sf('common/sfx/chime.wav')} volume={0.5} />}
            </Sequence>
            {narOp > 0 && !portrait && (
              <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: narOp }}>
                <div style={{ fontFamily: FONT.sans, textAlign: 'center', maxWidth: 1100 }}>
                  <Typewriter
                    text={narrator.outro}
                    startFrame={tl.outroStart}
                    spreadFrames={tl.outroFrames}
                    color="#ccc"
                    fontSize={36}
                    style={{ lineHeight: 1.7 }}
                    timings={script.voiceTimings?.[vnTimingKey(VN_OUTRO)]}
                  />
                </div>
              </AbsoluteFill>
            )}
            <BrandIntro script={script} durationFrames={LOGO_FRAMES} opacity={logoOp} />
          </>
        )
      })()}

      {/* 상단 브레드크럼 — 영상 전체 표시 */}
      <Breadcrumb script={script} tl={tl} />

      </div>{/* /콘텐츠 영역 */}

      {/* 세로 롱폼 상단 바 — 모바일 가독성 최적화 */}
      {portrait && (() => {
        const inBrand = frame < tl.brandStart + BRAND_FRAMES
        const inOutro = frame >= tl.outroStart
        if (inBrand || inOutro) return null

        let bookIdx = -1
        for (let i = 0; i < tl.bookStarts.length; i++) {
          if (frame >= tl.bookStarts[i]) bookIdx = i
        }
        const inBook = bookIdx >= 0 && frame < tl.recapStart

        // 섹션 라벨 (상단에 표시)
        const isEn = script.locale === 'en'
        let headerLabel = ''
        if (inBook) {
          const bt = tl.bookTimings[bookIdx]
          const bs = tl.bookStarts[bookIdx]
          const titleEnd = bs + bt.titleFrames
          const contextStart = bs + bt.summaryEnd + tl.SUMMARY_CONTEXT_GAP_F + tl.LABEL_CONTEXT_F
          const contextEnd = contextStart + bt.contextFrames
          if (frame < titleEnd) headerLabel = ''
          else if (frame < bs + bt.summaryEnd) headerLabel = isEn ? 'Summary' : '핵심 요약'
          else if (frame < contextEnd) headerLabel = isEn ? 'Background' : '감상 배경'
          else if (bt.hasQuote) headerLabel = isEn ? 'Quote' : '셀럽 인용'
        } else if (!tl.cont && frame >= tl.hostIntroStart && frame < tl.hostIntroStart + tl.celebIntroFrames) {
          headerLabel = isEn ? 'Introduction' : '인물 소개'
        } else if (!tl.cont && frame >= tl.hostIntroStart + tl.celebIntroFrames && frame < tl.hostIntroStart + tl.hostIntroFrames) {
          headerLabel = isEn ? 'Philosophy' : '감상 철학'
        } else if (frame >= tl.bridgeStart && frame < tl.bridgeStart + tl.bridgeFrames) {
          headerLabel = isEn ? 'Book Shelf' : '서가'
        } else if (frame >= tl.recapStart && frame < tl.recapStart + RECAP_FRAMES) {
          headerLabel = isEn ? 'Recap' : '리캡'
        }

        return (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: P_HEADER_H,
            background: DARK.surface,
            zIndex: 50,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: '0 48px',
          }}>
            {inBook ? (
              <>
                {/* 제목 = 주인공 */}
                <div style={{
                  fontSize: 52, fontWeight: 700,
                  fontFamily: FONT.serif, color: '#e8e0d0',
                  textAlign: 'center', lineHeight: 1.2,
                  maxWidth: 900,
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                }}>
                  {books[bookIdx]?.title}
                </div>
                {/* 저자 */}
                <div style={{
                  fontSize: 28, color: '#a09080',
                  fontFamily: FONT.sans, marginTop: 6,
                }}>
                  {books[bookIdx]?.creator}
                </div>
                {/* 섹션 · 번호 = 보조 라인 */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  marginTop: 12,
                }}>
                  {headerLabel && (
                    <div style={{
                      fontSize: 24, color: '#c8a46e',
                      fontFamily: FONT.cinzel, fontWeight: 600,
                      letterSpacing: 4,
                    }}>
                      {headerLabel}
                    </div>
                  )}
                  {headerLabel && (
                    <div style={{ color: 'rgba(200,164,110,0.3)', fontSize: 24 }}>·</div>
                  )}
                  <div style={{
                    fontSize: 24, color: 'rgba(200,164,110,0.6)',
                    fontFamily: FONT.cinzel, fontWeight: 600,
                    letterSpacing: 2,
                  }}>
                    {String(bookIdx + 1).padStart(2, '0')} / {String(books.length).padStart(2, '0')}
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* 이름 = 주인공 */}
                <div style={{
                  fontSize: 64, fontWeight: 800,
                  fontFamily: FONT.sans, color: '#e8e0d0',
                  textAlign: 'center', lineHeight: 1.1,
                }}>
                  {host.nickname}
                </div>
                {/* 섹션 라벨 = 보조 */}
                {headerLabel && (
                  <div style={{
                    fontSize: 28, color: '#c8a46e',
                    fontFamily: FONT.cinzel, fontWeight: 600,
                    letterSpacing: 6, marginTop: 12,
                  }}>
                    {headerLabel}
                  </div>
                )}
              </>
            )}
          </div>
        )
      })()}

      {/* 세로 롱폼 하단 바 — 아바타+이름, 진행 바 */}
      {portrait && (() => {
        const inBrand = frame < tl.brandStart + BRAND_FRAMES
        const inOutro = frame >= tl.outroStart
        if (inBrand || inOutro) return (
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: P_BOTTOM_H, background: DARK.surface, zIndex: 50 }} />
        )

        // 진행률
        const totalF = tl.outroStart + tl.outroFrames + LOGO_FRAMES
        const progress = Math.min(1, Math.max(0, frame / totalF))

        return (
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            height: P_BOTTOM_H, background: DARK.surface, zIndex: 50,
            display: 'flex', flexDirection: 'column',
            justifyContent: 'flex-end',
            padding: '0 48px 36px',
          }}>
            {/* 행1: 아바타 + 이름 + "서재 탐방" */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 20,
              marginBottom: 28,
            }}>
              <Img src={freshAvatarUrl(host.avatar_url)} style={{
                width: 80, height: 80, borderRadius: '50%', objectFit: 'cover',
                border: '2px solid rgba(200,164,110,0.25)',
                backgroundColor: 'rgba(30,24,16,0.9)',
              }} />
              <div style={{ flex: 1 }}>
                <div style={{ color: '#e8e0d0', fontSize: 36, fontWeight: 600, fontFamily: FONT.sans }}>
                  {host.nickname}
                </div>
                <div style={{ color: '#888', fontSize: 28, fontFamily: FONT.sans }}>
                  {script.locale === 'en' ? host.title : host.nickname_en}
                </div>
              </div>
              <div style={{
                color: '#c8a46e', fontSize: 28, fontFamily: FONT.cinzel,
                fontWeight: 600, letterSpacing: 6,
              }}>
                {script.locale === 'en' ? 'LIBRARY TOUR' : '서재 탐방'}
              </div>
            </div>
            {/* 행2: 진행 바 + 진행 텍스트 */}
            <div style={{
              width: '100%', height: 6, borderRadius: 3,
              background: 'rgba(200,164,110,0.15)',
            }}>
              <div style={{
                width: `${progress * 100}%`, height: '100%', borderRadius: 3,
                background: 'rgba(200,164,110,0.5)',
              }} />
            </div>
          </div>
        )
      })()}

      {/* 하단 세이프존 — 진행바만 표시 (돌판 텍스처 제거) */}

      <Overlay script={script} />

      {/* Portrait 자막 — 세로 영상 렌더링 시에도 표시 */}
      {portrait && <PortraitSubtitles script={script} tl={tl} />}

      {/* 스튜디오 전용 — 2배속 오디오 싱크 문제 진단: 일시 비활성화 */}
      {false && !getRemotionEnvironment().isRendering && !portrait && <StudioSubtitles script={script} tl={tl} />}
      {false && !getRemotionEnvironment().isRendering && (
        <SubEditor
          voiceTimings={script.voiceTimings}
          episodeName={epName}
          locale={script.locale ?? 'ko'}
          currentTimingKey={(() => {
            // 현재 프레임 → 재생 중인 voiceTimings 키 (전 구간 커버)
            const { bookStarts, bookTimings, hostIntroStart, celebIntroFrames, philosophyFrames,
              svcGreetingStart, svcGreetingFrames, svcIntroStart, svcIntroFrames,
              fQuoteStart, fQuoteFrames, bridgeStart, bridgeFrames,
              outroStart, outroFrames, TITLE_SUMMARY_GAP_F, SUMMARY_CONTEXT_GAP_F } = tl
            // 프리인트로
            if (frame >= svcGreetingStart && frame < svcGreetingStart + svcGreetingFrames) return vnTimingKey(VN_SERVICE_GREETING)
            if (frame >= svcIntroStart && frame < svcIntroStart + svcIntroFrames) return vnTimingKey(VN_SERVICE_INTRO)
            if (fQuoteFrames > 0 && frame >= fQuoteStart && frame < fQuoteStart + fQuoteFrames) return vnTimingKey(VN_FEATURED_QUOTE)
            // 호스트 인트로
            const philoStart = hostIntroStart + celebIntroFrames + f(1)
            if (frame >= hostIntroStart && frame < philoStart) return vnTimingKey(VN_CELEB_INTRO)
            if (philosophyFrames > 0 && frame >= philoStart && frame < philoStart + philosophyFrames) return vnTimingKey(VN_PHILOSOPHY)
            // 책 구간
            for (let i = 0; i < bookStarts.length; i++) {
              const bs = bookStarts[i]; const bt = bookTimings[i]
              const nextStart = i + 1 < bookStarts.length ? bookStarts[i + 1] : tl.recapStart
              if (frame < bs || frame >= nextStart) continue
              const titleEnd = bs + bt.titleFrames
              const summaryStart = titleEnd + TITLE_SUMMARY_GAP_F
              const summaryEnd = summaryStart + bt.summaryFrames
              const contextStart = bs + bt.summaryEnd + SUMMARY_CONTEXT_GAP_F
              const contextEnd = contextStart + bt.contextFrames
              if (frame >= bs && frame < titleEnd) return vnTimingKey(vnBookTitle(i))
              if (frame >= summaryStart && frame < summaryEnd) return vnTimingKey(vnBookSummary(i))
              if (frame >= contextStart && frame < contextEnd) return vnTimingKey(vnBookContext(i))
              if (bt.hasQuote) {
                const quoteStart = contextEnd + 90
                const quoteEnd = quoteStart + bt.quoteFrames
                if (frame >= quoteStart && frame < quoteEnd) return vnTimingKey(vnBookQuote(i))
                if (bt.hasContextAfter && frame >= quoteEnd) return vnTimingKey(vnBookContextAfter(i))
              }
            }
            if (frame >= outroStart) return vnTimingKey(VN_OUTRO)
            return undefined
          })()}
        />
      )}
      {false && !getRemotionEnvironment().isRendering && (
        <PromptPanel
          script={script}
          currentBookIdx={(() => { let idx = 0; tl.bookStarts.forEach((s, i) => { if (frame >= s) idx = i }); return idx })()}
          currentPhase={(() => {
            for (let i = 0; i < tl.bookStarts.length; i++) {
              const bs = tl.bookStarts[i]; const bt = tl.bookTimings[i]
              const summaryStart = bs + bt.titleFrames + tl.TITLE_SUMMARY_GAP_F
              const contextStart = bs + bt.summaryEnd + tl.SUMMARY_CONTEXT_GAP_F
              if (frame >= contextStart && frame < contextStart + bt.contextFrames) return '2'
              if (frame >= summaryStart && frame < summaryStart + bt.summaryFrames) return '1'
            }
            return null
          })()}
        />
      )}
    </AbsoluteFill>
  )
}
