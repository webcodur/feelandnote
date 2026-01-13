import { getCeleb } from '@/actions/admin/celebs'
import { notFound } from 'next/navigation'
import AICollectView from './AICollectView'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function AICollectPage({ params }: PageProps) {
  const { id } = await params

  const celeb = await getCeleb(id)
  if (!celeb) {
    notFound()
  }

  return <AICollectView celebId={id} celebName={celeb.nickname || '셀럽'} />
}
