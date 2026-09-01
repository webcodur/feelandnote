/**
 * 팩션 로더의 순수 조각 — 어떤 파일을 읽을지, 읽은 발화 시각을 어떻게 합칠지.
 * webpack·fetch 를 모르므로 node 테스트에서 그대로 돌린다. 실제 읽기는 script.ts 가 맡는다.
 */
import type { VoiceTimings } from '../../lib/voice-timing'

export type FactionLocale = 'ko' | 'en'

/** 편 본문 — DB 에서 내보낸 렌더용 산출물. staticFile 기준 상대 경로다. */
export function factionDataPath(name: string): string {
  return `factions/${name}/faction-data.json`
}

/**
 * 발화 시각 파일 후보. 통합본(`data.timing.<lang>.json`, 레거시)을 앞에 두고 편별 파일을 뒤에 두어
 * 같은 키는 편별 값이 이긴다 — require.context 시절 알파벳 순 병합과 같은 우선순위다.
 * 파일이 없는 후보는 읽는 쪽이 건너뛴다.
 */
export function timingFileCandidates(name: string, locale: FactionLocale, shortsParts: number[]): string[] {
  const parts = [...new Set(shortsParts)].sort((a, b) => a - b)
  return [
    `factions/${name}/data.timing.${locale}.json`,
    ...parts.map(p => `factions/${name}/data.timing.p${p}.${locale}.json`),
  ]
}

/** 후보 순서대로 얕게 합친다. 하나도 없으면 undefined — 렌더는 발화 시각 없이도 돈다(폴백). */
export function mergeTimingMaps(maps: ReadonlyArray<VoiceTimings | undefined>): VoiceTimings | undefined {
  const present = maps.filter((m): m is VoiceTimings => !!m)
  if (!present.length) return undefined
  return Object.assign({}, ...present) as VoiceTimings
}
