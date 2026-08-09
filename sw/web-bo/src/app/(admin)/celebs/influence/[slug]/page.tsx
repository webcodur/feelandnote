import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { getInfluenceList } from '@/actions/admin/influence'
import { getMemberBySlug } from '@/actions/admin/members'
import CelebSearchBar from '@/components/celeb/CelebSearchBar'
import InfluenceDashboard from '../InfluenceDashboard'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const member = await getMemberBySlug(slug)

  return {
    title: member
      ? `${member.nickname ?? '\uC140\uB7FD'} \uC601\uD5A5\uB825 \uD3C9\uAC00`
      : '\uC601\uD5A5\uB825 \uD3C9\uAC00',
  }
}

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function InfluenceDetailPage({ params }: PageProps) {
  const { slug } = await params
  const member = await getMemberBySlug(slug)

  if (!member || member.subject_kind !== 'celeb') {
    notFound()
  }

  const list = await getInfluenceList()
  const selectedRows = list.filter((row) => row.celeb_id === member.id)

  return (
    <div className="space-y-6">
      <CelebSearchBar
        className="max-w-xl"
        detailPathTemplate="/celebs/influence/[slug]"
      />

      <div className="flex items-center gap-4">
        <Link
          href="/celebs/influence"
          className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-secondary"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-text-primary">
            {`${member.nickname ?? '\uC140\uB7FD'} \uC601\uD5A5\uB825 \uD3C9\uAC00`}
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            {'\uC120\uD0DD\uD55C \uC140\uB7FD\uC758 \uC601\uD5A5\uB825 \uCD95\uC744 \uD55C \uD654\uBA74\uC5D0\uC11C \uBCF4\uC5EC\uC90D\uB2C8\uB2E4.'}
          </p>
        </div>
      </div>

      {selectedRows.length > 0 ? (
        <InfluenceDashboard data={selectedRows} />
      ) : (
        <div className="rounded-xl border border-border bg-bg-card p-6 text-sm text-text-secondary">
          {'\uC774 \uC140\uB7FD\uC740 \uC544\uC9C1 \uC601\uD5A5\uB825 \uB370\uC774\uD130\uAC00 \uB4F1\uB85D\uB418\uC5B4 \uC788\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.'}
        </div>
      )}
    </div>
  )
}
