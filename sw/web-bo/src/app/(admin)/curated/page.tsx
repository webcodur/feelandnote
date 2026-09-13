import type { Metadata } from 'next'
import { getCuratedAdminOverview } from '@/actions/admin/curated'
import CuratedBoard from './CuratedBoard'

export const metadata: Metadata = {
  title: '기관 선정 관리',
}

export default async function CuratedPage() {
  const overview = await getCuratedAdminOverview()

  return <CuratedBoard initialData={overview} />
}
