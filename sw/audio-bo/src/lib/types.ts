export type JobStage = 'idle' | 'extracting' | 'cleaning' | 'transcribing' | 'training' | 'synthesizing' | 'complete' | 'failed'
export type SegmentSpeaker = 'A' | 'B' | 'overlap'
export type VoiceDirection = 'calm' | 'firm' | 'energetic' | 'urgent' | 'relaxed' | 'gentle' | 'clear' | 'weighty'
export type MediaSegment = { id: string; start: number; end: number; speaker: SegmentSpeaker; enabled: boolean; text: string }
export type OutputAudio = { kind: string; name: string; relativePath: string; sizeBytes: number; durationSeconds: number; current: boolean; verification?: string; textMatchPercent?: number }
export type OutputRun = { id: string; generatedAt: string; text?: string; voiceDirections: VoiceDirection[]; current: boolean; files: OutputAudio[] }

export type AudioJob = {
  id: string
  name: string
  sourceUrl: string
  startSeconds: number
  endSeconds: number
  speaker: string
  stage: JobStage
  progress: number
  message: string
  transcript: string
  synthesisText?: string
  voiceDirections?: VoiceDirection[]
  durationSeconds?: number
  trainingSpeaker?: 'A' | 'B'
  segments?: MediaSegment[]
  trainingTranscript?: string
  createdAt: string
  updatedAt: string
  files: {
    source?: string
    video?: string
    cleaned?: string
    baseVoice?: string
    trainedVoice?: string
    polishedVoice?: string
  }
  model?: { gpt: string; sovits: string; reference: string; referenceText: string }
  verification?: { baseVoice: string; trainedVoice: string; polishedVoice: string }
}

export type JobAction = 'extract' | 'clean' | 'transcribe' | 'train' | 'synthesize'
