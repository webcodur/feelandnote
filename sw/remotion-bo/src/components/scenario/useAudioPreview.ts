'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { usePlaybackRate } from './usePlaybackRate'
import { dbToLinear } from './gain'

/**
 * 단일 Audio 인스턴스를 ref로 관리하는 셀럽 미리듣기 훅.
 *
 * - 재생 키(playingKey)로 어떤 wav가 재생 중/일시정지 중인지 추적한다.
 * - 키가 바뀌면 이전 재생을 정리하고 새 wav를 재생한다.
 * - paused/currentTime/duration/seek/togglePause/stop을 함께 노출하여 행별 컨트롤 UI를 구성할 수 있다.
 * - 재생 종료/에러 시 자동으로 키를 비운다.
 * - togglePlay에 dB 게인을 함께 넘기면 Web Audio GainNode로 즉시 적용. 재생 중에도 setGainDb로 실시간 반영 가능.
 */
export type AudioPreviewCtl = {
  playingKey: string | null
  paused: boolean
  currentTime: number
  duration: number
  togglePlay: (key: string, gainDb?: number | null) => void
  togglePause: () => void
  stop: () => void
  seek: (t: number) => void
  /** 현재 재생 중인 음원의 음량(dB)을 즉시 변경. 0/undefined면 원본. */
  setGainDb: (db: number | null | undefined) => void
}

export function useAudioPreview(series: string, name: string): AudioPreviewCtl {
  const [playingKey, setPlayingKey] = useState<string | null>(null)
  const [paused, setPaused] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const rafRef = useRef<number>(0)
  const [rate] = usePlaybackRate()

  // Web Audio API — 한 번만 생성. dB 게인을 audio.volume(0~1 한정)이 아닌 GainNode로 적용해
  // +dB 부스트(슬라이더 최대 +12dB)까지 백오피스에서 그대로 들리게 한다.
  const audioCtxRef = useRef<AudioContext | null>(null)
  const gainNodeRef = useRef<GainNode | null>(null)
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null)

  const ensureCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      audioCtxRef.current = new Ctx()
      gainNodeRef.current = audioCtxRef.current.createGain()
      gainNodeRef.current.connect(audioCtxRef.current.destination)
    }
    return { ctx: audioCtxRef.current!, gain: gainNodeRef.current! }
  }, [])

  const cleanup = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    rafRef.current = 0
    const a = audioRef.current
    if (a) {
      a.onended = null
      a.onerror = null
      a.onloadedmetadata = null
      a.pause()
      audioRef.current = null
    }
    if (sourceRef.current) {
      try { sourceRef.current.disconnect() } catch { /* noop */ }
      sourceRef.current = null
    }
  }, [])

  const tick = useCallback(() => {
    const a = audioRef.current
    if (!a) return
    setCurrentTime(a.currentTime)
    if (!a.paused) rafRef.current = requestAnimationFrame(tick)
  }, [])

  const start = useCallback((key: string, gainDb?: number | null) => {
    cleanup()
    setPlayingKey(key)
    setPaused(false)
    setCurrentTime(0)
    setDuration(0)
    const url = `/api/${series}/voice/play/${name}/${key}.wav`
    const audio = new Audio(url)
    audio.playbackRate = rate
    audioRef.current = audio

    // Web Audio 그래프 연결 — audio 요소가 만들어지자마자 잡아서 gain 경유로 출력.
    const { ctx, gain } = ensureCtx()
    if (ctx.state === 'suspended') ctx.resume().catch(() => {})
    gain.gain.value = dbToLinear(gainDb ?? undefined)
    try {
      const src = ctx.createMediaElementSource(audio)
      src.connect(gain)
      sourceRef.current = src
    } catch {
      // 동일 audio 인스턴스에 두 번 createMediaElementSource를 호출하면 throw — 우리는 매번 새로 만들지만 안전망.
    }

    audio.onloadedmetadata = () => {
      if (audioRef.current === audio) setDuration(audio.duration || 0)
    }
    audio.onended = () => {
      if (audioRef.current !== audio) return
      cleanup()
      setPlayingKey(null); setPaused(false); setCurrentTime(0); setDuration(0)
    }
    audio.onerror = () => {
      if (audioRef.current !== audio) return
      console.error('[useAudioPreview] audio load failed:', url)
      cleanup()
      setPlayingKey(null); setPaused(false); setCurrentTime(0); setDuration(0)
    }
    audio.play()
      .then(() => {
        if (audioRef.current !== audio) return
        tick()
      })
      .catch(err => {
        if (audioRef.current !== audio) return
        console.error('[useAudioPreview] audio play rejected:', err)
        cleanup()
        setPlayingKey(null); setPaused(false)
      })
  }, [series, name, rate, cleanup, tick, ensureCtx])

  const stop = useCallback(() => {
    cleanup()
    setPlayingKey(null); setPaused(false); setCurrentTime(0); setDuration(0)
  }, [cleanup])

  const togglePlay = useCallback((key: string, gainDb?: number | null) => {
    if (playingKey === key) {
      stop()
    } else {
      start(key, gainDb)
    }
  }, [playingKey, start, stop])

  const togglePause = useCallback(() => {
    const a = audioRef.current
    if (!a) return
    if (a.paused) {
      a.play()
        .then(() => { setPaused(false); tick() })
        .catch(() => {})
    } else {
      a.pause()
      cancelAnimationFrame(rafRef.current)
      rafRef.current = 0
      setPaused(true)
    }
  }, [tick])

  const seek = useCallback((t: number) => {
    const a = audioRef.current
    if (!a) return
    const max = a.duration || t
    const clamped = Math.max(0, Math.min(t, max))
    a.currentTime = clamped
    setCurrentTime(clamped)
  }, [])

  const setGainDb = useCallback((db: number | null | undefined) => {
    const gain = gainNodeRef.current
    if (!gain) return
    gain.gain.value = dbToLinear(db ?? undefined)
  }, [])

  // 재생 중 배속 변경 → 현재 재생 audio에 즉시 반영
  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = rate
  }, [rate])

  // 언마운트 시 정리
  useEffect(() => () => cleanup(), [cleanup])

  return { playingKey, paused, currentTime, duration, togglePlay, togglePause, stop, seek, setGainDb }
}
