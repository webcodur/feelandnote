'use client'

import { Loader2, ScanLine } from 'lucide-react'

/** 목록에 보이는 인물의 얼굴 사진 배경을 한 번에 제거하는 줄. */
export default function NobgBatchBar({
  targetCount,
  runningCount,
  doneCount,
  errorCount,
  submitting,
  reframe,
  onReframeChange,
  onRun,
}: {
  /** 지금 큐에 넣을 수 있는 인물 수. */
  targetCount: number
  /** 배치로 접수한 인물 중 아직 처리 중인 수. */
  runningCount: number
  doneCount: number
  errorCount: number
  submitting: boolean
  reframe: boolean
  onReframeChange: (value: boolean) => void
  onRun: () => void
}) {
  const batchTotal = runningCount + doneCount + errorCount
  const busy = submitting || runningCount > 0
  const finished = doneCount + errorCount
  const message = busy
    ? finished === 0
      ? `배경 처리 중 — ${batchTotal || targetCount}명을 이어서 처리합니다.`
      : `배경 처리 ${finished}/${batchTotal || targetCount}명 완료${errorCount > 0 ? ` · 실패 ${errorCount}명` : ''}`
    : targetCount > 0
      ? reframe
        ? '이 목록의 얼굴 사진을 배경 제거 후 reframe으로 맞춥니다. 결과는 기존 얼굴 사진을 덮어씁니다.'
        : '이 목록의 얼굴 사진 구도를 유지하고 배경만 제거합니다. 결과는 기존 얼굴 사진을 덮어씁니다.'
      : '배경을 제거할 얼굴 사진이 없습니다.'

  return (
    <div className="flex items-center justify-between gap-3 border-b border-border bg-bg-secondary/40 px-3 py-2">
      <p className="flex min-w-0 items-center gap-2 text-xs text-text-secondary">
        <ScanLine className={`h-3.5 w-3.5 shrink-0 ${busy ? 'text-accent' : 'text-text-tertiary'}`} />
        <span className="truncate">{message}</span>
      </p>
      <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary">
        <input type="checkbox" checked={reframe} disabled={busy} onChange={(event) => onReframeChange(event.target.checked)} className="cursor-pointer accent-accent" />
        reframe도 실행
      </label>
      <button
        type="button"
        disabled={targetCount === 0 || busy}
        onClick={onRun}
        title={reframe ? '목록 전원을 nobg 배경 제거 후 reframe으로 맞춥니다.' : '목록 전원의 구도를 유지하고 배경만 제거합니다.'}
        className="flex shrink-0 items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs font-semibold text-text-secondary hover:border-accent hover:bg-accent/10 hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ScanLine className="h-3.5 w-3.5" />}
        {busy ? '처리 중' : `전원 ${reframe ? 'nobg + reframe' : 'nobg만'} (${targetCount}명)`}
      </button>
    </div>
  )
}
