'use client'

import type { EditLang } from '@feelandnote/shared/bo/editor'
import { ArrowRightLeft, Search, Trash2 } from '@feelandnote/shared/bo/icons'
import type { FactionPerson, FactionSceneBeat } from '@/lib/faction-types'
import { CelebBadge } from '@/components/factions/shared/CelebBadge'
import { FactionSceneBeatRow } from './FactionSceneBeatRow'
import { FactionInsertBoundary } from './FactionInsertBoundary'
import { insertFactionCut } from './faction-scene-cut'
import { detachFactionCastPerson } from './faction-speaker-edit'

type Props = {
  beats: FactionSceneBeat[]
  onBeatsChange: (next: FactionSceneBeat[]) => void
  onSplitBeat: (beatIndex: number) => void
  onMoveBeatToScene?: (beatIndex: number) => void
  onInsertSceneBefore: () => void
  onInsertSceneAfter: () => void
  people: FactionPerson[]
  onPeopleChange: (nextPeople: FactionPerson[], nextBeats?: FactionSceneBeat[]) => void
  onAddCeleb: () => void
  series: string
  episodeName: string
  groupIndex: number
  clusterIndex: number
  editLang: EditLang
  sfxList: string[]
  speakerPeople: FactionPerson[]
  speakerVoiceFiles?: Record<string, { quote: string; epithet: string }>
  onSpeakerPersonChange?: (celebId: string, nextPerson: FactionPerson) => void
  onSetPrimaryQuote?: (beatIndex: number, celebId: string) => void
  onMoveCrossGroup?: (personIndex: number) => void
  celebExisting: Set<string>
  celebLoaded: boolean
}

/** 장면 하나가 소유하는 유일한 컷 목록. 화면·해설·인물 대사는 같은 구조를 쓴다. */
export function FactionClusterDialogueList({
  beats,
  onBeatsChange,
  onSplitBeat,
  onMoveBeatToScene,
  onInsertSceneBefore,
  onInsertSceneAfter,
  people,
  onPeopleChange,
  onAddCeleb,
  series,
  episodeName,
  groupIndex,
  clusterIndex,
  editLang,
  sfxList,
  speakerPeople,
  speakerVoiceFiles,
  onSpeakerPersonChange,
  onSetPrimaryQuote,
  onMoveCrossGroup,
  celebExisting,
  celebLoaded,
}: Props) {
  const changeBeat = (index: number, next: FactionSceneBeat) =>
    onBeatsChange(beats.map((beat, beatIndex) => beatIndex === index ? next : beat))
  const moveBeat = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= beats.length) return
    const next = [...beats]
    ;[next[index], next[target]] = [next[target], next[index]]
    onBeatsChange(next)
  }
  const deleteBeat = (index: number) => onBeatsChange(beats.filter((_, beatIndex) => beatIndex !== index))
  const appendCut = () => onBeatsChange(insertFactionCut(beats, beats.length))
  const insertSceneAt = (beatIndex: number) => {
    if (beatIndex <= 0) {
      onInsertSceneBefore()
      return
    }
    if (beatIndex >= beats.length) {
      onInsertSceneAfter()
      return
    }
    onSplitBeat(beatIndex)
  }
  const setPrimaryQuote = (index: number) => {
    const celebId = beats[index]?.speakerCelebId
    if (!celebId) return
    if (onSetPrimaryQuote) {
      onSetPrimaryQuote(index, celebId)
      return
    }
    onBeatsChange(beats.map((beat, beatIndex) => beat.speakerCelebId !== celebId ? beat : {
      ...beat,
      primaryQuote: beatIndex === index ? true : undefined,
    }))
  }
  const changeAssignedPerson = (beat: FactionSceneBeat, nextPerson: FactionPerson) => {
    if (beat.speakerCelebId && onSpeakerPersonChange) {
      onSpeakerPersonChange(beat.speakerCelebId, nextPerson)
      return
    }
    const personIndex = people.findIndex(person => beat.speakerCelebId
      ? person.celebId === beat.speakerCelebId
      : !!beat.speaker && person.name === beat.speaker)
    if (personIndex < 0) return
    const previous = people[personIndex]
    const nextBeats = beats.map(current => {
      const assigned = previous.celebId
        ? current.speakerCelebId === previous.celebId
        : !current.speakerCelebId && !!current.speaker && current.speaker === previous.name
      return assigned ? { ...current, speaker: nextPerson.name, speakerEn: nextPerson.nameEn } : current
    })
    onPeopleChange(
      people.map((person, index) => index === personIndex ? nextPerson : person),
      nextBeats,
    )
  }
  const removePerson = (index: number) => {
    const person = people[index]
    if (!person || !confirm(`「${person.name || '이름 없음'}」을 이 장면의 출연 인물에서 제거할까요? 인물 할당만 해제하고 대사·화자명·음원은 그대로 둡니다.`)) return
    const next = detachFactionCastPerson(people, beats, index, groupIndex, clusterIndex)
    onPeopleChange(next.people, next.beats)
  }

  return (
    <section className="space-y-3" aria-label="장면 내 컷 목록">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border/70 bg-bg-main/35 px-3 py-2.5">
        <div>
          <h4 className="text-sm font-black text-text-primary">컷 타임라인</h4>
          <p className="text-[11px] text-text-tertiary">화면·해설·인물 대사를 한 순서로 두고, 필요할 때 화자를 할당합니다.</p>
        </div>
        <button
          type="button"
          onClick={appendCut}
          className="rounded-md border border-accent/60 bg-accent/10 px-3 py-1.5 text-xs font-bold text-accent hover:border-accent hover:bg-accent/20 hover:text-text-primary active:bg-accent/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          + 끝에 컷 추가
        </button>
      </div>

      <FactionInsertBoundary
        label={`${clusterIndex + 1}번 장면 시작 경계`}
        onAddCut={() => onBeatsChange(insertFactionCut(beats, 0))}
        onAddScene={() => insertSceneAt(0)}
      />

      {beats.map((beat, index) => (
        <div key={`${groupIndex}-${clusterIndex}-beat-${index}`}>
          <FactionSceneBeatRow
            beat={beat}
            index={index}
            total={beats.length}
            onChange={changeBeat}
            onMove={moveBeat}
            onSplit={onSplitBeat}
            onMoveToScene={onMoveBeatToScene}
            onDelete={deleteBeat}
            editLang={editLang}
            sfxList={sfxList}
            series={series}
            episodeName={episodeName}
            groupIndex={groupIndex}
            clusterIndex={clusterIndex}
            localPeople={people}
            speakerPeople={speakerPeople}
            speakerVoiceFiles={speakerVoiceFiles}
            onAssignedPersonChange={nextPerson => changeAssignedPerson(beat, nextPerson)}
            onSetPrimaryQuote={() => setPrimaryQuote(index)}
          />
          <FactionInsertBoundary
            label={`${index + 1}번 컷 뒤 경계`}
            onAddCut={() => onBeatsChange(insertFactionCut(beats, index + 1))}
            onAddScene={() => insertSceneAt(index + 1)}
            // 컷 사이 편 경계는 다음 컷의 shortsCutBefore 로 산다. 마지막 컷 뒤는 장면 사이 토글이 맡는다.
            cut={index + 1 < beats.length ? {
              on: beats[index + 1].shortsCutBefore === true,
              onToggle: () => changeBeat(index + 1, {
                ...beats[index + 1],
                shortsCutBefore: beats[index + 1].shortsCutBefore === true ? undefined : true,
              }),
            } : undefined}
          />
        </div>
      ))}

      {beats.length === 0 ? (
        <p className="rounded-md border border-dashed border-border px-3 py-4 text-center text-xs text-text-dim">
          컷이 없습니다.
        </p>
      ) : null}

      <details className="rounded-md border border-border/70 bg-bg-main/30">
        <summary className="cursor-pointer rounded-md px-3 py-2 text-xs font-semibold text-text-secondary hover:bg-bg-hover">
          출연 인물 {people.length}명 · 컷의 화자 선택지
        </summary>
        <div className="flex flex-wrap gap-1.5 border-t border-border/60 p-2">
          {people.map((person, index) => (
            <span key={person.celebId ?? person.slug ?? `${person.name}-${index}`} className="inline-flex items-center gap-1 rounded-md border border-border bg-bg-card px-2 py-1 text-xs text-text-secondary">
              <span className="font-semibold text-text-primary">{editLang === 'en' ? person.nameEn ?? person.name : person.name}</span>
              <CelebBadge speaker={person} existing={celebExisting} loaded={celebLoaded} />
              {onMoveCrossGroup ? (
                <button type="button" onClick={() => onMoveCrossGroup(index)} className="rounded p-0.5 text-text-tertiary hover:bg-bg-hover hover:text-text-primary" title="다른 장면으로 이동" aria-label={`${person.name} 다른 장면으로 이동`}>
                  <ArrowRightLeft size={12} />
                </button>
              ) : null}
              <button type="button" onClick={() => removePerson(index)} className="rounded p-0.5 text-text-tertiary hover:bg-danger/15 hover:text-danger-text" title="출연 인물 제거" aria-label={`${person.name} 출연 인물 제거`}>
                <Trash2 size={12} />
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={onAddCeleb}
            className="inline-flex items-center gap-1 rounded-md border border-dashed border-border px-2 py-1 text-xs font-semibold text-text-secondary hover:border-accent hover:bg-bg-hover hover:text-text-primary"
          >
            <Search size={13} /> 출연 인물 등록
          </button>
        </div>
      </details>
    </section>
  )
}
