'use client'

type Props = {
  /** 이 자리에 편 경계가 켜져 있는가 */
  on: boolean
  onToggle: () => void
  /** 접근성 라벨 — 어느 자리의 경계인지("2번 장면 뒤 편 경계", "세력 「귀향길」 뒤 편 경계") */
  label: string
}

/**
 * 쇼츠 편 경계 토글 — 이야기 순서 위 한 자리(장면 사이·세력 사이)의 "여기서 편이 갈린다" 표식.
 * 컷 사이 경계는 FactionInsertBoundary 가 같은 모양으로 그린다. 켜진 모양은 목차·편성 패널이 읽는 것과 같다.
 * 롱폼은 경계와 무관하게 이어진다.
 */
export function FactionShortsCutToggle({ on, onToggle, label }: Props) {
  if (on) {
    return (
      <div
        className="flex items-center gap-2 rounded border border-dashed border-sky-500/60 bg-sky-500/10 px-3 py-1.5"
        data-faction-shorts-cut="on"
        aria-label={label}
      >
        <span className="h-px flex-1 bg-sky-500/50" aria-hidden="true" />
        <span className="shrink-0 text-[10px] font-black text-sky-500">쇼츠 편 경계 · 롱폼은 이어짐</span>
        <span className="h-px flex-1 bg-sky-500/50" aria-hidden="true" />
        <button
          type="button"
          onClick={onToggle}
          className="shrink-0 rounded border border-sky-500/50 px-1.5 py-0.5 text-[10px] font-bold text-sky-300 hover:border-sky-300 hover:bg-sky-500/20 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-300"
          title="이 경계를 없앱니다 — 앞뒤가 같은 편이 됩니다"
          aria-label={`${label} 없애기`}
        >
          ✕
        </button>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-2 py-0.5" data-faction-shorts-cut="off" aria-label={label}>
      <span className="h-px flex-1 bg-border/50" aria-hidden="true" />
      <button
        type="button"
        onClick={onToggle}
        className="shrink-0 rounded border border-dashed border-border px-2 py-0.5 text-[10px] font-bold text-text-dim hover:border-sky-400 hover:bg-sky-500/10 hover:text-sky-300 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-300"
        title="여기서 쇼츠 편을 나눕니다 — 롱폼은 이어집니다"
        aria-label={`${label} 켜기`}
      >
        편 나누기
      </button>
      <span className="h-px flex-1 bg-border/50" aria-hidden="true" />
    </div>
  )
}
