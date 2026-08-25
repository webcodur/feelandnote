'use client'

import type { EditLang } from '@feelandnote/shared/bo/editor'
import { ChevronDown, ChevronUp, Eye, EyeOff, Plus, Trash2 } from '@feelandnote/shared/bo/icons'
import { projectFactionSceneBeatsToPeople } from '@feelandnote/shared/lib/faction-scene-unification'
import type { FactionCluster, FactionPerson, FactionSceneBeat } from '@/lib/faction-types'
import { CoverPickerButton } from './CoverPickerButton/CoverPickerButton'
import { FactionClusterDialogueList } from './FactionClusterDialogueList'
import { FactionSequenceCard, sequenceCardIconButtonClass } from './FactionSequenceCard'
import { insertFactionCut } from './faction-scene-cut'

type Props = {
  cluster: FactionCluster
  inheritedLabelPosition: 'bottom' | 'center'
  clusterIndex: number
  groupIndex: number
  sequenceIndex: number
  sequenceLength: number
  numberLabel: string
  split: boolean
  solo: boolean
  expanded: boolean
  onExpandedChange: (expanded: boolean) => void
  onChange: (next: FactionCluster) => void
  onInsertBefore: () => void
  onSplitBeat: (beatIndex: number) => void
  onMove: (direction: -1 | 1) => void
  onDelete: () => void
  onAddCeleb: () => void
  series: string
  episodeName: string
  editLang: EditLang
  sfxList?: string[]
  speakerPeople: FactionPerson[]
  speakerVoiceFiles?: Record<string, { quote: string; epithet: string }>
  onSpeakerPersonChange?: (celebId: string, nextPerson: FactionPerson) => void
  onSetPrimaryQuote: (beatIndex: number, celebId: string) => void
  onMoveCrossGroup?: (personIndex: number) => void
  celebExisting: Set<string>
  celebLoaded: boolean
}

export function FactionClusterEditor({
  cluster,
  inheritedLabelPosition,
  clusterIndex,
  groupIndex,
  sequenceIndex,
  sequenceLength,
  numberLabel,
  split,
  solo,
  expanded,
  onExpandedChange,
  onChange,
  onInsertBefore,
  onSplitBeat,
  onMove,
  onDelete,
  onAddCeleb,
  series,
  episodeName,
  editLang,
  sfxList = [],
  speakerPeople,
  speakerVoiceFiles,
  onSpeakerPersonChange,
  onSetPrimaryQuote,
  onMoveCrossGroup,
  celebExisting,
  celebLoaded,
}: Props) {
  const people = (cluster.people ?? []).filter(entry => entry.isPerson !== false)
  const beats = cluster.beats ?? []
  const setBeats = (next: FactionSceneBeat[]) => onChange({
    ...cluster,
    beats: next,
    people: projectFactionSceneBeatsToPeople(people, next) as FactionPerson[],
  })
  const setPeople = (next: FactionPerson[], nextBeats = beats) => onChange({
    ...cluster,
    beats: nextBeats,
    people: projectFactionSceneBeatsToPeople(next, nextBeats) as FactionPerson[],
  })
  const localizedLabel = editLang === 'en' ? cluster.labelEn ?? cluster.label : cluster.label
  const title = localizedLabel?.split('\n')[0]?.trim()
    || people[0]?.name?.trim()
    || (split ? `대표 사진 ${clusterIndex + 1}` : '대표 사진')

  return (
    <FactionSequenceCard
      id={`cluster-header-${groupIndex}-${clusterIndex}`}
      numberLabel={numberLabel}
      title={title}
      meta={`장면 내 컷 ${beats.length}개 · 출연 인물 ${people.length}명${cluster.longformOnly ? ' · 롱폼 전용' : ''}${cluster.disabled ? ' · 영상 제외' : ''}`}
      expanded={expanded}
      dimmed={split && !!cluster.disabled}
      actions={(
        <>
          <button
            type="button"
            onClick={() => setBeats(insertFactionCut(beats, 0))}
            className="flex h-8 items-center gap-1 rounded-md border border-border bg-bg-main px-2.5 text-[11px] font-bold text-text-secondary hover:border-accent hover:bg-accent/10 hover:text-accent active:bg-accent/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            title="이 장면은 유지하고 첫 대사보다 앞에 화면 컷 추가"
            aria-label={`${numberLabel} 맨 앞에 화면 컷 추가`}
          >
            <Plus size={14} /> 앞에 컷
          </button>
          <button
            type="button"
            onClick={onInsertBefore}
            className="mr-1 flex h-8 items-center gap-1 rounded-md border border-teal-400/60 bg-teal-500/10 px-2.5 text-[11px] font-bold text-teal-200 hover:border-teal-200 hover:bg-teal-500/25 hover:text-teal-50 active:bg-teal-500/35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300"
            title="이 장면 바로 앞에 제목과 화면을 따로 가진 독립 장면 추가"
            aria-label={`${numberLabel} 앞에 독립 장면 추가`}
          >
            <Plus size={14} /> 앞에 장면
          </button>
          <button type="button" disabled={sequenceIndex === 0} onClick={() => onMove(-1)} className={sequenceCardIconButtonClass} title="이야기 순서에서 위로" aria-label={`${numberLabel} 위로 이동`}><ChevronUp size={15} /></button>
          <button type="button" disabled={sequenceIndex === sequenceLength - 1} onClick={() => onMove(1)} className={sequenceCardIconButtonClass} title="이야기 순서에서 아래로" aria-label={`${numberLabel} 아래로 이동`}><ChevronDown size={15} /></button>
          {split ? (
            <button type="button" aria-pressed={!!cluster.disabled} onClick={() => onChange({ ...cluster, disabled: cluster.disabled ? undefined : true })} className={`${sequenceCardIconButtonClass} ${cluster.disabled ? 'border-accent bg-accent/10 text-accent' : ''}`} title={cluster.disabled ? '이 장면을 다시 영상에 포함' : '이 장면을 영상에서 제외'}>{cluster.disabled ? <Eye size={15} /> : <EyeOff size={15} />}</button>
          ) : null}
          {split ? <span className="mx-0.5 h-5 w-px bg-border" aria-hidden="true" /> : null}
          {split ? <button type="button" onClick={onDelete} className="flex h-8 w-8 items-center justify-center rounded-md border border-danger/40 text-danger-text hover:border-danger/70 hover:bg-danger/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger" title="장면 삭제" aria-label={`${numberLabel} 장면 삭제`}><Trash2 size={15} /></button> : null}
          <button type="button" onClick={() => onExpandedChange(!expanded)} aria-expanded={expanded} aria-controls={`cluster-body-${groupIndex}-${clusterIndex}`} className={sequenceCardIconButtonClass} title={expanded ? '접기' : '펼치기'}><ChevronDown size={16} className={`transition-transform duration-200 ${expanded ? '' : '-rotate-90'}`} /></button>
        </>
      )}
      contentClassName="p-3"
    >
      <div id={`cluster-body-${groupIndex}-${clusterIndex}`} className="space-y-3">
        <section className="rounded-lg border border-border/70 bg-bg-main/25" aria-label={`${numberLabel} 장면 설정`}>
          <div className="flex flex-wrap items-center gap-2 border-b border-border/60 px-3 py-2">
            <span className="text-[11px] font-black text-text-secondary">장면 화면</span>
            <span className="text-[10px] text-text-dim">대표 화면과 장면명은 컷보다 먼저 노출됩니다.</span>
            <label className="ml-auto flex items-center gap-2 text-[11px] font-semibold text-text-secondary">
              <span>장면명 위치</span>
              <select
                value={cluster.labelPosition ?? ''}
                onChange={event => onChange({
                  ...cluster,
                  labelPosition: event.target.value === 'bottom'
                    ? 'bottom'
                    : event.target.value === 'center'
                      ? 'center'
                      : undefined,
                })}
                aria-label={`${numberLabel} 장면명 위치`}
                className="rounded-md border border-border bg-bg-main px-2 py-1 text-xs text-text-primary hover:border-accent hover:bg-bg-hover focus:border-accent focus:outline-none"
                title="상속은 위 대사·장면 자막 설정을 따릅니다"
              >
                <option value="">상속 ({inheritedLabelPosition === 'center' ? '중단' : '하단'})</option>
                <option value="center">중단</option>
                <option value="bottom">하단</option>
              </select>
            </label>
          </div>

          {!solo ? (
            <div className="grid items-stretch gap-3 p-3 lg:grid-cols-[11rem_minmax(0,1fr)]">
              <CoverPickerButton
                value={cluster.image}
                onChange={image => onChange({ ...cluster, image })}
                crop={cluster.imageCrop}
                onCropChange={imageCrop => onChange({ ...cluster, imageCrop })}
                label={title}
                emptyText="대표 사진"
                series={series}
                episodeName={episodeName}
                className="h-32 w-full shrink-0 lg:h-full lg:min-h-28"
              />

              <div className="min-w-0 space-y-2">
                {editLang !== 'en' ? (
                  <label className="block space-y-1">
                    <span className="text-[11px] font-bold text-text-tertiary">장면명과 설명</span>
                    <textarea
                      rows={2}
                      placeholder={split
                        ? '첫 줄=장면명, 둘째 줄부터=설명'
                        : '비우면 세력 명칭의 설명을 사용합니다'}
                      value={cluster.label ?? ''}
                      onChange={event => onChange({ ...cluster, label: event.target.value || undefined })}
                      className="w-full resize-y rounded-md border border-border bg-bg-main px-2.5 py-2 text-sm font-semibold leading-snug focus:border-accent focus:outline-none"
                    />
                  </label>
                ) : null}
                {editLang !== 'ko' ? (
                  <label className="block space-y-1">
                    <span className="text-[11px] font-bold text-text-tertiary">영문 장면명과 설명</span>
                    <textarea
                      rows={2}
                      placeholder="First line=name, following lines=description"
                      value={cluster.labelEn ?? ''}
                      onChange={event => onChange({ ...cluster, labelEn: event.target.value || undefined })}
                      className="w-full resize-y rounded-md border border-border bg-bg-main px-2.5 py-2 text-sm leading-snug text-text-secondary focus:border-accent focus:outline-none"
                    />
                  </label>
                ) : null}
                {split ? (
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-text-secondary">
                    <input type="checkbox" checked={!!cluster.longformOnly} onChange={event => onChange({ ...cluster, longformOnly: event.target.checked || undefined })} />
                    롱폼에만 넣기 <span className="font-normal text-text-dim">(쇼츠 제외)</span>
                  </label>
                ) : null}
              </div>
            </div>
          ) : (
            <p className="m-3 rounded-md border border-dashed border-border px-3 py-2 text-xs text-text-secondary">
              이 장면은 별도 단체샷 없이 아래 컷들의 화면 전환만 사용합니다.
            </p>
          )}
        </section>

        <div className="pt-1">
          <FactionClusterDialogueList
            beats={beats}
            onBeatsChange={setBeats}
            onSplitBeat={onSplitBeat}
            people={people}
            onPeopleChange={setPeople}
            onAddCeleb={onAddCeleb}
            series={series}
            episodeName={episodeName}
            groupIndex={groupIndex}
            clusterIndex={clusterIndex}
            editLang={editLang}
            sfxList={sfxList}
            speakerPeople={speakerPeople}
            speakerVoiceFiles={speakerVoiceFiles}
            onSpeakerPersonChange={onSpeakerPersonChange}
            onSetPrimaryQuote={onSetPrimaryQuote}
            onMoveCrossGroup={onMoveCrossGroup}
            celebExisting={celebExisting}
            celebLoaded={celebLoaded}
          />
        </div>
      </div>
    </FactionSequenceCard>
  )
}
