// 세력도감 미리보기용 길이·컷 계산. 실제 렌더 타이밍과 별개의 추정치.

import { factionSequenceOf, factionSceneBeats, type FactionScript, type FactionPerson, type FactionEra, type FactionChapter, type FactionSceneBeat } from '@/lib/faction-types'
import {
  FACTION_SCENE_DEFAULT_SEC,
  factionSceneTiming,
} from '@feelandnote/shared/lib/faction-scene-timing'
import {
  factionLongformPartCount as sharedLongformPartCount,
  factionLongformSegments as sharedLongformSegments,
  factionLongformSliceItems,
  type FactionLongformStep as SharedLongformStep,
} from '@feelandnote/shared/lib/faction-longform'

export const INTRO_SEC = 2.5
/** BO 미리보기 기본값 — 실제 렌더와 일치시키기 위해 4로 맞춤. script.groupSec가 있으면 우선 */
export const GROUP_SEC = 4
export const CLUSTER_SEC = 1.8
/** 시대 문구 카드 1장(초) — 렌더러(Faction/timing.ts ERA_SEC)와 동일 */
export const ERA_SEC = 2.6
/** 챕터 전환 검정 브릿지 1장(초) — 렌더러(Faction/timing.ts CHAPTER_BLACK_SEC)와 동일 */
export const CHAPTER_BLACK_SEC = 0.25
/** 챕터 표지 카드 1장(초) — 렌더러(Faction/timing.ts CHAPTER_COVER_SEC)와 동일 */
export const CHAPTER_COVER_SEC = 3.5
export const CHAPTER_VOICE_DELAY_SEC = 0.45
export const CHAPTER_VOICE_TAIL_SEC = 0.8
/** 인물 카드가 아닌 서사 항목 기본 길이 — Remotion timing.ts 와 동기화. */
export const SCENE_SEC = FACTION_SCENE_DEFAULT_SEC

export function sceneSecOf(scene: FactionPerson, captionIdHoldSec?: number): number {
  return factionSceneTiming({
    ...scene,
    captionIdHoldSec,
    beats: factionSceneBeats(scene).map(beat => ({ speaker: beat.speaker, text: beat.text })),
  }).durationSec
}

/** 챕터명 음성이 있으면 실제 렌더와 같이 표지 컷을 음성 끝까지 연장한다. */
export function chapterCoverSecOf(script: FactionScript, chapter: FactionChapter): number {
  const on = !!chapter.title?.trim() && (chapter.narrate ?? script.narrator?.readChapterTitle ?? false)
  const duration = chapter.voice?.quoteDuration ?? 0
  if (!on || duration <= 0) return CHAPTER_COVER_SEC
  const rate = Math.min(2, Math.max(0.5, chapter.voice?.quotePlaybackRate ?? script.narrator?.logline?.quotePlaybackRate ?? 1))
  return Math.max(CHAPTER_COVER_SEC, CHAPTER_VOICE_DELAY_SEC + duration / rate + CHAPTER_VOICE_TAIL_SEC)
}
/** 마지막 인물 컷 뒤 페이드아웃 여운(초) — 렌더러(Faction/timing.ts)와 동일. 별도 엔딩 카드 없음 */
export const ENDING_FADE_SEC = 1.6
/** 대사 후 대기 기본값(초) — 마지막 인물 대사 끝 ~ 전환까지 정지 유지. 렌더러(DEFAULT_END_HOLD_SEC)와 동일 */
export const DEFAULT_END_HOLD_SEC = 4
/** 마지막 화면(종료 화면) 대기 기본값(초) — 렌더러(DEFAULT_OUTRO_HOLD_SEC)와 동일. 시작 화면과 같은 길이 */
export const DEFAULT_OUTRO_HOLD_SEC = INTRO_SEC

/** 대사 처리 스텝(신모델) — 렌더 PersonSteps 미러. 직함·수식어·음성 3개 독립 토글 */
export interface FactionSteps { credit: boolean; epithet: boolean; voice: boolean }

/**
 * 인물의 대사 처리 스텝 판정 — 렌더(Faction/timing.ts personSteps)와 동일.
 * step* 불린이 하나라도 정의돼 있으면 그대로, 아니면 레거시 quoteMode에서 환산.
 */
export function factionStepsOf(p: FactionPerson, portrait = false, isLeader = false): FactionSteps {
  const hasNew = p.stepCreditShorts !== undefined || p.stepEpithetShorts !== undefined || p.stepVoiceShorts !== undefined || p.stepCreditLongform !== undefined || p.stepEpithetLongform !== undefined || p.stepVoiceLongform !== undefined
  if (hasNew) {
    if (portrait) {
      return {
        credit: !!p.stepCreditShorts,
        epithet: !!p.stepEpithetShorts,
        voice: !!p.stepVoiceShorts
      }
    } else {
      return {
        credit: !!p.stepCreditLongform,
        epithet: !!p.stepEpithetLongform,
        voice: !!p.stepVoiceLongform
      }
    }
  }
  const hasQuote = !!(p.quoteChunks?.some(c => c.trim()) || p.quote?.trim())
  const mode = p.quoteMode ?? (isLeader ? 'voice' : (hasQuote ? 'text' : 'credit'))
  return {
    credit: mode === 'credit' || mode === 'text' || mode === 'voice',
    epithet: mode === 'text' || mode === 'voice',
    voice: mode === 'voice'
  }
}

/** 신모델 스텝 저장 — 레거시 quoteMode는 제거한다(이후 신모델로 인식). */
export function applyFactionSteps(p: FactionPerson, steps: FactionSteps, portrait = false): FactionPerson {
  const next: FactionPerson = { ...p }
  if (portrait) {
    next.stepCreditShorts = steps.credit
    next.stepEpithetShorts = steps.epithet
    next.stepVoiceShorts = steps.voice
  } else {
    next.stepCreditLongform = steps.credit
    next.stepEpithetLongform = steps.epithet
    next.stepVoiceLongform = steps.voice
  }
  delete next.quoteMode
  return next
}

/** 낭독 여부 — orientation 맞춤 우선. 없으면 공통. 미지정이면 음원 있으면 낭독 */
export function epithetIsNarrated(p: FactionPerson, shorts = false): boolean {
  const spec = shorts ? p.epithetNarrateShorts : p.epithetNarrateLongform
  if (spec !== undefined) return spec
  if (p.epithetNarrate !== undefined) return p.epithetNarrate
  return !!(p.epithetDuration && p.epithetDuration > 0)
}

/** 직함 타이핑 여부 — orientation 맞춤 우선. 없으면 공통 */
export function linesTypingOf(p: FactionPerson, shorts = false): boolean {
  const spec = shorts ? p.linesTypingShorts : p.linesTypingLongform
  if (spec !== undefined) return spec
  return !!p.linesTyping
}

// 인물 컷 길이 — 렌더러(Faction/timing.ts)와 동일 규칙: 타이핑 시간 + 읽기 시간, 최소 보장
const FPS = 60
const TYPE_FRAMES_PER_CHAR = 3
const PERSON_HOLD_SEC = 1.2
const PERSON_MIN_SEC = 2.0

/** 인물 한 명 컷 길이(초). 반복 발화에서 신원을 생략하면 이름·직함·수식어 읽기 시간도 뺀다. */
function personDurationSec(p: FactionPerson, showIdentity = true): number {
  const desc = showIdentity ? (p.lines?.join('') ?? '') + (p.epithet ?? '') : ''
  const quote = p.quote ?? ''
  const chars = (showIdentity ? p.name?.length ?? 0 : 0) + desc.length + quote.length
  const typeSec = (chars * TYPE_FRAMES_PER_CHAR) / FPS
  return Math.max(PERSON_MIN_SEC, typeSec + PERSON_HOLD_SEC)
}

/** 한 세력의 인물 목록 — 항상 그룹(clusters)별 합산 */
function sequenceClusters(g: FactionScript['groups'][number]) {
  const clusters = g.clusters ?? []
  return factionSequenceOf(g).flatMap(item => {
    if (item.kind === 'cut') return []
    const cluster = clusters[item.clusterIndex]
    return cluster && !cluster.disabled ? [cluster] : []
  })
}

function groupPeople(g: FactionScript['groups'][number]): FactionPerson[] {
  const list = sequenceClusters(g).flatMap(c => c.people ?? [])
  // 영상에서 제외된 인물은 길이·카운트 계산에서 뺀다 (렌더와 일치)
  return list.filter(p => p.isPerson !== false && !p.disabled)
}

type ScenePersonRef = { person: FactionPerson }

function scenePersonRefs(script: FactionScript): ScenePersonRef[] {
  return script.groups.flatMap(group => (group.clusters ?? []).flatMap(cluster =>
    (cluster.people ?? []).flatMap(person => person.isPerson === false ? [] : [{ person }]),
  ))
}

function scenePersonRefOf(beat: FactionSceneBeat, refs: ScenePersonRef[]): ScenePersonRef | undefined {
  return beat.speakerCelebId
    ? refs.find(ref => ref.person.celebId === beat.speakerCelebId)
    : refs.find(ref => !!beat.speaker && ref.person.name === beat.speaker)
}

function personFromBeat(person: FactionPerson, beat: FactionSceneBeat): FactionPerson {
  const quoteChunks = beat.text.split(/\r?\n/)
  return {
    ...person,
    quote: quoteChunks.map(chunk => chunk.trim()).filter(Boolean).join(' '),
    quoteChunks,
    quoteDuration: beat.voiceDuration ?? person.quoteDuration,
    quotePlaybackRate: beat.voicePlaybackRate ?? person.quotePlaybackRate,
  }
}

type BeatCueStats = { durationSec: number; count: number }

/**
 * 장면은 대사 목록 하나만 소유한다. 인물 할당 대사는 인물 카드가 되고,
 * 할당되지 않은 연속 대사는 한 장면으로 남는다. Remotion buildCues와 같은 경계다.
 */
function groupBeatCueStats(
  g: FactionScript['groups'][number],
  script: FactionScript,
  introducedSpeakerIds = new Set<string>(),
): BeatCueStats {
  const refs = scenePersonRefs(script)
  return sequenceClusters(g).reduce<BeatCueStats>((total, cluster) => {
    if (!cluster.beats?.length) return total

    let narrativeBeats: FactionSceneBeat[] = []
    const flushNarrative = () => {
      if (!narrativeBeats.length) return
      total.durationSec += sceneSecOf({
        isPerson: false,
        name: cluster.label?.split('\n')[0]?.trim()
          || narrativeBeats[0]?.label?.trim()
          || narrativeBeats[0]?.speaker?.trim()
          || '장면',
        image: cluster.image,
        imageCrop: cluster.imageCrop,
        beats: narrativeBeats,
      }, script.captionIdHoldSec)
      total.count += 1
      narrativeBeats = []
    }

    for (const beat of cluster.beats) {
      const ref = scenePersonRefOf(beat, refs)
      if (!ref) {
        narrativeBeats.push(beat)
        continue
      }
      if (ref.person.disabled) continue
      flushNarrative()
      const identityKey = ref.person.celebId ?? ref.person.name
      const firstSpeech = !introducedSpeakerIds.has(identityKey)
      const showIdentity = beat.hideIdentity === true
        ? false
        : beat.hideIdentity === false
          ? true
          : firstSpeech
      introducedSpeakerIds.add(identityKey)
      total.durationSec += personDurationSec(personFromBeat(ref.person, beat), showIdentity)
      total.count += 1
    }
    flushNarrative()
    return total
  }, { durationSec: 0, count: 0 })
}

/** beats가 없는 구 데이터에서만 인물 카드가 직접 재생된다. */
function groupLegacyPeople(g: FactionScript['groups'][number]): FactionPerson[] {
  return sequenceClusters(g).flatMap(cluster => cluster.beats?.length ? [] : cluster.people ?? [])
    .filter(person => person.isPerson !== false && !person.disabled)
}

/** 한 세력의 인물 수 */
function groupPeopleCount(g: FactionScript['groups'][number]): number {
  return groupPeople(g).length
}

/** 등장 인물 총수 (비활성화 세력 제외) */
export function totalPeople(script: FactionScript): number {
  return (script.groups ?? [])
    .filter(g => !g.disabled)
    .reduce((sum, g) => sum + groupPeopleCount(g), 0)
}

/** 한 세력의 화보(그룹샷) 카드 수 — 렌더(buildCues)와 같이 실제 화보가 있는 묶음만 센다. */
function groupClusterCards(g: FactionScript['groups'][number]): number {
  if (g.solo) return 0
  return sequenceClusters(g).filter(c => !!c.image).length
}

/** 영상 총 길이(초) 추정 */
export function groupSecOf(script: FactionScript): number {
  return script.groupSec ?? GROUP_SEC
}

/** 그룹샷(화보 묶음) 카드 길이(초) 추정 — script.clusterSec 우선, 없으면 미리보기 추정치 CLUSTER_SEC */
export function clusterSecOf(script: FactionScript): number {
  return script.clusterSec ?? CLUSTER_SEC
}

export function totalSec(script: FactionScript): number {
  const groups = (script.groups ?? []).filter(g => !g.disabled)
  const introducedSpeakerIds = new Set<string>()
  const groupsSec = groups.reduce((sum, g) => {
    // 타이틀 카드(로고)는 로고(logoVid 또는 logoImg)가 있는 세력만. groupSec 오버라이드 지원
    const head = (g.logoVid || g.logoImg) ? groupSecOf(script) : 0
    // 화보(그룹샷) 카드 — solo 생략, 1명+화보 없음 그룹 생략. clusterSec 오버라이드 지원
    const clusterCardsSec = groupClusterCards(g) * clusterSecOf(script)
    // 인물 컷은 텍스트 양에 따라 길이가 다르다 — 사람마다 합산
    const peopleSec = groupLegacyPeople(g).reduce((s, p) => s + personDurationSec(p), 0)
    return sum + head + clusterCardsSec + peopleSec + groupBeatCueStats(g, script, introducedSpeakerIds).durationSec
  }, 0)
  // 엔딩 카드 없음. 마지막 인물 컷은 대사 끝부터 대사 후 대기(endHold)만큼 유지된다.
  // 추정: 인물 합산에는 PERSON_HOLD가 이미 포함되므로, 마지막 인물 hold를 대사 후 대기로 치환한다(렌더와 근사).
  // 브랜드 엔딩(FEEL & NOTE)이 모든 에피소드 마지막에 붙는다 — 마지막 화면 대기(outroHold)만큼 한 컷 추가.
  const endHold = Math.max(0, script.endHoldSec ?? DEFAULT_END_HOLD_SEC)
  const outroHold = Math.max(0, script.outroHoldSec ?? DEFAULT_OUTRO_HOLD_SEC)
  return Math.max(INTRO_SEC, INTRO_SEC + groupsSec - PERSON_HOLD_SEC + endHold + outroHold)
}

/** 컷 수 추정 (인트로 + 타이틀 + 화보 + 인물). 화보 수는 groupClusterCards 규칙(솔로·1명 무화보 생략). 엔딩 카드는 없다 */
export function cueCount(script: FactionScript): number {
  const groups = (script.groups ?? []).filter(g => !g.disabled)
  const groupCards = groups.filter(g => g.logoVid || g.logoImg).length
  const clusterCards = groups.reduce((s, g) => s + groupClusterCards(g), 0)
  const beatCards = groups.reduce((sum, group) => sum + groupBeatCueStats(group, script).count, 0)
  const legacyPeopleCards = groups.reduce((sum, group) => sum + groupLegacyPeople(group).length, 0)
  return 1 + groupCards + clusterCards + legacyPeopleCards + beatCards
}

export type FactionLongformStep = SharedLongformStep<FactionEra, FactionChapter>

/** 공용 세그먼트의 한 세력 slice를 BO FactionGroup으로 좁힌다. */
export function longformSliceGroup(
  script: FactionScript,
  step: Extract<FactionLongformStep, { gi: number }>,
): FactionScript['groups'][number] | undefined {
  const group = script.groups[step.gi]
  if (!group) return undefined
  const sequence = factionLongformSliceItems(
    group as unknown as Record<string, unknown>,
    step,
  ) as unknown as ReturnType<typeof factionSequenceOf>
  const includedClusters = new Set(sequence.flatMap(item => item.kind === 'cluster' ? [item.clusterIndex] : []))
  const clusters = (group.clusters ?? []).map((cluster, clusterIndex) =>
    includedClusters.has(clusterIndex) ? cluster : { ...cluster, disabled: true },
  )
  return { ...group, clusters, sequence }
}

/** 롱폼 편 개수 — longformLayout의 바깥 편 경계만 센다. group.sequence cut은 쇼츠 전용이다. */
export function longformPartCount(script: FactionScript): number {
  return sharedLongformPartCount(
    script.groups as unknown as Record<string, unknown>[],
    script.longformLayout,
  )
}

/**
 * 롱폼 배치를 편 경계(cut)로 가른 편 구간들 — 렌더(Faction/timing.ts longformSegments)와 동일 규칙.
 * 각 구간은 세력 블록(gi)·시대 문구 카드(era)·챕터 전환(chapter)의 나열. 배치에 빠진 활성 세력은 마지막 구간 맨 뒤에 자동으로 붙는다.
 */
export function longformSegments(script: FactionScript): FactionLongformStep[][] {
  return sharedLongformSegments<FactionEra, FactionChapter>(
    script.groups as unknown as Record<string, unknown>[],
    script.longformLayout,
  )
}

/** 사진 표시 주소 — 담화와 규칙이 같아 공용 부품 shared/bo/media-src 한 곳에만 둔다 */
export { imageSrc } from '@feelandnote/shared/bo/media-src'

/** 이름에서 이니셜 한 글자 추출 */
export function initial(name: string): string {
  const trimmed = (name ?? '').trim()
  return trimmed ? trimmed[0] : '?'
}
