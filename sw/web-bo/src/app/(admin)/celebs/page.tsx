import type { Metadata } from 'next'
import CelebsPageView, { type CelebsSearchParams } from './components/CelebsPageView'

export const metadata: Metadata = {
  title: '셀럽 관리',
}

export default function CelebsPage({
  searchParams,
}: {
  searchParams: Promise<CelebsSearchParams>
}) {
  return <CelebsPageView searchParams={searchParams} view="table" />
}
