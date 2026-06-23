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
  /**
   * 인물별 합성 엔진 (data 의 quoteEngine). 'gemini' | 'gemini-v3' | 'elevenlabs'.
   * 'elevenlabs' 는 사용자 전담이라 자동 생성에서 제외된다(buildVoiceJobs 단계에서 거른다).
   */
  engine?: 'gemini' | 'gemini-v3' | 'elevenlabs'
  /** 대사 의미 덩어리(원문, 발화 스타일 prefix 제외) — 발화 시각 정렬·자막 페이지 단위. 없으면 통대사 1개 */
  chunks: string[]
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
 * 합성에 넘길 최종 텍스트 — 인물 발화 스타일(quoteStyle)이 있으면 "<지시>: 대사" prefix 를 붙인다.
 * BO 미리듣기(useFactionVoiceGeneration)의 `${style}: ${text}` 와 동일 규칙이라 일괄 생성·미리듣기
 * 결과가 일치한다. prefix 가 텍스트에 포함되므로 매니페스트 해시(voice:text)도 자동으로 바뀌어,
 * 스타일만 고쳐도 재생성이 트리거된다. 빈 스타일은 옵트아웃(prefix 없음).
 */
function styledTextOf(p: FactionPerson, text: string): string {
  const style = (p.quoteStyle ?? '').trim()
  return style ? `${style}: ${text}` : text
}

/**
 * buildCues 의 person 컷을 순회하며 음성 잡을 만든다.
 * disabled 세력·disabled 인물은 buildCues 가 이미 컷을 안 만들므로 자동 제외된다(렌더와 동일 기준).
 * 대사가 없는 인물은 건너뛴다.
 *
 * portrait=false(가로 롱폼)로 컷을 만든다 — longformOnly 세력/묶음까지 모두 포함해
 * 음성을 빠짐없이 생성한다. 세로 쇼츠 컷은 이 집합의 부분집합이라 별도 생성이 불필요하다.
 */
export function buildVoiceJobs(script: FactionScript, part?: number): FactionVoiceJob[] {
  const jobs: FactionVoiceJob[] = []
  // part 지정 시 그 편 세력 인물만(buildCues 가 group.part 로 필터). 미지정이면 전체.
  const cues = buildCues(script, false, part)
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
    const rawChunks = (LANG === 'en' ? person.quoteEnChunks : person.quoteChunks)?.filter(c => c.trim())
    jobs.push({
      file: vnPersonQuote(cue.groupIndex, cue.personIndex, cue.clusterIndex),
      // 발화 스타일 prefix 를 텍스트에 합쳐 합성·해시 양쪽에 반영한다(BO 미리듣기와 동일 규칙).
      text: styledTextOf(person, text),
      // 자막 덩어리는 원문(prefix 제외) 기준 — 빈 덩어리(연속 개행=페이지 경계)는 제외해 발화 시각 정렬과 1:1. 없으면 통대사 1개.
      chunks: rawChunks?.length ? rawChunks : [text],
      speaker: person.quoteSpeaker,
      engine: person.quoteEngine,
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
