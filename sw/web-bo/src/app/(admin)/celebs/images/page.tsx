import type { Metadata } from 'next'
import CelebsPageView, { type CelebsSearchParams } from '../components/CelebsPageView'
import CelebImageGrid from '../components/CelebImageGrid'
import { getImageProcessingJobsForCelebs } from '@/lib/image-processing/queue'

export const metadata: Metadata = {
  title: '셀럽 이미지 작업',
}

export default function CelebImagesPage({
  searchParams,
}: {
  searchParams: Promise<CelebsSearchParams>
}) {
  return <CelebsPageView searchParams={searchParams} view="images" renderResults={async ({ celebs, resultSetKey }) => {
    const imageProcessingJobs = await getImageProcessingJobsForCelebs(celebs.map((celeb) => celeb.id))
    return <CelebImageGrid key={resultSetKey} celebs={celebs} imageProcessingJobs={imageProcessingJobs} />
  }} />
}
