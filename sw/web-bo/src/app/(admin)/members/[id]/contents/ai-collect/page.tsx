import type { Metadata } from 'next'
import { getMember } from '@/actions/admin/members'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const member = await getMember(id)
  return {
    title: member ? `${member.nickname} AI 수집` : 'AI 수집',
  }
}
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
