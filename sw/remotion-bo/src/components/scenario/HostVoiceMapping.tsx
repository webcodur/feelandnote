'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { SpeakerEngine } from './SpeakerPanel'

/**
 * host ELE 보이스 매핑 펼침 영역 — HostSpeakerRow 의 본문.
 *
 * 책임:
 *  - ElevenLabs 보이스 목록 fetch + 검색 + 미리듣기.
 *  - DB(profiles.voice_id_ko/en) 현재값 표시 + 불일치 경고.
 *  - 저장 범위(에피소드/DB/둘 다) 선택 후 적용.
 *
 * 부모(HostSpeakerRow) 가 episode 갱신 · 저장을 직접 처리하지 않고 콜백으로 위임.
 */

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

export type SaveScope = 'episode' | 'db' | 'both'

const SAVE_SCOPE_LABEL: Record<SaveScope, string> = {
  episode: '이 에피소드만',
  db: '인물 전체 (DB만)',
  both: '둘 다',
}

export function HostVoiceMapping({
  slug, locale, currentEleId, dirty, onApply, showDbMirror = true,
}: {
  slug: string
  locale: 'ko' | 'en'
  /** 현재 에피소드 host.elevenlabsVoiceId */
  currentEleId: string
  /** 다른 미저장 변경 잔존 여부 — 안내 문구 표시용 */
  dirty: boolean
  /** 보이스 적용 — 저장 범위에 따라 부모가 episode/DB 저장 수행. 결과 메시지를 반환. */
  onApply: (voiceId: string, scope: SaveScope) => Promise<{ ok: boolean; message: string }>
  /**
   * 인물 DB(profiles.voice_id_*) 와의 동기화 UI 노출 여부.
   * - true(기본): host 행에서 DB 현황 · 저장 범위 토글 표시.
   * - false: 추가 화자 행은 DB 와 무관하므로 숨기고 에피소드 JSON 에만 적용.
   */
  showDbMirror?: boolean
}) {
  const [voices, setVoices] = useState<ElevenVoice[]>([])
  const [voicesError, setVoicesError] = useState<string | null>(null)
  const [voicesLoading, setVoicesLoading] = useState(false)
  const [dbVoice, setDbVoice] = useState<DbVoice | null>(null)
  const [dbError, setDbError] = useState<string | null>(null)
  const [filter, setFilter] = useState('')
  const [scope, setScope] = useState<SaveScope>(showDbMirror ? 'both' : 'episode')
  const [applying, setApplying] = useState(false)
  const [saveStatus, setSaveStatus] = useState<string | null>(null)

  // 미리듣기
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [previewingId, setPreviewingId] = useState<string | null>(null)

  // 보이스 목록 fetch (마운트 시 1회)
  useEffect(() => {
    if (voices.length > 0 || voicesLoading) return
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
  }, [voices.length, voicesLoading])

  // DB voice 조회 — host 행에서만. 추가 화자는 DB 미러 없음.
  useEffect(() => {
    if (!showDbMirror) return
    setDbError(null)
    fetch(`/api/celebs/${slug}/voice`)
      .then(async r => {
        const d = await r.json()
        if (!r.ok) throw new Error(d.error ?? r.statusText)
        return d
      })
      .then(d => setDbVoice(d))
      .catch(e => setDbError(String(e?.message ?? e)))
  }, [slug, showDbMirror])

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

  const handleApply = async (voiceId: string) => {
    setApplying(true)
    setSaveStatus(null)
    try {
      const result = await onApply(voiceId, scope)
      setSaveStatus(result.message)
      if (result.ok && (scope === 'db' || scope === 'both')) {
        // 화면 표시용 DB 캐시 즉시 반영
        setDbVoice(prev => prev ? {
          ...prev,
          voice_id_ko: locale === 'ko' ? voiceId : prev.voice_id_ko,
          voice_id_en: locale === 'en' ? voiceId : prev.voice_id_en,
        } : prev)
      }
      setTimeout(() => setSaveStatus(null), 4000)
    } finally {
      setApplying(false)
    }
  }

  const currentEleName = currentEleId ? voiceById.get(currentEleId)?.name ?? null : null
  const currentDbName = currentDbId ? voiceById.get(currentDbId)?.name ?? null : null

  return (
    <div className="border border-purple-500/20 bg-bg-card rounded p-3 space-y-3">
      {/* 현황 — host 는 에피소드/DB 2칸, 추가 화자는 에피소드 1칸만 */}
      <div className={`grid gap-2 text-[11px] ${showDbMirror ? 'grid-cols-2' : 'grid-cols-1'}`}>
        <div className="bg-bg-main rounded px-2 py-1.5 border border-border">
          <div className="text-text-dim mb-0.5">현재 보이스 ({locale})</div>
          <div className="font-mono text-text-secondary truncate">
            {currentEleName ?? (currentEleId || '—')}
          </div>
          {currentEleName && (
            <div className="text-text-dim font-mono text-[11px] truncate">{currentEleId}</div>
          )}
        </div>
        {showDbMirror && (
          <div className="bg-bg-main rounded px-2 py-1.5 border border-border">
            <div className="text-text-dim mb-0.5">DB voice_id_{locale}</div>
            <div className="font-mono text-text-secondary truncate">
              {dbError ? <span className="text-red-400">{dbError}</span> : (currentDbName ?? (currentDbId || '—'))}
            </div>
            {currentDbName && (
              <div className="text-text-dim font-mono text-[11px] truncate">{currentDbId}</div>
            )}
          </div>
        )}
      </div>

      {/* 저장 범위 — host 전용. 추가 화자는 에피소드 JSON 고정. */}
      {showDbMirror && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] text-text-secondary">저장 범위:</span>
          {(['episode', 'db', 'both'] as SaveScope[]).map(s => (
            <button
              key={s}
              type="button"
              onClick={() => setScope(s)}
              className={`px-2 py-0.5 rounded text-[11px] border ${
                scope === s
                  ? 'bg-purple-500/20 text-purple-200 border-purple-500/60 font-semibold'
                  : 'bg-bg-main border-border text-text-dim hover:text-text-secondary'
              }`}
            >
              {SAVE_SCOPE_LABEL[s]}
            </button>
          ))}
        </div>
      )}

      <input
        type="text"
        placeholder="이름 · ID · 라벨로 검색"
        value={filter}
        onChange={e => setFilter(e.target.value)}
        className="w-full bg-bg-main border border-border rounded px-2 py-1 text-sm focus:outline-none focus:border-accent"
      />

      {/* 보이스 목록 */}
      <div className="max-h-72 overflow-y-auto border border-border rounded">
        {voicesLoading && <div className="px-3 py-4 text-[11px] text-text-dim">목록 불러오는 중…</div>}
        {voicesError && <div className="px-3 py-4 text-[11px] text-red-400">목록 실패: {voicesError}</div>}
        {!voicesLoading && !voicesError && filtered.length === 0 && (
          <div className="px-3 py-4 text-[11px] text-text-dim">결과 없음</div>
        )}
        {filtered.map(v => {
          const isCurrent = v.voice_id === currentEleId
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
                className={`w-6 h-6 flex items-center justify-center rounded text-[11px] ${
                  v.preview_url
                    ? 'bg-bg-main border border-border hover:border-purple-500/40'
                    : 'bg-bg-main border border-border opacity-30 cursor-not-allowed'
                }`}
                title={v.preview_url ? '미리듣기' : '미리듣기 없음'}
              >
                {isPlaying ? '❚❚' : '▶'}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-text-primary truncate">{v.name}</span>
                  {lang && <span className="text-[11px] text-text-dim">[{lang}]</span>}
                  {v.category && <span className="text-[11px] text-text-dim">({v.category})</span>}
                  {isCurrent && <span className="text-[11px] text-purple-300">현재</span>}
                  {isDb && !isCurrent && <span className="text-[11px] text-blue-300">DB</span>}
                </div>
                <div className="font-mono text-[11px] text-text-dim truncate">{v.voice_id}</div>
              </div>
              <button
                type="button"
                disabled={applying || isCurrent}
                onClick={() => handleApply(v.voice_id)}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
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
        <p className="text-[11px] text-amber-300/80">
          에피소드에 다른 미저장 변경이 남아 있습니다. 적용 시 전체 JSON 이 함께 저장됩니다.
        </p>
      )}
      {saveStatus && (
        <p className="text-[11px] text-text-secondary">{saveStatus}</p>
      )}
    </div>
  )
}

// 외부에서 DB 미러 비교용으로도 쓰는 헬퍼 — currentEleId vs DB 불일치 판정
export function isVoiceMismatch(currentEleId: string, dbVoice: DbVoice | null, locale: 'ko' | 'en'): boolean {
  if (!currentEleId) return false
  const dbId = locale === 'ko' ? dbVoice?.voice_id_ko : dbVoice?.voice_id_en
  if (!dbId) return false
  return currentEleId !== dbId
}

// 부모가 받아 처리할 콜백 시그니처 재export
export type HostVoiceApply = (voiceId: string, scope: SaveScope) => Promise<{ ok: boolean; message: string }>

// 부모가 HostVoiceMapping 외부에서도 SpeakerEngine 타입을 쓸 수 있게 재export (필요 시).
export type { SpeakerEngine }
