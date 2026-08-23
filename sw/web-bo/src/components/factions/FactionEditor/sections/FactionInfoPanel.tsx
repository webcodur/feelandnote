'use client'

import dynamic from 'next/dynamic'
import type { EditLang } from '@feelandnote/shared/bo/editor'
import { Plus } from '@feelandnote/shared/bo/icons'
import type { FactionGroup, FactionScript } from '@/lib/faction-types'
import { FactionGroupEditor } from '../FactionGroupEditor'
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
  musicList: string[]
  editLang: EditLang
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

export function FactionInfoPanel({
  script,
  series,
  episodeName,
  musicList,
  editLang,
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

      <section className="space-y-4 rounded-xl border border-border bg-bg-card/40 p-4 sm:p-5">
        <header className="flex h-9 items-center justify-between gap-3 border-b border-border/60 px-1 pb-3">
          <span className="text-xs text-text-tertiary">세력 · 묶음 · 인물 · 서사 항목</span>
          <span className="rounded border border-border bg-bg-card px-2.5 py-1 text-xs font-bold text-text-secondary">{groups.length}개 세력</span>
        </header>

        <div className="space-y-4">
          {groups.map((group, groupIndex) => (
            <div key={groupIndex} id={`faction-group-${groupIndex}`} className="scroll-mt-24">
              <FactionGroupEditor
                groupIndex={groupIndex}
                group={group}
                onChange={next => onSetGroup(groupIndex, next)}
                onDelete={() => onDeleteGroup(groupIndex)}
                onMoveUp={() => onMoveGroup(groupIndex, -1)}
                onMoveDown={() => onMoveGroup(groupIndex, 1)}
                series={series}
                episodeName={episodeName}
                musicList={musicList}
                editLang={editLang}
                onMoveCrossGroup={(clusterIndex, personIndex) => onMovePersonCrossGroup(groupIndex, clusterIndex, personIndex)}
                celebExisting={celebExisting}
                celebLoaded={celebLoaded}
                captionIdHoldSec={script.captionIdHoldSec}
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

      <FactionTimingSettings script={script} onChange={onChange} />
      <FactionNarratorPanel script={script} update={onChange} series={series} episodeName={episodeName} />
    </div>
  )
}
