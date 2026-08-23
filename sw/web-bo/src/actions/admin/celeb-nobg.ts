'use server'

import { requireAdmin } from '@/lib/admin-auth'
import {
  enqueueImageProcessingJob,
  getImageProcessingJob,
  getImageProcessingJobsForCelebs,
  type ImageProcessingJob,
} from '@/lib/image-processing/queue'

function assertUuid(celebId: string): void {
  if (!/^[0-9a-f-]{36}$/i.test(celebId)) throw new Error('잘못된 셀럽 ID입니다.')
}

export async function enqueueCelebAvatarBackgroundRemoval(
  celebId: string
): Promise<ImageProcessingJob> {
  await requireAdmin()
  assertUuid(celebId)
  return enqueueImageProcessingJob('nobg-avatar', celebId)
}

export async function enqueueCelebAvatarBackgroundRemovals(
  celebIds: string[]
): Promise<ImageProcessingJob[]> {
  await requireAdmin()
  const targets = [...new Set(celebIds)].slice(0, 100)
  targets.forEach(assertUuid)
  const jobs: ImageProcessingJob[] = []
  // 큐 순서를 목록 순서와 맞추려면 순차로 접수해야 한다.
  for (const celebId of targets) {
    jobs.push(await enqueueImageProcessingJob('nobg-avatar', celebId))
  }
  return jobs
}

export async function getCelebImageProcessingJobs(
  jobIds: string[]
): Promise<ImageProcessingJob[]> {
  await requireAdmin()
  const validIds = [...new Set(jobIds)]
    .filter((jobId) => /^[0-9a-f-]{36}$/i.test(jobId))
    .slice(0, 100)
  const results = await Promise.all(validIds.map((jobId) => getImageProcessingJob(jobId)))
  return results.filter((job): job is ImageProcessingJob => job !== null)
}

export async function getCelebActiveImageProcessingJobs(
  celebIds: string[]
): Promise<Record<string, ImageProcessingJob>> {
  await requireAdmin()
  const validIds = [...new Set(celebIds)]
    .filter((celebId) => /^[0-9a-f-]{36}$/i.test(celebId))
    .slice(0, 100)
  return getImageProcessingJobsForCelebs(validIds)
}
