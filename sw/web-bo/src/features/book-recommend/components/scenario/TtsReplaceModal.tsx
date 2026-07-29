'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { useEpisode } from '@/features/book-recommend/lib/episode-context'
import type { EpisodeData } from '../EpisodeEditor'

type Row = { id: string; from: string; to: string }

let _rid = 0
const nextId = () => `r${++_rid}`

/**
 * tts.replace 치환 사전 관리 모달.
 *
 * episode.tts.replace 는 본문에서 from → to 로 자동 치환되어 TTS 합성에 송신된다.
 * 본문 표기는 그대로 두고 음원에서만 다르게 읽히게 할 때 사용.
 *
 *   예) "머스크" → "Mŭsk"     (영문 이름 발음)
 *       "48"   → "사십팔"    (숫자 강제 한국어)
 *       "Stanford" → "스탠퍼드"
 *
 * 행 추가 · 편집은 from·to 양쪽이 입력된 시점에 디스크 저장.
 */
export function TtsReplaceModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { episode, updateEpisode, series, name } = useEpisode()
  const ep = episode as EpisodeData & { tts?: { replace?: Record<string, string> } }

  // 디스크의 사전 → 행 배열(편집용). 빈 행 하나는 항상 말미에 둔다(신규 입력란).
  const replaceMap = useMemo<Record<string, string>>(
    () => (ep.tts?.replace ?? {}) as Record<string, string>,
    [ep.tts?.replace],
  )
  const [rows, setRows] = useState<Row[]>([])

  useEffect(() => {
    if (!open) return
    const list: Row[] = Object.entries(replaceMap).map(([from, to]) => ({ id: nextId(), from, to }))
    list.push({ id: nextId(), from: '', to: '' })
    setRows(list)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, replaceMap, onClose])

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /** 현재 rows 를 정규화해 사전화 — 빈 행 제거, 같은 from 은 마지막 값 우선. */
  const buildMap = useCallback((list: Row[]): Record<string, string> => {
    const m: Record<string, string> = {}
    for (const r of list) {
      const from = r.from
      if (!from) continue
      m[from] = r.to
    }
    return m
  }, [])

  const persist = useCallback(async (nextMap: Record<string, string>) => {
    // 낙관적 업데이트
    const nextEp = {
      ...(ep as Record<string, unknown>),
      tts: { ...(ep.tts ?? {}), replace: nextMap },
    } as EpisodeData
    updateEpisode(nextEp)
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/${series}/episodes/${name}/field`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: ['tts', 'replace'], value: nextMap }),
      })
      const data = await res.json()
      if (!data.ok) setError(data.error ?? '저장 실패')
    } catch (e) {
      setError(String(e))
    } finally {
      setSaving(false)
    }
  }, [ep, updateEpisode, series, name])

  const handleBlur = useCallback(() => {
    const map = buildMap(rows)
    // 변경 없으면 패스
    const before = replaceMap
    const sameKeys = Object.keys(map).length === Object.keys(before).length
    const same = sameKeys && Object.keys(map).every(k => before[k] === map[k])
    if (same) return
    void persist(map)
  }, [rows, replaceMap, buildMap, persist])

  const updateRow = (id: string, patch: Partial<Row>) => {
    setRows(prev => {
      const next = prev.map(r => r.id === id ? { ...r, ...patch } : r)
      // 마지막 행에 값이 들어가면 새 빈 행 추가
      const last = next[next.length - 1]
      if (last && (last.from || last.to)) next.push({ id: nextId(), from: '', to: '' })
      return next
    })
  }

  const removeRow = (id: string) => {
    setRows(prev => {
      const next = prev.filter(r => r.id !== id)
      // 빈 행 보장
      if (next.length === 0 || next[next.length - 1].from || next[next.length - 1].to) {
        next.push({ id: nextId(), from: '', to: '' })
      }
      // 즉시 저장
      void persist(buildMap(next))
      return next
    })
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-bg-card border border-border rounded-md flex flex-col shadow-xl overflow-hidden"
        style={{ width: 'min(96vw, 1100px)', height: 'min(90vh, 800px)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center gap-4 px-5 py-3 border-b border-border bg-bg-main">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-base font-semibold text-text-primary shrink-0">TTS 치환 사전</span>
            <span className="text-sm text-text-secondary truncate">{name}</span>
            {saving && <span className="text-xs text-amber-300">저장 중…</span>}
            {error && <span className="text-xs text-danger-text">{error}</span>}
          </div>
          <button
            onClick={onClose}
            className="ml-auto px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-hover rounded border border-border"
            title="닫기 (ESC)"
          >
            닫기
          </button>
        </div>

        {/* 안내 */}
        <div className="px-5 py-3 border-b border-border text-sm text-text-secondary leading-relaxed bg-bg-main/30">
          본문에서 「본문 표기」 가 등장하면 TTS 합성 송신 시 「TTS 표기」 로 바뀐다.
          본문에는 정식 표기를 유지하고 음원에서만 발음·표기를 강제할 때 사용한다.
          빈 칸은 자동 무시되고 같은 「본문 표기」 는 마지막 값으로 덮어쓴다.
        </div>

        {/* 사전 본문 */}
        <div className="flex-1 min-h-0 overflow-auto p-5">
          <div className="rounded border border-border overflow-hidden">
            <div className="grid grid-cols-[1fr_1fr_auto] items-center text-xs text-text-secondary bg-bg-main border-b border-border">
              <span className="px-3 py-2 border-r border-border">본문 표기 (from)</span>
              <span className="px-3 py-2 border-r border-border">TTS 표기 (to)</span>
              <span className="px-3 py-2 w-12 text-center">삭제</span>
            </div>
            <ul>
              {rows.map((r, i) => {
                const isLast = i === rows.length - 1
                return (
                  <li key={r.id} className={`grid grid-cols-[1fr_1fr_auto] items-stretch ${i > 0 ? 'border-t border-border/60' : ''}`}>
                    <input
                      type="text"
                      value={r.from}
                      onChange={e => updateRow(r.id, { from: e.target.value })}
                      onBlur={handleBlur}
                      placeholder={isLast ? '예: 머스크' : ''}
                      className="bg-bg-card px-3 py-2 text-sm text-text-primary border-r border-border focus:outline-none focus:bg-bg-hover/40"
                    />
                    <input
                      type="text"
                      value={r.to}
                      onChange={e => updateRow(r.id, { to: e.target.value })}
                      onBlur={handleBlur}
                      placeholder={isLast ? '예: Mŭsk' : ''}
                      className="bg-bg-card px-3 py-2 text-sm text-text-primary border-r border-border focus:outline-none focus:bg-bg-hover/40"
                    />
                    <button
                      type="button"
                      onClick={() => removeRow(r.id)}
                      disabled={isLast && !r.from && !r.to}
                      className="w-12 text-sm text-text-secondary hover:text-danger-text hover:bg-danger-text/10 disabled:opacity-30 disabled:cursor-not-allowed"
                      title="이 행 삭제"
                    >
                      ×
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>

          <p className="mt-3 text-xs text-text-secondary">
            적용 예: 본문 「머스크는 스탠퍼드를 그만뒀다」 + 사전 「머스크→Mŭsk, 스탠퍼드→Stanford」 → 송신 「Mŭsk 는 Stanford 를 그만뒀다」.
            한 글자 치환은 의도치 않은 곳에 적용될 수 있으니 구두점·조사·전후 맥락을 포함한 짧은 어구를 권장한다.
          </p>
        </div>
      </div>
    </div>
  )
}
