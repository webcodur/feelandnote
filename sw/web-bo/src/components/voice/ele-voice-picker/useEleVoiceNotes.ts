'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { cleanVoiceGainDb, type EleVoiceNote, type EleVoiceNoteStatus } from '@/lib/ele-voice-notes'
import type { EleVoiceLike } from '@feelandnote/shared/bo/voice-utils'

type UpdatePatch = {
  status?: EleVoiceNoteStatus | null
  note?: string
  /** 추가 음량(dB). null 이면 지움 */
  gainDb?: number | null
}

export function useEleVoiceNotes() {
  const [notes, setNotes] = useState<Record<string, EleVoiceNote>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savingVoiceId, setSavingVoiceId] = useState<string | null>(null)
  // 음량을 고치기 직전 값 — 일괄 재적용이 「옛 도감값을 그대로 쓰던 인물」을 골라낼 때 쓴다
  const [previousGainDb, setPreviousGainDb] = useState<Record<string, number | undefined>>({})

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    fetch('/api/elevenlabs/voice-notes')
      .then(r => r.json())
      .then(d => {
        if (!alive) return
        setNotes(d.voices && typeof d.voices === 'object' ? d.voices : {})
      })
      .catch(e => { if (alive) setError(String(e)) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  const blockedVoiceIds = useMemo(
    () => new Set(Object.values(notes).filter(n => n.status === 'blocked').map(n => n.voiceId)),
    [notes],
  )

  const updateVoiceNote = useCallback(async (voice: EleVoiceLike, patch: UpdatePatch) => {
    const voiceId = voice.voice_id
    const previous = notes[voiceId]
    const next: EleVoiceNote = {
      ...previous,
      voiceId,
      name: voice.name,
      category: voice.category ?? null,
      labels: voice.labels ?? null,
      accountLabel: voice.account?.label ?? null,
      updatedAt: new Date().toISOString(),
    }
    if (patch.note !== undefined) next.note = patch.note
    if (patch.gainDb !== undefined) {
      setPreviousGainDb(prev => ({ ...prev, [voiceId]: previous?.gainDb }))
      const g = patch.gainDb === null ? undefined : cleanVoiceGainDb(patch.gainDb)
      if (g === undefined) delete next.gainDb
      else next.gainDb = g
    }
    if (patch.status === null) delete next.status
    else if (patch.status !== undefined) next.status = patch.status

    setSavingVoiceId(voiceId)
    setError(null)
    setNotes(prev => ({ ...prev, [voiceId]: next }))
    try {
      const res = await fetch('/api/elevenlabs/voice-notes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? '보이스 메모 저장 실패')
      if (data.notes?.voices) setNotes(data.notes.voices)
    } catch (e) {
      setError(String(e))
      setNotes(prev => {
        const out = { ...prev }
        if (previous) out[voiceId] = previous
        else delete out[voiceId]
        return out
      })
    } finally {
      setSavingVoiceId(null)
    }
  }, [notes])

  return {
    notes,
    loading,
    error,
    savingVoiceId,
    blockedVoiceIds,
    previousGainDb,
    updateVoiceNote,
  }
}
