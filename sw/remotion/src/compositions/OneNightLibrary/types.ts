export interface CelebData {
  nickname: string
  nickname_en: string
  speech_tone: string
  avatar_url: string
  quote: string
}

export interface DialogueLine {
  speaker: 'left' | 'right'
  text: string
  /** 감정/톤 디렉션 e.g. "[calm, contemplative]" */
  direction?: string
}

export interface ScriptData {
  title: string
  subtitle: string
  left: CelebData
  right: CelebData
  dialogue: DialogueLine[]
}
