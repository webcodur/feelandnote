'use client'

import { useEffect, useMemo, useState } from 'react'
import type { FactionPerson } from '@/lib/faction-types'
import type { SegmentEngineSpec } from '../../../../../../voice-utils'
import type { GenEngine } from '../../../../../../scenario-voice/ExpandedVoicePanel/types'
import { VOICE } from '@feelandnote/shared/lib/voice-policy'
import type { FactionVoiceSlot } from './voice-slots'

/**
 * 북리커맨드 useVoiceSpec 의 세력도(인물 1명) 어댑터 — 슬롯(대사/수식어) 파라미터화.
 *
 * 한 인물의 한 음성 슬롯(대사 또는 수식어 나레이션)을 "에피소드 + 구간키" 단위로 치환한다.
 * 읽고 쓰는 인물 필드는 slot.fields 로, 합성 텍스트는 slot.text 로 갈린다(대사·수식어 동일 UI 공유).
 */

type UseFactionVoiceSpecArgs = {
  person: FactionPerson
  /** 인물 음성 spec 필드 갱신(부분) — 디스크 저장은 부모가 처리 */
  onPersonChange: (next: FactionPerson) => void
  /** 음성 슬롯 — 대사(QUOTE_SLOT) 또는 수식어(EPITHET_SLOT) */
  slot: FactionVoiceSlot
}

export function useFactionVoiceSpec({ person, onPersonChange, slot }: UseFactionVoiceSpecArgs) {
  const F = slot.fields
  // 한 필드 갱신 헬퍼 — 슬롯 키로 인물 데이터에 영속한다.
  const setField = (key: keyof FactionPerson, val: unknown) =>
    onPersonChange({ ...person, [key]: val } as FactionPerson)

  // 합성 텍스트 — 슬롯이 정의한 텍스트(대사=통대사 / 수식어=한 문장).
  const original = useMemo(() => slot.text(person), [slot, person])
  const sectionTexts = useMemo(() => ({ original, tts: original }), [original])
  const [ttsText, setTtsText] = useState(original)
  // 다른 인물/슬롯으로 패널이 바뀌거나 원문이 갱신되면 입력칸을 원문으로 리셋
  useEffect(() => { setTtsText(original) }, [original])

  // ── 엔진 결정 ──
  const personEngine: GenEngine = (person[F.engine] as GenEngine | undefined) ?? 'gemini'
  const [chosenEngine, setChosenEngine] = useState<GenEngine>(personEngine)
  useEffect(() => { setChosenEngine(personEngine) }, [personEngine])

  // chosenEngine 토글 → 인물 데이터(slot.engine)에 반영(일괄 생성·렌더와 일치). 'gemini'(기본)는 필드를 비운다.
  const handleChosenEngine = (e: GenEngine) => {
    setChosenEngine(e)
    setField(F.engine, e === 'gemini' ? undefined : e)
  }

  // ── 보이스 spec ──
  const stylePrefix = (person[F.style] as string | undefined) ?? ''
  const geminiVoice = (person[F.speaker] as string | undefined) || VOICE.celeb
  const geminiSpec: SegmentEngineSpec = useMemo(
    () => ({ engine: 'gemini', voiceParam: geminiVoice, stylePrefix }),
    [geminiVoice, stylePrefix],
  )

  // 스타일 저장 — GenerateSection 이 longform 경로로 호출. 슬롯 style 필드에 영속(빈 값이면 제거).
  const saveQuoteStyle = (value: string) => {
    const trimmed = value.trim()
    if (((person[F.style] as string | undefined) ?? '') === trimmed) return
    setField(F.style, trimmed || undefined)
  }

  const eleVoiceId = (person[F.eleVoiceId] as string | undefined) ?? ''
  const setEleVoiceId = (v: string) => setField(F.eleVoiceId, v.trim() || undefined)
  const eleSpec: SegmentEngineSpec = useMemo(
    () => ({ engine: 'elevenlabs', voiceParam: eleVoiceId }),
    [eleVoiceId],
  )

  // ELE 감정/강도
  const eleOptions = person[F.eleOptions] as { stability?: number; style?: number } | undefined
  const setEleOptions = (next: { stability?: number; style?: number }) => {
    const cleaned: { stability?: number; style?: number } = {}
    if (typeof next.stability === 'number') cleaned.stability = next.stability
    if (typeof next.style === 'number') cleaned.style = next.style
    setField(F.eleOptions, Object.keys(cleaned).length ? cleaned : undefined)
  }

  // ── ELE 감정 태그 / 끝 패딩 ──
  const eleEmotions = (person[F.eleEmotions] as string[] | undefined) ?? []
  const eleTrail = (person[F.eleTrail] as boolean | undefined) ?? true
  const [emotionDraft, setEmotionDraft] = useState('')

  const setEleEmotions = (next: string[]) => setField(F.eleEmotions, next.length ? next : undefined)

  // 감정 토글 — 최대 2개. 초과 시 가장 오래된 것을 밀어낸다.
  const toggleEmotion = (em: string) => {
    if (eleEmotions.includes(em)) {
      setEleEmotions(eleEmotions.filter(e => e !== em))
    } else if (eleEmotions.length >= 2) {
      setEleEmotions([eleEmotions[1], em])
    } else {
      setEleEmotions([...eleEmotions, em])
    }
  }

  // 직접 입력 감정 추가 — 중복 무시, 최대 2개 유지.
  const addCustomEmotion = () => {
    const v = emotionDraft.trim()
    if (!v) return
    if (eleEmotions.includes(v)) { setEmotionDraft(''); return }
    const next = eleEmotions.length >= 2 ? [eleEmotions[1], v] : [...eleEmotions, v]
    setEleEmotions(next)
    setEmotionDraft('')
  }

  // 끝 패딩 토글 — 켜짐이 기본이라 끌 때만 false 저장, 다시 켜면 필드 제거.
  const setEleTrail = (on: boolean) => setField(F.eleTrail, on ? undefined : false)

  // ── 배속·게인 — 엔진 공통(렌더 적용값). 기본값(배속 1·게인 0)이면 필드를 비운다. ──
  const playbackRate = (person[F.rate] as number | undefined) ?? 1
  const gainDb = (person[F.gain] as number | undefined) ?? 0
  const setPlaybackRate = (rate: number) => {
    const r = Number.isFinite(rate) ? Math.min(2, Math.max(0.5, rate)) : 1
    setField(F.rate, Math.abs(r - 1) < 1e-6 ? undefined : r)
  }
  const setGainDb = (db: number) => {
    const d = Number.isFinite(db) ? db : 0
    setField(F.gain, Math.abs(d) < 1e-6 ? undefined : d)
  }

  const activeSpec: SegmentEngineSpec | null = chosenEngine === 'elevenlabs' ? eleSpec : geminiSpec
  const engineSpec: SegmentEngineSpec = chosenEngine === 'elevenlabs'
    ? (eleSpec ?? { engine: 'elevenlabs', voiceParam: '' })
    : geminiSpec

  // 캐릭터 보이스 저장처 — 북리커맨드 voiceOverride 와 같은 인터페이스로 select 를 구동한다.
  const voiceOverride = useMemo(
    () => ({
      value: geminiVoice,
      onChange: (v: string) => setField(F.speaker, v && v !== VOICE.celeb ? v : undefined),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [geminiVoice, person, onPersonChange],
  )

  return {
    sectionTexts,
    ttsText, setTtsText,
    chosenEngine, setChosenEngine: handleChosenEngine,
    geminiSpec,
    eleSpec,
    activeSpec,
    voiceOverride,
    engineSpec,
    eleVoiceId, setEleVoiceId,
    stylePrefix, saveQuoteStyle,
    eleOptions, setEleOptions,
    eleEmotions, toggleEmotion, addCustomEmotion,
    emotionDraft, setEmotionDraft,
    eleTrail, setEleTrail,
    playbackRate, setPlaybackRate,
    gainDb, setGainDb,
  }
}
