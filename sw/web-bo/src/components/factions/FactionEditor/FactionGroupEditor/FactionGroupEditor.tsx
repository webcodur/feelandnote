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
import { FactionSequenceEditor } from './FactionSequenceEditor'
import { insertFactionSceneBefore, splitFactionSceneAtBeat } from './faction-scene-split'

type Props = {
  groupIndex: number
  group: FactionGroup
  inheritedSceneCaptionPosition: 'bottom' | 'center'
  onChange: (next: FactionGroup) => void
  onDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  series: string
  episodeName: string
  editLang: EditLang
  sfxList: string[]
  onMoveCrossGroup?: (clusterIndex: number, personIndex: number) => void
  celebExisting: Set<string>
  celebLoaded: boolean
  speakerPeople: FactionPerson[]
  speakerVoiceFiles?: Record<string, { quote: string; epithet: string }>
  onSpeakerPersonChange?: (celebId: string, nextPerson: FactionPerson) => void
  onSetPrimaryQuote: (clusterIndex: number, beatIndex: number, celebId: string) => void
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

export function FactionGroupEditor({
  groupIndex, group, inheritedSceneCaptionPosition, onChange, onDelete, onMoveUp, onMoveDown, series, episodeName, editLang,
  sfxList,
  onMoveCrossGroup, celebExisting, celebLoaded,
  speakerPeople,
  speakerVoiceFiles,
  onSpeakerPersonChange,
  onSetPrimaryQuote,
}: Props) {
  const [expanded, setExpanded] = useState(false)
  const [expandedClusters, setExpandedClusters] = useState<Record<number, boolean>>({})
  const [singleExpanded, setSingleExpanded] = useState(true)
  const [celebTarget, setCelebTarget] = useState<number | undefined>(undefined)
  const disabled = !!group.disabled
  const factionColor = group.color ?? '#92400e'
  const sequence = factionSequenceOf(group)
  const clusters = group.clusters ?? []
  const split = clusters.length > 1

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
  const moveSequenceItem = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (index < 0 || target < 0 || target >= sequence.length) return
    const next = [...sequence]
    ;[next[index], next[target]] = [next[target], next[index]]
    if (!hasValidCutPositions(next)) return
    setSequence(next)
  }
  const setCluster = (index: number, next: FactionCluster) => {
    const updated = clusters.length
      ? clusters.map((cluster, clusterIndex) => clusterIndex === index ? next : cluster)
      : [next]
    onChange({ ...group, clusters: updated, sequence })
  }
  const addCluster = () => onChange({
    ...group,
    clusters: [...clusters, { label: '', people: [], beats: [] }],
    sequence: [...sequence, { kind: 'cluster', clusterIndex: clusters.length }],
  })
  const splitClusterAtBeat = (clusterIndex: number, beatIndex: number) => {
    const result = splitFactionSceneAtBeat({ group, groupIndex, clusterIndex, beatIndex })
    if (!result) return
    setExpandedClusters(current => ({
      ...current,
      [clusterIndex]: true,
      [result.newClusterIndex]: true,
    }))
    onChange(result.group)
  }
  const insertClusterBefore = (clusterIndex: number) => {
    const result = insertFactionSceneBefore({ group, clusterIndex })
    if (!result) return
    setExpandedClusters(current => ({
      ...current,
      [clusterIndex]: true,
      [result.newClusterIndex]: true,
    }))
    onChange(result.group)
  }
  const deleteCluster = (index: number) => {
    if (clusters.length <= 1) return
    if (!confirm('이 장면을 삭제하시겠습니까? 장면의 대사 항목과 출연 인물 배치도 함께 삭제됩니다.')) return
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
  const addCeleb = (celeb: CelebResult) => {
    if (celebTarget === undefined) return
    const target = clusters[celebTarget]
    if (target) {
      const entries = target.people ?? []
      const nextClusters = clusters.map((cluster, clusterIndex) => clusterIndex !== celebTarget ? cluster : {
        ...cluster,
        people: [...entries, celebToPerson(celeb)],
      })
      onChange({ ...group, clusters: nextClusters, sequence })
    }
  }

  return (
    <div
      data-faction-group-frame="true"
      className={`rounded-lg border-2 bg-bg-secondary ${disabled ? 'border-dashed bg-bg-secondary/50' : ''}`}
      style={{ borderColor: factionColor }}
    >
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
      />

      {expanded ? (
        <div
          id={`faction-group-body-${groupIndex}`}
          data-faction-group-end="true"
          className={`space-y-4 border-y-2 border-b-4 p-4 ${disabled ? '[&>*]:opacity-40 [&>*]:saturate-50' : ''}`}
          style={{ borderColor: factionColor }}
        >
          <FactionGroupSettings
            group={group}
            groupIndex={groupIndex}
            onChange={onChange}
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
                  inheritedLabelPosition={inheritedSceneCaptionPosition}
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
                  onInsertBefore={() => insertClusterBefore(clusterIndex)}
                  onSplitBeat={beatIndex => splitClusterAtBeat(clusterIndex, beatIndex)}
                  onMove={direction => moveSequenceItem(sequenceIndex, direction)}
                  onDelete={() => deleteCluster(clusterIndex)}
                  onAddCeleb={() => setCelebTarget(clusterIndex)}
                  series={series}
                  episodeName={episodeName}
                  editLang={editLang}
                  sfxList={sfxList}
                  speakerPeople={speakerPeople}
                  speakerVoiceFiles={speakerVoiceFiles}
                  onSpeakerPersonChange={onSpeakerPersonChange}
                  onSetPrimaryQuote={(beatIndex, celebId) => onSetPrimaryQuote(clusterIndex, beatIndex, celebId)}
                  onMoveCrossGroup={onMoveCrossGroup ? personIndex => onMoveCrossGroup(clusterIndex, personIndex) : undefined}
                  celebExisting={celebExisting}
                  celebLoaded={celebLoaded}
                />
              )
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
                <Plus size={15} /> 장면 추가
              </button>
            ) : undefined}
          />
        </div>
      ) : null}

      <FactionCelebSearchModal open={celebTarget !== undefined} onClose={() => setCelebTarget(undefined)} onSelect={addCeleb} />
    </div>
  )
}
