'use client'

/**
 * 세그먼트 사이 삽입 바 — 한 가로 전체 블록.
 *
 * "+ 인용"으로 셀럽 발화 구간을 추가하면 useShortsState.insertSegmentAt 이
 * subtitle:true · textOverlay:'bottom' · topRight:'none' 을 함께 채워 다른 셀럽 발화와 동일한 모양으로 만든다.
 * "+ 맥락"은 일반 narrator 자막 흐름.
 */
export function SegmentInsertBar({ atIdx, onInsert }: {
  atIdx: number
  onInsert: (atIdx: number, kind: 'quote' | 'context') => void
}) {
  return (
    <div className="group/ins flex items-center justify-center gap-2 py-1 px-2 my-1 rounded bg-bg-card hover:bg-accent/5">
      <span className="text-sm font-bold text-text-secondary/40 group-hover/ins:text-text-secondary/70 select-none">여기에 추가</span>
      <button
        type="button" onClick={() => onInsert(atIdx, 'quote')}
        title="이 위치에 인용 구간 삽입"
        className="px-2 py-0.5 text-sm font-bold text-accent/80 border border-accent/40 rounded hover:bg-accent/10 hover:border-accent hover:text-accent cursor-pointer"
      >+ 인용</button>
      <button
        type="button" onClick={() => onInsert(atIdx, 'context')}
        title="이 위치에 맥락 구간 삽입"
        className="px-2 py-0.5 text-sm font-bold text-accent/80 border border-accent/40 rounded hover:bg-accent/10 hover:border-accent hover:text-accent cursor-pointer"
      >+ 맥락</button>
    </div>
  )
}
