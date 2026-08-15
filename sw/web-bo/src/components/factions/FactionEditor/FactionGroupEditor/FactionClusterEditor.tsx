'use client'

import type { EditLang } from '@feelandnote/shared/bo/editor'
import { ChevronDown, ChevronUp, Eye, EyeOff, Trash2 } from '@feelandnote/shared/bo/icons'
import type { FactionCluster } from '@/lib/faction-types'
import { CoverPickerButton } from './CoverPickerButton/CoverPickerButton'
import { PersonList } from './PersonList/PersonList'
import { FactionSequenceCard, sequenceCardIconButtonClass } from './FactionSequenceCard'

type Props = {
  cluster: FactionCluster
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
  onMove: (direction: -1 | 1) => void
  onDelete: () => void
  onAddCeleb: () => void
  series: string
  episodeName: string
  editLang: EditLang
  onMoveCrossGroup?: (personIndex: number) => void
  celebExisting: Set<string>
  celebLoaded: boolean
}

export function FactionClusterEditor({
  cluster,
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
  onMove,
  onDelete,
  onAddCeleb,
  series,
  episodeName,
  editLang,
  onMoveCrossGroup,
  celebExisting,
  celebLoaded,
}: Props) {
  const people = cluster.people ?? []
  const localizedLabel = editLang === 'en' ? cluster.labelEn ?? cluster.label : cluster.label
  const title = localizedLabel?.split('\n')[0]?.trim()
    || people[0]?.name?.trim()
    || (split ? `대표 사진 ${clusterIndex + 1}` : '대표 사진')

  const personList = (
    <PersonList
      people={people}
      onPeopleChange={next => onChange({ ...cluster, people: next })}
      onAddCeleb={onAddCeleb}
      series={series}
      episodeName={episodeName}
      groupIndex={groupIndex}
      clusterIndex={clusterIndex}
      inheritedImage={solo ? undefined : cluster.image}
      inheritedImageCrop={solo ? undefined : cluster.imageCrop}
      editLang={editLang}
      onMoveCrossGroup={onMoveCrossGroup}
      celebExisting={celebExisting}
      celebLoaded={celebLoaded}
    />
  )

  return (
    <FactionSequenceCard
      id={`cluster-header-${groupIndex}-${clusterIndex}`}
      numberLabel={numberLabel}
      type="cluster"
      title={title}
      meta={`인물 ${people.length}${cluster.longformOnly ? ' · 롱폼 전용' : ''}${cluster.disabled ? ' · 영상 제외' : ''}`}
      expanded={expanded}
      dimmed={split && !!cluster.disabled}
      actions={(
        <>
          <button type="button" disabled={sequenceIndex === 0} onClick={() => onMove(-1)} className={sequenceCardIconButtonClass} title="이야기 순서에서 위로" aria-label={`${numberLabel} 위로 이동`}><ChevronUp size={15} /></button>
          <button type="button" disabled={sequenceIndex === sequenceLength - 1} onClick={() => onMove(1)} className={sequenceCardIconButtonClass} title="이야기 순서에서 아래로" aria-label={`${numberLabel} 아래로 이동`}><ChevronDown size={15} /></button>
          {split ? (
            <button type="button" aria-pressed={!!cluster.disabled} onClick={() => onChange({ ...cluster, disabled: cluster.disabled ? undefined : true })} className={`${sequenceCardIconButtonClass} ${cluster.disabled ? 'border-accent bg-accent/10 text-accent' : ''}`} title={cluster.disabled ? '이 그룹을 다시 영상에 포함' : '이 그룹을 영상에서 제외'}>{cluster.disabled ? <Eye size={15} /> : <EyeOff size={15} />}</button>
          ) : null}
          {split ? <span className="mx-0.5 h-5 w-px bg-border" aria-hidden="true" /> : null}
          {split ? <button type="button" onClick={onDelete} className="flex h-8 w-8 items-center justify-center rounded-md border border-danger/40 text-danger-text hover:border-danger/70 hover:bg-danger/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger" title="그룹 삭제" aria-label={`${numberLabel} 그룹 삭제`}><Trash2 size={15} /></button> : null}
          <button type="button" onClick={() => onExpandedChange(!expanded)} aria-expanded={expanded} aria-controls={`cluster-body-${groupIndex}-${clusterIndex}`} className={sequenceCardIconButtonClass} title={expanded ? '접기' : '펼치기'}><ChevronDown size={16} className={`transition-transform duration-200 ${expanded ? '' : '-rotate-90'}`} /></button>
        </>
      )}
      contentClassName="p-3"
    >
      <div id={`cluster-body-${groupIndex}-${clusterIndex}`} className="space-y-3">
        {solo ? personList : (
          <>
            <div className="grid items-stretch gap-3 lg:grid-cols-[12rem_minmax(0,1fr)]">
              <CoverPickerButton
                value={cluster.image}
                onChange={image => onChange({ ...cluster, image })}
                crop={cluster.imageCrop}
                onCropChange={imageCrop => onChange({ ...cluster, imageCrop })}
                label={title}
                emptyText="대표 사진"
                series={series}
                episodeName={episodeName}
                className="h-40 w-full shrink-0 lg:h-full lg:min-h-32"
              />

              <div className="min-w-0 space-y-2">
                {editLang !== 'en' ? (
                  <label className="block space-y-1">
                    <span className="text-[11px] font-bold text-text-tertiary">그룹명과 설명</span>
                    <textarea
                      rows={3}
                      placeholder={split
                        ? '첫 줄=그룹명, 둘째 줄부터=설명'
                        : '비우면 세력 명칭의 설명을 사용합니다'}
                      value={cluster.label ?? ''}
                      onChange={event => onChange({ ...cluster, label: event.target.value || undefined })}
                      className="w-full resize-y rounded-md border border-border bg-bg-main px-2.5 py-2 text-sm font-semibold leading-snug focus:border-accent focus:outline-none"
                    />
                  </label>
                ) : null}
                {editLang !== 'ko' ? (
                  <label className="block space-y-1">
                    <span className="text-[11px] font-bold text-text-tertiary">영문 그룹명과 설명</span>
                    <textarea
                      rows={3}
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
            <div className="border-t border-border/60 pt-3">{personList}</div>
          </>
        )}
      </div>
    </FactionSequenceCard>
  )
}
