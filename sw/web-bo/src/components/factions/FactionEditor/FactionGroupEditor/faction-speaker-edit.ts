import type { FactionGroup, FactionPerson, FactionSceneBeat } from '@/lib/faction-types'
import { factionVoiceFile, vnSceneBeat } from '@/lib/faction-voice'

export type FactionSpeakerVoiceFiles = Record<string, { quote: string; epithet: string }>

const compactDialogueText = (value: string | undefined): string =>
  (value ?? '').replace(/\s+/g, ' ').trim()

/** 줄바꿈 조판은 달라도 장면 대사와 인물 대표 대사의 실제 문장이 같은지 판정한다. */
export function factionSceneBeatMatchesPersonQuote(
  beat: FactionSceneBeat,
  person: FactionPerson,
  locale: 'ko' | 'en' = 'ko',
): boolean {
  if (beat.speakerCelebId && person.celebId && beat.speakerCelebId !== person.celebId) return false
  const beatText = locale === 'en' ? beat.textEn ?? beat.text : beat.text
  const personText = locale === 'en' ? person.quoteEn ?? person.quote : person.quote
  const compactBeat = compactDialogueText(beatText)
  return !!compactBeat && compactBeat === compactDialogueText(personText)
}

/** 렌더와 같은 순서로 인물별 첫 배치의 구 좌표형 음원을 찾는다. */
export function factionSpeakerVoiceFiles(groups: FactionGroup[]): FactionSpeakerVoiceFiles {
  return groups.reduce<FactionSpeakerVoiceFiles>((files, group, groupIndex) => {
    ;(group.clusters ?? []).forEach((cluster, clusterIndex) => {
      ;(cluster.people ?? []).forEach((person, personIndex) => {
        if (person.isPerson === false || !person.celebId || files[person.celebId]) return
        files[person.celebId] = {
          quote: factionVoiceFile(groupIndex, personIndex, clusterIndex),
          epithet: factionVoiceFile(groupIndex, personIndex, clusterIndex, 'epithet'),
        }
      })
    })
    return files
  }, {})
}

export type FactionVoiceFileMeta = { duration?: number }

/**
 * 통합 전 위치형 인물 음원을 각 대사 항목의 명시적 voiceFile로 고정한다.
 *
 * true 표식은 기존 연결이 확정된 항목이고, 표식이 없는 과도기 데이터는 실제 파일이 있으며
 * 인물 대표 대사와 본문이 같은 경우에만 복구한다. false는 본문·화자를 고쳐 옛 음원에서
 * 명시적으로 분리한 항목이므로 자동 복구하지 않는다.
 */
export function materializeFactionSceneVoiceFiles(
  groups: FactionGroup[],
  available: ReadonlyMap<string, FactionVoiceFileMeta>,
): { groups: FactionGroup[]; changed: number } {
  const defaultFiles = factionSpeakerVoiceFiles(groups)
  const peopleById = new Map<string, FactionPerson>()
  for (const group of groups) {
    for (const cluster of group.clusters ?? []) {
      for (const person of cluster.people ?? []) {
        if (person.isPerson === false || !person.celebId || peopleById.has(person.celebId)) continue
        peopleById.set(person.celebId, person)
      }
    }
  }

  let changed = 0
  const nextGroups = groups.map((group, groupIndex) => ({
    ...group,
    clusters: (group.clusters ?? []).map((cluster, clusterIndex) => {
      const localPeople = (cluster.people ?? []).filter(person => person.isPerson !== false)
      return {
        ...cluster,
        beats: (cluster.beats ?? []).map(beat => {
          if (beat.voiceFile) return beat
          const exactSceneFile = beat.text.trim() ? vnSceneBeat(beat.speaker, beat.text) : undefined
          if (exactSceneFile && available.has(exactSceneFile)) {
            changed++
            const duration = available.get(exactSceneFile)?.duration
            return {
              ...beat,
              voiceFile: exactSceneFile,
              ...(beat.voiceDuration == null && duration && duration > 0 ? { voiceDuration: duration } : {}),
            }
          }
          if (beat.legacyPersonVoice === false) return beat
          const localPersonIndex = beat.speakerCelebId
            ? localPeople.findIndex(person => person.celebId === beat.speakerCelebId)
            : localPeople.findIndex(person => !!beat.speaker && person.name === beat.speaker)
          const person = localPeople[localPersonIndex]
            ?? (beat.speakerCelebId ? peopleById.get(beat.speakerCelebId) : undefined)
          if (!person) return beat

          // 같은 인물이 다른 장면에 다시 배치되면 대표 대사가 달라질 수 있다. 이때 첫 배치의
          // 기존 WAV로 폴백하면 서로 다른 두 대사가 한 파일을 공유한다. 현재 장면에 인물이 있으면
          // 그 로컬 슬롯만 복구 대상으로 삼고, 비로컬 할당일 때만 첫 배치 파일을 본다.
          const localFile = localPersonIndex >= 0
            ? factionVoiceFile(groupIndex, localPersonIndex, clusterIndex)
            : undefined
          const inheritedFile = beat.speakerCelebId
            ? defaultFiles[beat.speakerCelebId]?.quote
            : undefined
          const candidates = [localFile ?? inheritedFile].filter((file): file is string => !!file)
          const existing = candidates.find(file => available.has(file))
          const file = beat.legacyPersonVoice === true
            ? existing ?? candidates[0]
            : factionSceneBeatMatchesPersonQuote(beat, person) ? existing : undefined
          if (!file) return beat

          changed++
          const duration = available.get(file)?.duration
          return {
            ...beat,
            voiceFile: file,
            legacyPersonVoice: undefined,
            ...(beat.voiceDuration == null && duration && duration > 0 ? { voiceDuration: duration } : {}),
          }
        }),
      }
    }),
  }))
  return { groups: changed ? nextGroups : groups, changed }
}

/** 출연 인물 행을 지워도 대사 본문·화자명·이미 만들어 둔 음원은 대사 항목에 남긴다. */
export function detachFactionCastPerson(
  people: FactionPerson[],
  beats: FactionSceneBeat[],
  removeIndex: number,
  groupIndex: number,
  clusterIndex: number,
): { people: FactionPerson[]; beats: FactionSceneBeat[] } {
  const removed = people[removeIndex]
  if (!removed) return { people, beats }

  const nextBeats = beats.map(beat => {
    const personIndex = beat.speakerCelebId
      ? people.findIndex(person => person.celebId === beat.speakerCelebId)
      : people.findIndex(person => !!beat.speaker && person.name === beat.speaker)
    const person = people[personIndex]
    const shouldMaterialize = !beat.voiceFile
      && personIndex >= 0
      && (beat.legacyPersonVoice === true
        || (beat.legacyPersonVoice !== false && !!person && factionSceneBeatMatchesPersonQuote(beat, person)))
    const preserved = shouldMaterialize
      ? {
          ...beat,
          voiceFile: factionVoiceFile(groupIndex, personIndex, clusterIndex),
          legacyPersonVoice: undefined,
        }
      : beat
    const assignedToRemoved = removed.celebId
      ? beat.speakerCelebId === removed.celebId
      : !beat.speakerCelebId && !!beat.speaker && beat.speaker === removed.name
    if (!assignedToRemoved) return preserved
    return {
      ...preserved,
      speakerCelebId: undefined,
      // 이름 스냅샷은 미할당 화자명으로 남겨 사람이 다시 연결할 수 있게 한다.
      speaker: beat.speaker ?? removed.name,
      speakerEn: beat.speakerEn ?? removed.nameEn,
      hideIdentity: undefined,
      primaryQuote: undefined,
      legacyPersonVoice: undefined,
    }
  })

  return {
    people: people.filter((_, personIndex) => personIndex !== removeIndex),
    beats: nextBeats,
  }
}

/** 렌더가 기본값으로 읽는 첫 인물 배치를 고치고 모든 할당 대사의 이름 스냅샷을 맞춘다. */
export function updateFactionSpeakerPerson(
  groups: FactionGroup[],
  celebId: string,
  nextPerson: FactionPerson,
): FactionGroup[] {
  let sourceUpdated = false
  const nextGroups = groups.map(group => ({
    ...group,
    clusters: (group.clusters ?? []).map(cluster => ({
      ...cluster,
      people: (cluster.people ?? []).map(person => {
        if (sourceUpdated || person.isPerson === false || person.celebId !== celebId) return person
        sourceUpdated = true
        return nextPerson
      }),
      beats: (cluster.beats ?? []).map(beat => beat.speakerCelebId === celebId ? {
        ...beat,
        speaker: nextPerson.name,
        speakerEn: nextPerson.nameEn,
      } : beat),
    })),
  }))
  return sourceUpdated ? nextGroups : groups
}
