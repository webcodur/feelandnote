'use client'

import { createContext, useContext, useState, useEffect, useRef, useCallback, type ReactNode } from 'react'
import type { EpisodeData } from '@/components/EpisodeEditor'
import type { VoiceFile, VoiceSummary } from '@/components/voice-utils'

type EpisodeContextValue = {
  series: string
  name: string
  isEn: boolean
  episode: EpisodeData | null
  updateEpisode: (ep: EpisodeData) => void
  dirty: boolean
  saving: boolean
  save: (data?: EpisodeData) => Promise<void>
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

  const isEn = name.endsWith('-en')

  const fetchEpisode = useCallback(() => {
    fetch(`/api/${series}/episodes/${name}`)
      .then(r => r.json())
      .then(ep => { setEpisode(ep); setJsonText(JSON.stringify(ep, null, 2)); setDirty(false) })
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

  const updateEpisode = useCallback((ep: EpisodeData) => {
    setEpisode(ep)
    setJsonText(JSON.stringify(ep, null, 2))
    setDirty(true)
  }, [])

  const save = useCallback(async (data?: EpisodeData) => {
    const toSave = data ?? episodeRef.current
    if (!toSave) return
    setSaving(true)
    try {
      const res = await fetch(`/api/${series}/episodes/${name}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(toSave),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? res.statusText)
      setEpisode(toSave)
      setJsonText(JSON.stringify(toSave, null, 2))
      setDirty(false)
    } catch (e: unknown) {
      alert('저장 실패: ' + (e instanceof Error ? e.message : String(e)))
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
