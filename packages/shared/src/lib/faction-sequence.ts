/**
 * 세력 안의 실제 이야기 순서 — 그룹(클러스터)과 인물 없는 개별 장면을 한 배열로 다룬다.
 *
 * DB의 클러스터·인물은 관계형 행으로 유지한다. sequence의 clusterIndex는 그 행의 position-1을
 * 가리키고, 장면만 faction_groups.data.sequence 안에 본문째 보존한다. 이로써 DB 계층을
 * 중복 저장하지 않으면서도 `그룹 → 장면 → 장면 → 그룹` 순서를 하나의 SSoT로 표현한다.
 */

export type FactionSequenceItem<TScene = Record<string, unknown>> =
  | { kind: 'cluster'; clusterIndex: number }
  | { kind: 'scene'; id: string; scene: TScene }
  | { kind: 'cut' }

type Row = Record<string, unknown>

function rows(value: unknown): Row[] {
  return Array.isArray(value)
    ? value.filter((item): item is Row => !!item && typeof item === 'object' && !Array.isArray(item))
    : []
}

function groupLabel(group: Row): string {
  const name = typeof group.name === 'string' ? group.name.split('\n')[0]?.trim() : ''
  return name || '이름 없는 세력'
}

/**
 * 구 구조(openingScenes + cluster.scenesAfter) 또는 신 구조(sequence)를 읽어 정규화한다.
 * sequence가 이미 있으면 모든 클러스터가 정확히 한 번 등장하는지 검증해 조용한 누락을 막는다.
 */
export function factionSequenceOf<TScene extends Row = Row>(
  group: Row,
): FactionSequenceItem<TScene>[] {
  const clusters = rows(group.clusters)
  const stored = group.sequence

  if (Array.isArray(stored)) {
    const seen = new Set<number>()
    const sequence = stored.map((raw, index): FactionSequenceItem<TScene> => {
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        throw new Error(`${groupLabel(group)} sequence ${index + 1}번 항목이 객체가 아니다`)
      }
      const item = raw as Row
      if (item.kind === 'cluster') {
        const clusterIndex = Number(item.clusterIndex)
        if (!Number.isInteger(clusterIndex) || clusterIndex < 0 || clusterIndex >= clusters.length) {
          throw new Error(`${groupLabel(group)} sequence ${index + 1}번이 없는 그룹(${String(item.clusterIndex)})을 가리킨다`)
        }
        if (seen.has(clusterIndex)) {
          throw new Error(`${groupLabel(group)} sequence에 그룹 ${clusterIndex + 1}이 두 번 들어 있다`)
        }
        seen.add(clusterIndex)
        return { kind: 'cluster', clusterIndex }
      }
      if (item.kind === 'scene' && item.scene && typeof item.scene === 'object' && !Array.isArray(item.scene)) {
        return {
          kind: 'scene',
          id: typeof item.id === 'string' && item.id ? item.id : `scene-${index + 1}`,
          scene: item.scene as TScene,
        }
      }
      if (item.kind === 'cut') return { kind: 'cut' }
      throw new Error(`${groupLabel(group)} sequence ${index + 1}번의 kind가 cluster, scene 또는 cut이 아니다`)
    })

    sequence.forEach((item, index) => {
      if (item.kind !== 'cut') return
      if (index === 0 || index === sequence.length - 1) {
        throw new Error(`${groupLabel(group)} sequence의 편 경계는 맨 앞이나 맨 뒤에 둘 수 없다`)
      }
      if (sequence[index - 1]?.kind === 'cut') {
        throw new Error(`${groupLabel(group)} sequence에 편 경계가 연속으로 들어 있다`)
      }
    })

    if (seen.size !== clusters.length) {
      const missing = clusters.flatMap((_, index) => seen.has(index) ? [] : [index + 1])
      throw new Error(`${groupLabel(group)} sequence에서 그룹 ${missing.join(', ')}이 빠졌다`)
    }
    return sequence
  }

  // 구 데이터의 위치 의미를 그대로 보존하는 일회성 읽기 호환.
  const sequence: FactionSequenceItem<TScene>[] = rows(group.openingScenes).map((scene, index) => ({
    kind: 'scene',
    id: `legacy-opening-${index + 1}`,
    scene: scene as TScene,
  }))
  clusters.forEach((cluster, clusterIndex) => {
    sequence.push({ kind: 'cluster', clusterIndex })
    rows(cluster.scenesAfter).forEach((scene, sceneIndex) => {
      sequence.push({
        kind: 'scene',
        id: `legacy-after-${clusterIndex + 1}-${sceneIndex + 1}`,
        scene: scene as TScene,
      })
    })
  })
  return sequence
}

/** sequence가 참조하는 실제 클러스터를 순서대로 돌려준다. */
export function sequenceClusters<TCluster extends Row = Row>(group: Row): TCluster[] {
  const clusters = rows(group.clusters) as TCluster[]
  return factionSequenceOf(group).flatMap(item => item.kind === 'cluster' ? [clusters[item.clusterIndex]] : [])
}

/** sequence 안의 개별 장면만 실제 이야기 순서대로 돌려준다. */
export function sequenceScenes<TScene extends Row = Row>(group: Row): TScene[] {
  return factionSequenceOf<TScene>(group).flatMap(item => item.kind === 'scene' ? [item.scene] : [])
}

/** sequence 내부의 쇼츠 편 경계 수. 롱폼 재생 순서에는 영향을 주지 않는다. */
export function sequenceCutCount(group: Row): number {
  return factionSequenceOf(group).filter(item => item.kind === 'cut').length
}
