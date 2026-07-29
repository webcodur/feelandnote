import type { Metadata } from 'next'
import { getFictionSourceAdminData } from '@/actions/admin/fiction-sources'
import FictionSourcesManager from './FictionSourcesManager'

export const metadata: Metadata = {
  title: '픽션 원전 관리',
}

export default async function FictionSourcesPage() {
  const data = await getFictionSourceAdminData()

  return <FictionSourcesManager initialData={data} />
}
