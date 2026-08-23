import React, { type ReactNode } from 'react'
import type { FactionSequenceItem } from '@/lib/faction-types'

type EntryItem = Extract<FactionSequenceItem, { kind: 'entry' }>

type Props = {
  sequence: FactionSequenceItem[]
  renderCluster: (clusterIndex: number, sequenceIndex: number) => ReactNode
  renderEntry: (item: EntryItem, sequenceIndex: number) => ReactNode
  renderCut?: (sequenceIndex: number) => ReactNode
  footer?: ReactNode
}

/** 세력 본문 편집기를 영상 이야기 순서와 동일한 DOM 순서로 배치한다. */
export function FactionSequenceEditor({ sequence, renderCluster, renderEntry, renderCut, footer }: Props) {
  return (
    <div className="flex flex-col gap-3" data-faction-sequence-editor>
      {sequence.map((item, sequenceIndex) => {
        if (item.kind === 'cluster') {
          return <div key={`cluster-${item.clusterIndex}`}>{renderCluster(item.clusterIndex, sequenceIndex)}</div>
        }
        if (item.kind === 'entry') return <div key={`entry-${item.clusterIndex}-${item.entryIndex}`}>{renderEntry(item, sequenceIndex)}</div>
        return (
          <div key={`cut-${sequenceIndex}`}>
            {renderCut?.(sequenceIndex) ?? (
              <div className="flex items-center gap-2 py-1" aria-label="쇼츠 편 경계">
                <span className="h-px flex-1 bg-sky-500/50" />
                <span className="text-[10px] font-black text-sky-500">쇼츠 편 경계 · 롱폼 연속</span>
                <span className="h-px flex-1 bg-sky-500/50" />
              </div>
            )}
          </div>
        )
      })}
      {footer}
    </div>
  )
}
