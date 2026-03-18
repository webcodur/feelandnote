/**
 * usePrefetch — BookRecommend 오디오 프리페치 훅
 */
import { useEffect } from 'react'
import { prefetch } from 'remotion'
import type { BookRecommendScript } from './types'
import { sf } from './utils'
import {
  VN_SERVICE_GREETING, VN_SERVICE_INTRO, VN_FEATURED_QUOTE,
  VN_CELEB_INTRO, VN_PHILOSOPHY,
  VN_LABEL_SUMMARY, VN_LABEL_CONTEXT,
  vnBookTitle, vnBookSummary, vnBookContext, vnBookQuote, vnBookContextAfter,
  VN_OUTRO, VN_INTERLUDE, VN_RETURN_INTRO, VN_PREV_RECAP,
} from './voice-names'

export function usePrefetch(
  script: BookRecommendScript,
  vf: (file: string) => string,
  hasVoice: boolean,
  cont: boolean,
) {
  const { narrator, host, books } = script

  useEffect(() => {
    if (!hasVoice) return
    const urls: string[] = [
      sf('sfx/chime.wav'),
      sf('sfx/page-turn.wav'),
      sf('sfx/whoosh.wav'),
      vf(VN_LABEL_SUMMARY),
      vf(VN_LABEL_CONTEXT),
      ...(narrator.outroDuration > 0 ? [vf(VN_OUTRO)] : []),
      ...(narrator.interludeDuration && narrator.interludeDuration > 0 ? [vf(VN_INTERLUDE)] : []),
      ...books.flatMap((_, i) => [
        vf(vnBookTitle(i)),
        vf(vnBookSummary(i)),
        vf(vnBookContext(i)),
        ...(books[i].directQuote ? [vf(vnBookQuote(i))] : []),
        ...(books[i].contextAfter ? [vf(vnBookContextAfter(i))] : []),
      ]),
    ]
    if (cont) {
      if ((narrator.returnIntroDuration ?? 0) > 0) urls.push(vf(VN_RETURN_INTRO))
      if ((narrator.prevRecapDuration ?? 0) > 0) urls.push(vf(VN_PREV_RECAP))
    } else {
      urls.push(sf('sfx/type-reveal.wav'))
      if ((narrator.serviceGreetingDuration ?? 0) > 0) {
        urls.push(vf(VN_SERVICE_GREETING))
      }
      if ((narrator.serviceIntroDuration ?? 0) > 0) urls.push(vf(VN_SERVICE_INTRO))
      urls.push(vf(VN_CELEB_INTRO))
      urls.push(vf(VN_PHILOSOPHY))
    }
    if (host.featuredQuoteDuration && host.featuredQuoteDuration > 0) urls.push(vf(VN_FEATURED_QUOTE))
    const cleanups = urls.map((url) => {
      const { free } = prefetch(url, { method: 'blob-url', contentType: 'audio/wav' })
      return free
    })
    return () => cleanups.forEach((fn) => fn())
  }, [books, hasVoice])
}
