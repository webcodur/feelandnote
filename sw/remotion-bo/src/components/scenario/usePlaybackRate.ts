'use client'

import { useEffect, useState } from 'react'

/**
 * 모든 오디오 재생 경로가 공유하는 배속 설정.
 *
 * - localStorage에 저장. 새 탭에서도 같은 값 사용.
 * - subscribe 모델 — 각 재생 훅이 rate 변경 즉시 audio.playbackRate에 반영.
 * - 1.0 외 값은 기본 색조와 다른 강조 색을 띄워 "지금 배속 켜진 상태"임을 표시.
 */
const STORAGE_KEY = 'remotion-bo:playback-rate'
const FALLBACK = 1

export const PLAYBACK_RATES = [0.75, 1, 1.25, 1.5, 2, 3, 4] as const

const listeners = new Set<(rate: number) => void>()

function readInitial(): number {
  if (typeof window === 'undefined') return FALLBACK
  const raw = window.localStorage.getItem(STORAGE_KEY)
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : FALLBACK
}

let currentRate = readInitial()

export function getPlaybackRate() {
  return currentRate
}

export function setPlaybackRate(rate: number) {
  if (!Number.isFinite(rate) || rate <= 0) return
  currentRate = rate
  if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, String(rate))
  listeners.forEach(l => l(rate))
}

export function usePlaybackRate(): [number, (rate: number) => void] {
  const [rate, setRate] = useState<number>(currentRate)
  useEffect(() => {
    listeners.add(setRate)
    return () => { listeners.delete(setRate) }
  }, [])
  return [rate, setPlaybackRate]
}
