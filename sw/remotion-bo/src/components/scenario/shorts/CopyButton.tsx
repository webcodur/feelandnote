'use client'

import { useState, useCallback, useEffect } from 'react'
import { JsonPastePanel, JsonPasteToggle } from '../JsonPastePanel'
import { parseShortsSegmentsJson, serializeShortsSegments } from '../jsonImport'

/**
 * 쇼츠 내용 복사 + JSON 토글.
 * 각 구간 라벨 = 위치 + 발화 유형 (훅·인트로 / 대사·해설).
 * JSON 패널 본체는 ShortsJsonPanel.
 */
export function ShortsCopyButton({
  segments, shortsName, jsonOpen, onToggleJson,
}: {
  segments: any[]
  shortsName?: string
  jsonOpen?: boolean
  onToggleJson?: () => void
}) {
  const [copied, setCopied] = useState(false)

  const copy = useCallback(() => {
    const speech = (s: any): '대사' | '해설' | null =>
      s?.role === 'celeb' ? '대사' : s?.role === 'narrator' ? '해설' : null
    const slot = (s: any): '훅' | '인트로' | null =>
      (s?.id === 'hook' || s?.visual === 'hook') ? '훅'
      : (s?.id === 'intro' || s?.visual === 'intro') ? '인트로' : null
    const labelOf = (s: any): string | null => {
      const sp = speech(s)
      const sl = slot(s)
      if (sl && sp) return `${sl} · ${sp}`
      return sl ?? sp
    }

    const items = segments
      .filter(s => !s?.disabled)
      .map(s => ({ label: labelOf(s), seg: s }))
      .filter((x): x is { label: string; seg: any } => x.label !== null)

    const titleLine = shortsName ? `[쇼츠] ${shortsName}` : ''

    const body = items
      .filter(({ seg }) => typeof seg.text === 'string' && seg.text.trim().length > 0)
      .map(({ label, seg }) => {
        const src = typeof seg.quoteSource === 'string' && seg.quoteSource.trim().length > 0
          ? `\n출처: ${seg.quoteSource.trim()}`
          : ''
        return `# ${label} (${seg.id})\n${seg.text}${src}`
      })
      .join('\n\n')

    navigator.clipboard.writeText(titleLine ? `${titleLine}\n\n${body}` : body).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }, [segments, shortsName])

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={copy}
        className="px-2.5 py-1 text-sm font-bold text-text-secondary hover:text-accent border border-border/40 rounded hover:border-accent/40"
      >
        {copied ? '복사됨' : '내용 복사'}
      </button>
      {onToggleJson && (
        <JsonPasteToggle open={!!jsonOpen} onOpen={onToggleJson} onClose={onToggleJson} />
      )}
    </div>
  )
}

/** 쇼츠 segments JSON 패널 — 적용 시 구간 배열 전체 교체. */
export function ShortsJsonPanel({
  segments, open, onClose, onApplySegments,
}: {
  segments: any[]
  open: boolean
  onClose: () => void
  onApplySegments: (segments: Array<Record<string, unknown>>) => void
}) {
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [applied, setApplied] = useState(false)

  useEffect(() => {
    if (!open) return
    setText(serializeShortsSegments(segments))
    setError(null)
    setApplied(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const apply = useCallback(() => {
    const result = parseShortsSegmentsJson(text)
    if (!result.ok) { setError(result.error); setApplied(false); return }
    onApplySegments(result.segments)
    setError(null)
    setApplied(true)
    setTimeout(() => setApplied(false), 1500)
  }, [text, onApplySegments])

  if (!open) return null

  return (
    <div className="mb-2">
      <JsonPastePanel
        open
        text={text}
        error={error}
        applied={applied}
        onChange={t => { setText(t); setError(null); setApplied(false) }}
        onApply={apply}
        onCopyJson={() => { navigator.clipboard.writeText(text) }}
        onClose={onClose}
        hint='외부 JSON 붙여넣기 후 「적용」하면 구간 전체가 교체됩니다. 형식: { "segments": [{ "id", "text", ... }] }'
        applyHint="적용됨 · 에피소드 저장으로 확정"
        placeholder='{ "segments": [ { "id": "hook", "text": "...", "role": "narrator" } ] }'
      />
    </div>
  )
}
