/**
 * faction/data.ts — faction-data.json 로드 + 음성 잡 추출 + 음성 길이 안전 기록
 *
 * 잡 인덱싱(groupIndex·clusterIndex·personIndex)은 렌더의 buildCues 와 100% 동일해야
 * 파일명(vnPersonQuote)이 렌더 cue 의 staticFile 경로와 일치한다. 그래서 직접 순회하지 않고
 * buildCues 결과의 person 컷을 그대로 쓴다 — 인덱스 드리프트 원천 차단.
 *
 * 서사 항목은 덩어리(beat)마다 음성을 갖는다. 인물 좌표 밖이라 화자 + 본문 해시로 파일명을
 * 정한다(vnSceneBeat). 장면을 옮기거나 순서를 바꿔도 음원이 따라오고, 본문을 고치면 파일명이 바뀌어
 * 옛 음원이 남지 않는다. 화자를 해시에 넣으므로 같은 말이라도 인물이 다르면 음원이 갈린다.
 */

import { readFile, writeFile } from 'fs/promises'
import { factionSceneCaptionPages } from '@feelandnote/shared/lib/faction-scene-timing'
import { factionSceneSpeakerPeople, resolveFactionSceneVoice } from '@feelandnote/shared/lib/faction-scene-speaker'
import { buildCues, type Cue } from '../../../src/compositions/Faction/timing.js'
import { factionSequenceOf } from '../../../src/compositions/Faction/types.js'
import type { FactionScript, FactionPerson, FactionSceneBeat } from '../../../src/compositions/Faction/types.js'
import { vnPersonQuote, vnSceneBeat } from '../../../src/compositions/Faction/voice-names.js'
import { DATA_PATH, LANG } from './cli.js'

export type FactionVoiceJob = {
  /** 출력 파일명 — 인물은 vnPersonQuote(F01C01P01-quote.wav), 장면 덩어리는 vnSceneBeat(scene-<해시>.wav) */
  file: string
  /** 합성 대상 텍스트 (선택 언어의 인물 대사 또는 장면 덩어리 본문) */
  text: string
  /** 화자 ID (인물 quoteSpeaker / 장면 voiceSpeaker). 미지정이면 공용 기본 보이스 */
  speaker?: string
  /** 선택 언어의 ElevenLabs 보이스 ID. 있으면 자동 Gemini 생성에서 제외한다. 장면 덩어리는 쓰지 않는다. */
  elevenLabsVoiceId?: string
  /** 의미 덩어리(원문, 발화 스타일 prefix 제외) — 발화 시각 정렬·자막 페이지 단위. 인물은 quoteChunks, 장면은 본문 문단. */
  chunks: string[]
} & (
  | {
      /** 인물 대사 잡 — buildCues 인덱스로 기록 대상을 되찾는다. 인물 컷은 항상 그룹 소속이라 clusterIndex 도 항상 있다 */
      target: 'person'
      groupIndex: number
      personIndex: number
      clusterIndex: number
    }
  | {
      /** 서사 항목 덩어리 잡 — 파일명이 화자·본문만으로 정해지므로 좌표를 들고 다니지 않는다 */
      target: 'scene'
    }
)

/** 같은 물리 파일을 공유해도 되는 잡인지 판정한다. 조판 공백만 다른 같은 발화는 공유 가능하다. */
function sameVoiceSource(left: FactionVoiceJob, right: FactionVoiceJob): boolean {
  const spoken = (value: string) => value.replace(/\s+/g, ' ').trim()
  return spoken(left.text) === spoken(right.text)
    && (left.speaker ?? '') === (right.speaker ?? '')
    && (left.elevenLabsVoiceId ?? '') === (right.elevenLabsVoiceId ?? '')
}

/** 서로 다른 발화를 한 WAV에 덮어쓰는 데이터는 생성 전에 중단한다. */
function assertCompatibleVoiceSource(previous: FactionVoiceJob, next: FactionVoiceJob): void {
  if (sameVoiceSource(previous, next)) return
  throw new Error(
    `음원 파일 충돌: ${next.file}이 서로 다른 발화에 배정됐다. `
    + `"${previous.text.slice(0, 40)}" / "${next.text.slice(0, 40)}"`,
  )
}

/** faction-data.json 원본을 그대로 읽는다(가공 없음). 기록 시 이 객체를 수정해 되쓴다. */
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
 * 선택 언어의 덩어리 본문·화자. ko=text/speaker, en=textEn/speakerEn(폴백 ko).
 * 렌더도 진입 시점(script.ts)에 같은 규칙으로 갈아 끼우므로, 이 값으로 만든 파일명(vnSceneBeat)이
 * 렌더가 재생하는 경로와 일치한다 — 언어가 다르면 파일도 갈린다.
 */
function beatTextOf(beat: FactionSceneBeat): string {
  const t = LANG === 'en' ? (beat.textEn ?? beat.text) : beat.text
  return (t ?? '').trim() ? (t as string) : ''
}

function beatSpeakerOf(beat: FactionSceneBeat): string | undefined {
  return LANG === 'en' ? (beat.speakerEn ?? beat.speaker) : beat.speaker
}

/**
 * 덩어리 낭독·대사 텍스트 — 화면에 뜨는 본문을 그대로 읽는다.
 * 문단 경계(빈 줄)와 줄바꿈은 화면 조판용이라 합성 전에 한 흐름으로 편다.
 */
function beatNarrationTextOf(text: string): string {
  return factionSceneCaptionPages(text)
    .map(page => page.replace(/\n+/g, ' ').trim())
    .filter(Boolean)
    .join(' ')
}

/** 장면 덩어리도 인물 대사와 같은 규칙으로 발화 스타일 prefix 를 붙인다. */
function styledBeatTextOf(beat: FactionSceneBeat, text: string): string {
  const style = (beat.voiceStyle ?? '').trim()
  return style ? `${style}: ${text}` : text
}

function sceneBeatFileOf(
  beat: FactionSceneBeat,
  group: FactionScript['groups'][number],
  groupIndex: number,
  clusterIndex: number,
): string {
  if (beat.voiceFile) return beat.voiceFile
  if (beat.legacyPersonVoice && beat.speakerCelebId) {
    const personIndex = (group.clusters?.[clusterIndex]?.people ?? [])
      .findIndex(person => person.isPerson !== false && person.celebId === beat.speakerCelebId)
    if (personIndex >= 0) return vnPersonQuote(groupIndex, personIndex, clusterIndex)
  }
  return vnSceneBeat(beatSpeakerOf(beat), beatTextOf(beat))
}

/**
 * buildCues 의 person 컷을 순회하며 음성 잡을 만든다.
 * disabled 세력·disabled 인물은 buildCues 가 이미 컷을 안 만들므로 자동 제외된다(렌더와 동일 기준).
 * 대사가 없는 인물은 건너뛴다.
 *
 * portrait=false(롱폼)로 컷을 만든다 — longformOnly 세력/묶음까지 모두 포함해
 * 음성을 빠짐없이 생성한다. 세로 쇼츠 컷은 이 집합의 부분집합이라 별도 생성이 불필요하다.
 */
export function buildVoiceJobs(script: FactionScript, part?: number): FactionVoiceJob[] {
  const jobs: FactionVoiceJob[] = []
  const personFiles = new Set<string>()
  // part 지정 시 그 편 세력 인물만(buildCues 가 group.part 로 필터). 미지정이면 전체.
  const cues = buildCues(script, false, part)
  for (const tc of cues) {
    const cue: Cue = tc.cue
    if (cue.kind !== 'person') continue
    const g = script.groups[cue.groupIndex]
    // buildCues 의 part 필터(timing.ts)는 portrait 모드에서만 걸린다. 정렬은 buildCues(script, false, part)
    // 로 호출해 portrait=false 이므로 편 필터가 통과된다 → 여기서 편(part) 필터를 직접 적용한다.
    // 안 하면 p1·p2 양쪽에 전 세력 인물이 섞여 편별 data.timing 이 오염된다.
    if (part != null && g.part != null && g.part !== part) continue
    const person: FactionPerson | undefined = g.clusters?.[cue.clusterIndex]?.people[cue.personIndex]
    if (!person) continue
    const text = quoteTextOf(person)
    if (!text) continue
    const file = vnPersonQuote(cue.groupIndex, cue.personIndex, cue.clusterIndex)
    // 통합 장면 안에서 같은 사람이 여러 번 말해도 구 인물 quote 잡은 한 파일당 한 번만 만든다.
    if (personFiles.has(file)) continue
    personFiles.add(file)
    const rawChunks = (LANG === 'en' ? person.quoteEnChunks : person.quoteChunks)?.filter(c => c.trim())
    jobs.push({
      file,
      // 발화 스타일 prefix 를 텍스트에 합쳐 합성·해시 양쪽에 반영한다(BO 미리듣기와 동일 규칙).
      text: styledTextOf(person, text),
      // 자막 덩어리는 원문(prefix 제외) 기준 — 빈 덩어리(연속 개행=페이지 경계)는 제외해 발화 시각 정렬과 1:1. 없으면 통대사 1개.
      chunks: rawChunks?.length ? rawChunks : [text],
      speaker: person.quoteSpeaker,
      elevenLabsVoiceId: LANG === 'en'
        ? person.quoteElevenlabsVoiceIdEn
        : person.quoteElevenlabsVoiceId,
      target: 'person',
      groupIndex: cue.groupIndex,
      personIndex: cue.personIndex,
      clusterIndex: cue.clusterIndex,
    })
  }
  const sceneJobs = buildSceneVoiceJobs(script, part)
  const sceneFiles = new Set(sceneJobs.map(job => job.file))
  const personJobByFile = new Map(jobs.map(job => [job.file, job]))
  for (const sceneJob of sceneJobs) {
    const personJob = personJobByFile.get(sceneJob.file)
    if (personJob) assertCompatibleVoiceSource(personJob, sceneJob)
  }
  // cluster.beats가 같은 FxxCxxPxx 파일을 직접 소유하면 그 대사가 최종 원천이다.
  // 구 person quote 잡까지 남기면 같은 파일을 서로 다른 텍스트로 두 번 합성·덮어쓸 수 있다.
  return [...jobs.filter(job => !sceneFiles.has(job.file)), ...sceneJobs]
}

/**
 * 서사 항목 덩어리 잡. 파일명이 화자·본문 해시라 컷 인덱스와 무관하므로 buildCues 대신
 * 세력의 sequence 를 직접 순회한다(인덱스 드리프트가 파일명에 영향을 주지 않는다).
 * 렌더와 같은 기준으로 비활성 세력과 본문 없는 덩어리를 뺀다. 화자·본문이 완전히 같은 덩어리 둘은
 * 파일명도 같으므로 한 번만 합성해 공유한다.
 */
function buildSceneVoiceJobs(script: FactionScript, part?: number): FactionVoiceJob[] {
  const jobs: FactionVoiceJob[] = []
  const seen = new Map<string, FactionVoiceJob>()
  const speakerPeople = factionSceneSpeakerPeople(script.groups)
  for (const [groupIndex, group] of script.groups.entries()) {
    if (group.disabled) continue
    if (part != null && group.part != null && group.part !== part) continue
    factionSequenceOf(group)
    for (const [clusterIndex, cluster] of (group.clusters ?? []).entries()) {
      for (const rawBeat of cluster.beats ?? []) {
        const beat = resolveFactionSceneVoice(
          rawBeat,
          speakerPeople,
          script.narrator?.logline,
          LANG === 'en' ? 'en' : 'ko',
        )
        const raw = beatTextOf(beat)
        if (!raw) continue
        const text = beatNarrationTextOf(raw)
        if (!text) continue
        // 렌더(NarrativeEntryCard)가 부르는 것과 똑같이 화자 + 본문 원문으로 파일명을 만든다.
        const file = sceneBeatFileOf(beat, group, groupIndex, clusterIndex)
        const job: FactionVoiceJob = {
          file,
          text: styledBeatTextOf(beat, text),
          chunks: factionSceneCaptionPages(raw),
          speaker: beat.voiceSpeaker,
          // 인물 카드로도 등장하는 사람은 카드와 같은 ELE 보이스를 쓴다 → 자동 생성에서 빠지고 사용자가 만든다.
          elevenLabsVoiceId: LANG === 'en'
            ? beat.voiceElevenlabsVoiceIdEn
            : beat.voiceElevenlabsVoiceId,
          target: 'scene',
        }
        const previous = seen.get(file)
        if (previous) {
          assertCompatibleVoiceSource(previous, job)
          continue
        }
        seen.set(file, job)
        jobs.push(job)
      }
    }
  }
  return jobs
}

/** 잡 인덱스로 data 안의 실제 인물 객체를 찾는다(quoteDuration 기록 대상). */
function findPerson(
  script: FactionScript,
  job: Extract<FactionVoiceJob, { target: 'person' }>,
): FactionPerson | undefined {
  return script.groups[job.groupIndex]?.clusters?.[job.clusterIndex]?.people[job.personIndex]
}

/**
 * 같은 화자·본문(=같은 파일명)을 쓰는 모든 덩어리에 음성 길이를 기록한다.
 * factionSequenceOf 는 scene 객체를 복사하지 않고 원본 참조로 넘기므로 여기서 쓴 값이 그대로 저장된다.
 * 구 데이터(caption 한 벌)는 승격 덩어리가 사본이라 원본 scene 의 레거시 필드에 적는다.
 */
function writeSceneDuration(script: FactionScript, file: string, rounded: number): number {
  let changed = 0
  const speakerPeople = factionSceneSpeakerPeople(script.groups)
  for (const [groupIndex, group] of script.groups.entries()) {
    factionSequenceOf(group)
    for (const [clusterIndex, cluster] of (group.clusters ?? []).entries()) {
      for (const rawBeat of cluster.beats ?? []) {
        const beat = resolveFactionSceneVoice(
          rawBeat,
          speakerPeople,
          script.narrator?.logline,
          LANG === 'en' ? 'en' : 'ko',
        )
        const raw = beatTextOf(beat)
        if (!raw || sceneBeatFileOf(beat, group, groupIndex, clusterIndex) !== file) continue
        if (rawBeat.voiceDuration === rounded) continue
        rawBeat.voiceDuration = rounded
        changed++
      }
    }
  }
  return changed
}

/**
 * 측정한 음성 길이를 faction-data.json 에 기록한다 — 인물은 quoteDuration, 서사 항목은 voiceDuration.
 * 읽기→수정→쓰기. 다른 필드·구조는 보존한다. 변경이 없으면 파일을 건드리지 않는다.
 *
 * @param durations file → 길이(초)
 */
export async function writeVoiceDurations(durations: Record<string, number>): Promise<number> {
  const script = await loadFactionData()
  const jobs = buildVoiceJobs(script)
  let changed = 0
  for (const job of jobs) {
    const dur = durations[job.file]
    if (dur == null) continue
    const rounded = Math.round(dur * 100) / 100
    if (job.target === 'scene') {
      changed += writeSceneDuration(script, job.file, rounded)
      continue
    }
    const person = findPerson(script, job)
    if (!person) continue
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
