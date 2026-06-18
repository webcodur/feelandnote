'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import type { VoiceFile } from '../../voice-utils'
import { parseWav, channelToFloat, muteRegions, toAudioBuffer, toBase64, type ParsedWav, type Region } from './wav'

/**
 * 음원 로드 URL·저장 호출을 주입하는 어댑터.
 * 미지정이면 북리커맨드 기본 라우트(/voice/play, /voice/save)를 쓴다.
 * 세력도 등 다른 저장 경로는 이 어댑터로 라우트만 갈아끼운다(동작 동일).
 */
export type BreathEndpoints = {
  /** 캐시 무력화 쿼리까지 포함한 음원 GET URL */
  loadUrl: (series: string, name: string, fileName: string) => string
  /** wav 바이트를 디스크에 저장. 실패 시 throw */
  save: (series: string, name: string, fileName: string, base64: string) => Promise<void>
}

type Args = {
  series: string
  name: string
  file: VoiceFile
  onRefresh: () => void
  /** 로드·저장 라우트 어댑터 (선택). 미지정 시 북리커맨드 기본 라우트. */
  endpoints?: BreathEndpoints
}

// 북리커맨드 기본 라우트 — 기존 동작 보존.
const DEFAULT_ENDPOINTS: BreathEndpoints = {
  loadUrl: (series, name, fileName) => `/api/${series}/voice/play/${name}/${fileName}?t=${Date.now()}`,
  save: async (series, name, fileName, base64) => {
    const res = await fetch(`/api/${series}/voice/save`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ episode: name, fileName, base64 }),
    })
    const data = await res.json()
    if (!data.success) throw new Error(data.error ?? '저장 실패')
  },
}

/** 들숨 제거 모드의 상태·로직 일체 — 로드, 재생, 구간 관리, 저장/복원 */
export function useBreathEditor({ series, name, file, onRefresh, endpoints }: Args) {
  // 어댑터를 ref 에 고정 — 인라인 객체로 넘겨도 effect/callback 의존성이 흔들리지 않게.
  const epRef = useRef<BreathEndpoints>(endpoints ?? DEFAULT_ENDPOINTS)
  epRef.current = endpoints ?? DEFAULT_ENDPOINTS
  const [wav, setWav] = useState<ParsedWav | null>(null)
  const [samples, setSamples] = useState<Float32Array | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [regions, setRegions] = useState<Region[]>([])
  const [playing, setPlaying] = useState(false)
  const [playhead, setPlayhead] = useState(0)
  const [saving, setSaving] = useState(false)
  const [savedCount, setSavedCount] = useState(0)  // 저장 횟수 — 0이면 복원 버튼 비활성
  const regionIdRef = useRef(1)

  // 최초 로드한 원본 바이트 — 저장 후에도 유지, 「원본 복원」용. 패널을 닫으면 사라진다.
  const originalRef = useRef<ArrayBuffer | null>(null)

  const ctxRef = useRef<AudioContext | null>(null)
  const srcRef = useRef<AudioBufferSourceNode | null>(null)
  const animRef = useRef(0)

  // 음원 로드 — 활성 엔진 파일을 받아 WAV 직접 파싱
  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    setWav(null)
    setSamples(null)
    setRegions([])
    fetch(epRef.current.loadUrl(series, name, file.name))
      .then(r => {
        if (!r.ok) throw new Error(`음원 로드 실패 (${r.status})`)
        return r.arrayBuffer()
      })
      .then(buf => {
        if (!alive) return
        const parsed = parseWav(buf)
        if (!originalRef.current) originalRef.current = buf
        setWav(parsed)
        setSamples(channelToFloat(parsed))
        setLoading(false)
      })
      .catch(e => { if (alive) { setError(String(e?.message ?? e)); setLoading(false) } })
    return () => { alive = false }
  }, [series, name, file.name])

  const stop = useCallback(() => {
    cancelAnimationFrame(animRef.current)
    if (srcRef.current) { try { srcRef.current.stop() } catch {} srcRef.current = null }
    setPlaying(false)
  }, [])

  useEffect(() => () => {
    cancelAnimationFrame(animRef.current)
    if (srcRef.current) { try { srcRef.current.stop() } catch {} }
    ctxRef.current?.close().catch(() => {})
  }, [])

  /** from~to 재생. applyMute=true 면 지정 구간이 무음으로 들린다 */
  const play = useCallback((from: number, to?: number, applyMute = true) => {
    if (!wav) return
    stop()
    const ctx = ctxRef.current ?? (ctxRef.current = new AudioContext())
    if (ctx.state === 'suspended') void ctx.resume()
    const buffer = toAudioBuffer(ctx, wav, regions, applyMute)
    const src = ctx.createBufferSource()
    src.buffer = buffer
    src.connect(ctx.destination)
    const dur = (to ?? wav.duration) - from
    src.onended = () => {
      if (srcRef.current !== src) return
      srcRef.current = null
      cancelAnimationFrame(animRef.current)
      setPlaying(false)
    }
    src.start(0, from, dur)
    srcRef.current = src
    const startCtxTime = ctx.currentTime
    setPlaying(true)
    const tick = () => {
      if (srcRef.current !== src) return
      const t = from + (ctx.currentTime - startCtxTime)
      setPlayhead(Math.min(t, to ?? wav.duration))
      animRef.current = requestAnimationFrame(tick)
    }
    tick()
  }, [wav, regions, stop])

  const addRegion = useCallback((start: number, end: number) => {
    if (!wav) return
    const s = Math.max(0, Math.min(start, end))
    const e = Math.min(wav.duration, Math.max(start, end))
    if (e - s < 0.01) return  // 10ms 미만 드래그는 클릭으로 간주
    setRegions(prev => [...prev, { id: regionIdRef.current++, start: s, end: e }].sort((a, b) => a.start - b.start))
  }, [wav])

  const removeRegion = useCallback((id: number) => {
    setRegions(prev => prev.filter(r => r.id !== id))
  }, [])

  const saveBytes = useCallback(async (bytes: ArrayBuffer) => {
    await epRef.current.save(series, name, file.name, toBase64(bytes))
    const parsed = parseWav(bytes)
    setWav(parsed)
    setSamples(channelToFloat(parsed))
    setRegions([])
    onRefresh()
  }, [series, name, file.name, onRefresh])

  /** 지정 구간을 무음 처리한 결과를 디스크에 덮어쓴다 */
  const saveMuted = useCallback(async () => {
    if (!wav || regions.length === 0) return
    stop()
    setSaving(true)
    setError(null)
    try {
      await saveBytes(muteRegions(wav, regions))
      setSavedCount(c => c + 1)
    } catch (e) {
      setError(String((e as Error)?.message ?? e))
    } finally {
      setSaving(false)
    }
  }, [wav, regions, stop, saveBytes])

  /** 패널을 연 시점의 원본으로 되돌린다 */
  const restoreOriginal = useCallback(async () => {
    if (!originalRef.current) return
    stop()
    setSaving(true)
    setError(null)
    try {
      await saveBytes(originalRef.current)
      setSavedCount(0)
    } catch (e) {
      setError(String((e as Error)?.message ?? e))
    } finally {
      setSaving(false)
    }
  }, [stop, saveBytes])

  return {
    wav, samples, loading, error,
    regions, addRegion, removeRegion,
    playing, playhead, play, stop,
    saving, savedCount, saveMuted, restoreOriginal,
  }
}
