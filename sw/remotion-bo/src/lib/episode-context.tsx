'use client'

import { createContext, useContext, useState, useEffect, useRef, useCallback, type ReactNode } from 'react'
import type { EpisodeData } from '@/components/EpisodeEditor'
import type { VoiceFile, VoiceSummary } from '@feelandnote/shared/bo/voice-utils'

export type SaveResult = { ok: boolean; fieldSync?: { synced: number; textAnchorsNeeded: number } | null }
/** 저장 범위 — 어떤 파일군만 기록할지 한정. 'all'=전체(현행). 서버 SaveScope 와 동일 값. */
export type SaveScope = 'all' | 'longform' | 'shorts'

type EpisodeContextValue = {
  series: string
  name: string
  isEn: boolean
  episode: EpisodeData | null
  updateEpisode: (ep: EpisodeData) => void
  dirty: boolean
  saving: boolean
  save: (data?: EpisodeData, opts?: { scope?: SaveScope }) => Promise<SaveResult | null>
  reload: () => void
  voiceFiles: VoiceFile[]
  voiceSummary: VoiceSummary
  refreshFiles: () => void
  post: (url: string, body: unknown) => Promise<void>
  playVoice: (fileName: string) => void
  jsonText: string
  setJsonText: (t: string) => void
  setDirty: (d: boolean) => void
  saveFromJson: () => Promise<void>
}

const EpisodeContext = createContext<EpisodeContextValue | null>(null)

export function useEpisode() {
  const ctx = useContext(EpisodeContext)
  if (!ctx) throw new Error('useEpisode must be used within EpisodeProvider')
  return ctx
}

const EMPTY_SUMMARY: VoiceSummary = { total: 0, totalSizeKB: 0 }

export function EpisodeProvider({ series, name, children }: { series: string; name: string; children: ReactNode }) {
  const [episode, setEpisode] = useState<EpisodeData | null>(null)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [jsonText, setJsonText] = useState('')
  const [voiceFiles, setVoiceFiles] = useState<VoiceFile[]>([])
  const [voiceSummary, setVoiceSummary] = useState<VoiceSummary>(EMPTY_SUMMARY)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const episodeRef = useRef<EpisodeData | null>(null)
  episodeRef.current = episode
  // 로드/저장 시점 스냅샷 — longform 부분 저장에서 "변경된 책"만 가려내는 기준.
  const baselineRef = useRef<EpisodeData | null>(null)

  const isEn = name.endsWith('-en')

  const fetchEpisode = useCallback(() => {
    fetch(`/api/${series}/episodes/${name}`)
      .then(r => r.json())
      .then(ep => { setEpisode(ep); baselineRef.current = JSON.parse(JSON.stringify(ep)); setJsonText(JSON.stringify(ep, null, 2)); setDirty(false) })
      .catch(() => {})
  }, [series, name])

  const refreshFiles = useCallback(() => {
    fetch(`/api/${series}/voice/files/${name}`)
      .then(r => r.json())
      .then(data => {
        setVoiceFiles(data.files ?? [])
        setVoiceSummary(data.summary ?? EMPTY_SUMMARY)
      })
      .catch(() => {})
  }, [series, name])

  useEffect(() => {
    fetchEpisode()
    refreshFiles()
  }, [fetchEpisode, refreshFiles])

  // 외부에서 JSON/voice 파일이 갱신된 경우(에디터로 직접 수정 등) 탭 활성화 시 자동 재로드.
  // dirty/saving 중에는 스킵해 사용자 편집을 덮어쓰지 않는다.
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState !== 'visible') return
      if (dirty || saving) return
      fetchEpisode()
      refreshFiles()
    }
    window.addEventListener('focus', handler)
    document.addEventListener('visibilitychange', handler)
    return () => {
      window.removeEventListener('focus', handler)
      document.removeEventListener('visibilitychange', handler)
    }
  }, [dirty, saving, fetchEpisode, refreshFiles])

  const updateEpisode = useCallback((ep: EpisodeData) => {
    setEpisode(ep)
    setJsonText(JSON.stringify(ep, null, 2))
    setDirty(true)
  }, [])

  const save = useCallback(async (data?: EpisodeData, opts?: { scope?: SaveScope }): Promise<SaveResult | null> => {
    const toSave = data ?? episodeRef.current
    if (!toSave) return null
    setSaving(true)
    try {
      const sc = opts?.scope
      // scope 지정 시 해당 파일군만 기록(쇼츠↔롱폼 교차 덮어쓰기 방지). 미지정/'all'은 전체 저장.
      const params = new URLSearchParams()
      if (sc && sc !== 'all') params.set('scope', sc)
      // longform 부분 저장: baseline 과 비교해 실제 바뀐 책 인덱스만 기록한다.
      // BO 가 안 건드린 책은 디스크 원본을 보존 → 동시편집/외부수정 덮어쓰기 방지.
      const base = baselineRef.current as unknown as { books?: unknown[] } | null
      const cur = toSave as unknown as { books?: unknown[] }
      if (sc === 'longform' && Array.isArray(base?.books) && Array.isArray(cur.books)
          && base!.books!.length === cur.books!.length) {
        const changed: number[] = []
        for (let i = 0; i < cur.books!.length; i++) {
          if (JSON.stringify(cur.books![i]) !== JSON.stringify(base!.books![i])) changed.push(i)
        }
        // 일부만 변경된 경우에만 부분 저장(전부 변경이면 전체 저장으로 둔다).
        if (changed.length < cur.books!.length) params.set('books', changed.join(','))
      }
      const qs = params.toString() ? `?${params.toString()}` : ''
      const res = await fetch(`/api/${series}/episodes/${name}${qs}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(toSave),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? res.statusText)
      const result: SaveResult = await res.json()
      setEpisode(toSave)
      baselineRef.current = JSON.parse(JSON.stringify(toSave))
      setJsonText(JSON.stringify(toSave, null, 2))
      setDirty(false)
      return result
    } catch (e: unknown) {
      alert('저장 실패: ' + (e instanceof Error ? e.message : String(e)))
      return null
    } finally {
      setSaving(false)
    }
  }, [series, name])

  const saveFromJson = useCallback(async () => {
    try {
      const parsed = JSON.parse(jsonText)
      await save(parsed)
    } catch (e: unknown) {
      alert('JSON 오류: ' + (e instanceof Error ? e.message : String(e)))
    }
  }, [jsonText, save])

  const post = useCallback(async (url: string, body: unknown) => {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }))
      alert('실패: ' + (err.error ?? res.statusText))
    }
  }, [])

  const playVoice = useCallback((fileName: string) => {
    if (audioRef.current) audioRef.current.pause()
    audioRef.current = new Audio(`/api/${series}/voice/play/${name}/${fileName}`)
    audioRef.current.play()
  }, [series, name])

  return (
    <EpisodeContext.Provider value={{
      series, name, isEn,
      episode, updateEpisode,
      dirty, saving, save, reload: fetchEpisode,
      voiceFiles, voiceSummary, refreshFiles,
      post, playVoice,
      jsonText, setJsonText, setDirty, saveFromJson,
    }}>
      {children}
    </EpisodeContext.Provider>
  )
}
