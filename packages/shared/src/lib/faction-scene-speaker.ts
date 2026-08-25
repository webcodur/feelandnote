type FactionSpeakerPerson = {
  celebId?: string
  name?: string
  nameEn?: string
  quoteSpeaker?: string
  quoteStyle?: string
  quoteElevenlabsVoiceId?: string
  quoteElevenlabsVoiceIdEn?: string
  quoteEleOptions?: { stability?: number; style?: number }
  quoteEleEmotions?: string[]
  quoteEleTrail?: boolean
  quoteGainDb?: number
  quotePlaybackRate?: number
}

type FactionSpeakerBeat = {
  speakerCelebId?: string
  speaker?: string
  speakerEn?: string
  voiceSpeaker?: string
  voiceStyle?: string
  voiceElevenlabsVoiceId?: string
  voiceElevenlabsVoiceIdEn?: string
  voiceEleOptions?: { stability?: number; style?: number }
  voiceEleEmotions?: string[]
  voiceEleTrail?: boolean
  voiceGainDb?: number
  voicePlaybackRate?: number
}

type FactionNarrationVoice = {
  quoteSpeaker?: string
  quoteStyle?: string
  quoteElevenlabsVoiceId?: string
  quoteElevenlabsVoiceIdEn?: string
  quoteEleOptions?: { stability?: number; style?: number }
  quoteEleEmotions?: string[]
  quoteEleTrail?: boolean
  quoteGainDb?: number
  quotePlaybackRate?: number
}

/** 실제 인물 UUID도 자유 화자명도 없는 발화는 에피소드 공용 나레이터가 읽는 해설이다. */
export function isFactionSceneNarrationBeat(beat: FactionSpeakerBeat): boolean {
  return !beat.speakerCelebId && !beat.speaker?.trim() && !beat.speakerEn?.trim()
}

/** 장면 대사에 할당할 수 있는 실제 인물만 CELEB UUID 기준으로 한 번씩 모은다. */
export function factionSceneSpeakerPeople<T extends FactionSpeakerPerson & { isPerson?: boolean }>(
  groups: ReadonlyArray<{ clusters?: ReadonlyArray<{ people?: ReadonlyArray<T> }> }>,
): T[] {
  const seen = new Set<string>()
  return groups.flatMap(group => group.clusters ?? []).flatMap(cluster => cluster.people ?? []).flatMap(person => {
    if (person.isPerson === false || !person.celebId || seen.has(person.celebId)) return []
    seen.add(person.celebId)
    return [person]
  })
}

/** speakerCelebId가 같은 에피소드의 실제 인물 배치를 가리키는지 저장 전에 검증한다. */
export function assertFactionSceneSpeakerAssignments(
  groups: ReadonlyArray<{
    name?: string
    clusters?: ReadonlyArray<{
      beats?: ReadonlyArray<FactionSpeakerBeat>
      people?: ReadonlyArray<(FactionSpeakerPerson & { isPerson?: boolean; name?: string; beats?: ReadonlyArray<FactionSpeakerBeat> })>
    }>
  }>,
): void {
  const assignedIds = new Set(factionSceneSpeakerPeople(groups).flatMap(person => person.celebId ? [person.celebId] : []))
  groups.forEach((group, groupIndex) => {
    ;(group.clusters ?? []).forEach((cluster, clusterIndex) => {
      ;(cluster.beats ?? []).forEach((beat, beatIndex) => {
        if (!beat.speakerCelebId || assignedIds.has(beat.speakerCelebId)) return
        const groupName = group.name?.split('\n')[0]?.trim() || `세력 ${groupIndex + 1}`
        throw new Error(`${groupName} · 장면 ${clusterIndex + 1}의 ${beatIndex + 1}번 발화가 이 에피소드에 없는 인물을 가리킵니다`)
      })
      ;(cluster.people ?? []).forEach((entry, entryIndex) => {
        if (entry.isPerson !== false) return
        ;(entry.beats ?? []).forEach((beat, beatIndex) => {
          if (!beat.speakerCelebId || assignedIds.has(beat.speakerCelebId)) return
          const groupName = group.name?.split('\n')[0]?.trim() || `세력 ${groupIndex + 1}`
          const sceneName = entry.name?.trim() || `서사 항목 ${clusterIndex + 1}:${entryIndex + 1}`
          throw new Error(`${groupName} · ${sceneName}의 ${beatIndex + 1}번 발화가 이 에피소드에 없는 인물을 가리킵니다`)
        })
      })
    })
  })
}

/**
 * 장면 발화의 인물 할당을 실제 화면·음성 값으로 푼다.
 * 발화 자체의 음성 오버라이드는 보존하고, 비어 있는 값만 할당된 인물의 대사 설정에서 상속한다.
 */
export function resolveFactionSceneSpeaker<T extends FactionSpeakerBeat>(
  beat: T,
  people: ReadonlyArray<FactionSpeakerPerson>,
  locale: 'ko' | 'en' = 'ko',
): T {
  if (!beat.speakerCelebId) return beat
  const person = people.find(candidate => candidate.celebId === beat.speakerCelebId)
  if (!person) return beat
  const speaker = locale === 'en'
    ? person.nameEn?.trim() || person.name?.trim()
    : person.name?.trim()
  return {
    ...beat,
    ...(speaker ? { speaker, speakerEn: person.nameEn?.trim() || person.name?.trim() } : {}),
    voiceSpeaker: beat.voiceSpeaker ?? person.quoteSpeaker,
    voiceStyle: beat.voiceStyle ?? person.quoteStyle,
    voiceElevenlabsVoiceId: beat.voiceElevenlabsVoiceId ?? person.quoteElevenlabsVoiceId,
    voiceElevenlabsVoiceIdEn: beat.voiceElevenlabsVoiceIdEn ?? person.quoteElevenlabsVoiceIdEn,
    voiceEleOptions: beat.voiceEleOptions ?? person.quoteEleOptions,
    voiceEleEmotions: beat.voiceEleEmotions ?? person.quoteEleEmotions,
    voiceEleTrail: beat.voiceEleTrail ?? person.quoteEleTrail,
    voiceGainDb: beat.voiceGainDb ?? person.quoteGainDb,
    voicePlaybackRate: beat.voicePlaybackRate ?? person.quotePlaybackRate,
  }
}

/**
 * 장면 발화를 실제 인물 또는 에피소드 공용 나레이터의 음성값으로 푼다.
 *
 * 나레이터는 출연 인물 행을 만들지 않는 가상 화자다. 저장된 speaker를 채우지 않으므로
 * 기존 scene-<hash>.wav 파일명과 장면명 표시 방식은 그대로 유지하고 음성 기본값만 상속한다.
 * 자유 화자명이 있는 미할당 발화는 독립 화자이므로 나레이터 값을 상속하지 않는다.
 */
export function resolveFactionSceneVoice<T extends FactionSpeakerBeat>(
  beat: T,
  people: ReadonlyArray<FactionSpeakerPerson>,
  narrationVoice?: FactionNarrationVoice,
  locale: 'ko' | 'en' = 'ko',
): T {
  const assigned = resolveFactionSceneSpeaker(beat, people, locale)
  if (!isFactionSceneNarrationBeat(assigned) || !narrationVoice) return assigned
  return {
    ...assigned,
    voiceSpeaker: assigned.voiceSpeaker ?? narrationVoice.quoteSpeaker,
    voiceStyle: assigned.voiceStyle ?? narrationVoice.quoteStyle,
    voiceElevenlabsVoiceId: assigned.voiceElevenlabsVoiceId ?? narrationVoice.quoteElevenlabsVoiceId,
    voiceElevenlabsVoiceIdEn: assigned.voiceElevenlabsVoiceIdEn
      ?? narrationVoice.quoteElevenlabsVoiceIdEn
      ?? narrationVoice.quoteElevenlabsVoiceId,
    voiceEleOptions: assigned.voiceEleOptions ?? narrationVoice.quoteEleOptions,
    voiceEleEmotions: assigned.voiceEleEmotions ?? narrationVoice.quoteEleEmotions,
    voiceEleTrail: assigned.voiceEleTrail ?? narrationVoice.quoteEleTrail,
    voiceGainDb: assigned.voiceGainDb ?? narrationVoice.quoteGainDb,
    voicePlaybackRate: assigned.voicePlaybackRate ?? narrationVoice.quotePlaybackRate,
  }
}
