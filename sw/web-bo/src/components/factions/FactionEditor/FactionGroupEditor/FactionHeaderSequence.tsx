'use client'

import { Fragment } from 'react'
import { ChevronLeft, ChevronRight, Film, Plus, Trash2 } from '@feelandnote/shared/bo/icons'
import { cropToStyle, MediaThumb } from '@feelandnote/shared/bo/media'
import { factionEntryAt, factionSequenceOf, type FactionCluster, type FactionGroup, type FactionPerson, type FactionSequenceItem } from '@/lib/faction-types'
import { imageSrc } from '../../shared/timing'

type Props = {
  group: FactionGroup
  groupIndex: number
  series: string
  episodeName: string
  borderColor: string
  onChange: (next: FactionGroup) => void
  onJumpCluster: (ci: number) => void
  onJumpNarrativeEntry: (entryId: string) => void
}

function newNarrativeEntry(): FactionPerson {
  return { isPerson: false, name: '새 서사 항목' }
}

/** 그룹 화보가 없는 개인 컷 구성에서는 첫 유효 개인 화보를 헤더 대표로 쓴다. */
function clusterHeaderMedia(cluster: FactionCluster) {
  if (cluster.image?.trim()) {
    return { image: cluster.image, crop: cluster.imageCrop }
  }
  const people = (cluster.people ?? []).filter(candidate => candidate.isPerson !== false)
  const person = people.find(candidate => !candidate.disabled && candidate.image?.trim())
    ?? people.find(candidate => candidate.image?.trim())
  return { image: person?.image, crop: person?.imageCrop }
}

export function FactionHeaderSequence({
  group, groupIndex, series, episodeName, borderColor, onChange, onJumpCluster, onJumpNarrativeEntry,
}: Props) {
  const sequence = factionSequenceOf(group)
  const setSequence = (next: FactionSequenceItem[]) => onChange({
    ...group,
    sequence: next,
  })
  const insertScene = (index: number) => {
    if (!group.clusters?.length) return
    const previousCluster = [...sequence.slice(0, index)].reverse().find(item => item.kind === 'cluster')
    const clusterIndex = previousCluster?.kind === 'cluster' ? previousCluster.clusterIndex : 0
    const cluster = group.clusters[clusterIndex]
    const entryIndex = cluster.people?.length ?? 0
    const clusters = group.clusters.map((candidate, ci) => ci === clusterIndex
      ? { ...candidate, people: [...(candidate.people ?? []), newNarrativeEntry()] }
      : candidate)
    const next = [...sequence]
    next.splice(index, 0, { kind: 'entry', clusterIndex, entryIndex })
    onChange({ ...group, clusters, sequence: next })
  }
  const insertCut = (index: number) => {
    if (index <= 0 || index >= sequence.length) return
    if (sequence[index - 1]?.kind === 'cut' || sequence[index]?.kind === 'cut') return
    const next = [...sequence]
    next.splice(index, 0, { kind: 'cut' })
    setSequence(next)
  }
  const validCutPositions = (items: FactionSequenceItem[]) => items.every((item, index) => item.kind !== 'cut'
    || (index > 0 && index < items.length - 1 && items[index - 1]?.kind !== 'cut' && items[index + 1]?.kind !== 'cut'))
  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= sequence.length) return
    const next = [...sequence]
    ;[next[index], next[target]] = [next[target], next[index]]
    if (!validCutPositions(next)) return
    setSequence(next)
  }
  const removeScene = (index: number) => {
    const item = sequence[index]
    if (item?.kind !== 'entry') return
    const entry = factionEntryAt(group, item)
    if (!confirm(`「${entry.name || '서사 항목'}」을 삭제할까요? 문장과 이미지 연결도 함께 사라집니다.`)) return
    const clusters = group.clusters!.map((cluster, ci) => ci === item.clusterIndex
      ? { ...cluster, people: (cluster.people ?? []).filter((_, ei) => ei !== item.entryIndex) }
      : cluster)
    const next = sequence.flatMap((candidate, itemIndex) => {
      if (itemIndex === index) return []
      if (candidate.kind !== 'entry' || candidate.clusterIndex !== item.clusterIndex) return [candidate]
      return [{ ...candidate, entryIndex: candidate.entryIndex > item.entryIndex ? candidate.entryIndex - 1 : candidate.entryIndex }]
    })
    onChange({ ...group, clusters, sequence: next })
  }
  const removeCut = (index: number) => {
    if (sequence[index]?.kind !== 'cut') return
    setSequence(sequence.filter((_, itemIndex) => itemIndex !== index))
  }

  return (
    <div className="flex h-full shrink-0 items-stretch gap-1.5 pl-2" aria-label="세력 이야기 순서">
      {sequence.map((item, sequenceIndex) => {
        const canInsertCut = sequenceIndex > 0
          && sequence[sequenceIndex - 1]?.kind !== 'cut'
          && item.kind !== 'cut'
        const insertBefore = (
          <div className="flex w-7 shrink-0 flex-col gap-1">
            <button
              type="button"
              onClick={event => { event.stopPropagation(); insertScene(sequenceIndex) }}
              className="flex h-7 items-center justify-center rounded border border-dashed border-teal-300/70 bg-black/15 text-teal-100 hover:border-teal-100 hover:bg-teal-500/25"
              title={`${sequenceIndex + 1}번째 항목 앞에 서사 항목 추가`}
              aria-label={`${sequenceIndex + 1}번째 항목 앞에 서사 항목 추가`}
            >
              <Plus size={14} />
            </button>
            {canInsertCut ? (
              <button
                type="button"
                onClick={event => { event.stopPropagation(); insertCut(sequenceIndex) }}
                className="flex h-7 items-center justify-center rounded border border-dashed border-sky-300/70 bg-black/15 text-[12px] text-sky-100 hover:border-sky-100 hover:bg-sky-500/25"
                title="이 위치에서 다음 쇼츠 편 시작 · 롱폼은 계속 이어짐"
                aria-label="쇼츠 편 경계 추가"
              >
                ✂
              </button>
            ) : null}
          </div>
        )
        const controls = (
          <div className="absolute bottom-1 right-1 z-20 flex items-center gap-0.5 rounded bg-bg-main/95 p-0.5 shadow-sm">
            <button
              type="button"
              disabled={sequenceIndex === 0}
              onClick={event => { event.stopPropagation(); move(sequenceIndex, -1) }}
              className="flex h-5 w-5 items-center justify-center rounded text-text-secondary hover:bg-bg-hover hover:text-text-primary disabled:opacity-30"
              title="이야기 순서에서 왼쪽으로"
              aria-label="왼쪽으로 이동"
            >
              <ChevronLeft size={12} />
            </button>
            <button
              type="button"
              disabled={sequenceIndex === sequence.length - 1}
              onClick={event => { event.stopPropagation(); move(sequenceIndex, 1) }}
              className="flex h-5 w-5 items-center justify-center rounded text-text-secondary hover:bg-bg-hover hover:text-text-primary disabled:opacity-30"
              title="이야기 순서에서 오른쪽으로"
              aria-label="오른쪽으로 이동"
            >
              <ChevronRight size={12} />
            </button>
            {item.kind === 'entry' || item.kind === 'cut' ? (
              <button
                type="button"
                onClick={event => {
                  event.stopPropagation()
                  if (item.kind === 'entry') removeScene(sequenceIndex)
                  else removeCut(sequenceIndex)
                }}
                className="flex h-5 w-5 items-center justify-center rounded text-danger-text hover:bg-danger/15"
                title={item.kind === 'entry' ? '서사 항목 삭제' : '쇼츠 편 경계 삭제'}
                aria-label={item.kind === 'entry' ? '서사 항목 삭제' : '쇼츠 편 경계 삭제'}
              >
                <Trash2 size={11} />
              </button>
            ) : null}
          </div>
        )

        if (item.kind === 'cluster') {
          const cluster = group.clusters?.[item.clusterIndex]
          if (!cluster) return null
          const media = clusterHeaderMedia(cluster)
          const src = imageSrc(series, episodeName, media.image)
          const label = cluster.label?.split('\n')[0]?.trim()
            || cluster.people?.find(entry => entry.isPerson !== false)?.name?.trim()
            || `대표 사진 ${item.clusterIndex + 1}`
          return (
            <Fragment key={`cluster-${item.clusterIndex}`}>
            {insertBefore}
            <div className="relative w-28 shrink-0 overflow-hidden rounded border bg-bg-main/90" style={{ borderColor }}>
              <button
                type="button"
                onClick={event => { event.stopPropagation(); onJumpCluster(item.clusterIndex) }}
                className="block h-full w-full text-left hover:bg-bg-hover hover:brightness-110"
                title={`${label} 편집 위치로 이동`}
              >
                {src ? <MediaThumb src={src} alt="" showExt className="h-[4.5rem] w-full" mediaStyle={cropToStyle(media.crop)} /> : (
                  <span className="flex h-[4.5rem] items-center justify-center bg-bg-card text-[10px] font-semibold text-text-tertiary">화보 없음</span>
                )}
                <span className="block truncate px-2 pb-7 pt-1 text-[10px] font-bold text-text-primary">{label}</span>
                <span className="absolute left-1 top-1 rounded border border-amber-200 bg-amber-400 px-1.5 py-0.5 font-mono text-[9px] font-black tabular-nums text-amber-950 shadow-sm">{groupIndex + 1}-{sequenceIndex + 1}</span>
              </button>
              {controls}
            </div>
            </Fragment>
          )
        }

        if (item.kind === 'cut') {
          return (
            <Fragment key={`cut-${sequenceIndex}`}>
              {insertBefore}
              <div className="relative flex w-24 shrink-0 flex-col items-center justify-center rounded border border-dashed border-sky-300/80 bg-sky-950/45 px-2 text-center text-sky-100">
                <span className="text-lg leading-none">✂</span>
                <span className="mt-1 text-[9px] font-black leading-tight">쇼츠 편 경계</span>
                <span className="text-[8px] text-sky-200/75">롱폼 연속</span>
                <span className="absolute left-1 top-1 rounded border border-sky-200 bg-sky-400 px-1.5 py-0.5 font-mono text-[9px] font-black tabular-nums text-sky-950 shadow-sm">{groupIndex + 1}-{sequenceIndex + 1}</span>
                {controls}
              </div>
            </Fragment>
          )
        }

        const entry = factionEntryAt(group, item)
        const src = imageSrc(series, episodeName, entry.image)
        return (
          <Fragment key={`entry-${item.clusterIndex}-${item.entryIndex}`}>
          {insertBefore}
          <div className="relative w-28 shrink-0 overflow-hidden rounded border border-teal-400/70 bg-bg-main/90">
            <button
              type="button"
              onClick={event => { event.stopPropagation(); onJumpNarrativeEntry(`${item.clusterIndex}-${item.entryIndex}`) }}
              className="block h-full w-full text-left hover:bg-teal-500/15"
              title={`${entry.name || '제목 없음'} 편집 위치로 이동`}
            >
              {src ? <MediaThumb src={src} alt={entry.name} showExt className="h-[4.5rem] w-full" /> : (
                <span className="flex h-[4.5rem] flex-col items-center justify-center gap-1 bg-teal-950/35 text-teal-300">
                  <Film size={18} />
                  <span className="text-[9px] font-semibold">텍스트 배경</span>
                </span>
              )}
              <span className="block line-clamp-2 px-2 pb-7 pt-1 text-[10px] font-bold leading-tight text-text-primary">{entry.name || '제목 없음'}</span>
              <span className="absolute left-1 top-1 rounded border border-cyan-200 bg-cyan-400 px-1.5 py-0.5 font-mono text-[9px] font-black tabular-nums text-cyan-950 shadow-sm">{groupIndex + 1}-{sequenceIndex + 1}</span>
            </button>
            {controls}
          </div>
          </Fragment>
        )
      })}

      <button
        type="button"
        onClick={event => { event.stopPropagation(); insertScene(sequence.length) }}
        className="flex w-7 shrink-0 items-center justify-center rounded border border-dashed border-teal-300/70 bg-black/15 text-teal-100 hover:border-teal-100 hover:bg-teal-500/25"
        title="맨 뒤에 서사 항목 추가"
        aria-label="맨 뒤에 서사 항목 추가"
      >
        <Plus size={14} />
      </button>
    </div>
  )
}
