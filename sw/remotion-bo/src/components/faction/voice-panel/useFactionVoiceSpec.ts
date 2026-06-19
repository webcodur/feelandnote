import { useEffect, useMemo, useState } from 'react'
import type { FactionPerson } from '@/lib/faction-types'
import type { SegmentEngineSpec } from '../../voice-utils'
import type { GenEngine } from '../../scenario-voice/ExpandedVoicePanel/types'
import { VOICE } from '@feelandnote/shared/lib/voice-policy'

/**
 * 북리커맨드 useVoiceSpec 의 세력도(인물 1명) 어댑터.
 *
 * 북리커맨드는 "에피소드 + 구간키"에서 엔진·보이스 spec(geminiSpec/eleSpec/activeSpec)을
 * 끌어냈다. 세력도는 그 단위를 "인물 1명 = 대사 1개"로 치환한다.
 *
 * 매핑:
 *  - 합성 텍스트(ttsText)            ← person.quoteChunks 를 공백으로 이은 통대사(없으면 quote)
 *  - 엔진(chosenEngine)              ← person.quoteEngine ('gemini' | 'gemini-v3' | 'elevenlabs')
 *  - Gemini 캐릭터 보이스(geminiSpec)← person.quoteSpeaker (미지정이면 공용 기본 Puck)
 *  - ELE 보이스(eleSpec)             ← person.quoteElevenlabsVoiceId
 *  - 발화 스타일(geminiSpec.stylePrefix) ← person.quoteStyle (Gemini prefix)
 *  - ELE 감정/강도(eleSendSettings)   ← person.quoteEleOptions (stability·style)
 *
 * 캐릭터 보이스 선택은 북리커맨드의 voiceOverride 슬롯과 동일하게 동작시킨다 —
 * select 가 활성화되고, 선택값이 합성 spec·onChange 콜백에 모두 반영된다.
 *
 * 발화 스타일은 북리커맨드 롱폼(voiceStyles[구간키])과 달리 인물 데이터(quoteStyle)에 직접
 * 영속한다. GenerateSection 의 스타일 입력칸이 blur 시 handleLongformStyleChange 로 들어오므로,
 * 그 콜백을 quoteStyle 저장으로 연결한다(아래 saveQuoteStyle).
 */

type UseFactionVoiceSpecArgs = {
  person: FactionPerson
  /** 인물 음성 spec 필드 갱신(부분) — 디스크 저장은 부모가 처리 */
  onPersonChange: (next: FactionPerson) => void
}

export function useFactionVoiceSpec({ person, onPersonChange }: UseFactionVoiceSpecArgs) {
  // 합성 텍스트 — 통대사(덩어리를 공백으로 이어 한 음원). data.json 의 quote 기준.
  const original = useMemo(
    () => (person.quoteChunks?.map(c => c.trim()).filter(Boolean).join(' ') || person.quote || '').trim(),
    [person.quoteChunks, person.quote],
  )
  const sectionTexts = useMemo(() => ({ original, tts: original }), [original])
  const [ttsText, setTtsText] = useState(original)
  // 다른 인물로 패널이 바뀌면(또는 대사 원문이 갱신되면) 입력칸을 원문으로 리셋
  useEffect(() => { setTtsText(original) }, [original])

  // ── 엔진 결정 ──
  const personEngine: GenEngine = person.quoteEngine ?? 'gemini'
  const [chosenEngine, setChosenEngine] = useState<GenEngine>(personEngine)
  // 인물의 저장된 엔진이 바뀌면 동기화
  useEffect(() => { setChosenEngine(personEngine) }, [personEngine])

  // chosenEngine 토글이 바뀌면 인물 데이터(quoteEngine)에 반영해 일괄 생성·렌더와 일치시킨다.
  const handleChosenEngine = (e: GenEngine) => {
    setChosenEngine(e)
    // 'gemini'(기본)는 필드를 지워 깔끔하게 둔다.
    onPersonChange({ ...person, quoteEngine: e === 'gemini' ? undefined : e })
  }

  // ── 보이스 spec ──
  // 발화 스타일 prefix — 인물 quoteStyle 을 geminiSpec.stylePrefix 로 노출한다.
  // GenerateSection 의 스타일 입력칸 초기값이 stylePrefix 라 인물 저장값이 그대로 뜬다.
  const stylePrefix = person.quoteStyle ?? ''
  const geminiVoice = person.quoteSpeaker || VOICE.celeb
  const geminiSpec: SegmentEngineSpec = useMemo(
    () => ({ engine: 'gemini', voiceParam: geminiVoice, stylePrefix }),
    [geminiVoice, stylePrefix],
  )

  // 스타일 저장 — GenerateSection 이 longform 경로(handleLongformStyleChange)로 호출한다.
  // 인물 quoteStyle 에 직접 영속. 빈 값이면 필드를 지운다.
  const saveQuoteStyle = (value: string) => {
    const trimmed = value.trim()
    if ((person.quoteStyle ?? '') === trimmed) return
    onPersonChange({ ...person, quoteStyle: trimmed || undefined })
  }

  const eleVoiceId = person.quoteElevenlabsVoiceId ?? ''
  const setEleVoiceId = (v: string) =>
    onPersonChange({ ...person, quoteElevenlabsVoiceId: v.trim() || undefined })
  // ELE 보이스 ID가 비어 있어도 spec 을 만들어 ELE 옵션·생성 버튼을 활성화한다.
  // (ID 입력칸은 ELE 선택 시에만 뜨므로, eleSpec 을 voiceId 의존으로 두면 ELE 를 영영 못 고르는 데드락이 된다.)
  // voiceId 가 빈 채로 생성하면 라우트가 막아 안내한다.
  const eleSpec: SegmentEngineSpec = useMemo(
    () => ({ engine: 'elevenlabs', voiceParam: eleVoiceId }),
    [eleVoiceId],
  )

  // ELE 감정/강도 — 인물 quoteEleOptions. 미리듣기·생성 호출에 settings 로 전달.
  const eleOptions = person.quoteEleOptions
  const setEleOptions = (next: { stability?: number; style?: number }) => {
    const cleaned: { stability?: number; style?: number } = {}
    if (typeof next.stability === 'number') cleaned.stability = next.stability
    if (typeof next.style === 'number') cleaned.style = next.style
    onPersonChange({ ...person, quoteEleOptions: Object.keys(cleaned).length ? cleaned : undefined })
  }

  // ── ELE 감정 태그 / 끝 패딩 — 북리커맨드 EleSendOpts 의 emotions[]·trailEnabled 에 대응. ──
  // 인물 quoteEleEmotions(0~2개)·quoteEleTrail 에 영속. 미리듣기·생성 호출에서 buildEleText 로 본문에 삽입.
  const eleEmotions = person.quoteEleEmotions ?? []
  // 끝 패딩은 미지정이면 켜짐(기본값). 명시적 false 일 때만 끈다.
  const eleTrail = person.quoteEleTrail ?? true
  const [emotionDraft, setEmotionDraft] = useState('')

  const setEleEmotions = (next: string[]) =>
    onPersonChange({ ...person, quoteEleEmotions: next.length ? next : undefined })

  // 감정 토글 — 최대 2개. 초과 시 가장 오래된 것을 밀어낸다(북리커맨드 toggleEmotion 동일 규칙).
  const toggleEmotion = (em: string) => {
    if (eleEmotions.includes(em)) {
      setEleEmotions(eleEmotions.filter(e => e !== em))
    } else if (eleEmotions.length >= 2) {
      setEleEmotions([eleEmotions[1], em])
    } else {
      setEleEmotions([...eleEmotions, em])
    }
  }

  // 직접 입력 감정 추가 — 중복 무시, 최대 2개 유지(북리커맨드 addCustomEmotion 동일 규칙).
  const addCustomEmotion = () => {
    const v = emotionDraft.trim()
    if (!v) return
    if (eleEmotions.includes(v)) { setEmotionDraft(''); return }
    const next = eleEmotions.length >= 2 ? [eleEmotions[1], v] : [...eleEmotions, v]
    setEleEmotions(next)
    setEmotionDraft('')
  }

  // 끝 패딩 토글 — 켜짐이 기본이라, 끌 때만 false 를 저장하고 다시 켜면 필드를 지운다.
  const setEleTrail = (on: boolean) =>
    onPersonChange({ ...person, quoteEleTrail: on ? undefined : false })

  // ── 배속·게인 — 엔진 공통(렌더 적용값). 인물 quotePlaybackRate / quoteGainDb 에 영속. ──
  // 기본값(배속 1, 게인 0)이면 필드를 지워 data.json 을 깔끔히 둔다(렌더 헬퍼가 미지정=기본 처리).
  const playbackRate = person.quotePlaybackRate ?? 1
  const gainDb = person.quoteGainDb ?? 0
  const setPlaybackRate = (rate: number) => {
    const r = Number.isFinite(rate) ? Math.min(2, Math.max(0.5, rate)) : 1
    onPersonChange({ ...person, quotePlaybackRate: Math.abs(r - 1) < 1e-6 ? undefined : r })
  }
  const setGainDb = (db: number) => {
    const d = Number.isFinite(db) ? db : 0
    onPersonChange({ ...person, quoteGainDb: Math.abs(d) < 1e-6 ? undefined : d })
  }

  const activeSpec: SegmentEngineSpec | null = chosenEngine === 'elevenlabs' ? eleSpec : geminiSpec

  // 기본 매핑 = 현재 선택 엔진(인물 설정이 곧 기본). engine 종류만 chosenEngine 과 맞춰
  // GenerateSection 의 "기본 매핑과 다름"·"단일 생성 미지원" 안내가 뜨지 않게 한다.
  const engineSpec: SegmentEngineSpec = chosenEngine === 'elevenlabs'
    ? (eleSpec ?? { engine: 'elevenlabs', voiceParam: '' })
    : geminiSpec

  // 캐릭터 보이스 저장처 — 북리커맨드 voiceOverride 와 같은 인터페이스로 select 를 구동한다.
  const voiceOverride = useMemo(
    () => ({
      value: geminiVoice,
      onChange: (v: string) =>
        onPersonChange({ ...person, quoteSpeaker: v && v !== VOICE.celeb ? v : undefined }),
    }),
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
