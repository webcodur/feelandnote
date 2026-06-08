/** 마디 안 이미지 전환 한 칸 — Remotion solo-build.ts의 SoloImageChange 와 동일 형태. */
export interface SoloImageChange {
  /** 이미지 파일 — 'episodes/...' 풀 경로(쇼츠와 동일). 비면 '' (자리표시) */
  image: string
  /** 전환 시작 문장/절 — 본문 내 위치(글자수 비율)로 전환 시각 산정 */
  text?: string
  /** 전환 시각(초, 마디 시작 기준) — 음성 정렬 시 우선 사용 (선택) */
  t?: number
}

/** 1권 모드(SOLO) 자유섹션 — Remotion solo-build.ts의 SoloFreeSection 과 동일 형태. */
export interface SoloFreeSection {
  id: string
  text: string
  image?: string
  /** 마디 안에서 문장별로 이미지를 갈아끼우는 전환 배열 (있으면 image보다 우선) */
  imageChangeAt?: SoloImageChange[]
  voice?: 'tts' | 'actor'
  kind?: 'narration' | 'quote'
  quoteSource?: string
  /** 캐릭터 보이스 — Gemini 보이스명. 음성 편집 창에서 선택, TTS 화자일 때 적용 (기본 Kore) */
  geminiVoice?: string
}
