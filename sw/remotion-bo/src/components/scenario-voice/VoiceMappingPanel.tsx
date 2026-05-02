'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useEpisode } from '@/lib/episode-context'

type ElevenVoice = {
  voice_id: string
  name: string
  category: string | null
  labels: Record<string, string> | null
  preview_url: string | null
  description: string | null
}

type DbVoice = {
  id: string
  slug: string | null
  nickname: string | null
  voice_id_ko: string | null
  voice_id_en: string | null
}

type SaveScope = 'episode' | 'db' | 'both'

/** 에피소드 파일명 → 인물 slug. -en 접미사, -숫자 변형 제거. */
function nameToSlug(name: string): string {
  const base = name.endsWith('-en') ? name.slice(0, -3) : name
  const m = base.match(/^(.+)-\d+$/)
  return m ? m[1] : base
}

const SAVE_SCOPE_LABEL: Record<SaveScope, string> = {
  episode: '이 에피소드만 (JSON)',
  db: '인물 전체 (DB만)',
  both: '둘 다 (DB + 이 에피소드)',
}

export function VoiceMappingPanel() {
  const { episode, name, isEn, updateEpisode, save, dirty } = useEpisode()
  const slug = useMemo(() => nameToSlug(name), [name])
  const locale: 'ko' | 'en' = isEn ? 'en' : 'ko'

  const [voices, setVoices] = useState<ElevenVoice[]>([])
  const [voicesError, setVoicesError] = useState<string | null>(null)
  const [voicesLoading, setVoicesLoading] = useState(false)
  const [dbVoice, setDbVoice] = useState<DbVoice | null>(null)
  const [dbError, setDbError] = useState<string | null>(null)

  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState('')
  const [scope, setScope] = useState<SaveScope>('both')
  const [savingScope, setSavingScope] = useState(false)
  const [saveStatus, setSaveStatus] = useState<string | null>(null)

  // 미리듣기 (정적 preview_url)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [previewingId, setPreviewingId] = useState<string | null>(null)

  // 보이스 목록 + DB 값 fetch (펼칠 때 1회)
  useEffect(() => {
    if (!open || voices.length > 0 || voicesLoading) return
    setVoicesLoading(true)
    setVoicesError(null)
    fetch('/api/elevenlabs/voices')
      .then(async r => {
        const d = await r.json()
        if (!r.ok) throw new Error(d.error ?? r.statusText)
        return d
      })
      .then(d => setVoices(d.voices ?? []))
      .catch(e => setVoicesError(String(e?.message ?? e)))
      .finally(() => setVoicesLoading(false))
  }, [open, voices.length, voicesLoading])

  useEffect(() => {
    if (!open) return
    setDbError(null)
    fetch(`/api/celebs/${slug}/voice`)
      .then(async r => {
        const d = await r.json()
        if (!r.ok) throw new Error(d.error ?? r.statusText)
        return d
      })
      .then(d => setDbVoice(d))
      .catch(e => setDbError(String(e?.message ?? e)))
  }, [open, slug])

  const currentJsonId = episode?.host?.elevenlabsVoiceId ?? ''
  const currentDbId = locale === 'ko' ? dbVoice?.voice_id_ko : dbVoice?.voice_id_en

  const voiceById = useMemo(() => {
    const m = new Map<string, ElevenVoice>()
    voices.forEach(v => m.set(v.voice_id, v))
    return m
  }, [voices])

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return voices
    return voices.filter(v => {
      if (v.name.toLowerCase().includes(q)) return true
      if (v.voice_id.toLowerCase().includes(q)) return true
      const lab = v.labels ? Object.values(v.labels).join(' ').toLowerCase() : ''
      return lab.includes(q)
    })
  }, [voices, filter])

  const playPreview = (v: ElevenVoice) => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    if (previewingId === v.voice_id) {
      setPreviewingId(null)
      return
    }
    if (!v.preview_url) return
    const a = new Audio(v.preview_url)
    audioRef.current = a
    setPreviewingId(v.voice_id)
    a.onended = () => setPreviewingId(null)
    a.play().catch(() => setPreviewingId(null))
  }

  const apply = async (newId: string) => {
    if (!episode) return
    setSavingScope(true)
    setSaveStatus(null)
    try {
      const messages: string[] = []

      if (scope === 'db' || scope === 'both') {
        const res = await fetch(`/api/celebs/${slug}/voice`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ locale, voiceId: newId }),
        })
        const d = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(d.error ?? `DB 저장 실패 (${res.status})`)
        messages.push(`DB(${locale}) 저장`)
        setDbVoice(prev => prev ? {
          ...prev,
          voice_id_ko: locale === 'ko' ? newId : prev.voice_id_ko,
          voice_id_en: locale === 'en' ? newId : prev.voice_id_en,
        } : prev)
      }

      if (scope === 'episode' || scope === 'both') {
        const next = { ...episode, host: { ...(episode.host ?? {}), elevenlabsVoiceId: newId } } as typeof episode
        // updateEpisode → dirty 플래그 + 즉시 PUT 저장으로 일원화
        updateEpisode(next as any)
        const result = await save(next as any)
        if (!result?.ok) throw new Error('에피소드 JSON 저장 실패')
        messages.push('에피소드 JSON 저장')
      }

      setSaveStatus(messages.join(' · '))
      setTimeout(() => setSaveStatus(null), 4000)
    } catch (e) {
      setSaveStatus('실패: ' + (e instanceof Error ? e.message : String(e)))
    } finally {
      setSavingScope(false)
    }
  }

  const currentJsonName = currentJsonId ? voiceById.get(currentJsonId)?.name ?? null : null
  const currentDbName = currentDbId ? voiceById.get(currentDbId)?.name ?? null : null
  const mismatch = !!currentJsonId && !!currentDbId && currentJsonId !== currentDbId

  return (
    <div className="border border-border/40 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-bg-hover"
      >
        <span className="text-[11px] font-medium text-purple-300">인물 보이스</span>
        <span className="text-[10px] text-text-dim font-mono">
          {currentJsonId ? (currentJsonName ?? currentJsonId) : '미배정'}
        </span>
        {mismatch && (
          <span className="text-[10px] text-amber-300/90 ml-1">DB와 다름</span>
        )}
        <span className="text-text-dim text-xs ml-auto">{open ? '▼' : '▶'}</span>
      </button>

      {open && (
        <div className="border-t border-border bg-bg-card p-3 space-y-3">
          {/* 현황 */}
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

          {/* 저장 범위 + 검색 */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] text-text-secondary">저장 범위:</span>
            {(['episode', 'db', 'both'] as SaveScope[]).map(s => (
              <button
                key={s}
                type="button"
                onClick={() => setScope(s)}
                className={`px-2 py-0.5 rounded text-[10px] border ${
                  scope === s
                    ? 'bg-purple-500/20 text-purple-200 border-purple-500/60 font-semibold'
                    : 'bg-bg-main border-border text-text-dim hover:text-text-secondary'
                }`}
              >
                {SAVE_SCOPE_LABEL[s]}
              </button>
            ))}
          </div>

          <input
            type="text"
            placeholder="이름·ID·라벨로 검색"
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="w-full bg-bg-main border border-border rounded px-2 py-1 text-sm focus:outline-none focus:border-accent"
          />

          {/* 보이스 목록 */}
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

          {dirty && (
            <p className="text-[10px] text-amber-300/80">
              에피소드에 다른 미저장 변경이 남아 있습니다. 적용 시 전체 JSON이 함께 저장됩니다.
            </p>
          )}
          {saveStatus && (
            <p className="text-[11px] text-text-secondary">{saveStatus}</p>
          )}
        </div>
      )}
    </div>
  )
}
