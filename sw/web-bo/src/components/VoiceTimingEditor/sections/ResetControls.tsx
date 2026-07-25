type Props = {
  onResetAll: () => void
  onRedistributeText: () => void
}

export function ResetControls({ onResetAll, onRedistributeText }: Props) {
  return (
    <div className="flex items-center gap-2">
      <button onClick={onResetAll}
        className="px-2 py-0.5 rounded text-xs font-bold bg-bg-card border border-border hover:bg-bg-hover text-text-secondary">
        경계+텍스트 초기화
      </button>
      <button onClick={onRedistributeText}
        className="px-2 py-0.5 rounded text-xs font-bold bg-bg-card border border-border hover:bg-bg-hover text-text-secondary">
        텍스트만 재배분
      </button>
    </div>
  )
}
