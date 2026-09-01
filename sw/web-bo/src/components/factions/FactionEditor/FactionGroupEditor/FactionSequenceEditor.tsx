import React, { type ReactNode } from 'react'
import { factionSequenceCutBoundaries } from '@feelandnote/shared/lib/faction-sequence'
import type { FactionSequenceItem } from '@/lib/faction-types'
import { FactionShortsCutToggle } from './FactionShortsCutToggle'

type Props = {
  sequence: FactionSequenceItem[]
  /** 장면 하나. sequenceIndex 는 장면·경계를 합친 이야기 순서상 위치다(위·아래 이동에 쓴다). */
  renderCluster: (clusterIndex: number, sequenceIndex: number) => ReactNode
  /** k번째 장면 뒤 경계를 켜고 끈다. 없으면 경계를 표시만 하지 않는다. */
  onToggleCut?: (boundary: number) => void
  footer?: ReactNode
}

/**
 * 세력 본문 편집기를 영상 이야기 순서와 동일한 DOM 순서로 배치한다.
 * 장면과 장면 사이마다 쇼츠 편 경계 토글이 선다. 세력 끝 경계(다음 세력과의 사이)는
 * 세력 목록(FactionInfoPanel)이 세력 사이에 같은 토글로 그린다 — 여기서는 그리지 않는다.
 */
export function FactionSequenceEditor({ sequence, renderCluster, onToggleCut, footer }: Props) {
  const boundaries = factionSequenceCutBoundaries(sequence)
  const clusters = sequence
    .map((item, sequenceIndex) => ({ item, sequenceIndex }))
    .filter((entry): entry is { item: Extract<FactionSequenceItem, { kind: 'cluster' }>; sequenceIndex: number } => entry.item.kind === 'cluster')

  return (
    <div className="flex flex-col gap-3" data-faction-sequence-editor>
      {clusters.map(({ item, sequenceIndex }, order) => {
        const boundary = order + 1
        const isLast = order === clusters.length - 1
        return (
          <div key={`cluster-${item.clusterIndex}`}>
            {renderCluster(item.clusterIndex, sequenceIndex)}
            {!isLast && onToggleCut ? (
              <div className="mt-3">
                <FactionShortsCutToggle
                  on={boundaries.has(boundary)}
                  onToggle={() => onToggleCut(boundary)}
                  label={`${boundary}번 장면 뒤 편 경계`}
                />
              </div>
            ) : null}
          </div>
        )
      })}
      {footer}
    </div>
  )
}
