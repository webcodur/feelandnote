import type { Metadata } from 'next'
import { getFictionSourceAdminData } from '@/actions/admin/fiction-sources'
import FictionSourcesManager from './FictionSourcesManager'

export const metadata: Metadata = {
  title: '인물 도서 관리',
}

export default async function FictionSourcesPage() {
  const data = await getFictionSourceAdminData()

  return <FictionSourcesManager initialData={data} />
}
