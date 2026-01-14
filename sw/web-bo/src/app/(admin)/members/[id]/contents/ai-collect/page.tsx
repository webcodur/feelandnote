import { getMember } from '@/actions/admin/members'
import { notFound } from 'next/navigation'
import AICollectView from './AICollectView'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function AICollectPage({ params }: PageProps) {
  const { id } = await params

  const member = await getMember(id)
  if (!member || member.profile_type !== 'CELEB') {
    notFound()
  }

  return <AICollectView celebId={id} celebName={member.nickname || '셀럽'} />
}
