'use client'

import { Loader2, ScanLine } from 'lucide-react'

/** 목록에 보이는 인물의 얼굴 사진 배경을 한 번에 제거하는 줄. */
export default function NobgBatchBar({
  targetCount,
  runningCount,
  doneCount,
  errorCount,
  submitting,
  onRun,
}: {
  /** 지금 큐에 넣을 수 있는 인물 수. */
  targetCount: number
  /** 배치로 접수한 인물 중 아직 처리 중인 수. */
  runningCount: number
  doneCount: number
  errorCount: number
  submitting: boolean
  onRun: () => void
}) {
  const batchTotal = runningCount + doneCount + errorCount
  const busy = submitting || runningCount > 0
  const finished = doneCount + errorCount
  const message = busy
    ? finished === 0
      ? `배경 제거 중 — 모델을 한 번만 올려 ${batchTotal || targetCount}명을 이어서 처리합니다.`
      : `배경 제거 ${finished}/${batchTotal || targetCount}명 완료${errorCount > 0 ? ` · 실패 ${errorCount}명` : ''}`
    : targetCount > 0
      ? '이 목록에 보이는 인물의 얼굴 사진 배경을 한 번에 제거합니다. 결과는 기존 얼굴 사진을 덮어씁니다.'
      : '배경을 제거할 얼굴 사진이 없습니다.'

  return (
    <div className="flex items-center justify-between gap-3 border-b border-border bg-bg-secondary/40 px-3 py-2">
      <p className="flex min-w-0 items-center gap-2 text-xs text-text-secondary">
        <ScanLine className={`h-3.5 w-3.5 shrink-0 ${busy ? 'text-accent' : 'text-text-tertiary'}`} />
        <span className="truncate">{message}</span>
      </p>
      <button
        type="button"
        disabled={targetCount === 0 || busy}
        onClick={onRun}
        title="로컬 PC의 배경 제거 모델로 목록 전원의 얼굴 사진을 순서대로 처리합니다."
        className="flex shrink-0 items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs font-semibold text-text-secondary hover:border-accent hover:bg-accent/10 hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ScanLine className="h-3.5 w-3.5" />}
        {busy ? '처리 중' : `전원 nobg (${targetCount}명)`}
      </button>
    </div>
  )
}
