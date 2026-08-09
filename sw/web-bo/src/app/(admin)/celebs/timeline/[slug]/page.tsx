import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { getMemberBySlug } from '@/actions/admin/members'
import { getTimelineEvents } from '@/actions/admin/timeline'
import CelebSearchBar from '@/components/celeb/CelebSearchBar'
import TimelineEditor from './TimelineEditor'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const member = await getMemberBySlug(slug)
  const sectionName = member?.celeb_tier === 'fiction' ? '서사 연표' : '생애 행적'
  return { title: member ? `${member.nickname ?? '셀럽'} ${sectionName} 편집` : `${sectionName} 편집` }
}

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function TimelineDetailPage({ params }: PageProps) {
  const { slug } = await params
  const member = await getMemberBySlug(slug)

  if (!member || member.subject_kind !== 'celeb') {
    notFound()
  }

  const events = await getTimelineEvents(member.id)
  const isFiction = member.celeb_tier === 'fiction'
  const sectionName = isFiction ? '서사 연표' : '생애 행적'

  return (
    <div className="space-y-4 md:space-y-6">
      <CelebSearchBar className="max-w-xl" detailPathTemplate="/celebs/timeline/[slug]" />

      <div className="flex items-center gap-4">
        <Link
          href="/celebs/timeline"
          className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-secondary"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-text-primary">
            {`${member.nickname ?? '셀럽'} ${sectionName} 편집`}
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            {isFiction
              ? '원전의 사건 순서를 적습니다. 실제 연도를 만들지 말고 서사 단계와 근거 링크를 남기세요.'
              : '항목을 눌러 고칩니다. 좌표는 지명으로 찾아 고르세요 — 손으로 적으면 같은 이름의 다른 곳에 찍힙니다.'}
          </p>
        </div>
      </div>

      <TimelineEditor celebId={member.id} initialEvents={events} isFiction={isFiction} />
    </div>
  )
}
