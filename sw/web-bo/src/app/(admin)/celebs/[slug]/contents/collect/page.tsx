import type { Metadata } from 'next'
import { getMemberBySlug } from '@/actions/admin/members'
import { notFound } from 'next/navigation'
import CollectView from '../../../../members/[id]/contents/collect/CollectView'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const member = await getMemberBySlug(slug)
  return {
    title: member ? `${member.nickname} 수집` : '수집',
  }
}

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function CollectPage({ params }: PageProps) {
  const { slug } = await params

  const member = await getMemberBySlug(slug)
  if (!member || member.profile_type !== 'CELEB') {
    notFound()
  }

  return <CollectView celebId={member.id} celebName={member.nickname || '셀럽'} />
}
