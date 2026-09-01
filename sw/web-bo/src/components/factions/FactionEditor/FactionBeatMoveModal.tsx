'use client'

import { useState } from 'react'
import { X } from '@feelandnote/shared/bo/icons'
import { factionSceneNumbers, factionSequenceOf, type FactionGroup } from '@/lib/faction-types'

type Props = {
  groups: FactionGroup[]
  fromGroupIndex: number
  fromClusterIndex: number
  onClose: () => void
  onConfirm: (toGroupIndex: number, toClusterIndex: number) => void
}

type Destination = {
  groupIndex: number
  clusterIndex: number
  label: string
}

function destinationsOf(
  groups: FactionGroup[],
  fromGroupIndex: number,
  fromClusterIndex: number,
): Destination[] {
  return groups.flatMap((group, groupIndex) => {
    const sceneNumbers = factionSceneNumbers(group)
    const groupName = group.name?.split('\n')[0]?.trim() || `세력 ${groupIndex + 1}`
    return factionSequenceOf(group).flatMap(item => {
      if (item.kind !== 'cluster') return []
      const clusterIndex = item.clusterIndex
      if (groupIndex === fromGroupIndex && clusterIndex === fromClusterIndex) return []
      const cluster = group.clusters?.[clusterIndex]
      if (!cluster) return []
      const sceneName = cluster.label?.split('\n')[0]?.trim() || '제목 없음'
      const sceneNumber = sceneNumbers.get(clusterIndex) ?? clusterIndex + 1
      return [{
        groupIndex,
        clusterIndex,
        label: `${groupIndex + 1}-${sceneNumber} · ${groupName} / ${sceneName}`,
      }]
    })
  })
}

export function FactionBeatMoveModal({
  groups,
  fromGroupIndex,
  fromClusterIndex,
  onClose,
  onConfirm,
}: Props) {
  const destinations = destinationsOf(groups, fromGroupIndex, fromClusterIndex)
  const [selected, setSelected] = useState(() => destinations[0]
    ? `${destinations[0].groupIndex}-${destinations[0].clusterIndex}`
    : '')

  const handleConfirm = () => {
    if (!selected) return
    const [groupIndex, clusterIndex] = selected.split('-').map(Number)
    onConfirm(groupIndex, clusterIndex)
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="faction-beat-move-title">
      <div className="w-full max-w-md rounded-lg border border-border bg-bg-main p-4 shadow-xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 id="faction-beat-move-title" className="text-lg font-bold text-text-primary">컷을 다른 장면으로 이동</h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-transparent text-text-dim hover:border-border hover:bg-bg-hover hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            aria-label="컷 이동 창 닫기"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mb-6 space-y-2">
          <label htmlFor="faction-beat-move-destination" className="text-sm font-semibold text-text-secondary">받을 장면</label>
          <select
            id="faction-beat-move-destination"
            className="w-full rounded-md border border-border bg-bg-card p-2 text-sm text-text-primary hover:border-accent hover:bg-bg-hover focus:border-accent focus:outline-none"
            value={selected}
            onChange={event => setSelected(event.target.value)}
          >
            {destinations.map(destination => (
              <option
                key={`${destination.groupIndex}-${destination.clusterIndex}`}
                value={`${destination.groupIndex}-${destination.clusterIndex}`}
              >
                {destination.label}
              </option>
            ))}
          </select>
          <p className="text-xs leading-relaxed text-text-tertiary">
            선택한 컷 한 개를 받을 장면의 맨 끝으로 보냅니다. 컷의 화자·이미지·음성·효과음 설정은 함께 이동합니다.
          </p>
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border bg-bg-card px-4 py-2 text-sm font-semibold text-text-secondary hover:border-text-tertiary hover:bg-bg-hover hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!selected}
            className="rounded-md border border-accent bg-accent px-4 py-2 text-sm font-bold text-white hover:border-accent-hover hover:bg-accent-hover disabled:cursor-not-allowed disabled:border-border disabled:bg-bg-card disabled:text-text-dim focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            장면 끝으로 이동
          </button>
        </div>
      </div>
    </div>
  )
}
