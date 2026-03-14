"use client"

import { useCallback, useEffect, useRef, useState } from "react"

/** 마크다운에서 순수 텍스트 추출 (bold, code, list marker 제거) */
function stripMarkdown(md: string): string {
  return md
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^- /gm, "")
    .replace(/\|[^\n]+\|/g, "") // 테이블 제거
    .replace(/\n{2,}/g, "\n")
    .trim()
}

/** 텍스트를 문장 단위로 분리 */
function splitSentences(text: string): string[] {
  // 마침표, 물음표, 느낌표, 큰따옴표+마침표 뒤에서 분리
  const raw = text.split(/(?<=[.!?。])\s+/)
  return raw.map((s) => s.trim()).filter(Boolean)
}

/** 한국어 기준 음성 속도 추정: 초당 ~5.5자 (Cloud TTS 0.95 속도) */
const CHARS_PER_SEC = 5.5

export type TtsState = "idle" | "loading" | "playing" | "paused"

interface UseTextToSpeechReturn {
  state: TtsState
  /** 현재 하이라이트할 문장 인덱스 (-1 = 없음) */
  activeSentenceIndex: number
  /** 문장 목록 (마크다운에서 추출) */
  sentences: string[]
  play: () => void
  pause: () => void
  stop: () => void
}

export function useTextToSpeech(contentMarkdown: string): UseTextToSpeechReturn {
  const plainText = stripMarkdown(contentMarkdown)
  const sentences = splitSentences(plainText)

  const [state, setState] = useState<TtsState>("idle")
  const [activeSentenceIndex, setActiveSentenceIndex] = useState(-1)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const blobUrlRef = useRef<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const abortRef = useRef<AbortController | null>(null)

  // cleanup
  const cleanup = useCallback(() => {
    timerRef.current.forEach(clearTimeout)
    timerRef.current = []
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current)
      blobUrlRef.current = null
    }
    abortRef.current?.abort()
    abortRef.current = null
    setActiveSentenceIndex(-1)
  }, [])

  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [cleanup])

  // contentMarkdown 변경 시 리셋
  useEffect(() => {
    cleanup()
    setState("idle")
  }, [contentMarkdown, cleanup])

  const scheduleHighlights = useCallback(
    (audio: HTMLAudioElement) => {
      if (sentences.length === 0) return

      // 총 예상 시간
      const totalChars = sentences.reduce((sum, s) => sum + s.length, 0)
      const totalEstDuration = totalChars / CHARS_PER_SEC

      // 각 문장 시작 시간 계산
      let elapsed = 0
      for (let i = 0; i < sentences.length; i++) {
        const startTime = elapsed
        const sentenceDuration = (sentences[i].length / totalChars) * totalEstDuration

        const timer = setTimeout(() => {
          if (audio.paused && audio.currentTime === 0) return
          setActiveSentenceIndex(i)
        }, startTime * 1000)

        timerRef.current.push(timer)
        elapsed += sentenceDuration
      }
    },
    [sentences],
  )

  const play = useCallback(async () => {
    // 일시정지 후 재개
    if (state === "paused" && audioRef.current) {
      audioRef.current.play()
      setState("playing")
      return
    }

    // 새로 시작
    cleanup()
    setState("loading")

    const abort = new AbortController()
    abortRef.current = abort

    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: plainText, locale: "ko" }),
        signal: abort.signal,
      })

      if (!res.ok) throw new Error("TTS request failed")

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      blobUrlRef.current = url

      const audio = new Audio(url)
      audioRef.current = audio

      audio.onplay = () => {
        setState("playing")
        scheduleHighlights(audio)
      }

      audio.onended = () => {
        setState("idle")
        setActiveSentenceIndex(-1)
        timerRef.current.forEach(clearTimeout)
        timerRef.current = []
      }

      audio.onerror = () => {
        setState("idle")
        cleanup()
      }

      await audio.play()
    } catch (e: unknown) {
      if (e instanceof Error && e.name === "AbortError") return
      setState("idle")
      cleanup()
    }
  }, [state, plainText, cleanup, scheduleHighlights])

  const pause = useCallback(() => {
    if (audioRef.current && state === "playing") {
      audioRef.current.pause()
      setState("paused")
      // 타이머 정리 (resume 시 재스케줄은 하지 않고 현재 하이라이트 유지)
      timerRef.current.forEach(clearTimeout)
      timerRef.current = []
    }
  }, [state])

  const stop = useCallback(() => {
    cleanup()
    setState("idle")
  }, [cleanup])

  return { state, activeSentenceIndex, sentences, play, pause, stop }
}
