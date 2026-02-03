import { redirect } from 'next/navigation'
import { getMember } from '@/actions/admin/members'

interface PageProps {
  params: Promise<{ id: string }>
}

// 기존 /members/[id] 경로를 타입에 따라 적절한 곳으로 리다이렉트
export default async function MemberDetailPage({ params }: PageProps) {
  const { id } = await params
  const member = await getMember(id)

  if (!member) {
    redirect('/users')
  }

  // 프로필 타입에 따라 적절한 경로로 리다이렉트
  if (member.profile_type === 'CELEB') {
    redirect(`/celebs/${id}`)
  } else {
    redirect(`/users/${id}`)
  }
}
