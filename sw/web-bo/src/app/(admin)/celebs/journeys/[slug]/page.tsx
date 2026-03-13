import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import type { CelebTitleItem } from '@/actions/admin/celebs'
import { getMemberBySlug } from '@/actions/admin/members'
import CelebSearchBar from '@/components/celeb/CelebSearchBar'
import CelebJourneyEditor from '../../../members/journeys/CelebJourneyEditor'

function toCelebEditItem(member: Awaited<ReturnType<typeof getMemberBySlug>>): CelebTitleItem {
  return {
    id: member!.id,
    nickname: member!.nickname ?? null,
    avatar_url: member!.avatar_url ?? null,
    profession: member!.profession ?? null,
    title: member!.title ?? null,
    cultural_journey: member!.cultural_journey ?? null,
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const member = await getMemberBySlug(slug)

  return {
    title: member
      ? `${member.nickname ?? '\uC140\uB7FD'} \uAC10\uC0C1 \uCCA0\uD559 \uD3B8\uC9D1`
      : '\uAC10\uC0C1 \uCCA0\uD559 \uD3B8\uC9D1',
  }
}

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function CelebJourneyDetailPage({ params }: PageProps) {
  const { slug } = await params
  const member = await getMemberBySlug(slug)

  if (!member || member.profile_type !== 'CELEB') {
    notFound()
  }

  const celeb = toCelebEditItem(member)

  return (
    <div className="space-y-4 md:space-y-6">
      <CelebSearchBar
        className="max-w-xl"
        detailPathTemplate="/celebs/journeys/[slug]"
      />

      <div className="flex items-center gap-4">
        <Link
          href="/celebs/journeys"
          className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-secondary"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-text-primary">
            {`${member.nickname ?? '\uC140\uB7FD'} \uAC10\uC0C1 \uCCA0\uD559 \uD3B8\uC9D1`}
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            {'\uD574\uB2F9 \uC140\uB7FD\uC758 \uAC10\uC0C1 \uCCA0\uD559\uB9CC \uC9D1\uC911\uD574\uC11C \uC218\uC815\uD569\uB2C8\uB2E4.'}
          </p>
        </div>
      </div>

      <CelebJourneyEditor celebs={[celeb]} page={1} total={1} limit={50} />
    </div>
  )
}
