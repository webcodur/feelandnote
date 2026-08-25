type Row = Record<string, unknown>

export type UnifiedFactionSceneMediaChange = {
  /** Zero-based line/chunk inside this beat where the replacement starts. */
  chunk: number
  media: string
  crop?: unknown
  filter?: string
  zoomFocus?: unknown
}

export type UnifiedFactionSceneBeat = {
  speakerCelebId?: string
  speaker?: string
  speakerEn?: string
  /** 할당 대사: undefined=영상 안 첫 대사만 자동 표시, false=강제 표시, true=숨김. */
  hideIdentity?: boolean
  /** 이 인물의 기본 대사이자 웹팩션 대표 대사로 투영할 컷. */
  primaryQuote?: boolean
  text: string
  textEn?: string
  media?: string
  mediaCrop?: unknown
  mediaFilter?: string
  mediaZoomFocus?: unknown
  /** Intra-dialogue screen changes. Positions are local to this beat's newline-delimited text. */
  mediaChanges?: UnifiedFactionSceneMediaChange[]
  voiceDuration?: number
  voiceGainDb?: number
  voicePlaybackRate?: number
  voiceSpeaker?: string
  voiceStyle?: string
  voiceElevenlabsVoiceId?: string
  voiceElevenlabsVoiceIdEn?: string
  voiceEleOptions?: { stability?: number; style?: number }
  voiceEleEmotions?: string[]
  voiceEleTrail?: boolean
  /** 기존 FxxCxxPxx 인물 음원 연결. true=구 위치형 연결, false=본문·화자를 고쳐 옛 음원에서 명시적으로 분리. */
  legacyPersonVoice?: boolean
  /** 구 독립 장면 제목. 별도 장면 카드가 아니라 대사 항목의 문맥 표지만 맡는다. */
  label?: string
  labelEn?: string
  /** 구 독립 장면의 최소 길이·효과음. 평평한 대사 항목에서도 값이 소실되지 않게 둔다. */
  minimumSec?: number
  sfx?: string
  /** 같은 장면 안에서 쇼츠 편이 갈리는 경우 다음 대사 항목에 붙는 경계 flag. */
  shortsCutBefore?: boolean
}

type LegacyFactionPerson = {
  isPerson?: boolean
  celebId?: string
  name?: string
  nameEn?: string
  quote?: string
  quoteEn?: string
  quoteChunks?: string[]
  quoteEnChunks?: string[]
  image?: string
  imageCrop?: unknown
  quoteImage?: string
  quoteImageCrop?: unknown
  quoteImageFilter?: string
  quoteZoomFocus?: unknown
  imageChanges?: {
    chunk: number
    image: string
    crop?: unknown
    filter?: string
    zoomFocus?: unknown
  }[]
  quoteDuration?: number
  quoteGainDb?: number
  quotePlaybackRate?: number
  quoteSpeaker?: string
  quoteStyle?: string
  quoteElevenlabsVoiceId?: string
  quoteElevenlabsVoiceIdEn?: string
  quoteEleOptions?: { stability?: number; style?: number }
  quoteEleEmotions?: string[]
  quoteEleTrail?: boolean
}

function textOf(chunks: unknown, text: unknown): string {
  if (Array.isArray(chunks)) return chunks.map(value => String(value ?? '')).join('\n')
  return typeof text === 'string' ? text : ''
}

/** 구 인물 행의 quote 한 벌을 장면의 평범한 대사 항목 하나로 승격한다. */
export function legacyFactionPersonToSceneBeat(person: LegacyFactionPerson): UnifiedFactionSceneBeat {
  return {
    speakerCelebId: person.celebId,
    speaker: person.name,
    speakerEn: person.nameEn,
    text: textOf(person.quoteChunks, person.quote),
    textEn: textOf(person.quoteEnChunks, person.quoteEn) || undefined,
    media: (person.quoteImage as string | undefined) ?? person.image,
    mediaCrop: person.quoteImageCrop ?? person.imageCrop,
    ...(person.quoteImageFilter ? { mediaFilter: person.quoteImageFilter } : {}),
    ...(person.quoteZoomFocus ? { mediaZoomFocus: person.quoteZoomFocus } : {}),
    ...(person.imageChanges?.length ? {
      mediaChanges: person.imageChanges.map(change => ({
        chunk: change.chunk,
        media: change.image,
        ...(change.crop ? { crop: change.crop } : {}),
        ...(change.filter ? { filter: change.filter } : {}),
        ...(change.zoomFocus ? { zoomFocus: change.zoomFocus } : {}),
      })),
    } : {}),
    voiceDuration: person.quoteDuration,
    voiceGainDb: person.quoteGainDb,
    voicePlaybackRate: person.quotePlaybackRate,
    voiceSpeaker: person.quoteSpeaker,
    voiceStyle: person.quoteStyle,
    voiceElevenlabsVoiceId: person.quoteElevenlabsVoiceId,
    voiceElevenlabsVoiceIdEn: person.quoteElevenlabsVoiceIdEn,
    ...(person.quoteEleOptions ? { voiceEleOptions: person.quoteEleOptions } : {}),
    ...(person.quoteEleEmotions?.length ? { voiceEleEmotions: person.quoteEleEmotions } : {}),
    ...(person.quoteEleTrail != null ? { voiceEleTrail: person.quoteEleTrail } : {}),
    legacyPersonVoice: true,
  }
}

/** 구 isPerson=false 장면 한 벌을 같은 모양의 평평한 대사 항목들로 승격한다. */
export function legacyFactionEntryToSceneBeats(entry: Row): UnifiedFactionSceneBeat[] {
  const explicit = Array.isArray(entry.beats)
    ? entry.beats.filter((beat): beat is Row => !!beat && typeof beat === 'object' && !Array.isArray(beat))
    : []
  const beats: UnifiedFactionSceneBeat[] = explicit.length
    ? explicit.map(beat => ({ ...beat, text: typeof beat.text === 'string' ? beat.text : '' }))
    : typeof entry.caption === 'string' || typeof entry.captionEn === 'string'
      ? [{
          text: typeof entry.caption === 'string' ? entry.caption : '',
          textEn: typeof entry.captionEn === 'string' ? entry.captionEn : undefined,
          voiceDuration: entry.voiceDuration as number | undefined,
          voiceGainDb: entry.voiceGainDb as number | undefined,
          voicePlaybackRate: entry.voicePlaybackRate as number | undefined,
          voiceSpeaker: entry.voiceSpeaker as string | undefined,
          voiceStyle: entry.voiceStyle as string | undefined,
        }]
      : []

  if (!beats.length) beats.push({ text: '' })
  const first = beats[0]
  beats[0] = {
    ...first,
    label: typeof entry.name === 'string' ? entry.name : undefined,
    labelEn: typeof entry.nameEn === 'string' ? entry.nameEn : undefined,
    media: first.media ?? (typeof entry.image === 'string' ? entry.image : undefined),
    mediaCrop: first.mediaCrop ?? entry.imageCrop,
    minimumSec: typeof entry.durationSec === 'number' ? entry.durationSec : undefined,
    sfx: typeof entry.sfx === 'string' ? entry.sfx : undefined,
  }
  return beats
}

function chunksOf(texts: string[]): string[] | undefined {
  if (!texts.length) return undefined
  return texts.flatMap(text => text.split(/\r?\n/))
}

function compactText(chunks: string[] | undefined): string | undefined {
  const text = chunks?.map(chunk => chunk.trim()).filter(Boolean).join(' ')
  return text || undefined
}

/**
 * 장면 beats가 편집 단일원천이 된 뒤에도 도감·기존 DB 핫 컬럼이 읽는 quote 값을 파생한다.
 * 이 함수는 인물 메타데이터를 건드리지 않고 할당된 대사 필드만 투영한다.
 */
export function projectFactionSceneBeatsToPeople<T extends LegacyFactionPerson>(
  people: readonly T[],
  beats: readonly UnifiedFactionSceneBeat[],
): T[] {
  return people.map(person => {
    if (person.isPerson === false) return person
    const assigned = beats.filter(beat => beat.speakerCelebId
      ? beat.speakerCelebId === person.celebId
      : !!beat.speaker && beat.speaker === person.name)
    const primary = assigned.find(beat => beat.primaryQuote === true)
    const quoteBeats = primary ? [primary] : assigned
    const koChunks = chunksOf(quoteBeats.map(beat => beat.text ?? ''))
    const enChunks = chunksOf(quoteBeats.flatMap(beat => beat.textEn == null ? [] : [beat.textEn]))
    const first = quoteBeats[0]
    // 구 데이터가 기본 화보와 같은 경로를 quoteImage에 명시했어도 그 명시와 부속 설정을 지우지 않는다.
    // 새 beat가 기본 화보를 그대로 쓰는 경우만 중복 quoteImage 생성을 피한다.
    const firstMedia = first?.media && (first.media !== person.image || first.media === person.quoteImage)
      ? first.media
      : undefined
    const imageChanges: Row[] = []
    let chunkOffset = 0
    quoteBeats.forEach((beat, index) => {
      if (index > 0 && beat.media) {
        imageChanges.push({
          chunk: chunkOffset,
          image: beat.media,
          ...(beat.mediaCrop ? { crop: beat.mediaCrop } : {}),
          ...(beat.mediaFilter ? { filter: beat.mediaFilter } : {}),
          ...(beat.mediaZoomFocus ? { zoomFocus: beat.mediaZoomFocus } : {}),
        })
      }
      for (const change of beat.mediaChanges ?? []) {
        const localChunk = Number.isFinite(change.chunk) ? Math.max(0, Math.trunc(change.chunk)) : 0
        imageChanges.push({
          chunk: chunkOffset + localChunk,
          image: change.media,
          ...(change.crop ? { crop: change.crop } : {}),
          ...(change.filter ? { filter: change.filter } : {}),
          ...(change.zoomFocus ? { zoomFocus: change.zoomFocus } : {}),
        })
      }
      chunkOffset += beat.text.split(/\r?\n/).length
    })

    return {
      ...person,
      quote: compactText(koChunks),
      quoteChunks: koChunks,
      quoteEn: compactText(enChunks),
      quoteEnChunks: enChunks,
      quoteImage: firstMedia,
      quoteImageCrop: firstMedia ? first?.mediaCrop : undefined,
      quoteImageFilter: firstMedia ? first?.mediaFilter : undefined,
      // 일부 구 행에는 quoteImage 없이 목표점만 남아 있다. 통합 저장이 그 값까지 청소하면 안 된다.
      quoteZoomFocus: first?.mediaZoomFocus,
      imageChanges: imageChanges.length ? imageChanges : undefined,
      quoteDuration: quoteBeats.length === 1 ? first?.voiceDuration : undefined,
      quoteGainDb: first?.voiceGainDb ?? person.quoteGainDb,
      quotePlaybackRate: first?.voicePlaybackRate ?? person.quotePlaybackRate,
      quoteSpeaker: first?.voiceSpeaker ?? person.quoteSpeaker,
      quoteStyle: first?.voiceStyle ?? person.quoteStyle,
      quoteElevenlabsVoiceId: first?.voiceElevenlabsVoiceId ?? person.quoteElevenlabsVoiceId,
      quoteElevenlabsVoiceIdEn: first?.voiceElevenlabsVoiceIdEn ?? person.quoteElevenlabsVoiceIdEn,
      quoteEleOptions: first?.voiceEleOptions ?? person.quoteEleOptions,
      quoteEleEmotions: first?.voiceEleEmotions ?? person.quoteEleEmotions,
      quoteEleTrail: first?.voiceEleTrail ?? person.quoteEleTrail,
    } as T
  })
}

/**
 * 대표 대사가 명시된 인물만 에피소드 전체 장면에서 찾아 사람 행의 quote 한 벌로 투영한다.
 * 화자와 인물 배치가 서로 다른 장면에 있어도 웹팩션이 같은 선택을 읽어야 하므로 클러스터 경계를 넘는다.
 */
export function projectFactionPrimaryQuotesToGroups<T extends {
  clusters?: readonly unknown[]
  people?: readonly unknown[]
}>(groups: readonly T[]): T[] {
  const primaryByCelebId = new Map<string, UnifiedFactionSceneBeat>()
  for (const group of groups) {
    const clusters = Array.isArray(group.clusters) ? group.clusters : []
    for (const cluster of clusters) {
      if (!cluster || typeof cluster !== 'object' || Array.isArray(cluster)) continue
      const rawBeats = (cluster as Row).beats
      const beats = Array.isArray(rawBeats) ? rawBeats : []
      for (const rawBeat of beats) {
        if (!rawBeat || typeof rawBeat !== 'object' || Array.isArray(rawBeat)) continue
        const beat = rawBeat as UnifiedFactionSceneBeat
        if (beat.primaryQuote !== true || !beat.speakerCelebId || primaryByCelebId.has(beat.speakerCelebId)) continue
        primaryByCelebId.set(beat.speakerCelebId, beat)
      }
    }
  }
  if (!primaryByCelebId.size) return [...groups]

  const projectPeople = (rawPeople: readonly unknown[]): unknown[] => rawPeople.map(rawPerson => {
    if (!rawPerson || typeof rawPerson !== 'object' || Array.isArray(rawPerson)) return rawPerson
    const person = rawPerson as LegacyFactionPerson
    const primary = person.celebId ? primaryByCelebId.get(person.celebId) : undefined
    return primary ? projectFactionSceneBeatsToPeople([person], [primary])[0] : rawPerson
  })

  return groups.map(group => ({
    ...group,
    ...(Array.isArray(group.people) ? { people: projectPeople(group.people) } : {}),
    clusters: (Array.isArray(group.clusters) ? group.clusters : []).map(rawCluster => {
      if (!rawCluster || typeof rawCluster !== 'object' || Array.isArray(rawCluster)) return rawCluster
      const cluster = rawCluster as Row
      return {
        ...cluster,
        people: projectPeople(Array.isArray(cluster.people) ? cluster.people : []),
      }
    }),
  })) as T[]
}
