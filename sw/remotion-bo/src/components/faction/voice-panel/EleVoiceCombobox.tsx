'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * ElevenLabs 보이스 콤보박스 — 드롭다운(전체 목록 + 이름 검색)과 직접 입력을 한 위젯에 합친다.
 *
 * 표준 datalist 는 입력값(voiceId)으로 목록을 필터링해, 보이스가 선택된 상태(입력칸에 id 가 차 있음)에서
 * 드롭다운을 다시 열면 그 id 와 매칭되는 항목만 떠 사실상 목록이 사라진다. 그래서 직접 구현한다.
 *
 * 동작:
 *  - 입력칸 클릭/포커스 → 드롭다운 펼침. 검색어가 비면 전체 목록, 입력하면 이름으로 필터.
 *  - 목록 항목 클릭 → 그 보이스 voiceId 를 저장(입력칸엔 이름 표시).
 *  - 목록에 없는 보이스 → 검색어를 그대로 voiceId 로 지정하는 항목이 맨 아래에 뜬다(공유 보이스 등 대응).
 *  - 검색은 query 로만 다루고 저장은 명시적 선택(클릭)으로만 — 타이핑이 곧장 저장되지 않아 검색/직접입력이 안 섞인다.
 */

type Voice = { voice_id: string; name: string; category?: string | null }

export function EleVoiceCombobox({
  voices, value, onChange, loading, error,
}: {
  voices: Voice[]
  /** 현재 voiceId */
  value: string
  /** voiceId 변경 */
  onChange: (voiceId: string) => void
  loading: boolean
  error: string | null
}) {
  const [open, setOpen] = useState(false)
  // 편집(검색) 중 여부 — 켜지면 입력칸이 query 를, 꺼지면 선택된 보이스 이름을 보여준다.
  const [editing, setEditing] = useState(false)
  const [query, setQuery] = useState('')
  const wrapRef = useRef<HTMLDivElement>(null)

  const selected = voices.find(v => v.voice_id === value)
  // 표시값: 검색 중이면 입력 query, 아니면 선택된 이름(목록에 없으면 raw voiceId).
  const display = editing ? query : (selected?.name ?? value)

  // 바깥 클릭 시 닫기 + 검색 종료(표시값을 선택 이름으로 되돌린다).
  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false); setEditing(false); setQuery('')
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const q = query.trim().toLowerCase()
  const filtered = q ? voices.filter(v => v.name.toLowerCase().includes(q)) : voices
  // 검색어가 어느 보이스 이름과도 정확히 안 맞고, 이미 등록된 id 도 아니면 "직접 지정" 항목을 띄운다.
  const rawQuery = query.trim()
  const showRaw = !!rawQuery
    && !voices.some(v => v.name.toLowerCase() === q || v.voice_id === rawQuery)

  const pick = (voiceId: string) => {
    onChange(voiceId)
    setEditing(false); setOpen(false); setQuery('')
  }

  return (
    <div ref={wrapRef} className="relative" onClick={e => e.stopPropagation()}>
      <div className="flex items-stretch rounded border border-border overflow-hidden">
        <span className="px-2 flex items-center text-sm text-text-secondary bg-slate-100 text-slate-800 font-extrabold border-r border-slate-300 shrink-0">ELE 보이스</span>
        <input
          type="text"
          value={display}
          onFocus={() => { setEditing(true); setQuery(''); setOpen(true) }}
          onChange={e => { setEditing(true); setQuery(e.target.value); setOpen(true) }}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault()
              if (filtered.length) pick(filtered[0].voice_id)
              else if (rawQuery) pick(rawQuery)
            } else if (e.key === 'Escape') {
              setOpen(false); setEditing(false); setQuery('')
            }
          }}
          placeholder={loading ? '불러오는 중…' : selected ? selected.name : '보이스 검색 또는 voiceId 입력'}
          className="h-8 flex-1 text-sm bg-white px-3 text-slate-950 font-bold focus:outline-none"
        />
        <button
          type="button"
          onMouseDown={e => e.preventDefault()}
          onClick={() => { setOpen(o => !o); setEditing(false); setQuery('') }}
          className="px-2 flex items-center bg-white text-slate-500 hover:text-slate-800 border-l border-slate-200 shrink-0"
          title="목록 펼치기"
        >▼</button>
      </div>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-72 overflow-auto rounded border border-slate-300 bg-white shadow-lg">
          {loading && <div className="px-3 py-2 text-xs text-slate-500 font-bold">불러오는 중…</div>}
          {error && <div className="px-3 py-2 text-xs text-danger-text font-bold">목록 로드 실패 — voiceId 직접 입력: {error}</div>}
          {!loading && !error && filtered.length === 0 && !showRaw && (
            <div className="px-3 py-2 text-xs text-slate-400 font-bold">일치하는 보이스 없음</div>
          )}
          {!loading && !error && filtered.length > 0 && (
            <>
              {/* 헤더 행 — 스크롤해도 고정. 컬럼: 이름 · 분류 · 보이스 ID */}
              <div className="sticky top-0 z-10 grid grid-cols-[1fr_auto_148px] gap-3 border-b border-slate-200 bg-slate-100 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wide text-slate-500">
                <span>이름</span>
                <span className="text-center">분류</span>
                <span>보이스 ID</span>
              </div>
              {filtered.map(v => {
                const sel = v.voice_id === value
                return (
                  <button
                    key={v.voice_id}
                    type="button"
                    onClick={() => pick(v.voice_id)}
                    className={`grid w-full grid-cols-[1fr_auto_148px] items-center gap-3 px-3 py-1.5 text-left ${
                      sel ? 'bg-emerald-50 text-emerald-800' : 'text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <span className={`truncate text-sm ${sel ? 'font-extrabold' : 'font-bold'}`}>{v.name}</span>
                    <span className="text-center text-[10px] font-semibold text-slate-400">{v.category ?? '—'}</span>
                    <span className="truncate font-mono text-[10px] text-slate-400">{v.voice_id}</span>
                  </button>
                )
              })}
            </>
          )}
          {showRaw && (
            <button
              type="button"
              onClick={() => pick(rawQuery)}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-purple-700 font-extrabold border-t border-slate-200 hover:bg-purple-50"
            >
              &quot;{rawQuery}&quot; 를 voiceId 로 직접 지정
            </button>
          )}
        </div>
      )}
    </div>
  )
}
