export type ImageProcessingJobType = 'nobg-avatar' | 'nobg-avatar-only'
export type ImageProcessingJobStatus = 'queued' | 'running' | 'done' | 'error'

export interface ImageProcessingJob {
  id: string
  type: ImageProcessingJobType
  celebId: string
  status: ImageProcessingJobStatus
  queuePosition: number
  createdAt: string
  startedAt?: string
  finishedAt?: string
  resultUrl?: string
  error?: string
  progress?: string
}
