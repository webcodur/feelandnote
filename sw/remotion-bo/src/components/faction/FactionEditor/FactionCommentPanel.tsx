'use client'

import { useState, useEffect, useCallback } from 'react'
import { Save } from '../shared/icons'

/**
 * 편별 댓글(해설 텍스트) — 영상 데이터와 별개인 comment.p<part>.txt 를 읽고 쓴다.
 * 유튜브 고정 댓글 등에 쓸 각 세력·인물 해설 글. 각 편 섹션엔 한 줄 트리거만 두고,
 * 누르면 넓은 모달에서 편집한다.
 */
export function FactionCommentPanel({
  series,
  episodeName,
  part,
}: {
  series: string
  episodeName: string
  part: number
}) {
  const [text, setText] = useState('')
  const [open, setOpen] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const [copied, setCopied] = useState(false)

  const base = `/api/${series}/faction-comment/${encodeURIComponent(episodeName)}`

  const load = useCallback(async () => {
    try {
      const r = await fetch(`${base}?part=${part}`)
      const j = await r.json()
      setText(j.comment ?? '')
      setDirty(false)
    } catch { /* 무시 — 비어있는 상태로 둔다 */ }
  }, [base, part])

  useEffect(() => { load() }, [load])

  // 모달 열려 있을 때 ESC 로 닫기
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const save = async () => {
    setSaving(true)
    try {
      await fetch(base, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ part, text }),
      })
      setDirty(false)
      setSavedFlash(true)
      setTimeout(() => setSavedFlash(false), 1500)
    } finally {
      setSaving(false)
    }
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch { /* 클립보드 불가 환경 무시 */ }
  }

  const lineCount = text ? text.split('\n').length : 0
  const firstLine = text.split('\n').find(l => l.trim()) ?? ''
  // part 0 = 편 구분 없는 통합편 — "0편"이 아니라 "통합편"으로 표기
  const partLabel = part === 0 ? '통합편' : `${part}편`

  return (
    <>
      {/* 트리거 — 각 편 섹션 인라인 한 줄. 누르면 모달 */}
      <button
        onClick={() => setOpen(true)}
        className="flex w-full cursor-pointer items-center gap-2 rounded-md border border-border/60 bg-bg-card/30 px-2.5 py-2 text-left hover:bg-bg-hover/40"
        title="댓글 편집"
      >
        <span className="shrink-0 text-xs font-bold text-text-secondary">{partLabel} 댓글</span>
        {text.trim() ? (
          <span className="min-w-0 flex-1 truncate text-[11px] text-text-dim" title={firstLine}>{firstLine}</span>
        ) : (
          <span className="min-w-0 flex-1 truncate text-[11px] text-text-dim/70">아직 작성된 댓글이 없습니다</span>
        )}
        {dirty && <span className="shrink-0 text-[10px] text-amber-500" title="저장 안 됨">●</span>}
        <span className="shrink-0 font-mono text-[10px] text-text-dim">{lineCount}줄</span>
        <span className="shrink-0 text-[10px] text-text-dim">편집 →</span>
      </button>

      {/* 편집 모달 */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setOpen(false)}>
          <div className="flex max-h-[88vh] w-full max-w-3xl flex-col rounded-lg border border-border bg-bg-card p-4" onClick={e => e.stopPropagation()}>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-bold text-text-primary">
                {partLabel} 댓글
                {dirty && <span className="text-xs font-normal text-amber-500">● 저장 안 됨</span>}
              </h2>
              <button onClick={() => setOpen(false)} className="rounded-md border border-border px-3 py-1 text-sm text-text-secondary hover:bg-bg-hover">닫기</button>
            </div>
            <p className="mb-3 text-xs text-text-secondary">각 세력·인물 해설. 유튜브 고정 댓글 등에 사용 (영상 데이터와 별개로 저장됨).</p>
            <textarea
              autoFocus
              value={text}
              onChange={e => { setText(e.target.value); setDirty(true) }}
              placeholder={`${partLabel} 해설 댓글 (각 세력·인물 한두 줄씩)`}
              className="min-h-[55vh] flex-1 resize-none whitespace-pre rounded-md border border-border bg-bg-main/40 px-3 py-2.5 font-mono text-[13px] leading-relaxed focus:border-accent focus:outline-none"
            />
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={save}
                disabled={saving || !dirty}
                className="flex items-center gap-1.5 rounded-md border border-accent bg-accent/10 px-3 py-1.5 text-sm font-semibold text-accent hover:bg-accent/20 disabled:opacity-50"
              >
                <Save size={14} />
                {savedFlash ? '저장됨' : saving ? '저장 중…' : '저장'}
              </button>
              <button
                onClick={copy}
                className="rounded-md border border-border bg-bg-card px-3 py-1.5 text-sm hover:bg-bg-hover"
                title="댓글 전체를 클립보드에 복사"
              >
                {copied ? '복사됨' : '복사'}
              </button>
              <span className="ml-auto text-[10px] text-text-dim">{lineCount}줄 · {text.length}자</span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
