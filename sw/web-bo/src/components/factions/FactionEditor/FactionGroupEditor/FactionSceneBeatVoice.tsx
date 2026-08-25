'use client'

import { useEffect, useMemo, useState } from 'react'
import type { EditLang } from '@feelandnote/shared/bo/editor'
import type { VoiceFile } from '@feelandnote/shared/bo/voice-utils'
import { isFactionSceneNarrationBeat } from '@feelandnote/shared/lib/faction-scene-speaker'
import type { FactionNarratorVoice, FactionPerson, FactionSceneBeat } from '@/lib/faction-types'
import { factionVoiceFile, vnSceneBeat } from '@/lib/faction-voice'
import { useFactionVoice } from '../../shared/FactionVoiceContext'
import { FactionVoicePanel } from './FactionPersonRow/FactionVoicePanel/FactionVoicePanel'
import { FactionVoiceSettingsModal } from './FactionPersonRow/FactionVoicePanel/voice-panel'
import { QUOTE_SLOT } from './FactionPersonRow/FactionVoicePanel/voice-panel/voice-slots'
import { factionSceneBeatMatchesPersonQuote } from './faction-speaker-edit'

type Props = {
  beat: FactionSceneBeat
  assignedPerson?: FactionPerson
  assignedVoiceFile?: string
  localPeople: FactionPerson[]
  groupIndex: number
  clusterIndex: number
  series: string
  episodeName: string
  editLang: EditLang
  onChange: (next: FactionSceneBeat) => void
  /** 할당 인물의 기본 음성값을 같은 컷 안에서 고친다. 컷별 값은 beat가 계속 우선한다. */
  onAssignedPersonChange?: (next: FactionPerson) => void
}

const same = (left: unknown, right: unknown) =>
  left === right || JSON.stringify(left) === JSON.stringify(right)

function beatOverride<T>(value: T | undefined, base: T | undefined, current: T | undefined): T | undefined {
  return current !== undefined || !same(value, base) ? value : undefined
}

function narratorPersonOf(voice?: FactionNarratorVoice): FactionPerson | undefined {
  return voice ? { ...voice, name: '나레이터' } as FactionPerson : undefined
}

function voicePersonOf(
  beat: FactionSceneBeat,
  person?: FactionPerson,
  commonNarrationVoice?: FactionNarratorVoice,
): FactionPerson {
  const koChunks = beat.text.split(/\r?\n/)
  const enChunks = beat.textEn?.split(/\r?\n/)
  const inherited = person
    ?? (isFactionSceneNarrationBeat(beat) ? narratorPersonOf(commonNarrationVoice) : undefined)
  return {
    ...(inherited ?? { name: beat.speaker?.trim() || '나레이터' }),
    name: inherited?.name ?? beat.speaker?.trim() ?? '나레이터',
    quote: koChunks.map(chunk => chunk.trim()).filter(Boolean).join(' '),
    quoteChunks: koChunks,
    quoteEn: enChunks?.map(chunk => chunk.trim()).filter(Boolean).join(' '),
    quoteEnChunks: enChunks,
    quoteDuration: beat.voiceDuration,
    quoteGainDb: beat.voiceGainDb ?? inherited?.quoteGainDb,
    quotePlaybackRate: beat.voicePlaybackRate ?? inherited?.quotePlaybackRate,
    quoteSpeaker: beat.voiceSpeaker ?? inherited?.quoteSpeaker,
    quoteStyle: beat.voiceStyle ?? inherited?.quoteStyle,
    quoteElevenlabsVoiceId: beat.voiceElevenlabsVoiceId ?? inherited?.quoteElevenlabsVoiceId,
    quoteElevenlabsVoiceIdEn: beat.voiceElevenlabsVoiceIdEn ?? inherited?.quoteElevenlabsVoiceIdEn,
    quoteEleOptions: beat.voiceEleOptions ?? inherited?.quoteEleOptions,
    quoteEleEmotions: beat.voiceEleEmotions ?? inherited?.quoteEleEmotions,
    quoteEleTrail: beat.voiceEleTrail ?? inherited?.quoteEleTrail,
  }
}

/** 장면 beat에 구 개인 대사의 파일 재생·합성·싱크·후처리 도구를 직접 연결한다. */
export function FactionSceneBeatVoice({
  beat,
  assignedPerson,
  assignedVoiceFile,
  localPeople,
  groupIndex,
  clusterIndex,
  series,
  episodeName,
  editLang,
  onChange,
  onAssignedPersonChange,
}: Props) {
  const [modalMode, setModalMode] = useState<'beat' | 'person' | null>(null)
  const voice = useFactionVoice()
  const isNarration = isFactionSceneNarrationBeat(beat)
  const commonNarrationVoice = voice?.commonNarrationVoice
  const localPersonIndex = assignedPerson
    ? localPeople.findIndex(person => person.celebId
      ? person.celebId === assignedPerson.celebId
      : person.name === assignedPerson.name)
    : -1
  const localizedSpeaker = editLang === 'en' ? beat.speakerEn ?? beat.speaker : beat.speaker
  const localizedText = editLang === 'en' ? beat.textEn ?? beat.text : beat.text
  const localVoiceFile = localPersonIndex >= 0
    ? factionVoiceFile(groupIndex, localPersonIndex, clusterIndex)
    : undefined
  const positionVoiceCandidates = [assignedVoiceFile, localVoiceFile]
    .filter((file, index, files): file is string => !!file && files.indexOf(file) === index)
  const existingPositionVoiceFile = positionVoiceCandidates.find(file => voice?.byFile.has(file))
  const recoverablePositionVoiceFile = assignedPerson
    && beat.legacyPersonVoice !== false
    && factionSceneBeatMatchesPersonQuote(beat, assignedPerson, editLang === 'en' ? 'en' : 'ko')
    ? existingPositionVoiceFile
    : undefined
  const inheritedPositionVoiceFile = beat.legacyPersonVoice === true
    ? existingPositionVoiceFile ?? positionVoiceCandidates[0]
    : recoverablePositionVoiceFile
  const voiceFile = beat.voiceFile
    ?? inheritedPositionVoiceFile
    ?? vnSceneBeat(localizedSpeaker, localizedText)
  const meta = voice?.byFile.get(voiceFile)
  const activeFile: VoiceFile | undefined = meta
    ? { name: voiceFile, sizeKB: Math.round(meta.size / 1024), duration: meta.duration, engine: 'gemini' }
    : undefined
  const inheritedVoicePerson = useMemo(
    () => assignedPerson ?? (isNarration ? narratorPersonOf(commonNarrationVoice) : undefined),
    [assignedPerson, commonNarrationVoice, isNarration],
  )
  const person = useMemo(
    () => voicePersonOf(beat, assignedPerson, commonNarrationVoice),
    [assignedPerson, beat, commonNarrationVoice],
  )
  const assignedVoicePerson = useMemo(() => assignedPerson ? {
    ...assignedPerson,
    quote: person.quote,
    quoteChunks: person.quoteChunks,
    quoteEn: person.quoteEn,
    quoteEnChunks: person.quoteEnChunks,
    // 길이는 이 컷의 실제 음원 표시용일 뿐 인물 기본값으로 저장하지 않는다.
    quoteDuration: beat.voiceDuration,
  } : person, [assignedPerson, beat.voiceDuration, person])
  const overrideCount = [
    beat.voiceGainDb,
    beat.voicePlaybackRate,
    beat.voiceSpeaker,
    beat.voiceStyle,
    beat.voiceElevenlabsVoiceId,
    beat.voiceElevenlabsVoiceIdEn,
    beat.voiceEleOptions,
    beat.voiceEleEmotions,
    beat.voiceEleTrail,
  ].filter(value => value !== undefined).length
  const beatVoiceLabel = assignedPerson
    ? '대사 음성'
    : isNarration
      ? '나레이터 해설 음성'
      : '미할당 화자 음성'
  const beatVoiceSlot = { ...QUOTE_SLOT, label: beatVoiceLabel }

  useEffect(() => {
    const materializedVoiceFile = !beat.voiceFile && inheritedPositionVoiceFile
      ? inheritedPositionVoiceFile
      : undefined
    const measuredDuration = meta?.duration && meta.duration > 0 && beat.voiceDuration == null
      ? meta.duration
      : undefined
    if (!materializedVoiceFile && measuredDuration == null) return
    onChange({
      ...beat,
      ...(materializedVoiceFile ? { voiceFile: materializedVoiceFile, legacyPersonVoice: undefined } : {}),
      ...(measuredDuration != null ? { voiceDuration: measuredDuration } : {}),
    })
  }, [beat, inheritedPositionVoiceFile, meta?.duration, onChange])

  if (!voice || !beat.text.trim()) return null

  const changeVoicePerson = (next: FactionPerson) => onChange({
    ...beat,
    voiceDuration: next.quoteDuration,
    voiceGainDb: beatOverride(next.quoteGainDb, inheritedVoicePerson?.quoteGainDb, beat.voiceGainDb),
    voicePlaybackRate: beatOverride(next.quotePlaybackRate, inheritedVoicePerson?.quotePlaybackRate, beat.voicePlaybackRate),
    voiceSpeaker: beatOverride(next.quoteSpeaker, inheritedVoicePerson?.quoteSpeaker, beat.voiceSpeaker),
    voiceStyle: beatOverride(next.quoteStyle, inheritedVoicePerson?.quoteStyle, beat.voiceStyle),
    voiceElevenlabsVoiceId: beatOverride(next.quoteElevenlabsVoiceId, inheritedVoicePerson?.quoteElevenlabsVoiceId, beat.voiceElevenlabsVoiceId),
    voiceElevenlabsVoiceIdEn: beatOverride(next.quoteElevenlabsVoiceIdEn, inheritedVoicePerson?.quoteElevenlabsVoiceIdEn, beat.voiceElevenlabsVoiceIdEn),
    voiceEleOptions: beatOverride(next.quoteEleOptions, inheritedVoicePerson?.quoteEleOptions, beat.voiceEleOptions),
    voiceEleEmotions: beatOverride(next.quoteEleEmotions, inheritedVoicePerson?.quoteEleEmotions, beat.voiceEleEmotions),
    voiceEleTrail: beatOverride(next.quoteEleTrail, inheritedVoicePerson?.quoteEleTrail, beat.voiceEleTrail),
  })

  const changeAssignedVoice = (next: FactionPerson) => {
    if (!assignedPerson || !onAssignedPersonChange) return
    onAssignedPersonChange({
      ...assignedPerson,
      quoteGainDb: next.quoteGainDb,
      quotePlaybackRate: next.quotePlaybackRate,
      quoteSpeaker: next.quoteSpeaker,
      quoteStyle: next.quoteStyle,
      quoteElevenlabsVoiceId: next.quoteElevenlabsVoiceId,
      quoteElevenlabsVoiceIdEn: next.quoteElevenlabsVoiceIdEn,
      quoteEleOptions: next.quoteEleOptions,
      quoteEleEmotions: next.quoteEleEmotions,
      quoteEleTrail: next.quoteEleTrail,
    })
  }

  return (
    <section data-faction-scene-voice-file={voiceFile} className="mt-2 rounded-md border border-border/70 bg-bg-main/25">
      <div className="flex min-h-10 flex-wrap items-center gap-2 border-b border-border/60 px-3 py-2 text-[10px] text-text-dim">
        <div>
          <div className="text-[11px] font-black text-text-secondary">음성 트랙</div>
          <div className="mt-0.5">{assignedPerson
            ? overrideCount > 0
              ? `인물 기본값 위에 ${overrideCount}개 오버라이드`
              : '인물 기본값 상속 중'
            : isNarration
              ? commonNarrationVoice
                ? overrideCount > 0
                  ? `공용 나레이터 위에 ${overrideCount}개 오버라이드`
                  : '공용 나레이터 상속 중'
                : '공용 나레이터 설정 필요 · 현재 기본 음성'
              : '이 컷 전용 음성'}</div>
        </div>
        {assignedPerson && onAssignedPersonChange ? (
          <button
            type="button"
            onClick={() => setModalMode('person')}
            className="ml-auto rounded-md border border-border px-2 py-1 font-semibold text-text-secondary hover:border-accent hover:bg-bg-hover hover:text-text-primary"
            title="이 인물이 할당된 대사들이 상속할 기본 목소리·속도·말투를 편집합니다"
          >
            인물 기본 음성 편집
          </button>
        ) : isNarration ? (
          <button
            type="button"
            onClick={() => document.getElementById('faction-narrator-voice')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
            className="ml-auto rounded-md border border-border px-2 py-1 font-semibold text-text-secondary hover:border-accent hover:bg-bg-hover hover:text-text-primary"
            title="이 에피소드의 모든 나레이터 해설이 상속하는 공용 목소리로 이동합니다"
          >
            공용 나레이터 설정
          </button>
        ) : null}
      </div>
      <div className="p-2">
        <FactionVoicePanel
          person={person}
          series={series}
          episodeName={episodeName}
          voiceFile={voiceFile}
          hasContent
          meta={meta}
          activeFile={activeFile}
          onOpenModal={() => setModalMode('beat')}
          slot={beatVoiceSlot}
          lang={editLang}
        />
      </div>
      {modalMode ? (
        <FactionVoiceSettingsModal
          person={modalMode === 'person' ? assignedVoicePerson : person}
          onChange={modalMode === 'person' ? changeAssignedVoice : changeVoicePerson}
          series={series}
          episodeName={episodeName}
          voiceFile={voiceFile}
          activeFile={activeFile}
          onRefresh={() => voice.reload?.()}
          onClose={() => setModalMode(null)}
          slot={{ ...QUOTE_SLOT, label: modalMode === 'person' ? '인물 기본 음성' : beatVoiceLabel }}
          lang={editLang}
        />
      ) : null}
    </section>
  )
}
