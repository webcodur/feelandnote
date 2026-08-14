/** 대사·음성 작업대가 쓰는 상수와 타입 */

export type Locale = 'ko' | 'en'
export type ViewMode = 'both' | 'ko' | 'en'

export const SPEECH_TONES = ['loyal', 'composed', 'bold', 'humble', 'gentle', 'free'] as const

export const TONE_LABELS: Record<string, string> = {
  loyal: '충의', composed: '침착', bold: '당돌',
  humble: '겸양', gentle: '온화', free: '호방',
}

export const MODE_OPTIONS: { value: ViewMode; label: string }[] = [
  { value: 'both', label: '한영본' },
  { value: 'ko', label: '국문' },
  { value: 'en', label: '영문' },
]

export const LOCALE_BADGE: Record<Locale, { label: string; className: string }> = {
  ko: { label: 'KO', className: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  en: { label: 'EN', className: 'bg-purple-500/15 text-purple-400 border-purple-500/30' },
}

export function localesFor(mode: ViewMode): Locale[] {
  return mode === 'both' ? ['ko', 'en'] : [mode]
}

export interface VoiceSettings {
  stability: number
  similarity_boost: number
  style: number
  speed: number
  volumeBoost: number
}

export const DEFAULT_SETTINGS: VoiceSettings = {
  stability: 0.5,
  similarity_boost: 0.75,
  style: 0.3,
  speed: 1.0,
  volumeBoost: 0,
}

/** 생성·불러오기로 만든 임시 음성 한 벌 (아직 R2에 올리지 않은 상태) */
export interface Preview {
  blobUrl: string
  base64: string
  bytes: number
  contentType: 'audio/mpeg' | 'audio/wav'
  duration: number
  trimStart: number
  trimEnd: number
  boostDb?: number
}

export const LABELS = {
  modeSwitch: '편집 모드',
  previewPlay: '프리뷰 재생',
  delete: '삭제',
  saveDone: '저장 완료',
  saveFail: '저장 실패',
  playFail: '재생 실패',
  generateFail: '생성 실패',
  uploadFail: '업로드 실패',
  inputVoiceId: 'Voice ID를 입력하세요',
  enterVoiceIdFirst: 'Voice ID ({locale})를 먼저 입력하세요',
  voiceIdSaved: 'Voice ID ({locale}) 저장 완료',
  emptyTtsText: 'TTS 텍스트가 비어있습니다.',
  previewDone: '프리뷰 생성',
  uploadDone: '{key} R2 업로드 완료',
  batchGenerate: '전체 생성',
  resetDefaults: '기본값 복원',
  dialogueEditor: '대사 편집 + TTS',
  save: '저장',
  dialoguePlaceholder: '대사 입력...',
  existingVoicePlay: '기존 음성 재생',
  noSavedVoice: '저장된 음성 없음',
  generatePreview: 'TTS 생성 (프리뷰)',
  download: '다운로드',
  downloadFail: '다운로드 실패',
  quote: '명언',
  quotePlaceholder: '명언 입력...',
  monologue: '독백',
  monologuePlaceholder: '독백 입력...',
  trimEdit: '트림 편집',
  voiceEnabled: '음성 활성화',
  deleteAllVoices: '전체 삭제',
  deleteAllConfirm: '이 인물의 음성 파일을 전부 삭제한다. 되돌릴 수 없다. 진행할까?',
  deleteAllDone: '전체 음성 삭제 완료',
  bulkUpload: '묶음 올리기',
  bulkUploadNoMatch: '매칭되는 파일이 없다. (g1~3, r1~3, d1~3, bw1~3, bd1~3, bl1~3, c1~3, quote)',
  playbackRate: '재생 배속',
  openEditor: '음성 편집 창 열기 (목소리 고르기 · 감정 표식 · 파형 · 들숨 제거)',
} as const
