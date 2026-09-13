import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getCuratedAdminCurators, getCuratedListAdminDetail } from '@/actions/admin/curated'
import CuratedListEditor from './CuratedListEditor'

export const metadata: Metadata = {
  title: '기관 선정 목록 편집',
}

export default async function CuratedListPage({ params }: { params: Promise<{ listId: string }> }) {
  const { listId } = await params
  const [detail, curators] = await Promise.all([
    getCuratedListAdminDetail(listId),
    getCuratedAdminCurators(),
  ])
  if (!detail) notFound()

  return (
    <CuratedListEditor
      detail={detail}
      curators={curators}
      publicWebUrl={process.env.NEXT_PUBLIC_WEB_URL ?? ''}
    />
  )
}
