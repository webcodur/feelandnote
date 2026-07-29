import { useEffect, useMemo, useRef, useState } from 'react'
import type { DbVoice, ElevenVoice, HostVoiceApply, SaveScope } from './types'

export function useHostVoiceMapping({
  slug, locale, currentEleId, onApply, showDbMirror,
}: {
  slug: string
  locale: 'ko' | 'en'
  currentEleId: string
  onApply: HostVoiceApply
  showDbMirror: boolean
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

  return {
    voicesError,
    voicesLoading,
    dbError,
    filter,
    setFilter,
    scope,
    setScope,
    applying,
    saveStatus,
    previewingId,
    currentDbId,
    filtered,
    playPreview,
    handleApply,
    currentEleName,
    currentDbName,
  }
}
