import { useEffect, useMemo, useRef, useState } from 'react'
import { useEpisode } from '@/lib/episode-context'
import type { DbVoice, ElevenVoice, SaveScope } from './types'
import { nameToSlug } from './utils'

export function useVoiceMapping() {
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

  return {
    locale,
    dbError,
    open,
    setOpen,
    filter,
    setFilter,
    scope,
    setScope,
    savingScope,
    saveStatus,
    voicesLoading,
    voicesError,
    filtered,
    previewingId,
    currentJsonId,
    currentDbId,
    currentJsonName,
    currentDbName,
    mismatch,
    dirty,
    playPreview,
    apply,
  }
}
