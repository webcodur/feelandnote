/** 능력/덕목 항목 */
export interface StatEntry {
  score: number
  reason: string
  duration?: number
}

/** 성향 항목 (-50 ~ +50) */
export interface DispositionEntry {
  score: number
  label: [string, string]  // [negative, positive]
  reason: string
  duration?: number
}

/** 영향력 축 */
export interface InfluenceAxis {
  score: number
  label: string
  exp: string
  duration?: number
}

export interface CelebProfileScript {
  locale?: 'ko' | 'en'
  host: {
    nickname: string
    nickname_en: string
    bio: string
    title: string
    avatar_url: string
    speech_tone: string
    geminiVoice?: string
    elevenlabsVoiceId?: string
  }
  persona: {
    abilities: Record<string, StatEntry>
    innerVirtues: Record<string, StatEntry>
    outerVirtues: Record<string, StatEntry>
    dispositions: Record<string, DispositionEntry>
    rationale: string
    rationaleDuration?: number
  }
  influence: {
    axes: Record<string, InfluenceAxis>
    transhistoricity: { score: number; exp: string; duration?: number }
    totalScore: number
  }
  narrator: {
    seriesIntro: string
    seriesIntroDuration?: number
    intro: string
    introDuration?: number
    bioToPersona: string
    bioToPersonaDuration?: number
    abilitiesToVirtues: string
    abilitiesToVirtuesDuration?: number
    virtuesToDispositions: string
    virtuesToDispositionsDuration?: number
    personaToInfluence: string
    personaToInfluenceDuration?: number
    totalScoreLine: string
    totalScoreLineDuration?: number
    bridge: string
    bridgeDuration?: number
  }
  tts?: {
    narrator?: Record<string, string>
  }
  voiceTimings?: Record<string, { start: number; end: number }[]>
}
