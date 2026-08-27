'use client'

import { memo } from 'react'
import dynamic from 'next/dynamic'
import type { EditLang } from '@feelandnote/shared/bo/editor'
import { Plus } from '@feelandnote/shared/bo/icons'
import type { FactionGroup, FactionPerson, FactionScript } from '@/lib/faction-types'
import { factionSceneSpeakerPeople } from '@feelandnote/shared/lib/faction-scene-speaker'
import { projectFactionPrimaryQuotesToGroups } from '@feelandnote/shared/lib/faction-scene-unification'
import { FactionGroupEditor } from '../FactionGroupEditor'
import { factionSpeakerVoiceFiles, updateFactionSpeakerPerson } from '../FactionGroupEditor/faction-speaker-edit'
import { FactionNarratorPanel } from '../FactionNarratorPanel'
import { FactionDialogueSettings } from './FactionDialogueSettings'
import { FactionTimingSettings } from './FactionTimingSettings'

const FactionPeoplePanel = dynamic(
  () => import('../FactionPeoplePanel/FactionPeoplePanel'),
  {
    loading: () => (
      <div className="rounded-xl border border-border bg-bg-card px-4 py-16 text-center text-sm text-text-secondary">
        인물 사진 모드를 여는 중입니다…
      </div>
    ),
  },
)

type Props = {
  script: FactionScript
  series: string
  episodeName: string
  editLang: EditLang
  sfxList: string[]
  showPeopleImages: boolean
  celebExisting: Set<string>
  celebLoaded: boolean
  onChange: (patch: Partial<FactionScript>) => void
  onApplyDialogueAll: () => void
  onClearDialogueOverrides: () => void
  onSetGroup: (index: number, group: FactionGroup) => void
  onDeleteGroup: (index: number) => void
  onMoveGroup: (index: number, direction: -1 | 1) => void
  onMovePersonCrossGroup: (groupIndex: number, clusterIndex: number, personIndex: number) => void
  onAddGroup: () => void
}

type FactionGroupListProps = Pick<Props,
  | 'series'
  | 'episodeName'
  | 'editLang'
  | 'sfxList'
  | 'celebExisting'
  | 'celebLoaded'
  | 'onChange'
  | 'onSetGroup'
  | 'onDeleteGroup'
  | 'onMoveGroup'
  | 'onMovePersonCrossGroup'
  | 'onAddGroup'
> & {
  groups: FactionGroup[]
  inheritedSceneCaptionPosition: 'bottom' | 'center'
}

/** 에피소드 설정만 바뀔 때 수십 개 장면 편집기를 다시 그리지 않는 렌더 경계. */
const FactionGroupList = memo(function FactionGroupList({
  groups,
  inheritedSceneCaptionPosition,
  series,
  episodeName,
  editLang,
  sfxList,
  celebExisting,
  celebLoaded,
  onChange,
  onSetGroup,
  onDeleteGroup,
  onMoveGroup,
  onMovePersonCrossGroup,
  onAddGroup,
}: FactionGroupListProps) {
  const speakerPeople = factionSceneSpeakerPeople(groups)
  const speakerVoiceFiles = factionSpeakerVoiceFiles(groups)
  const changeSpeakerPerson = (celebId: string, nextPerson: FactionPerson) => {
    const nextGroups = updateFactionSpeakerPerson(groups, celebId, nextPerson)
    if (nextGroups !== groups) onChange({ groups: nextGroups })
  }
  const setPrimaryQuote = (groupIndex: number, clusterIndex: number, beatIndex: number, celebId: string) => {
    const nextGroups = groups.map((group, nextGroupIndex) => ({
      ...group,
      clusters: (group.clusters ?? []).map((cluster, nextClusterIndex) => ({
        ...cluster,
        beats: (cluster.beats ?? []).map((beat, nextBeatIndex) => beat.speakerCelebId !== celebId ? beat : {
          ...beat,
          primaryQuote: nextGroupIndex === groupIndex && nextClusterIndex === clusterIndex && nextBeatIndex === beatIndex
            ? true
            : undefined,
        }),
      })),
    }))
    onChange({ groups: projectFactionPrimaryQuotesToGroups(nextGroups) as FactionGroup[] })
  }

  return (
    <section className="space-y-4 rounded-xl border border-border bg-bg-card/40 p-4 sm:p-5">
      <header className="flex h-9 items-center justify-between gap-3 border-b border-border/60 px-1 pb-3">
        <span className="text-xs text-text-tertiary">세력 · 장면 · 대사 항목 · 화자 할당</span>
        <span className="rounded border border-border bg-bg-card px-2.5 py-1 text-xs font-bold text-text-secondary">{groups.length}개 세력</span>
      </header>

      <div className="space-y-4">
        {groups.map((group, groupIndex) => (
          <div key={groupIndex} id={`faction-group-${groupIndex}`} className="scroll-mt-24">
            <FactionGroupEditor
              groupIndex={groupIndex}
              group={group}
              inheritedSceneCaptionPosition={inheritedSceneCaptionPosition}
              onChange={next => onSetGroup(groupIndex, next)}
              onDelete={() => onDeleteGroup(groupIndex)}
              onMoveUp={() => onMoveGroup(groupIndex, -1)}
              onMoveDown={() => onMoveGroup(groupIndex, 1)}
              series={series}
              episodeName={episodeName}
              editLang={editLang}
              sfxList={sfxList}
              onMoveCrossGroup={(clusterIndex, personIndex) => onMovePersonCrossGroup(groupIndex, clusterIndex, personIndex)}
              celebExisting={celebExisting}
              celebLoaded={celebLoaded}
              speakerPeople={speakerPeople}
              speakerVoiceFiles={speakerVoiceFiles}
              onSpeakerPersonChange={changeSpeakerPerson}
              onSetPrimaryQuote={(clusterIndex, beatIndex, celebId) => setPrimaryQuote(groupIndex, clusterIndex, beatIndex, celebId)}
            />
          </div>
        ))}
        {groups.length === 0 && (
          <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-text-secondary">
            아직 세력이 없습니다.
          </p>
        )}
        <button
          type="button"
          onClick={onAddGroup}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-bg-main px-4 py-3 text-sm font-bold text-text-secondary hover:border-accent hover:bg-bg-hover hover:text-text-primary"
        >
          <Plus size={16} /> 세력 추가
        </button>
      </div>
    </section>
  )
}, (previous, next) => (
  previous.groups === next.groups
  && previous.inheritedSceneCaptionPosition === next.inheritedSceneCaptionPosition
  && previous.series === next.series
  && previous.episodeName === next.episodeName
  && previous.editLang === next.editLang
  && previous.sfxList === next.sfxList
  && previous.celebExisting === next.celebExisting
  && previous.celebLoaded === next.celebLoaded
))

export function FactionInfoPanel({
  script,
  series,
  episodeName,
  editLang,
  sfxList,
  showPeopleImages,
  celebExisting,
  celebLoaded,
  onChange,
  onApplyDialogueAll,
  onClearDialogueOverrides,
  onSetGroup,
  onDeleteGroup,
  onMoveGroup,
  onMovePersonCrossGroup,
  onAddGroup,
}: Props) {
  const groups = script.groups ?? []

  if (showPeopleImages) {
    return <FactionPeoplePanel groups={groups} series={series} episodeName={episodeName} />
  }

  return (
    <div className="space-y-3">
      <FactionDialogueSettings
        script={script}
        onChange={onChange}
        onApplyAll={onApplyDialogueAll}
        onClearOverrides={onClearDialogueOverrides}
      />

      <FactionTimingSettings script={script} onChange={onChange} />

      <FactionGroupList
        groups={groups}
        inheritedSceneCaptionPosition={script.quoteCaptionPos ?? 'bottom'}
        series={series}
        episodeName={episodeName}
        editLang={editLang}
        sfxList={sfxList}
        celebExisting={celebExisting}
        celebLoaded={celebLoaded}
        onChange={onChange}
        onSetGroup={onSetGroup}
        onDeleteGroup={onDeleteGroup}
        onMoveGroup={onMoveGroup}
        onMovePersonCrossGroup={onMovePersonCrossGroup}
        onAddGroup={onAddGroup}
      />

      <FactionNarratorPanel script={script} update={onChange} series={series} episodeName={episodeName} />
    </div>
  )
}
