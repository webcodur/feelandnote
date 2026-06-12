// ── Engine resolution ──

/**
 * secKey 의 `shorts-{N}` 은 고정 slot 번호다 (배열 위치가 아님).
 * 발행 순서·미발행분 때문에 slot 과 배열 위치가 어긋날 수 있으므로, 항상 slot 으로 위치를 찾는다.
 * slot 미지정 레거시 데이터는 (slot-1) 폴더순으로 폴백한다. useShortsState·BgmPanel 과 동일 규약.
 */
export function shortsArrIndexBySlot(shortsArr: readonly unknown[] | undefined, slot: number): number {
  if (!Array.isArray(shortsArr)) return slot - 1
  const i = shortsArr.findIndex(s => (s as { slot?: number } | null | undefined)?.slot === slot)
  return i >= 0 ? i : slot - 1
}

/** ELE 대상 섹션인지 판별 (셀럽 음성 섹션). `shorts-N/` prefix가 붙어 있어도 동작한다. */
export function isEleSection(key: string): boolean {
  const base = key.replace(/^shorts-\d+\//, '')
  return base === 'A3-featured-quote' || base === 'B2-philosophy' || /^D\d{2}d\d+-quote$/.test(base) || /^S\d{2}-celeb-/.test(base) || /^S\d{2}-book-quote/.test(base)
}

export type EngineKind = 'gemini' | 'elevenlabs'

export type SegmentEngineSpec = {
  engine: EngineKind
  /** Gemini: prebuilt voice name (e.g., 'Sulafat'). ElevenLabs: voiceId. */
  voiceParam: string
  /** Gemini-only: 발화 스타일 prefix (segment.style 값). */
  stylePrefix?: string
}

/** sectionKey + episode → 단일 segment 생성용 엔진 결정.
 *  단일 생성이 의미있는 경우에만 spec을 돌려준다. 그 외(나레이터/요약 기본 톤 등)는
 *  null을 반환해 상단 도구막대 일괄 생성으로 처리하도록 유도한다.
 *
 *  우선순위 (ElevenLabs voiceId):
 *  segment.elevenlabsVoiceId > speakers[seg.speaker].elevenlabsVoiceId > host.elevenlabsVoiceId
 *
 *  엔진 분기:
 *  1. shorts segment에 `geminiVoice` 오버라이드 → Gemini
 *  2. 셀럽 섹션(isEleSection) + 위 우선순위로 해소된 voiceId 존재 → ElevenLabs
 *  3. 그 외 → null
 */
export function resolveSegmentEngine(
  key: string,
  episode: { host?: { elevenlabsVoiceId?: string; geminiVoice?: string } | null; shorts?: unknown; speakers?: unknown },
): SegmentEngineSpec | null {
  type SegLite = { id: string; geminiVoice?: string; style?: string; elevenlabsVoiceId?: string; speaker?: string }
  type SpeakerLite = { id: string; engine?: 'gemini' | 'elevenlabs'; voiceId?: string; elevenlabsVoiceId?: string }
  type ShortLite = { segments?: SegLite[]; speakers?: SpeakerLite[] }

  // shorts segment 매칭
  const m = key.match(/^shorts-(\d+)\/S\d{2}-(.+)$/)
  let seg: SegLite | undefined
  let shortCfg: ShortLite | undefined
  if (m) {
    const segId = m[2]
    const arr = Array.isArray(episode.shorts) ? (episode.shorts as ShortLite[]) : []
    shortCfg = arr[shortsArrIndexBySlot(arr, parseInt(m[1], 10))]
    seg = shortCfg?.segments?.find(s => s.id === segId)
  }

  // 화자 풀 — 신구조 SSoT(episode.speakers) 우선, 옛 shortCfg.speakers 폴백
  const epSpeakers = Array.isArray((episode as { speakers?: unknown }).speakers)
    ? ((episode as { speakers: SpeakerLite[] }).speakers)
    : []
  const findSpeaker = (id: string): SpeakerLite | undefined =>
    epSpeakers.find(s => s.id === id) ?? shortCfg?.speakers?.find(s => s.id === id)
  const speakerObj = seg?.speaker ? findSpeaker(seg.speaker) : undefined

  // 1. Gemini 캐릭터 보이스 — segment 직접 > 화자(gemini 엔진)
  if (seg?.geminiVoice) {
    return { engine: 'gemini', voiceParam: seg.geminiVoice, stylePrefix: seg.style }
  }
  if (speakerObj?.engine === 'gemini' && speakerObj.voiceId) {
    return { engine: 'gemini', voiceParam: speakerObj.voiceId, stylePrefix: seg?.style }
  }

  // 2. ELE 셀럽 섹션 — voiceId 우선순위: segment 직접 > 화자(SSoT) > 옛 elevenlabsVoiceId > host
  if (isEleSection(key)) {
    const speakerVoice = speakerObj
      ? (speakerObj.engine === 'elevenlabs' && speakerObj.voiceId ? speakerObj.voiceId : speakerObj.elevenlabsVoiceId)
      : undefined
    const voiceId = seg?.elevenlabsVoiceId ?? speakerVoice ?? episode.host?.elevenlabsVoiceId
    if (voiceId) return { engine: 'elevenlabs', voiceParam: voiceId }
  }

  return null
}

/** 엔진별 음성 파일이 저장되는 폴더 prefix */
export function engineSlotPrefix(engine: EngineKind): 'gemini' | 'elevenlabs' {
  return engine
}

/** 파일명에서 엔진 슬롯 판별 */
export function engineSlot(name: string): 'gemini' | 'elevenlabs' | 'common' {
  if (name.startsWith('gemini/')) return 'gemini'
  if (name.startsWith('elevenlabs/')) return 'elevenlabs'
  return 'common'
}
