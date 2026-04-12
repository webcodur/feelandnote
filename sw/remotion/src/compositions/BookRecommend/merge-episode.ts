import type { BookRecommendScript, EpisodeTimingData } from './types'

/** content JSON + timing JSON → 완전한 BookRecommendScript
 *
 *  옵션 2 이후: shorts는 script.ts가 외부 파일(`shorts/{locale}-N.json`)에서
 *  먼저 주입해 content.shorts에 이미 배열로 채워져 있다. 이 함수는 본체(narrator,
 *  host, books) 타이밍만 머지하고 shorts는 그대로 통과시킨다.
 */
export function mergeEpisode(
  content: BookRecommendScript,
  timing: EpisodeTimingData,
): BookRecommendScript {
  return {
    ...content,
    voiceTimings: timing.voiceTimings,
    narrator: { ...content.narrator, ...timing.narrator },
    host: { ...content.host, ...timing.host },
    books: content.books?.map((book, i) => ({
      ...book,
      ...(timing.books?.[i] ?? {}),
    })) as BookRecommendScript['books'],
    shorts: content.shorts,
  }
}
