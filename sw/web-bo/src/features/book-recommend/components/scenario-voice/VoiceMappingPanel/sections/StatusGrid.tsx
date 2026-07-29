type Props = {
  locale: 'ko' | 'en'
  currentJsonId: string
  currentJsonName: string | null
  currentDbId: string | null | undefined
  currentDbName: string | null
  dbError: string | null
}

export function StatusGrid({
  locale,
  currentJsonId,
  currentJsonName,
  currentDbId,
  currentDbName,
  dbError,
}: Props) {
  return (
    <div className="grid grid-cols-2 gap-2 text-[11px]">
      <div className="bg-bg-main rounded px-2 py-1.5 border border-border">
        <div className="text-text-dim mb-0.5">이 에피소드 ({locale})</div>
        <div className="font-mono text-text-secondary truncate">
          {currentJsonName ?? (currentJsonId || '—')}
        </div>
        {currentJsonName && (
          <div className="text-text-dim font-mono text-[10px] truncate">{currentJsonId}</div>
        )}
      </div>
      <div className="bg-bg-main rounded px-2 py-1.5 border border-border">
        <div className="text-text-dim mb-0.5">DB voice_id_{locale}</div>
        <div className="font-mono text-text-secondary truncate">
          {dbError ? <span className="text-red-400">{dbError}</span> : (currentDbName ?? (currentDbId || '—'))}
        </div>
        {currentDbName && (
          <div className="text-text-dim font-mono text-[10px] truncate">{currentDbId}</div>
        )}
      </div>
    </div>
  )
}
