'use client'

export function BgmSelect({ label, current, files, onSelect, onRemove }: {
  label: string; current?: string; files: { name: string; duration: number | null }[]
  onSelect: (fileName: string) => void; onRemove: () => void
}) {
  const currentFile = current?.split('/').pop()
  return (
    <div className="ml-[72px] flex items-center gap-1.5 py-0.5 text-xs font-bold">
      <span className="text-text-secondary/60 shrink-0">{label}</span>
      {currentFile ? (
        <>
          <span className="text-accent/70">{currentFile}</span>
          <button onClick={onRemove} className="text-red-400/60 hover:text-red-400">&times;</button>
        </>
      ) : (
        <select className="bg-bg-card border border-border rounded px-1 py-0 text-text-secondary"
          defaultValue="" onChange={e => { if (e.target.value) onSelect(e.target.value) }}>
          <option value="">선택...</option>
          {files.map(f => (
            <option key={f.name} value={f.name}>
              {f.name}{f.duration != null ? ` (${Math.round(f.duration)}s)` : ''}
            </option>
          ))}
        </select>
      )}
    </div>
  )
}
