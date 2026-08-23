'use client'

import { useState } from 'react'
import type { EditLang } from '@feelandnote/shared/bo/editor'
import { Plus } from '@feelandnote/shared/bo/icons'
import {
  factionSequenceOf,
  type FactionCluster,
  type FactionGroup,
  type FactionPerson,
  type FactionSequenceItem,
} from '@/lib/faction-types'
import { FactionCelebSearchModal, type CelebResult } from './FactionCelebSearchModal'
import { FactionClusterEditor } from './FactionClusterEditor'
import { FactionGroupHeader } from './FactionGroupHeader'
import { FactionGroupSettings } from './FactionGroupSettings'
import { FactionNarrativeEntryEditor } from './FactionNarrativeEntryEditor'
import { FactionSequenceEditor } from './FactionSequenceEditor'

type Props = {
  groupIndex: number
  group: FactionGroup
  onChange: (next: FactionGroup) => void
  onDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  series: string
  episodeName: string
  musicList: string[]
  editLang: EditLang
  onMoveCrossGroup?: (clusterIndex: number, personIndex: number) => void
  celebExisting: Set<string>
  celebLoaded: boolean
  captionIdHoldSec?: number
}

function celebToPerson(celeb: CelebResult): FactionPerson {
  return {
    name: celeb.nickname,
    role: celeb.title || celeb.profession || '',
    org: '',
    image: celeb.avatar_url || undefined,
    slug: celeb.slug,
    celebId: celeb.id,
    ...(celeb.voice_id_ko ? { quoteElevenlabsVoiceId: celeb.voice_id_ko } : {}),
  }
}

function cleanSequenceCuts(sequence: FactionSequenceItem[]): FactionSequenceItem[] {
  const out: FactionSequenceItem[] = []
  for (const item of sequence) {
    if (item.kind === 'cut' && (out.length === 0 || out[out.length - 1]?.kind === 'cut')) continue
    out.push(item)
  }
  if (out[out.length - 1]?.kind === 'cut') out.pop()
  return out
}

function hasValidCutPositions(sequence: FactionSequenceItem[]): boolean {
  return sequence.every((item, index) => item.kind !== 'cut'
    || (index > 0 && index < sequence.length - 1 && sequence[index - 1]?.kind !== 'cut' && sequence[index + 1]?.kind !== 'cut'))
}

type EntryItem = Extract<FactionSequenceItem, { kind: 'entry' }>

export function FactionGroupEditor({
  groupIndex, group, onChange, onDelete, onMoveUp, onMoveDown, series, episodeName, editLang,
  onMoveCrossGroup, celebExisting, celebLoaded, captionIdHoldSec,
}: Props) {
  const [expanded, setExpanded] = useState(false)
  const [expandedClusters, setExpandedClusters] = useState<Record<number, boolean>>({})
  const [singleExpanded, setSingleExpanded] = useState(true)
  const [celebTarget, setCelebTarget] = useState<number | undefined>(undefined)
  const disabled = !!group.disabled
  const clusters = group.clusters ?? []
  const sequence = factionSequenceOf(group)
  const split = clusters.length > 1
  const firstCluster: FactionCluster = clusters[0] ?? { people: [] }

  const jumpTo = (elementId: string, clusterIndex?: number) => {
    setExpanded(true)
    if (clusterIndex != null) {
      if (split) setExpandedClusters(current => ({ ...current, [clusterIndex]: true }))
      else setSingleExpanded(true)
    }
    requestAnimationFrame(() => requestAnimationFrame(() => {
      document.getElementById(elementId)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }))
  }

  const setSequence = (next: FactionSequenceItem[]) => onChange({
    ...group,
    sequence: next,
  })
  const updateEntry = (item: EntryItem, nextEntry: FactionPerson) => {
    const nextClusters = clusters.map((cluster, clusterIndex) => clusterIndex !== item.clusterIndex ? cluster : {
      ...cluster,
      people: (cluster.people ?? []).map((entry, entryIndex) => entryIndex === item.entryIndex ? nextEntry : entry),
    })
    onChange({ ...group, clusters: nextClusters, sequence })
  }
  const moveSequenceItem = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (index < 0 || target < 0 || target >= sequence.length) return
    const next = [...sequence]
    ;[next[index], next[target]] = [next[target], next[index]]
    if (!hasValidCutPositions(next)) return
    setSequence(next)
  }
  const moveEntry = (entry: EntryItem, direction: -1 | 1) => {
    const index = sequence.findIndex(item => item.kind === 'entry'
      && item.clusterIndex === entry.clusterIndex && item.entryIndex === entry.entryIndex)
    moveSequenceItem(index, direction)
  }
  const deleteEntry = (item: EntryItem) => {
    const entry = clusters[item.clusterIndex]?.people[item.entryIndex]
    if (!entry || entry.isPerson !== false) return
    if (!confirm(`「${entry.name || '서사 항목'}」을 삭제할까요? 문장과 이미지 연결도 함께 사라집니다.`)) return
    const nextClusters = clusters.map((cluster, clusterIndex) => clusterIndex !== item.clusterIndex ? cluster : {
      ...cluster,
      people: (cluster.people ?? []).filter((_, entryIndex) => entryIndex !== item.entryIndex),
    })
    const nextSequence = sequence.flatMap(candidate => {
      if (candidate.kind !== 'entry' || candidate.clusterIndex !== item.clusterIndex) return [candidate]
      if (candidate.entryIndex === item.entryIndex) return []
      return [{ ...candidate, entryIndex: candidate.entryIndex > item.entryIndex ? candidate.entryIndex - 1 : candidate.entryIndex }]
    })
    onChange({ ...group, clusters: nextClusters, sequence: cleanSequenceCuts(nextSequence) })
  }

  const setClusters = (next: FactionCluster[]) => onChange({ ...group, clusters: next, sequence })
  const setCluster = (index: number, next: FactionCluster) => {
    const previous = clusters[index]
    const reboundSequence = sequence.map(item => {
      if (item.kind !== 'entry' || item.clusterIndex !== index) return item
      const previousEntry = previous?.people?.[item.entryIndex]
      const nextIndex = previousEntry ? (next.people ?? []).indexOf(previousEntry) : -1
      return nextIndex >= 0 ? { ...item, entryIndex: nextIndex } : item
    })
    const updated = clusters.length
      ? clusters.map((cluster, clusterIndex) => clusterIndex === index ? next : cluster)
      : [next]
    onChange({ ...group, clusters: updated, sequence: reboundSequence })
  }
  const addCluster = () => onChange({
    ...group,
    clusters: [...clusters, { label: '', people: [] }],
    sequence: [...sequence, { kind: 'cluster', clusterIndex: clusters.length }],
  })
  const deleteCluster = (index: number) => {
    if (clusters.length <= 1) return
    if (!confirm('이 그룹을 삭제하시겠습니까? (그룹 내 인물도 함께 삭제됩니다)')) return
    const nextSequence = cleanSequenceCuts(sequence.reduce<FactionSequenceItem[]>((items, item) => {
      if (item.kind === 'cut') items.push(item)
      else if (item.clusterIndex !== index) items.push({
        ...item,
        clusterIndex: item.clusterIndex > index ? item.clusterIndex - 1 : item.clusterIndex,
      })
      return items
    }, []))
    onChange({
      ...group,
      clusters: clusters.filter((_, clusterIndex) => clusterIndex !== index),
      sequence: nextSequence,
    })
  }
  const mergeClusters = () => {
    const allEntries = clusters.flatMap(cluster => cluster.people ?? [])
    const people = allEntries.filter(entry => entry.isPerson !== false)
    const narratives = allEntries.filter(entry => entry.isPerson === false)
    const mergedEntries = [...people, ...narratives]
    let keptCluster = false
    const nextSequence = cleanSequenceCuts(sequence.reduce<FactionSequenceItem[]>((items, item) => {
      if (item.kind === 'cut') items.push(item)
      else if (item.kind === 'entry') {
        const entry = clusters[item.clusterIndex]?.people?.[item.entryIndex]
        const entryIndex = entry ? mergedEntries.indexOf(entry) : -1
        if (entryIndex >= 0) items.push({ kind: 'entry', clusterIndex: 0, entryIndex })
      }
      else if (!keptCluster) {
        keptCluster = true
        items.push({ kind: 'cluster', clusterIndex: 0 })
      }
      return items
    }, []))
    onChange({ ...group, clusters: [{ ...firstCluster, people: mergedEntries }], sequence: nextSequence })
  }
  const addCeleb = (celeb: CelebResult) => {
    if (celebTarget === undefined) return
    const target = clusters[celebTarget]
    if (target) {
      const people = (target.people ?? []).filter(entry => entry.isPerson !== false)
      const narratives = (target.people ?? []).filter(entry => entry.isPerson === false)
      setCluster(celebTarget, { ...target, people: [...people, celebToPerson(celeb), ...narratives] })
    }
  }

  return (
    <div className={`rounded-lg border ${disabled ? 'border-dashed border-border/60 bg-bg-secondary/50' : 'border-border bg-bg-secondary'}`}>
      <FactionGroupHeader
        group={group}
        groupIndex={groupIndex}
        series={series}
        episodeName={episodeName}
        editLang={editLang}
        expanded={expanded}
        onExpandedChange={setExpanded}
        onChange={onChange}
        onDelete={onDelete}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
        onJumpCluster={clusterIndex => jumpTo(`cluster-header-${groupIndex}-${clusterIndex}`, clusterIndex)}
        onJumpNarrativeEntry={entryKey => jumpTo(`entry-${groupIndex}-${entryKey}`)}
      />

      {expanded ? (
        <div id={`faction-group-body-${groupIndex}`} className={`space-y-4 border-t border-border p-4 ${disabled ? 'opacity-40 saturate-50' : ''}`}>
          <FactionGroupSettings
            group={group}
            groupIndex={groupIndex}
            split={split}
            onChange={onChange}
            onToggleSplit={split ? mergeClusters : addCluster}
          />

          <FactionSequenceEditor
            sequence={sequence}
            renderCluster={(clusterIndex, sequenceIndex) => {
              const cluster = clusters[clusterIndex]
              if (!cluster) return null
              const clusterExpanded = split
                ? expandedClusters[clusterIndex] ?? true
                : singleExpanded
              return (
                <FactionClusterEditor
                  cluster={cluster}
                  clusterIndex={clusterIndex}
                  groupIndex={groupIndex}
                  sequenceIndex={sequenceIndex}
                  sequenceLength={sequence.length}
                  numberLabel={`${groupIndex + 1}-${sequenceIndex + 1}`}
                  split={split}
                  solo={!split && !!group.solo}
                  expanded={clusterExpanded}
                  onExpandedChange={next => {
                    if (split) setExpandedClusters(current => ({ ...current, [clusterIndex]: next }))
                    else setSingleExpanded(next)
                  }}
                  onChange={next => setCluster(clusterIndex, next)}
                  onMove={direction => moveSequenceItem(sequenceIndex, direction)}
                  onDelete={() => deleteCluster(clusterIndex)}
                  onAddCeleb={() => setCelebTarget(clusterIndex)}
                  series={series}
                  episodeName={episodeName}
                  editLang={editLang}
                  onMoveCrossGroup={onMoveCrossGroup ? personIndex => onMoveCrossGroup(clusterIndex, personIndex) : undefined}
                  celebExisting={celebExisting}
                  celebLoaded={celebLoaded}
                />
              )
            }}
            renderEntry={(item, sequenceIndex) => {
              const entry = clusters[item.clusterIndex]?.people[item.entryIndex]
              if (!entry || entry.isPerson !== false) return null
              return <FactionNarrativeEntryEditor
                item={item}
                scene={entry}
                sequenceIndex={sequenceIndex}
                sequenceLength={sequence.length}
                numberLabel={`${groupIndex + 1}-${sequenceIndex + 1}`}
                onChange={updateEntry}
                onMove={moveEntry}
                onDelete={deleteEntry}
                series={series}
                episodeName={episodeName}
                editLang={editLang}
                idPrefix={`entry-${groupIndex}`}
                captionIdHoldSec={captionIdHoldSec}
              />
            }}
            renderCut={sequenceIndex => (
              <div className="flex items-center gap-2 rounded border border-dashed border-sky-500/60 bg-sky-500/10 px-3 py-2" aria-label="쇼츠 편 경계">
                <span className="h-px flex-1 bg-sky-500/50" />
                <span className="shrink-0 text-[10px] font-black text-sky-500">쇼츠 편 경계 · 롱폼은 이어짐</span>
                <span className="h-px flex-1 bg-sky-500/50" />
                <div className="flex shrink-0 gap-1">
                  <button type="button" onClick={() => moveSequenceItem(sequenceIndex, -1)} className="rounded border border-border px-1.5 py-1 text-[10px] text-text-secondary hover:bg-bg-hover" title="앞으로 이동">▲</button>
                  <button type="button" onClick={() => moveSequenceItem(sequenceIndex, 1)} className="rounded border border-border px-1.5 py-1 text-[10px] text-text-secondary hover:bg-bg-hover" title="뒤로 이동">▼</button>
                  <button type="button" onClick={() => setSequence(sequence.filter((_, index) => index !== sequenceIndex))} className="rounded border border-border px-1.5 py-1 text-[10px] text-danger-text hover:bg-danger/15" title="편 경계 삭제">✕</button>
                </div>
              </div>
            )}
            footer={split ? (
              <button type="button" onClick={addCluster} className="flex items-center gap-1.5 self-start rounded-md border border-dashed border-border bg-bg-card px-3 py-1.5 text-sm font-semibold text-text-secondary hover:border-accent hover:bg-bg-hover">
                <Plus size={15} /> 그룹 추가
              </button>
            ) : undefined}
          />
        </div>
      ) : null}

      <FactionCelebSearchModal open={celebTarget !== undefined} onClose={() => setCelebTarget(undefined)} onSelect={addCeleb} />
    </div>
  )
}
