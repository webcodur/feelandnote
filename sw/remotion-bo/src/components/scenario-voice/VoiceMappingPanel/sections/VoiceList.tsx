import type { ElevenVoice } from '../types'

type Props = {
  voicesLoading: boolean
  voicesError: string | null
  filtered: ElevenVoice[]
  currentJsonId: string
  currentDbId: string | null | undefined
  previewingId: string | null
  savingScope: boolean
  playPreview: (v: ElevenVoice) => void
  apply: (newId: string) => void
}

export function VoiceList({
  voicesLoading,
  voicesError,
  filtered,
  currentJsonId,
  currentDbId,
  previewingId,
  savingScope,
  playPreview,
  apply,
}: Props) {
  return (
    <div className="max-h-72 overflow-y-auto border border-border rounded">
      {voicesLoading && <div className="px-3 py-4 text-[11px] text-text-dim">목록 불러오는 중...</div>}
      {voicesError && <div className="px-3 py-4 text-[11px] text-red-400">목록 실패: {voicesError}</div>}
      {!voicesLoading && !voicesError && filtered.length === 0 && (
        <div className="px-3 py-4 text-[11px] text-text-dim">결과 없음</div>
      )}
      {filtered.map(v => {
        const isCurrent = v.voice_id === currentJsonId
        const isDb = v.voice_id === currentDbId
        const isPlaying = previewingId === v.voice_id
        const lang = v.labels?.language ?? v.labels?.accent ?? null
        return (
          <div
            key={v.voice_id}
            className={`flex items-center gap-2 px-2.5 py-1.5 text-[11px] border-b border-border/40 last:border-b-0 ${
              isCurrent ? 'bg-purple-500/10' : ''
            }`}
          >
            <button
              type="button"
              onClick={() => playPreview(v)}
              disabled={!v.preview_url}
              className={`w-6 h-6 flex items-center justify-center rounded text-[10px] ${
                v.preview_url
                  ? 'bg-bg-main border border-border hover:border-purple-500/40'
                  : 'bg-bg-main border border-border opacity-30 cursor-not-allowed'
              }`}
              title={v.preview_url ? '미리듣기' : '미리듣기 없음'}
            >
              {isPlaying ? '■' : '▶'}
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-text-primary truncate">{v.name}</span>
                {lang && <span className="text-[9px] text-text-dim">[{lang}]</span>}
                {v.category && <span className="text-[9px] text-text-dim">({v.category})</span>}
                {isCurrent && <span className="text-[9px] text-purple-300">현재</span>}
                {isDb && !isCurrent && <span className="text-[9px] text-blue-300">DB</span>}
              </div>
              <div className="font-mono text-[9px] text-text-dim truncate">{v.voice_id}</div>
            </div>
            <button
              type="button"
              disabled={savingScope || isCurrent}
              onClick={() => apply(v.voice_id)}
              className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                isCurrent
                  ? 'bg-bg-main border border-border text-text-dim cursor-default'
                  : 'bg-purple-500/20 text-purple-200 border border-purple-500/40 hover:bg-purple-500/30 disabled:opacity-50'
              }`}
            >
              {isCurrent ? '사용 중' : '적용'}
            </button>
          </div>
        )
      })}
    </div>
  )
}
