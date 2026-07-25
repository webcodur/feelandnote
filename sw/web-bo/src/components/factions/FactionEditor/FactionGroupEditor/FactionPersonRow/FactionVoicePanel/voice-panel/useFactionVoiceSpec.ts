'use client'

import { useEffect, useMemo, useState } from 'react'
import type { FactionPerson } from '@/lib/faction-types'
import type { SegmentEngineSpec } from '@feelandnote/shared/bo/voice-utils'
import type { GenEngine } from '@feelandnote/shared/bo/voice-utils'
import { VOICE } from '@feelandnote/shared/lib/voice-policy'
import type { EditLang } from '@feelandnote/shared/bo/editor'
import { buildVoiceAssignPatch, langFieldsOf, type FactionVoiceSlot } from './voice-slots'

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
  /**
   * 편집 언어 — 합성 엔진·ElevenLabs 목소리를 이 언어의 칸에 읽고 쓴다.
   * 미지정이면 국문(옛 호출부 동작 그대로).
   */
  lang?: EditLang
  /**
   * 보이스 도감에 적힌 그 보이스의 추가 음량 — 인물에 값이 없을 때 대신 쓴다.
   * 음량은 보이스 자체의 성질이라 인물마다 다시 맞추지 않는다.
   */
  gainDbFallback?: number
  /**
   * 보이스 하나의 도감 음량을 찾아 준다 — 보이스를 **배정하는 순간** 인물의 빈 음량 칸에 복사하는 데 쓴다.
   * 복사해 두어야 렌더에 실린다(렌더는 대본 파일의 인물 값만 읽고 도감을 모른다).
   */
  gainDbOfVoice?: (voiceId: string) => number | undefined
}

export function useFactionVoiceSpec({ person, onPersonChange, slot, lang, gainDbFallback, gainDbOfVoice }: UseFactionVoiceSpecArgs) {
  const F = slot.fields
  // 엔진·목소리만 언어별 칸을 쓴다(스타일·감정·길이·음량·배속은 언어 공용 — voice-slots 주석 참조)
  const L = langFieldsOf(slot, lang)
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
  const personEngine: GenEngine = (person[L.engine] as GenEngine | undefined) ?? 'gemini'
  const [chosenEngine, setChosenEngine] = useState<GenEngine>(personEngine)
  useEffect(() => { setChosenEngine(personEngine) }, [personEngine])

  // chosenEngine 토글 → 인물 데이터(slot.engine)에 명시적으로 반영한다.
  // 공용 낭독 목소리를 상속하는 수식어에서는 'gemini'도 실제 인물별 예외값이 될 수 있다.
  const handleChosenEngine = (e: GenEngine) => {
    setChosenEngine(e)
    setField(L.engine, e)
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

  const eleVoiceId = (person[L.eleVoiceId] as string | undefined) ?? ''
  /**
   * 보이스 배정 — 인물의 음량 칸이 비어 있으면 도감에 적힌 그 보이스의 음량을 **함께** 적어 둔다.
   * 도감 값을 내보내기가 몰래 끼워 넣는 방식은 쓰지 않으므로(왕복 검증이 깨진다) 이 순간 데이터에
   * 명시적으로 남겨야 렌더가 같은 음량으로 재생한다. 이미 사람이 정한 값이 있으면 건드리지 않는다.
   */
  const setEleVoiceId = (v: string) => {
    const patch = buildVoiceAssignPatch(person as unknown as Record<string, unknown>, slot, lang, v, gainDbOfVoice?.(v.trim()))
    onPersonChange({ ...person, ...patch } as FactionPerson)
  }
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

  // 고른 감정 표식 저장 — 고르기·직접 입력·최대 개수 규칙은 공용 부품(EleEmotionPicker)이 맡는다.
  const setEleEmotions = (next: string[]) => setField(F.eleEmotions, next.length ? next : undefined)

  // 공용값 상속 상황에서도 명시적 예외가 유지되도록 true/false를 그대로 저장한다.
  const setEleTrail = (on: boolean) => setField(F.eleTrail, on)

  // ── 배속·게인 — 엔진 공통(렌더 적용값). 기본값도 공용값을 덮는 명시적 예외가 될 수 있다. ──
  const playbackRate = (person[F.rate] as number | undefined) ?? 1
  // 실효 음량 = 인물 개별값(있으면 우선) → 도감값 → 0dB
  const personGainDb = person[F.gain] as number | undefined
  const gainDb = personGainDb ?? gainDbFallback ?? 0
  /** 인물에 값이 없어 도감값을 빌려 쓰는 중인가 — 화면이 그 사실을 알린다 */
  const gainDbInherited = personGainDb == null && gainDbFallback != null
  const setPlaybackRate = (rate: number) => {
    const r = Number.isFinite(rate) ? Math.min(2, Math.max(0.5, rate)) : 1
    setField(F.rate, r)
  }
  const setGainDb = (db: number) => {
    const d = Number.isFinite(db) ? db : 0
    setField(F.gain, d)
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
    eleEmotions, setEleEmotions,
    eleTrail, setEleTrail,
    playbackRate, setPlaybackRate,
    gainDb, setGainDb, gainDbInherited,
  }
}
