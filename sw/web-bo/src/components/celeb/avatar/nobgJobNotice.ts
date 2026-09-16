import type { ImageProcessingJob } from '@/lib/image-processing/types'

/**
 * 배경 제거 작업을 접수했을 때 띄우는 문구.
 * 누끼 버튼과 자르기 창이 같은 큐에 넣으므로 같은 말을 쓴다.
 */
export function nobgQueuedMessage(label: string, job: ImageProcessingJob): string {
  return job.status === 'running'
    ? `${label} 배경 제거를 시작했습니다.`
    : `${label} 배경 제거를 대기열 ${job.queuePosition}번째로 접수했습니다.`
}

export function nobgQueueFailureMessage(error: unknown): string {
  return error instanceof Error ? error.message : '배경 제거 작업을 접수하지 못했습니다.'
}
