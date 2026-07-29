'use client'

import { useState, useEffect, useCallback } from 'react'
import type { VoiceSelect } from './types'

// ── Hook: useVoiceSelect ──

export function useVoiceSelect(series: string, name: string) {
  const [vs, setVs] = useState<VoiceSelect>(undefined as unknown as VoiceSelect)
  const [loading, setLoading] = useState(true)
  const fetchVs = useCallback(() => {
    fetch(`/api/${series}/voice/voice-select/${name}`)
      .then(r => r.json())
      .then(d => { setVs(d); setLoading(false) })
      .catch(() => { setVs(null); setLoading(false) })
  }, [series, name])
  useEffect(() => { fetchVs() }, [fetchVs])
  const saveVs = useCallback(async (next: VoiceSelect) => {
    setVs(next)
    if (next) {
      await fetch(`/api/${series}/voice/voice-select/${name}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(next),
      })
    }
  }, [series, name])
  return { vs, loading, saveVs, refetch: fetchVs }
}
