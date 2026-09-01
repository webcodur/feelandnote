'use client'

import { cropToStyle, MediaThumb } from '@feelandnote/shared/bo/media'
import { factionSceneNumbers, factionSequenceOf, type FactionCluster, type FactionGroup } from '@/lib/faction-types'
import { imageSrc } from '../../shared/timing'

type Props = {
  group: FactionGroup
  groupIndex: number
  series: string
  episodeName: string
  borderColor: string
  onJumpCluster: (ci: number) => void
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
  group, groupIndex, series, episodeName, borderColor, onJumpCluster,
}: Props) {
  const clusterIndexes = factionSequenceOf(group).flatMap(item => item.kind === 'cluster'
    ? [item.clusterIndex]
    : [])
  const sceneNumbers = factionSceneNumbers(group)

  return (
    <div className="flex h-full shrink-0 items-stretch gap-2" aria-label="세력 장면 이미지">
      {clusterIndexes.map(clusterIndex => {
        const cluster = group.clusters?.[clusterIndex]
        if (!cluster) return null
        const media = clusterHeaderMedia(cluster)
        const src = imageSrc(series, episodeName, media.image)
        const label = cluster.label?.split('\n')[0]?.trim() || '제목 없음'
        return (
          <button
            key={`cluster-${clusterIndex}`}
            type="button"
            onClick={event => { event.stopPropagation(); onJumpCluster(clusterIndex) }}
            data-faction-scene-image="true"
            className="group relative block aspect-square h-full w-auto shrink-0 overflow-hidden rounded-md border bg-bg-main/90 text-left hover:brightness-110 hover:ring-2 hover:ring-white/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            style={{ borderColor }}
            title={`${label} 편집 위치로 이동`}
          >
            {src ? <MediaThumb src={src} alt="" className="h-full w-full object-cover" style={cropToStyle(media.crop)} /> : (
              <span className="flex h-full w-full items-center justify-center bg-bg-card text-[11px] font-semibold text-text-tertiary">화보 없음</span>
            )}
            <span className="pointer-events-none absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/95 via-black/65 to-transparent px-2 pb-2 pt-8 text-[11px] font-bold text-white">{label}</span>
            <span className="absolute left-1.5 top-1.5 rounded border border-slate-300 bg-slate-100 px-1.5 py-0.5 font-mono text-[9px] font-black tabular-nums text-slate-900 shadow-sm">{groupIndex + 1}-{sceneNumbers.get(clusterIndex) ?? 1}</span>
          </button>
        )
      })}
    </div>
  )
}
