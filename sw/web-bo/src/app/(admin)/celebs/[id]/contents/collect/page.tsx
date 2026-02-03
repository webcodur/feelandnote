import type { Metadata } from 'next'
import { getMember } from '@/actions/admin/members'
import { notFound } from 'next/navigation'
import CollectView from '../../../../members/[id]/contents/collect/CollectView'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const member = await getMember(id)
  return {
    title: member ? `${member.nickname} 수집` : '수집',
  }
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function CollectPage({ params }: PageProps) {
  const { id } = await params

  const member = await getMember(id)
  if (!member || member.profile_type !== 'CELEB') {
    notFound()
  }

  return <CollectView celebId={id} celebName={member.nickname || '셀럽'} />
}
