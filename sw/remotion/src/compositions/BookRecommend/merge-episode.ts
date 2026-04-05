import type { BookRecommendScript, EpisodeTimingData } from './types'

/** content JSON + timing JSON → 완전한 BookRecommendScript */
export function mergeEpisode(
  content: BookRecommendScript,
  timing: EpisodeTimingData,
): BookRecommendScript {
  return {
    ...content,
    voiceTimings: timing.voiceTimings,
    narrator: { ...content.narrator, ...timing.narrator },
    host: { ...content.host, ...timing.host },
    books: content.books.map((book, i) => ({
      ...book,
      ...(timing.books?.[i] ?? {}),
    })),
    shorts: content.shorts
      ? {
          ...content.shorts,
          segments: content.shorts.segments.map((seg, i) => ({
            ...seg,
            ...(timing.shorts?.segments?.[i] ?? {}),
          })),
        }
      : content.shorts,
  }
}
