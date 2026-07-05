import { useEffect, useMemo, useState } from 'react'
import type { EpisodeData } from '../../EpisodeEditor'
import type { SegmentEngineSpec } from '../../voice-utils'
import { resolveSegmentEngine, shortsArrIndexBySlot, longformQuoteSpeakerId } from '../../voice-utils'
import { getTextsForSection } from '../utils'
import { roleForLongformKey, geminiVoiceForRole, stylePrefixForRole, type Role } from '@feelandnote/shared/lib/voice-policy'
import type { GenEngine } from './types'

type UseVoiceSpecArgs = {
  secKey: string
  episode: EpisodeData
  overrideText?: string
  voiceOverride?: { value: string; onChange: (v: string) => void } | null
}

export function useVoiceSpec({ secKey, episode, overrideText, voiceOverride }: UseVoiceSpecArgs) {
  const sectionTexts = useMemo(() => getTextsForSection(secKey, episode), [secKey, episode])
  const [ttsText, setTtsText] = useState(() => overrideText ?? (sectionTexts.tts || sectionTexts.original))

  // ── 엔진 결정 ──
  // 자동 매핑은 default 추천일 뿐. 사용자가 chosenEngine 토글로 GEM/ELE 중 자유 선택.
  const engineSpec = useMemo(() => resolveSegmentEngine(secKey, episode), [secKey, episode])
  const [chosenEngine, setChosenEngine] = useState<GenEngine>(() => engineSpec?.engine ?? 'gemini')
  // secKey 가 바뀌면 자동 매핑 기본값으로 리셋
  useEffect(() => {
    if (engineSpec?.engine) setChosenEngine(engineSpec.engine)
  }, [secKey, engineSpec?.engine])

  // chosenEngine 별로 필요한 spec 매핑 (자동 매핑이 다른 엔진이면 폴백 매핑 시도)
  const eleSpec: SegmentEngineSpec | null = useMemo(() => {
    if (engineSpec?.engine === 'elevenlabs') return engineSpec
    // 셀럽 segment 가 GEM 매핑이라 engineSpec 이 elevenlabs 가 아닌 경우, 사용자가 ELE 로 임시
    // 전환할 때의 폴백. segment.speaker → 화자 풀에서 ELE 보이스 찾기 우선, 없으면 host.
    type SpeakerLite = { id: string; engine?: 'gemini' | 'elevenlabs'; voiceId?: string; elevenlabsVoiceId?: string }
    const m = secKey.match(/^shorts-(\d+)\/S\d{2}-(.+)$/)
    const seg = m ? (() => {
      const arr = Array.isArray(episode.shorts) ? episode.shorts : []
      return arr[shortsArrIndexBySlot(arr, parseInt(m[1], 10))]?.segments?.find((s: { id: string }) => s.id === m[2]) as { speaker?: string; elevenlabsVoiceId?: string } | undefined
    })() : undefined
    const speakers: SpeakerLite[] = Array.isArray((episode as { speakers?: unknown }).speakers)
      ? (episode as { speakers: SpeakerLite[] }).speakers : []
    // 쇼츠는 segment.speaker, 롱폼 인용/후속은 quotePairs 화자 지정.
    const longformSpeakerId = m ? undefined : longformQuoteSpeakerId(secKey, (episode as { books?: unknown }).books as readonly unknown[] | undefined)
    const speakerObj = seg?.speaker
      ? speakers.find(sp => sp.id === seg.speaker)
      : (longformSpeakerId ? speakers.find(sp => sp.id === longformSpeakerId) : undefined)
    const speakerVoice = speakerObj
      ? (speakerObj.engine === 'elevenlabs' && speakerObj.voiceId ? speakerObj.voiceId : speakerObj.elevenlabsVoiceId)
      : undefined
    const fallbackId = seg?.elevenlabsVoiceId ?? speakerVoice ?? episode.host?.elevenlabsVoiceId
    if (!fallbackId) return null
    return { engine: 'elevenlabs', voiceParam: fallbackId }
  }, [engineSpec, episode, secKey])

  const geminiSpec: SegmentEngineSpec = useMemo(() => {
    if (engineSpec?.engine === 'gemini') return engineSpec
    // 사용자가 GEM 으로 임시 전환할 때의 폴백. 역할 기반 공유 정책(voice-policy)으로 결정한다.
    type SpeakerLite = { id: string; engine?: 'gemini' | 'elevenlabs'; voiceId?: string }
    const m = secKey.match(/^shorts-(\d+)\/S\d{2}-(.+)$/)
    const seg = m ? (() => {
      const arr = Array.isArray(episode.shorts) ? episode.shorts : []
      return arr[shortsArrIndexBySlot(arr, parseInt(m[1], 10))]?.segments?.find((s: { id: string }) => s.id === m[2]) as { geminiVoice?: string; style?: string; speaker?: string; role?: string } | undefined
    })() : undefined
    const speakers: SpeakerLite[] = Array.isArray((episode as { speakers?: unknown }).speakers)
      ? (episode as { speakers: SpeakerLite[] }).speakers : []
    // 쇼츠는 segment.speaker, 롱폼 인용/후속은 quotePairs 화자 지정.
    const longformSpeakerId = m ? undefined : longformQuoteSpeakerId(secKey, (episode as { books?: unknown }).books as readonly unknown[] | undefined)
    const speakerObj = seg?.speaker
      ? speakers.find(sp => sp.id === seg.speaker)
      : (longformSpeakerId ? speakers.find(sp => sp.id === longformSpeakerId) : undefined)
    const speakerGeminiVoice = speakerObj?.engine === 'gemini' ? speakerObj.voiceId : undefined

    // 역할 판정 — 쇼츠는 segment.role(SSoT), 롱폼은 구간키 규칙. 이후 공유 정책으로
    // 역할→보이스/스타일을 결정해 CLI 와 같은 결과를 보장한다(롱폼 나레이터=Kore, 요약=Charon).
    const role: Role = m ? ((seg?.role as Role) ?? 'narrator') : roleForLongformKey(secKey)
    const isHook = !!m && m[2] === 'hook'

    // 외부 저장처(솔로 자유섹션 등)가 주입되면 그 보이스를 최우선 사용.
    const voiceName = voiceOverride?.value ?? geminiVoiceForRole(role, {
      scope: m ? 'shorts' : 'long',
      isHook,
      hostGeminiVoice: (episode.host as { geminiVoice?: string })?.geminiVoice,
      segGeminiVoice: seg?.geminiVoice,
      speakerVoice: speakerGeminiVoice,
    })
    // 저장된 빈 문자열('')은 옵트아웃이므로 그대로 통과시켜 prefix 없이 미리듣기한다.
    const stylePrefix = stylePrefixForRole(role, {
      segStyle: seg?.style,
      savedStyle: episode.voiceStyles?.[secKey],
      hostVoiceStyle: (episode.host as { voiceStyle?: string })?.voiceStyle,
      hostShortsSpeed: (episode.host as { shortsSpeed?: string })?.shortsSpeed,
    })
    return { engine: 'gemini', voiceParam: voiceName, stylePrefix }
  }, [engineSpec, episode, secKey, voiceOverride])

  const activeSpec: SegmentEngineSpec | null = chosenEngine === 'elevenlabs' ? eleSpec : geminiSpec

  // ── shorts segment 식별 (geminiVoice·style 편집용) ──
  const segmentLocator = useMemo(() => {
    const m = secKey.match(/^shorts-(\d+)\/S\d{2}-(.+)$/)
    if (!m) return null
    return { shortsIndex: parseInt(m[1], 10), segmentId: m[2] }
  }, [secKey])

  return {
    sectionTexts,
    ttsText, setTtsText,
    engineSpec,
    chosenEngine, setChosenEngine,
    eleSpec,
    geminiSpec,
    activeSpec,
    segmentLocator,
  }
}
