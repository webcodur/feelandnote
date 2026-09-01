'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { FactionPerson } from '@/lib/faction-types'
import type { SegmentEngineSpec } from '@feelandnote/shared/bo/voice-utils'
import type { GenEngine } from '@feelandnote/shared/bo/voice-utils'
import { VOICE } from '@feelandnote/shared/lib/voice-policy'
import { effectiveElevenLabsVoiceId, factionVoiceProvider } from '@feelandnote/shared/lib/faction-voice-provider'
import type { EditLang } from '@feelandnote/shared/bo/editor'
import { buildVoiceAssignPatch, langFieldsOf, type FactionVoiceSlot } from './voice-slots'

/**
 * 북리커맨드 useVoiceSpec 의 세력도감(인물 1명) 어댑터 — 슬롯(대사/수식어) 파라미터화.
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
   * 편집 언어 — ElevenLabs 목소리를 이 언어의 칸에 읽고 쓴다.
   * 미지정이면 국문(옛 호출부 동작 그대로).
   */
  lang?: EditLang
  /** 편별 배정이 없을 때 이어받는 셀럽 프로필 ElevenLabs 보이스 */
  inheritedEleVoiceId?: string
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

export function useFactionVoiceSpec({ person, onPersonChange, slot, lang, inheritedEleVoiceId, gainDbFallback, gainDbOfVoice }: UseFactionVoiceSpecArgs) {
  const F = slot.fields
  // ElevenLabs 목소리만 언어별 칸을 쓴다(스타일·감정·길이·음량·배속은 언어 공용).
  const L = langFieldsOf(slot, lang)

  /**
   * 🔴 인물 갱신은 **반드시 최신 인물 위에 얹는다**(ref 경유). 그리기 시점 인물을 그대로 쓰면
   *    늦게 끝난 작업이 그 사이 사람이 고친 값을 통째로 되돌린다.
   *
   * 실제 사고(26.07.26 유저 신고): 아레스 인물에 '아레스' 보이스를 골라도 자꾸 옛 보이스로
   * 되돌아갔다. 원인은 음원 만들기가 몇 초 걸리는 동안 사람이 보이스를 바꾸면, **누를 당시에
   * 굳어 있던 옛 인물**을 저장 완료 콜백이 통째로 되쓰던 것이다(길이 한 칸만 바꾸려고 인물 전체를
   * 펼쳐 담기 때문). 여기서 고른 보이스뿐 아니라 그 사이 고친 모든 칸이 같이 되돌아간다.
   *
   * 셀럽 목소리 가져오기처럼 이 훅 안에서 기다렸다 쓰는 경로도 같은 함정이라, 낱개 갱신 자체를
   * 최신 기준으로 바꿨다. (같은 이유로 들숨 저장 경로는 이미 ref 를 쓰고 있었다 — 그 규칙을 넓힌다.)
   */
  const personRef = useRef(person)
  personRef.current = person
  const onPersonChangeRef = useRef(onPersonChange)
  onPersonChangeRef.current = onPersonChange

  // 한 필드 갱신 헬퍼 — 슬롯 키로 인물 데이터에 영속한다(항상 최신 인물 기준).
  const setField = (key: keyof FactionPerson, val: unknown) =>
    onPersonChangeRef.current({ ...personRef.current, [key]: val } as FactionPerson)

  // 합성 텍스트 — 슬롯이 정의한 텍스트(대사=통대사 / 수식어=한 문장).
  const original = useMemo(() => slot.text(person), [slot, person])
  const sectionTexts = useMemo(() => ({ original, tts: original }), [original])
  const [ttsText, setTtsText] = useState(original)
  // 다른 인물/슬롯으로 패널이 바뀌거나 원문이 갱신되면 입력칸을 원문으로 리셋
  useEffect(() => { setTtsText(original) }, [original])

  // ── 엔진 결정 ──
  const ownEleVoiceId = person[L.eleVoiceId] as string | undefined
  const eleVoiceId = effectiveElevenLabsVoiceId(ownEleVoiceId, inheritedEleVoiceId) ?? ''
  // 엔진은 생성 세션의 선택값이다. ElevenLabs ID가 있으면 ELE로 시작하고 별도 영속 필드는 두지 않는다.
  const [chosenEngine, setChosenEngine] = useState<GenEngine>(() => factionVoiceProvider(eleVoiceId))

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
    if (((personRef.current[F.style] as string | undefined) ?? '') === trimmed) return
    // 빈 문자열은 "상속된 스타일을 쓰지 않음"이라는 명시적 override다.
    setField(F.style, trimmed)
  }

  /**
   * 보이스 배정 — 인물의 음량 칸이 비어 있으면 도감에 적힌 그 보이스의 음량을 **함께** 적어 둔다.
   * 도감 값을 내보내기가 몰래 끼워 넣는 방식은 쓰지 않으므로(왕복 검증이 깨진다) 이 순간 데이터에
   * 명시적으로 남겨야 렌더가 같은 음량으로 재생한다. 이미 사람이 정한 값이 있으면 건드리지 않는다.
   */
  const setEleVoiceId = (v: string) => {
    const latest = personRef.current
    const patch = buildVoiceAssignPatch(latest as unknown as Record<string, unknown>, slot, lang, v, gainDbOfVoice?.(v.trim()))
    onPersonChangeRef.current({ ...latest, ...patch } as FactionPerson)
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
    chosenEngine, setChosenEngine,
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
