import type { Metadata } from 'next'
import CelebsPageView, { type CelebsSearchParams } from '../components/CelebsPageView'

export const metadata: Metadata = {
  title: '셀럽 이미지 작업',
}

export default function CelebImagesPage({
  searchParams,
}: {
  searchParams: Promise<CelebsSearchParams>
}) {
  return <CelebsPageView searchParams={searchParams} view="images" />
}
