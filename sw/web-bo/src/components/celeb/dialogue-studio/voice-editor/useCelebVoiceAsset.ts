'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { VoiceFile } from '@feelandnote/shared/bo/voice-utils'
import { encodeWAV, abToBase64 } from '../audio'
import type { Locale } from '../constants'

/**
 * 저장된 대사 음원 한 개를 다루기 좋게 풀어 놓는다.
 *
 * 파형 그리기·앞뒤 자르기는 길이를 알아야 하고, 들숨 편집은 wav 바이트를 요구한다.
 * R2에 있는 것은 대개 mp3라서, 받아서 브라우저가 풀고 wav로 다시 묶어 둔다.
 */
export function useCelebVoiceAsset({
  celebKey, locale, type, variant, exists, reloadTick,
}: {
  /** 창구 주소에 쓰는 인물 키 (셀럽 ID 또는 연결 키) */
  celebKey: string
  locale: Locale
  type: string
  variant?: number
  /** R2에 파일이 있는지 — 없으면 헛되이 받지 않는다 */
  exists: boolean
  /** 저장 후 이 값을 바꾸면 다시 읽는다 */
  reloadTick: number
}) {
  const [file, setFile] = useState<VoiceFile | undefined>(undefined)
  const [wavUrl, setWavUrl] = useState<string | null>(null)
  const [wavBase64, setWavBase64] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const wavUrlRef = useRef<string | null>(null)

  const fileName = useMemo(
    () => (type === 'quote' ? 'quote' : `${type}-${variant}`),
    [type, variant],
  )

  const fileUrl = useMemo(() => {
    const qs = new URLSearchParams({ locale, type })
    if (variant) qs.set('variant', String(variant))
    if (reloadTick) qs.set('t', String(reloadTick))
    return `/api/celebs/${encodeURIComponent(celebKey)}/voice/file?${qs}`
  }, [celebKey, locale, type, variant, reloadTick])

  useEffect(() => {
    if (!exists) {
      setFile(undefined)
      setWavUrl(null)
      setWavBase64(null)
      return
    }

    let alive = true
    setLoading(true)
    setError(null)

    fetch(fileUrl)
      .then(r => {
        if (!r.ok) throw new Error(`음원을 못 읽었다 (${r.status})`)
        return r.arrayBuffer()
      })
      .then(async buf => {
        const ctx = new AudioContext()
        try {
          const decoded = await ctx.decodeAudioData(buf.slice(0))
          if (!alive) return
          setFile({
            name: `${locale}/${fileName}`,
            sizeKB: Math.round(buf.byteLength / 1024),
            duration: decoded.duration,
            engine: 'elevenlabs',
          })
          // 들숨 편집기는 wav 만 다룬다 — 여기서 미리 바꿔 둔다
          const wav = encodeWAV(decoded, 0, decoded.duration)
          const url = URL.createObjectURL(new Blob([wav], { type: 'audio/wav' }))
          if (wavUrlRef.current) URL.revokeObjectURL(wavUrlRef.current)
          wavUrlRef.current = url
          setWavUrl(url)
          setWavBase64(abToBase64(wav))
        } finally {
          await ctx.close()
        }
      })
      .catch(e => { if (alive) setError(String(e?.message ?? e)) })
      .finally(() => { if (alive) setLoading(false) })

    return () => { alive = false }
  }, [fileUrl, exists, locale, fileName])

  // 화면을 떠날 때 임시 주소를 거둔다
  useEffect(() => () => {
    if (wavUrlRef.current) URL.revokeObjectURL(wavUrlRef.current)
  }, [])

  return { file, fileUrl, fileName, wavUrl, wavBase64, loading, error }
}
