'use client'

/**
 * 세력 배경음악 곡 선택 — 곡 드롭다운 + 음량 슬라이더.
 * 롱폼 편성/쇼츠 편성 양쪽에서 세력마다 곡을 지정할 때 공용으로 쓴다.
 * 곡을 고르면 그 세력 진입 시 곡이 교체되고, "이전 곡 유지"면 직전 곡을 이어간다.
 */
export function FactionMusicPicker({
  file,
  vol,
  musicList,
  onFile,
  onVol,
}: {
  file?: string
  vol?: number
  musicList: string[]
  onFile: (v?: string) => void
  onVol: (v?: number) => void
}) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <select
        value={file ?? ''}
        onChange={e => onFile(e.target.value || undefined)}
        className="min-w-0 flex-1 rounded-md border border-border bg-bg-card px-2 py-1 text-[11px] focus:border-accent focus:outline-none"
        title="이 세력부터 나올 곡 (이전 곡 유지 = 직전 곡 그대로)"
      >
        <option value="">이전 곡 유지</option>
        {musicList.map(m => <option key={m} value={m}>{m}</option>)}
      </select>
      {file && (
        <span className="flex shrink-0 items-center gap-1" title="이 곡 음량. 100%가 원음">
          <input
            type="range" min={0} max={1} step={0.05}
            value={vol ?? 1}
            onChange={e => { const v = Number(e.target.value); onVol(v === 1 ? undefined : v) }}
            className="w-16 accent-accent"
          />
          <span className="w-8 text-right font-mono text-[10px] text-text-secondary">{Math.round((vol ?? 1) * 100)}%</span>
        </span>
      )}
    </div>
  )
}
