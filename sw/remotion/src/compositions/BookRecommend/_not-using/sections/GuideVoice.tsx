/**
 * GuideVoice — 음성 미생성 구간의 가이드 음성 (Studio 프리뷰 전용)
 *
 * 아직 TTS(wav)를 만들지 않은 자막 구간만, 브라우저 내장 음성(Web Speech API)으로
 * 자막 텍스트를 읽어준다. 음성이 이미 있는 구간은 건드리지 않는다.
 *
 * "따로 놀지 않게" — 프레임이 가리키는 현재 자막을 기준으로만 발화한다:
 *  - 자막이 바뀌면 이전 읽기를 즉시 끊고(cancel) 현재 자막을 읽기 시작한다.
 *  - 타임라인을 점프하면 끊고, 점프 지점의 자막부터 다시 읽는다.
 *  - 정지 중에는 발화하지 않는다(재생 중일 때만).
 *  - 자막이 화면에 떠 있는 시간 안에 다 읽도록 읽기 속도(rate)를 맞춘다.
 *
 * 렌더 출력에는 포함되지 않는다(브라우저 읽기 음성은 녹화되지 않음).
 */
import React, { useEffect, useMemo, useRef } from 'react'
import { useCurrentFrame, useVideoConfig } from 'remotion'
import type { BookRecommendScript } from '../types'
import type { Timeline } from '../useTimeline'
import { buildLongSubs } from '../studio/StudioSubtitles'

interface Props {
  script: BookRecommendScript
  tl: Timeline
}

export const GuideVoice: React.FC<Props> = ({ script, tl }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const subs = useMemo(() => buildLongSubs(script, tl), [script, tl])

  const prevFrame = useRef(frame)
  const spokenKey = useRef<string | null>(null)

  useEffect(() => {
    const tts = typeof window !== 'undefined' ? window.speechSynthesis : null
    if (!tts) return

    const delta = frame - prevFrame.current
    prevFrame.current = frame
    // 재생 중(프레임이 한 칸씩 전진) vs 점프(큰 이동) vs 정지(변화 없음) 판별
    const playing = delta > 0 && delta <= 5
    const jumped = Math.abs(delta) > 5

    if (jumped) { tts.cancel(); spokenKey.current = null }
    if (!playing) return

    const cur = subs.find(s => frame >= s.start && frame < s.end)
    if (!cur || !cur.synthetic || !cur.text.trim()) return

    const key = `${cur.start}:${cur.end}`
    if (spokenKey.current === key) return // 이미 이 자막을 읽는 중

    tts.cancel()
    const u = new SpeechSynthesisUtterance(cur.text)
    u.lang = script.locale === 'en' ? 'en-US' : 'ko-KR'
    // 자막이 화면에 떠 있는 시간 안에 다 읽도록 속도 보정.
    // 영상 구간은 실제 음성 속도(KO_CPS≈6.8자/초)로 잡혀 있는데, 브라우저 읽기 음성은
    // 그보다 느려(rate 1에서 대략 절반) 구간 안에 다 못 읽고 잘린다.
    // 브라우저 기본 속도(BROWSER_CPS) 기준으로 필요한 배속을 계산해 완독시킨다.
    const BROWSER_CPS = 3.4 // 브라우저 SpeechSynthesis 한국어 rate 1 실측 추정(자/초)
    const segSec = (cur.end - cur.start) / fps
    const estReadSec = cur.text.length / BROWSER_CPS // rate 1로 읽는 데 걸리는 시간
    u.rate = Math.min(3, Math.max(0.8, estReadSec / Math.max(0.3, segSec)))
    tts.speak(u)
    spokenKey.current = key
  }, [frame, subs, fps, script.locale])

  // 언마운트(컴포지션 전환 등) 시 발화 중단
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel()
    }
  }, [])

  return null
}
