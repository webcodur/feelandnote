import type { BookRecommendScript } from './types'
import type { SfxSection } from './sfx-build'
import type { Timeline } from './useTimeline'
import {
  toFrames, CELEB_VISUAL_DELAY, CONTEXT_QUOTE_GAP, QUOTE_CONTEXTAFTER_GAP, f,
} from './timing'
import {
  vnTimingKey, VN_SERVICE_GREETING, VN_SERVICE_INTRO, VN_FEATURED_QUOTE,
  VN_CELEB_INTRO, VN_PHILOSOPHY, VN_RETURN_INTRO, VN_PREV_RECAP,
  vnBookTitle, vnBookSummary, vnBookContext, vnBookQuote, vnBookAfter, VN_OUTRO,
} from './voice-names'
import { bookFieldParts } from './field-parts'

/**
 * 롱폼의 모든 음성 행을 SfxSection 목록으로 변환.
 *
 * - 각 구간의 절대 시작 프레임은 useTimeline 결과(tl)와 책 내부 phase 누적으로 산출.
 * - 책 내부 phase 누적은 BookCardVisual의 sLabelSummary/sSummary/sContext 계산과 일치한다.
 * - SFX 큐가 비어있는 행은 호출 측(buildSfxRenderItems)에서 자동 skip.
 */
export function collectLongformSections(script: BookRecommendScript, tl: Timeline): SfxSection[] {
  const out: SfxSection[] = []
  const { narrator, host, books } = script

  // 인트로 영역 — 새 시작 시리즈에만 노출되는 항목은 cont일 때 frames=0이므로 자연 skip.
  const fQuoteVoiceFrames = host.featuredQuoteDuration && host.featuredQuoteDuration > 0
    ? toFrames(host.featuredQuoteDuration) : 0

  if (tl.cont) {
    if (tl.returnIntroFrames > 0) {
      out.push({
        timingsKey: vnTimingKey(VN_RETURN_INTRO), text: narrator.returnIntro ?? '',
        startFrame: tl.returnIntroStart, durationFrames: tl.returnIntroFrames,
        sfx: narrator.returnIntroSfx, keyPrefix: 'sfx-return-intro',
      })
    }
    if (tl.prevRecapFrames > 0) {
      out.push({
        timingsKey: vnTimingKey(VN_PREV_RECAP), text: narrator.prevRecap ?? '',
        startFrame: tl.prevRecapStart, durationFrames: tl.prevRecapFrames,
        sfx: narrator.prevRecapSfx, keyPrefix: 'sfx-prev-recap',
      })
    }
  } else {
    if (tl.svcGreetingFrames > 0) {
      out.push({
        timingsKey: vnTimingKey(VN_SERVICE_GREETING), text: narrator.serviceGreeting ?? '',
        startFrame: tl.svcGreetingStart, durationFrames: tl.svcGreetingFrames,
        sfx: narrator.serviceGreetingSfx, keyPrefix: 'sfx-svc-greeting',
      })
    }
    if (tl.svcIntroFrames > 0) {
      out.push({
        timingsKey: vnTimingKey(VN_SERVICE_INTRO), text: narrator.serviceIntro ?? '',
        startFrame: tl.svcIntroStart, durationFrames: tl.svcIntroFrames,
        sfx: narrator.serviceIntroSfx, keyPrefix: 'sfx-svc-intro',
      })
    }
    if (fQuoteVoiceFrames > 0) {
      out.push({
        timingsKey: vnTimingKey(VN_FEATURED_QUOTE), text: host.featuredQuote ?? '',
        startFrame: tl.fQuoteStart, durationFrames: fQuoteVoiceFrames,
        sfx: host.featuredQuoteSfx, keyPrefix: 'sfx-featured-quote',
      })
    }
    // celebIntro: hostIntroStart + CELEB_VISUAL_DELAY 이후 실제 음성. tl.celebIntroFrames는 delay 포함값.
    const celebIntroVoiceFrames = tl.celebIntroFrames > CELEB_VISUAL_DELAY
      ? tl.celebIntroFrames - CELEB_VISUAL_DELAY : 0
    if (celebIntroVoiceFrames > 0) {
      out.push({
        timingsKey: vnTimingKey(VN_CELEB_INTRO), text: narrator.celebIntro ?? '',
        startFrame: tl.hostIntroStart + CELEB_VISUAL_DELAY, durationFrames: celebIntroVoiceFrames,
        sfx: narrator.celebIntroSfx, keyPrefix: 'sfx-celeb-intro',
      })
    }
    // philosophy: hostIntroStart + celebIntroFrames + f(1)
    if (tl.philosophyFrames > 0) {
      out.push({
        timingsKey: vnTimingKey(VN_PHILOSOPHY), text: host.philosophy ?? '',
        startFrame: tl.hostIntroStart + tl.celebIntroFrames + f(1),
        durationFrames: tl.philosophyFrames,
        sfx: host.philosophySfx, keyPrefix: 'sfx-philosophy',
      })
    }
  }

  if (tl.bridgeFrames > 0) {
    out.push({
      timingsKey: vnTimingKey('B3-bridge.wav'), text: narrator.bridge ?? '',
      startFrame: tl.bridgeStart, durationFrames: tl.bridgeFrames,
      sfx: narrator.bridgeSfx, keyPrefix: 'sfx-bridge',
    })
  }

  // 책별 — 책 내부 phase 위치는 BookCardVisual과 동일 식.
  books.forEach((book, bi) => {
    const bookStart = tl.bookStarts[bi]
    if (bookStart == null) return
    const titleFrames = toFrames(book.titleDuration ?? 0)
    const summaryFrames = toFrames(book.summaryDuration ?? 0)
    const contextFrames = toFrames(book.contextDuration ?? 0)
    const sLabelSummary = titleFrames + tl.TITLE_SUMMARY_GAP_F
    const sSummary = sLabelSummary + tl.LABEL_SUMMARY_F
    const sSummaryEnd = sSummary + summaryFrames
    const sLabelContext = sSummaryEnd + tl.SUMMARY_CONTEXT_GAP_F
    const sContext = sLabelContext + tl.LABEL_CONTEXT_F
    const sContextEnd = sContext + contextFrames

    if (titleFrames > 0) {
      out.push({
        timingsKey: vnTimingKey(vnBookTitle(bi)),
        text: `${book.title}, ${book.creator}`,
        startFrame: bookStart, durationFrames: titleFrames,
        sfx: book.titleSfx, keyPrefix: `sfx-book${bi}-title`,
      })
    }
    if (summaryFrames > 0) {
      // 토막별 항목 — 앵커는 토막 본문에서 매칭된다 (분할 없으면 1개 = 기존과 동일)
      const sumStarts = tl.bookTimings[bi]?.summaryPartStartsF ?? [0]
      bookFieldParts(book.summary, book.summaryParts).forEach((partText, p) => {
        out.push({
          timingsKey: vnTimingKey(vnBookSummary(bi, p)), text: partText,
          startFrame: bookStart + sSummary + (sumStarts[p] ?? 0),
          durationFrames: p + 1 < sumStarts.length ? sumStarts[p + 1] - sumStarts[p] : summaryFrames - (sumStarts[p] ?? 0),
          sfx: book.summarySfx, keyPrefix: `sfx-book${bi}-summary${p > 0 ? `-${p + 1}` : ''}`,
        })
      })
    }
    if (contextFrames > 0) {
      const ctxStarts = tl.bookTimings[bi]?.contextPartStartsF ?? [0]
      bookFieldParts(book.contextMain, book.contextMainParts).forEach((partText, p) => {
        out.push({
          timingsKey: vnTimingKey(vnBookContext(bi, p)), text: partText,
          startFrame: bookStart + sContext + (ctxStarts[p] ?? 0),
          durationFrames: p + 1 < ctxStarts.length ? ctxStarts[p + 1] - ctxStarts[p] : contextFrames - (ctxStarts[p] ?? 0),
          sfx: book.contextMainSfx, keyPrefix: `sfx-book${bi}-context${p > 0 ? `-${p + 1}` : ''}`,
        })
      })
    }

    // quotePairs — sContextEnd 이후 누적
    let cursor = sContextEnd
    const pairTimings = tl.bookTimings[bi]?.quotePairTimings ?? []
    ;(book.quotePairs ?? []).forEach((pair, pi) => {
      const pt = pairTimings[pi]
      if (!pt) return
      if (pt.hasQuote) {
        const sQuote = cursor + CONTEXT_QUOTE_GAP
        if (pt.quoteFrames > 0) {
          out.push({
            timingsKey: vnTimingKey(vnBookQuote(bi, pi)), text: pair.quote ?? '',
            startFrame: bookStart + sQuote, durationFrames: pt.quoteFrames,
            sfx: pair.quoteSfx, keyPrefix: `sfx-book${bi}-quote${pi}`,
          })
        }
        cursor = sQuote + pt.quoteFrames
      }
      if (pt.hasAfter) {
        const sAfter = cursor + QUOTE_CONTEXTAFTER_GAP
        if (pt.afterFrames > 0) {
          out.push({
            timingsKey: vnTimingKey(vnBookAfter(bi, pi)), text: pair.after ?? '',
            startFrame: bookStart + sAfter, durationFrames: pt.afterFrames,
            sfx: pair.afterSfx, keyPrefix: `sfx-book${bi}-after${pi}`,
          })
        }
        cursor = sAfter + pt.afterFrames
      }
    })
  })

  // outro — 음성 길이만큼만(아웃트로 프레임은 fallback 포함이므로 narrator.outroDuration 우선)
  const outroVoiceFrames = narrator.outroDuration > 0 ? toFrames(narrator.outroDuration) : 0
  if (outroVoiceFrames > 0) {
    out.push({
      timingsKey: vnTimingKey(VN_OUTRO), text: narrator.outro ?? '',
      startFrame: tl.outroStart, durationFrames: outroVoiceFrames,
      sfx: narrator.outroSfx, keyPrefix: 'sfx-outro',
    })
  }

  return out
}
