/**
 * 세력도감(Faction) 에피소드 로더
 *
 * 편 본문(public/factions/{name}/faction-data.json)은 **번들에 넣지 않는다.** 컴포지션을 열거나
 * 렌더할 때 Root 의 calculateMetadata 가 `loadFactionScript` 로 그 편 하나만 읽어 한 언어의
 * 스크립트를 펼친다. 예전엔 require.context 로 100편을 전부 번들에 실어, 백오피스가 한 편을
 * 저장할 때마다 webpack 이 전편을 다시 묶었다(실측 30초~5분). 지금은 저장 뒤 Studio 새로고침이면 된다.
 *
 * 번들에 남는 것은 둘뿐이다 — 등록 목록(_episodes.json)과 편별 변형 목록(faction-variants.json).
 * 둘 다 수 KB 이고 편 구성이 바뀔 때만 달라진다. 컴포지션 목록은 이 둘만으로 만든다.
 *
 * 영문판 치환: name←nameEn, lines←linesEn 등. 영문 값이 없으면 한국어 값으로 폴백한다.
 * 통합 명칭(name·title·label)은 데이터가 이미 '앞부분\n뒷부분' 한 필드라 그대로 펼친다(렌더가 split).
 */

import { staticFile } from 'remotion'
import { factionSequenceOf, type FactionScript, type FactionGroup, type FactionCluster, type FactionPerson, type FactionNarratorVoice } from './types'
import { normalizeFactionGroupEntries } from '@feelandnote/shared/lib/faction-sequence'
import { factionSceneSpeakerPeople, resolveFactionSceneVoice } from '@feelandnote/shared/lib/faction-scene-speaker'
import { withFixedFactionOpeningVoice } from '@feelandnote/shared/lib/faction-voice-provider'
import { factionVariants, type FactionVariantDef } from '@feelandnote/shared/lib/youtube-faction-meta'
import type { VoiceTimings, VoiceTimingSegment } from '../../lib/voice-timing'
import { clampRate, vnTimingKey, vnPersonQuote, vnBeatVoiceFile } from './voice-names'
import { factionDataPath, mergeTimingMaps, timingFileCandidates, type FactionLocale } from './script-files'
// 등록 에피소드 화이트리스트 — 폴더에 faction-data.json이 있어도 이 목록에 없으면 컴포지션으로 노출하지 않는다.
import episodeRegistry from '../../../public/factions/_episodes.json'
// 편별 변형 목록 색인 — 내보내기가 편마다 자기 자리를 갱신한다. 파일 하나만 static import 한다:
// require.context 로 폴더를 훑으면 webpack 이 public/factions 전체(수천 파일)를 감시해 사진 하나에도 컴파일 패스가 돈다.
import variantsIndex from '../../../public/factions/_variants.json'

const ALLOW = new Set(episodeRegistry as string[])
/** 등록 순서 그대로의 편 폴더명 — Studio 사이드바·컴포지션 등록 순서. */
export const episodeFolders: string[] = [...ALLOW]

const episodeVariants = variantsIndex as unknown as Record<string, FactionVariantDef[]>

/**
 * 편의 영상 변형(세로 롱폼 N편·세로 쇼츠 N편). 색인에 아직 없는 편은 통짜 롱폼·단일 쇼츠만 등록한다 —
 * 백오피스 저장이나 `pnpm faction:variants` 가 색인을 채우면 다음 빌드에서 제 모습이 된다.
 */
export function variantsOf(name: string): FactionVariantDef[] {
  return episodeVariants[name] ?? factionVariants([{ name }], undefined)
}

async function fetchJsonIfExists<T>(relPath: string): Promise<T | undefined> {
  const res = await fetch(staticFile(relPath))
  if (res.status === 404) return undefined
  if (!res.ok) throw new Error(`${relPath} 읽기 실패: HTTP ${res.status}`)
  return await res.json() as T
}

/**
 * 한 편의 스크립트를 읽어 한 언어로 펼친다. 컴포지션을 열 때(calculateMetadata) 한 번 부른다.
 * 발화 시각은 그 편의 쇼츠 편 번호에 맞는 파일만 찾는다(없으면 발화 시각 없이 렌더).
 */
export async function loadFactionScript(name: string, en = false): Promise<FactionScript> {
  if (!ALLOW.has(name)) throw new Error(`등록되지 않은 편: ${name} — public/factions/_episodes.json 에 없다`)
  const data = await fetchJsonIfExists<FactionScript>(factionDataPath(name))
  if (!data) throw new Error(`faction-data.json 없음: ${name} — 백오피스에서 저장하거나 pnpm faction:export 로 내보내라`)
  const locale: FactionLocale = en ? 'en' : 'ko'
  // 단일 쇼츠(part 미지정)도 파이프라인은 --part 1 로 산출하므로 p1 을 찾는다.
  const shortsParts = variantsOf(name).flatMap(v => v.isShorts ? [v.part ?? 1] : [])
  const timings = await Promise.all(
    timingFileCandidates(name, locale, shortsParts).map(p => fetchJsonIfExists<VoiceTimings>(p)),
  )
  return resolveScript(data, name, en, scaleVoiceTimings(data, mergeTimingMaps(timings), en))
}

/**
 * 인물 펼치기. en=false면 원본 그대로(한국어판 — quoteEn은 렌더러가 보조 표기로 사용).
 * en=true면 영문 필드를 주 필드로 올리고 보조 영문(quoteEn)은 제거한다.
 */
/**
 * 공용 낭독 목소리를 인물 수식어 슬롯의 기본값으로 펼친다.
 * 원본 JSON에는 중복 저장하지 않고, 렌더용 스크립트에서만 상속한다.
 */
function inheritEpithetVoice(p: FactionPerson, common?: FactionNarratorVoice): FactionPerson {
  if (!common) return p
  return {
    ...p,
    epithetSpeaker: p.epithetSpeaker ?? common.quoteSpeaker,
    epithetStyle: p.epithetStyle ?? common.quoteStyle,
    epithetElevenlabsVoiceId: p.epithetElevenlabsVoiceId ?? common.quoteElevenlabsVoiceId,
    epithetEleOptions: p.epithetEleOptions ?? common.quoteEleOptions,
    epithetEleEmotions: p.epithetEleEmotions ?? common.quoteEleEmotions,
    epithetEleTrail: p.epithetEleTrail ?? common.quoteEleTrail,
    epithetGainDb: p.epithetGainDb ?? common.quoteGainDb,
    epithetPlaybackRate: p.epithetPlaybackRate ?? common.quotePlaybackRate,
  }
}

function resolvePerson(p: FactionPerson, en: boolean, commonVoice?: FactionNarratorVoice): FactionPerson {
  if (p.isPerson === false) {
    return {
      ...p,
      name: en ? (p.nameEn ?? p.name) : p.name,
      caption: en ? (p.captionEn ?? p.caption) : p.caption,
      beats: p.beats?.map(beat => ({
        ...beat,
        speaker: en ? (beat.speakerEn ?? beat.speaker) : beat.speaker,
        text: en ? (beat.textEn ?? beat.text) : beat.text,
      })),
    }
  }
  if (!en) {
    // quoteOrigin은 제작 메모다. 한국어 렌더 문구로 노출하지 않는다.
    return inheritEpithetVoice({ ...p, quoteEn: undefined }, commonVoice)
  }
  return inheritEpithetVoice({
    ...p,
    name: p.nameEn ?? p.name,
    epithet: p.epithetEn ?? p.epithet,
    lines: p.linesEn ?? p.lines,
    quote: p.quoteEn ?? p.quote,
    quoteChunks: p.quoteEnChunks ?? p.quoteChunks,
    quoteEn: undefined,
  }, commonVoice)
}

function resolveCluster(c: FactionCluster, en: boolean, commonVoice?: FactionNarratorVoice, inheritImage = true): FactionCluster {
  return {
    ...c,
    // 단체 명칭 — 통합형(앞부분\n뒷부분) 그대로. 영문판은 labelEn 폴백.
    label: en ? (c.labelEn ?? c.label) : c.label,
    beats: c.beats?.map(beat => ({
      ...beat,
      label: en ? (beat.labelEn ?? beat.label) : beat.label,
      speaker: en ? (beat.speakerEn ?? beat.speaker) : beat.speaker,
      text: en ? (beat.textEn ?? beat.text) : beat.text,
    })),
    // 개인샷이 비었거나 그룹 화보와 같은 파일이면 렌더용 객체에 그룹 화보·맞춤을 펼친다.
    // 원본 JSON에는 중복 저장하지 않으면서 인트로·인물 컷·카드뉴스 등 모든 소비자가 같은 사진을 본다.
    people: c.people?.map(p => {
      const person = resolvePerson(p, en, commonVoice)
      const inheritsImage = person.isPerson !== false && inheritImage && !!c.image && (!person.image || person.image === c.image)
      return inheritsImage ? { ...person, image: c.image, imageCrop: c.imageCrop } : person
    }) ?? [],
  }
}

function resolveGroup(g: FactionGroup, en: boolean, commonVoice?: FactionNarratorVoice): FactionGroup {
  const normalized = normalizeFactionGroupEntries(g as unknown as Record<string, unknown>) as unknown as FactionGroup
  return {
    ...normalized,
    // 세력 명칭 — 통합형(앞부분\n뒷부분) 그대로. 영문판은 nameEn 폴백.
    name: en ? (normalized.nameEn ?? normalized.name) : normalized.name,
    sequence: factionSequenceOf(normalized),
    clusters: normalized.clusters.map(c => resolveCluster(c, en, commonVoice, !normalized.solo)),
  }
}

/** 장면 대사를 에피소드 인물 UUID에 연결해 현재 이름·기본 음성을 펼친다. */
function resolveSceneSpeakers(
  groups: FactionGroup[],
  en: boolean,
  commonVoice?: FactionNarratorVoice,
): FactionGroup[] {
  const people = factionSceneSpeakerPeople(groups)
  return groups.map(group => ({
    ...group,
    clusters: group.clusters.map(cluster => ({
      ...cluster,
      beats: cluster.beats?.map(beat => resolveFactionSceneVoice(beat, people, commonVoice, en ? 'en' : 'ko')),
      people: cluster.people.map(person => person.isPerson !== false || !person.beats?.length
        ? person
        : {
            ...person,
            beats: person.beats.map(beat => resolveFactionSceneVoice(beat, people, commonVoice, en ? 'en' : 'ko')),
          }),
    })),
  }))
}

/** voiceTimings 한 인물 분량을 배속(rate)만큼 1/rate 스케일 — 음원을 빠르게 돌리면 점등·페이지 시각도 당겨진다. */
const scaleSegs = (segs: VoiceTimingSegment[], rate: number): VoiceTimingSegment[] =>
  segs.map(s => ({
    ...s,
    start: s.start / rate,
    end: s.end / rate,
    subTimings: s.subTimings?.map(t => t / rate),
    words: s.words?.map(w => ({ ...w, start: w.start / rate, end: w.end / rate })),
  }))

/**
 * 인물별 재생 배속(quotePlaybackRate)을 발화 시각 맵에 동적 반영한다(북리커맨드 playback-rate 와 동일 원리).
 * <Audio playbackRate> 가 음원을 빠르게 돌리므로, 점등·페이지 시각도 1/rate 로 당겨 음원과 정합시킨다.
 * 배속 지정 인물이 없으면 입력을 그대로 반환(제로 코스트). 키(stem)는 렌더·산출과 동일한 vnTimingKey 규칙.
 */
function scaleVoiceTimings(data: FactionScript, vt?: VoiceTimings, en = false): VoiceTimings | undefined {
  if (!vt) return vt
  let out: VoiceTimings | undefined
  const scale = (stem: string, rate: number) => {
    if (rate === 1 || !vt[stem]) return
    if (!out) out = { ...vt }
    out[stem] = scaleSegs(vt[stem], rate)
  }
  const speakerPeople = factionSceneSpeakerPeople(data.groups)
  data.groups.forEach((g, gi) => {
    if (g.disabled) return
    // 인물 컷 cue 에 clusterIndex 가 항상 들어가므로 키는 항상 FxxCxxPxx (solo 포함).
    ;(g.clusters ?? []).forEach((c, ci) => {
      ;(c.people ?? []).forEach((p, pi) => {
        if (p.isPerson !== false) scale(vnTimingKey(vnPersonQuote(gi, pi, ci)), clampRate(p.quotePlaybackRate))
      })
      // 장면 발화도 같은 보정을 받는다 — 렌더(personFromSceneBeat)가 beat.voicePlaybackRate 로 음원을
      // 빠르게 돌리므로, 빼먹으면 그 컷만 자막이 배속만큼 늦게 뜬다. 파일명·배속 폴백 규칙은 렌더와 같다.
      ;(c.beats ?? []).forEach(beat => {
        if (beat.legacyPersonVoice) return // 인물 quote 파일을 그대로 쓰는 컷 — 위 people 루프가 이미 보정했다
        const person = beat.speakerCelebId
          ? speakerPeople.find(p => p.celebId === beat.speakerCelebId)
          : undefined
        const file = vnBeatVoiceFile({
          ...beat,
          speaker: en ? (beat.speakerEn ?? beat.speaker) : beat.speaker,
          text: (en ? (beat.textEn ?? beat.text) : beat.text) ?? '',
        }, en ? 'en' : 'ko')
        scale(vnTimingKey(file), clampRate(beat.voicePlaybackRate ?? person?.quotePlaybackRate))
      })
    })
  })
  return out ?? vt
}

/** 나레이터 낭독 한 벌 — 영문판은 quoteEn/quoteEnChunks 를 주 필드로 올린다(없으면 한국어 폴백). */
function resolveNarratorVoice(v: FactionNarratorVoice | undefined, en: boolean): FactionNarratorVoice | undefined {
  if (!v || !en) return v
  return { ...v, quote: v.quoteEn ?? v.quote, quoteChunks: v.quoteEnChunks ?? v.quoteChunks, quoteEn: undefined }
}

/** faction-data.json → 단일 언어 스크립트. en=false는 원본 그대로 반환한다. */
function resolveScript(data: FactionScript, episodeName: string, en: boolean, voiceTimings?: VoiceTimings): FactionScript {
  const resolvedVoice = resolveNarratorVoice(data.narrator?.logline, en)
  const commonVoice = resolvedVoice
    ? withFixedFactionOpeningVoice(episodeName, resolvedVoice)
    : undefined
  const groups = resolveSceneSpeakers(
    data.groups.map(g => resolveGroup(g, en, commonVoice)),
    en,
    commonVoice,
  )
  return {
    ...data,
    // 나레이터(옵션) — 이름·소개·낭독 3종의 영문 폴백 치환
    narrator: data.narrator ? {
      ...data.narrator,
      name: en ? (data.narrator.nameEn ?? data.narrator.name) : data.narrator.name,
      label: en ? (data.narrator.labelEn ?? data.narrator.label) : data.narrator.label,
      logline: commonVoice,
      outro: resolveNarratorVoice(data.narrator.outro, en),
      intro: resolveNarratorVoice(data.narrator.intro, en),
    } : undefined,
    // 영상 명칭 — 통합형(앞부분\n뒷부분) 그대로. 영문판은 titleEn 폴백.
    title: en ? (data.titleEn ?? data.title) : data.title,
    // titleByPart 는 데이터에 통합형으로 들어 있으니 그대로 둔다(영문 폴백은 해당 part 키 부재 시 렌더가 title 로 폴백).
    titleByPart: data.titleByPart,
    // 시작문구는 영문 슬롯이 채워졌을 때만 노출 — 비어 있으면 표시하지 않는다(한글 누출 차단).
    logline: en ? data.loglineEn : data.logline,
    loglineByPart: en ? data.loglineByPartEn : data.loglineByPart,
    loglineByLvPart: en ? data.loglineByLvPartEn : data.loglineByLvPart,
    // 롱폼 편성 — 영문판은 시대 문구·챕터 제목을 영문으로 치환한다. 세력 참조·편 경계는 그대로.
    longformLayout: data.longformLayout?.map(it =>
      'era' in it ? { era: { ...it.era, label: en ? (it.era.labelEn ?? it.era.label) : it.era.label } }
      : 'chapter' in it ? {
        chapter: {
          ...it.chapter,
          title: en ? (it.chapter.titleEn ?? it.chapter.title) : it.chapter.title,
          voice: resolveNarratorVoice(it.chapter.voice, en),
        },
      }
      : it,
    ),
    groups,
    voiceTimings,
  }
}

