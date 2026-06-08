import type { Timing } from '../types'

type Props = {
  jsonOpen: boolean
  jsonText: string
  jsonError: string | null
  setJsonOpen: (v: boolean) => void
  setJsonText: (v: string) => void
  setJsonError: (v: string | null) => void
  onToggle: () => void
  onChange: (timings: Timing[]) => void
}

export function JsonEditor({
  jsonOpen, jsonText, jsonError, setJsonOpen, setJsonText, setJsonError, onToggle, onChange,
}: Props) {
  return (
    <div>
      <button onClick={onToggle}
        className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-bg-card border border-border hover:bg-bg-hover text-text-secondary">
        <span>{'{}'}</span>
        <span>{jsonOpen ? 'JSON 닫기' : 'JSON 편집'}</span>
      </button>
      {jsonOpen && (
        <div className="mt-1 space-y-1">
          <textarea
            value={jsonText}
            onChange={(e) => { setJsonText(e.target.value); setJsonError(null) }}
            className="w-full h-40 bg-bg-main border border-border rounded px-2 py-1 font-mono text-xs font-bold resize-y focus:outline-none focus:border-accent"
          />
          {jsonError && <div className="text-xs font-bold text-red-400">{jsonError}</div>}
          <div className="flex gap-1">
            <button onClick={() => {
              try {
                const parsed = JSON.parse(jsonText)
                if (!Array.isArray(parsed) || !parsed.every((t: any) => t && typeof t.start === 'number' && typeof t.end === 'number')) {
                  setJsonError('[{start, end}, ...] 형식이어야 합니다'); return
                }
                onChange(parsed)
                setJsonOpen(false)
              } catch (e: unknown) { setJsonError('JSON 파싱 오류: ' + (e instanceof Error ? e.message : String(e))) }
            }}
              className="px-2 py-0.5 rounded text-xs font-bold font-semibold bg-green-600 text-white hover:bg-green-500">
              JSON 적용
            </button>
            <button onClick={() => setJsonOpen(false)}
              className="px-2 py-0.5 rounded text-xs font-bold bg-bg-card border border-border hover:bg-bg-hover text-text-secondary">
              취소
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
