/**
 * 에피소드 데이터 직렬화 헬퍼.
 *
 * - splitEpisodeData: UI 가 통저장하는 EpisodeData 객체를 content / timing 두 갈래로 나눈다.
 *   duration 류 필드는 timing 으로, 나머지는 content 로. 외부 shorts 필드는 본체에서 제외.
 * - mergeEpisodeFiles: 디스크에서 읽은 content + timing 을 한 객체로 합쳐 UI 에 돌려준다.
 *
 * 신구조·레거시 양쪽에서 공유.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

const NARRATOR_DURATION_KEYS = [
  'serviceGreetingDuration', 'serviceIntroDuration', 'celebIntroDuration',
  'bridgeDuration', 'outroDuration', 'labelSummaryDuration', 'labelContextDuration',
  'returnIntroDuration', 'prevRecapDuration', 'interludeDuration',
] as const

const HOST_DURATION_KEYS = ['featuredQuoteDuration', 'voiceDuration'] as const

const BOOK_DURATION_KEYS = [
  'titleDuration', 'summaryDuration', 'contextDuration',
] as const

export function mergeEpisodeFiles(content: any, timing: any): any {
  if (!timing || Object.keys(timing).length === 0) return content
  return {
    ...content,
    voiceTimings: timing.voiceTimings ?? content.voiceTimings,
    narrator: { ...content.narrator, ...timing.narrator },
    host: { ...content.host, ...timing.host },
    books: content.books?.map((b: any, i: number) => {
      const tb = timing.books?.[i] ?? {}
      const merged = { ...b, ...tb }
      // quotePairDurations → quotePairs 내부에 병합
      if (tb.quotePairDurations && merged.quotePairs) {
        merged.quotePairs = merged.quotePairs.map((p: any, pi: number) => ({
          ...p, ...(tb.quotePairDurations[pi] ?? {}),
        }))
        delete merged.quotePairDurations
      }
      return merged
    }),
    shorts: content.shorts,
  }
}

export function splitEpisodeData(data: unknown): { content: any; timing: any } {
  const timing: any = {}
  const content = JSON.parse(JSON.stringify(data))

  if (content.voiceTimings) {
    timing.voiceTimings = content.voiceTimings
    delete content.voiceTimings
  }

  const nd: any = {}
  for (const k of NARRATOR_DURATION_KEYS) {
    if (content.narrator?.[k] != null) { nd[k] = content.narrator[k]; delete content.narrator[k] }
  }
  if (Object.keys(nd).length > 0) timing.narrator = nd

  const hd: any = {}
  for (const k of HOST_DURATION_KEYS) {
    if (content.host?.[k] != null) { hd[k] = content.host[k]; delete content.host[k] }
  }
  if (Object.keys(hd).length > 0) timing.host = hd

  if (content.books) {
    const bd = content.books.map((b: any) => {
      const d: any = {}
      for (const k of BOOK_DURATION_KEYS) {
        if (b[k] != null) { d[k] = b[k]; delete b[k] }
      }
      if (b.quotePairs?.length) {
        d.quotePairDurations = b.quotePairs.map((p: any) => {
          const pd: any = {}
          if (p.quoteDuration != null) { pd.quoteDuration = p.quoteDuration; delete p.quoteDuration }
          if (p.afterDuration != null) { pd.afterDuration = p.afterDuration; delete p.afterDuration }
          return pd
        })
      }
      return d
    })
    if (bd.some((d: any) => Object.keys(d).length > 0)) timing.books = bd
  }

  // 외부 shorts 파일로 분리 저장되므로 본체에서는 배제
  if (content.shorts !== undefined) delete content.shorts
  // 폐기된 솔로 잔재 차단 — solos는 별도 저장 안 함 (책 본문에서 자동 변환)
  if (content.solos !== undefined) delete content.solos

  return { content, timing }
}
