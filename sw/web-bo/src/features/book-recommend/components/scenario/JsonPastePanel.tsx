'use client'

import { useCallback, useState } from 'react'

/** JSON 붙여넣기 패널 상태 — open/serialize/apply 사이클 공용. */
export function useJsonPastePanel(serialize: () => string) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [applied, setApplied] = useState(false)
  const [copied, setCopied] = useState(false)

  const openPanel = useCallback(() => {
    setText(serialize())
    setError(null)
    setApplied(false)
    setOpen(true)
  }, [serialize])

  const closePanel = useCallback(() => {
    setOpen(false)
    setError(null)
    setApplied(false)
  }, [])

  const onChange = useCallback((t: string) => {
    setText(t)
    setError(null)
    setApplied(false)
  }, [])

  const markApplied = useCallback(() => {
    setError(null)
    setApplied(true)
    setTimeout(() => setApplied(false), 1500)
  }, [])

  const fail = useCallback((msg: string) => {
    setError(msg)
    setApplied(false)
  }, [])

  const copyJson = useCallback(() => {
    const body = open ? text : serialize()
    navigator.clipboard.writeText(body).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }, [open, text, serialize])

  return {
    open, text, error, applied, copied,
    openPanel, closePanel, onChange, markApplied, fail, copyJson,
  }
}

/**
 * 외부 JSON 붙여넣기 UI — 솔로·롱폼·쇼츠 공통.
 * 적용은 화면 상태만 갱신. 디스크 저장은 상위 저장 버튼 책임.
 */
export function JsonPastePanel({
  open, text, error, applied,
  onChange, onApply, onCopyJson, onClose,
  hint,
  applyHint = '적용됨 · 상단/우하단 저장으로 확정',
  placeholder,
}: {
  open: boolean
  text: string
  error: string | null
  applied: boolean
  onChange: (t: string) => void
  onApply: () => void
  onCopyJson: () => void
  onClose: () => void
  hint: string
  applyHint?: string
  placeholder?: string
}) {
  if (!open) return null

  return (
    <div className="space-y-1.5 border-t border-border/50 pt-2 mt-2">
      <div className="text-[11px] text-text-secondary">{hint}</div>
      <textarea
        value={text}
        onChange={e => onChange(e.target.value)}
        spellCheck={false}
        className="w-full h-48 bg-bg-main border border-border rounded px-2 py-1.5 font-mono text-[11px] font-bold resize-y focus:outline-none focus:border-accent text-text-primary"
        placeholder={placeholder}
      />
      {error && <div className="text-[11px] font-bold text-red-400">{error}</div>}
      {applied && !error && (
        <div className="text-[11px] font-bold text-emerald-500">{applyHint}</div>
      )}
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={onApply}
          className="px-2.5 py-1 rounded text-[12px] font-bold bg-emerald-600 text-white hover:bg-emerald-500"
        >
          적용
        </button>
        <button
          type="button"
          onClick={onCopyJson}
          className="px-2.5 py-1 rounded text-[12px] font-bold text-text-secondary border border-border/60 hover:border-accent/40 hover:text-accent"
          title="현재 텍스트 영역의 JSON을 클립보드에 복사"
        >
          JSON 복사
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-2.5 py-1 rounded text-[12px] font-bold text-text-secondary border border-border/60 hover:border-accent/40 hover:text-accent"
        >
          취소
        </button>
      </div>
    </div>
  )
}

/** 헤더용 「JSON 넣기」 토글 버튼 */
export function JsonPasteToggle({
  open, onOpen, onClose, className,
}: {
  open: boolean
  onOpen: () => void
  onClose: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={open ? onClose : onOpen}
      className={className ?? 'px-2.5 py-1 text-sm font-bold text-text-secondary hover:text-accent border border-border/40 rounded hover:border-accent/40'}
      title="외부 JSON 붙여넣기 또는 현재 내용 JSON 편집"
    >
      {open ? 'JSON 닫기' : 'JSON 넣기'}
    </button>
  )
}
