import type { FactionGroup } from '@/lib/faction-types'
import { preserveFactionSceneBeatVoiceFile } from './faction-scene-split'

type FactionSceneBeatMoveInput = {
  groups: FactionGroup[]
  fromGroupIndex: number
  fromClusterIndex: number
  fromBeatIndex: number
  toGroupIndex: number
  toClusterIndex: number
}

/** 컷 한 개를 기존 장면의 맨 끝으로 옮긴다. 컷이 가진 화면·화자·음성·효과 설정은 그대로 따라간다. */
export function moveFactionSceneBeat({
  groups,
  fromGroupIndex,
  fromClusterIndex,
  fromBeatIndex,
  toGroupIndex,
  toClusterIndex,
}: FactionSceneBeatMoveInput): FactionGroup[] | null {
  if (fromGroupIndex === toGroupIndex && fromClusterIndex === toClusterIndex) return null

  const sourceCluster = groups[fromGroupIndex]?.clusters?.[fromClusterIndex]
  const targetCluster = groups[toGroupIndex]?.clusters?.[toClusterIndex]
  const sourceBeat = sourceCluster?.beats?.[fromBeatIndex]
  if (!sourceCluster || !targetCluster || !sourceBeat) return null

  const movedBeat = preserveFactionSceneBeatVoiceFile(
    sourceBeat,
    sourceCluster.people ?? [],
    fromGroupIndex,
    fromClusterIndex,
  )

  return groups.map((group, groupIndex) => {
    if (groupIndex !== fromGroupIndex && groupIndex !== toGroupIndex) return group

    return {
      ...group,
      clusters: (group.clusters ?? []).map((cluster, clusterIndex) => {
        if (groupIndex === fromGroupIndex && clusterIndex === fromClusterIndex) {
          return {
            ...cluster,
            beats: (cluster.beats ?? []).filter((_, beatIndex) => beatIndex !== fromBeatIndex),
          }
        }
        if (groupIndex === toGroupIndex && clusterIndex === toClusterIndex) {
          return {
            ...cluster,
            beats: [...(cluster.beats ?? []), movedBeat],
          }
        }
        return cluster
      }),
    }
  })
}
