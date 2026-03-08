import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { getPersonaVectors } from '@/actions/admin/persona'
import { getMemberBySlug } from '@/actions/admin/members'
import CelebSearchBar from '@/components/celeb/CelebSearchBar'
import PersonaReferencePanel from '../components/PersonaReferencePanel'
import VectorDashboard from '../components/VectorChart'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const member = await getMemberBySlug(slug)

  return {
    title: member
      ? `${member.nickname ?? '\uC140\uB7FD'} \uD398\uB974\uC18C\uB098 \uBD84\uC11D`
      : '\uD398\uB974\uC18C\uB098 \uBD84\uC11D',
  }
}

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function PersonaVectorDetailPage({ params }: PageProps) {
  const { slug } = await params
  const member = await getMemberBySlug(slug)

  if (!member || member.profile_type !== 'CELEB') {
    notFound()
  }

  const vectors = await getPersonaVectors()
  const selectedVectors = vectors.filter((vector) => vector.celeb_id === member.id)

  return (
    <div className="space-y-6">
      <CelebSearchBar
        className="max-w-xl"
        detailPathTemplate="/celebs/vectors/[slug]"
      />

      <div className="flex items-center gap-4">
        <Link
          href="/celebs/vectors"
          className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-secondary"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-text-primary">
            {`${member.nickname ?? '\uC140\uB7FD'} \uD398\uB974\uC18C\uB098 \uBD84\uC11D`}
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            {'\uC120\uD0DD\uD55C \uC140\uB7FD\uC758 \uD398\uB974\uC18C\uB098 \uCD95\uC744 \uB2E8\uC77C \uBDF0\uB85C \uD655\uC778\uD569\uB2C8\uB2E4.'}
          </p>
        </div>
      </div>

      <PersonaReferencePanel vectors={vectors} />

      {selectedVectors.length > 0 ? (
        <VectorDashboard vectors={selectedVectors} />
      ) : (
        <div className="rounded-xl border border-border bg-bg-card p-6 text-sm text-text-secondary">
          {'\uC774 \uC140\uB7FD\uC740 \uC544\uC9C1 \uD398\uB974\uC18C\uB098 \uBCA1\uD130\uAC00 \uB4F1\uB85D\uB418\uC5B4 \uC788\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.'}
        </div>
      )}
    </div>
  )
}
