/**
 * faction/data.ts — data.json 로드 + 인물 음성 잡 추출 + quoteDuration 안전 기록
 *
 * 잡 인덱싱(groupIndex·clusterIndex·personIndex)은 렌더의 buildCues 와 100% 동일해야
 * 파일명(vnPersonQuote)이 렌더 cue 의 staticFile 경로와 일치한다. 그래서 직접 순회하지 않고
 * buildCues 결과의 person 컷을 그대로 쓴다 — 인덱스 드리프트 원천 차단.
 */

import { readFile, writeFile } from 'fs/promises'
import { buildCues, type Cue } from '../../../src/compositions/Faction/timing.js'
import type { FactionScript, FactionPerson } from '../../../src/compositions/Faction/types.js'
import { vnPersonQuote } from '../../../src/compositions/Faction/voice-names.js'
import { DATA_PATH, LANG } from './cli.js'

export type FactionVoiceJob = {
  /** 출력 파일명 (vnPersonQuote 규칙) — 예 F01P01-quote.wav */
  file: string
  /** 합성 대상 텍스트 (선택 언어의 대사) */
  text: string
  /** 인물별 화자 ID (data 의 quoteSpeaker). 미지정이면 공용 기본 보이스 */
  speaker?: string
  /** buildCues 인덱스 — quoteDuration 기록 시 인물을 다시 찾는 데 쓴다 */
  groupIndex: number
  personIndex: number
  clusterIndex?: number
}

/** data.json 원본을 그대로 읽는다(가공 없음). 기록 시 이 객체를 수정해 되쓴다. */
export async function loadFactionData(): Promise<FactionScript> {
  const raw = await readFile(DATA_PATH, 'utf-8')
  return JSON.parse(raw) as FactionScript
}

/** 선택 언어의 대사 텍스트. ko=quote, en=quoteEn(폴백 quote). 합성은 통대사라 chunk 를 합치지 않는다. */
function quoteTextOf(p: FactionPerson): string {
  const t = LANG === 'en' ? (p.quoteEn ?? p.quote) : p.quote
  return (t ?? '').trim()
}

/**
 * buildCues 의 person 컷을 순회하며 음성 잡을 만든다.
 * disabled 세력·disabled 인물은 buildCues 가 이미 컷을 안 만들므로 자동 제외된다(렌더와 동일 기준).
 * 대사가 없는 인물은 건너뛴다.
 *
 * portrait=false(가로 롱폼)로 컷을 만든다 — longformOnly 세력/묶음까지 모두 포함해
 * 음성을 빠짐없이 생성한다. 세로 쇼츠 컷은 이 집합의 부분집합이라 별도 생성이 불필요하다.
 */
export function buildVoiceJobs(script: FactionScript): FactionVoiceJob[] {
  const jobs: FactionVoiceJob[] = []
  const cues = buildCues(script, false)
  for (const tc of cues) {
    const cue: Cue = tc.cue
    if (cue.kind !== 'person') continue
    const g = script.groups[cue.groupIndex]
    const person: FactionPerson | undefined = cue.clusterIndex != null
      ? g.clusters?.[cue.clusterIndex]?.people[cue.personIndex] ?? g.people[cue.personIndex]
      : g.people[cue.personIndex]
    if (!person) continue
    const text = quoteTextOf(person)
    if (!text) continue
    jobs.push({
      file: vnPersonQuote(cue.groupIndex, cue.personIndex, cue.clusterIndex),
      text,
      speaker: person.quoteSpeaker,
      groupIndex: cue.groupIndex,
      personIndex: cue.personIndex,
      clusterIndex: cue.clusterIndex,
    })
  }
  return jobs
}

/** 잡 인덱스로 data 안의 실제 인물 객체를 찾는다(quoteDuration 기록 대상). */
function findPerson(script: FactionScript, job: FactionVoiceJob): FactionPerson | undefined {
  const g = script.groups[job.groupIndex]
  if (!g) return undefined
  if (job.clusterIndex != null) {
    return g.clusters?.[job.clusterIndex]?.people[job.personIndex] ?? g.people[job.personIndex]
  }
  return g.people[job.personIndex]
}

/**
 * 측정한 음성 길이를 data.json 의 해당 인물 quoteDuration 에 기록한다.
 * 읽기→수정→쓰기. 다른 필드·구조는 보존한다. 변경이 없으면 파일을 건드리지 않는다.
 *
 * @param durations file → 길이(초)
 */
export async function writeQuoteDurations(durations: Record<string, number>): Promise<number> {
  const script = await loadFactionData()
  const jobs = buildVoiceJobs(script)
  let changed = 0
  for (const job of jobs) {
    const dur = durations[job.file]
    if (dur == null) continue
    const person = findPerson(script, job)
    if (!person) continue
    const rounded = Math.round(dur * 100) / 100
    if (person.quoteDuration !== rounded) {
      person.quoteDuration = rounded
      changed++
    }
  }
  if (changed > 0) {
    await writeFile(DATA_PATH, JSON.stringify(script, null, 2) + '\n', 'utf-8')
  }
  return changed
}
