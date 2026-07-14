import type { AudioJob } from './types'

export const WORKFLOW_STEPS = ['영상 선택', '구간 편집', '목소리 학습', '새 음성 만들기'] as const

export function getCompletedStep(job: AudioJob) {
  if (job.files.polishedVoice) return 4
  if (job.model) return 3
  if (job.transcript) return 2
  if (job.files.source) return 1
  return 0
}

export function getCompletedStepLabel(job: AudioJob) {
  const step = getCompletedStep(job)
  return step === 0 ? '시작 전' : `${WORKFLOW_STEPS[step - 1]} 완료`
}

export function isJobComplete(job: AudioJob) {
  return getCompletedStep(job) === WORKFLOW_STEPS.length
}
