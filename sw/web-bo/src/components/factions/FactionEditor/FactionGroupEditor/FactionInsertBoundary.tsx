'use client'

import { Plus } from '@feelandnote/shared/bo/icons'

type Props = {
  label: string
  onAddCut: () => void
  onAddScene: () => void
  /**
   * 이 경계의 쇼츠 편 경계 토글. 컷 사이 경계에만 준다 — 장면 시작 경계는 장면 사이 토글(FactionSequenceEditor)이 맡는다.
   * 켜진 모양은 장면 사이·세력 사이 토글(FactionShortsCutToggle)과 같다.
   */
  cut?: { on: boolean; onToggle: () => void }
}

/** 컷과 컷 사이 경계선 — 새 항목을 끼우거나, 여기서 쇼츠 편을 나눈다. */
export function FactionInsertBoundary({ label, onAddCut, onAddScene, cut }: Props) {
  const on = !!cut?.on
  const line = on ? 'h-px flex-1 bg-sky-500/50' : 'h-px flex-1 bg-border/70'
  return (
    <div
      className={`flex items-center gap-2 py-1 ${on ? 'rounded border border-dashed border-sky-500/60 bg-sky-500/10 px-2' : ''}`}
      data-faction-insert-boundary="true"
      data-faction-shorts-cut={cut ? (on ? 'on' : 'off') : undefined}
      aria-label={label}
    >
      <span className={line} aria-hidden="true" />
      {on && <span className="shrink-0 text-[10px] font-black text-sky-500">쇼츠 편 경계 · 롱폼은 이어짐</span>}
      <div className="flex shrink-0 items-center rounded-md border border-dashed border-border bg-bg-secondary p-0.5" role="group" aria-label="이 경계에 추가">
        <button
          type="button"
          onClick={onAddCut}
          className="flex items-center gap-1 rounded px-2 py-1 text-xs font-bold text-text-secondary hover:border-accent hover:bg-accent/10 hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
          title="이 경계에 빈 화면 컷을 추가합니다"
        >
          <Plus size={13} /> 컷 추가
        </button>
        <span className="text-text-dim" aria-hidden="true">|</span>
        <button
          type="button"
          onClick={onAddScene}
          className="flex items-center gap-1 rounded px-2 py-1 text-xs font-bold text-text-secondary hover:border-teal-300 hover:bg-teal-500/10 hover:text-teal-200 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-teal-300"
          title="이 경계에 새 장면을 추가합니다"
        >
          <Plus size={13} /> 장면 추가
        </button>
        {cut ? (
          <>
            <span className="text-text-dim" aria-hidden="true">|</span>
            <button
              type="button"
              onClick={cut.onToggle}
              className={`rounded px-2 py-1 text-xs font-bold focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-300 ${
                on ? 'text-sky-300 hover:bg-sky-500/20' : 'text-text-dim hover:bg-sky-500/10 hover:text-sky-300'
              }`}
              title={on ? '이 경계를 없앱니다 — 앞뒤가 같은 편이 됩니다' : '여기서 쇼츠 편을 나눕니다 — 롱폼은 이어집니다'}
              aria-label={on ? `${label} 편 경계 없애기` : `${label} 편 나누기`}
            >
              {on ? '편 경계 ✕' : '편 나누기'}
            </button>
          </>
        ) : null}
      </div>
      <span className={line} aria-hidden="true" />
    </div>
  )
}
