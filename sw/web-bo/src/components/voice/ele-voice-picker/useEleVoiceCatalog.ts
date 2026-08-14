'use client'

import { useEffect, useState } from 'react'
import type { EleVoiceLike } from '@feelandnote/shared/bo/voice-utils'

type Catalog = { voices: EleVoiceLike[]; error: string | null }

let cachedCatalog: Catalog | null = null
let catalogRequest: Promise<Catalog> | null = null

function loadCatalog(): Promise<Catalog> {
  if (cachedCatalog) return Promise.resolve(cachedCatalog)
  if (catalogRequest) return catalogRequest

  catalogRequest = fetch('/api/elevenlabs/voices')
    .then(async response => {
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error ?? `보이스 목록 조회 실패 (${response.status})`)
      if (!Array.isArray(data.voices)) throw new Error(data.error ?? '보이스 목록을 읽지 못했습니다.')
      return { voices: data.voices as EleVoiceLike[], error: null }
    })
    .catch(error => ({ voices: [], error: error instanceof Error ? error.message : String(error) }))
    .then(result => {
      cachedCatalog = result
      return result
    })

  return catalogRequest
}

/** 여러 선택기가 같은 ElevenLabs 목록 요청을 공유한다. */
export function useEleVoiceCatalog() {
  const [catalog, setCatalog] = useState<Catalog>(() => cachedCatalog ?? { voices: [], error: null })
  const [loading, setLoading] = useState(() => cachedCatalog === null)

  useEffect(() => {
    let active = true
    void loadCatalog().then(result => {
      if (!active) return
      setCatalog(result)
      setLoading(false)
    })
    return () => { active = false }
  }, [])

  return { ...catalog, loading }
}
