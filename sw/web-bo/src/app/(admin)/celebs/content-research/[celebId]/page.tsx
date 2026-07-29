import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, BookMarked, ExternalLink } from 'lucide-react'
import { getContentResearchDetail } from '@/actions/admin/content-research'
import { getCelebProfessionLabel } from '@/constants/celebCategories'
import ResearchLedger from './ledger'

export const metadata: Metadata = {
  title: '콘텐츠 조사 장부',
  robots: { index: false, follow: false },
}

interface PageProps {
  params: Promise<{ celebId: string }>
}

export default async function ContentResearchLedgerPage({ params }: PageProps) {
  const { celebId } = await params
  const detail = await getContentResearchDetail(celebId)
  const { profile } = detail

  return (
    <div className="space-y-5">
      <header className="border-b border-border pb-5">
        <Link
          href="/celebs/content-research"
          className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-accent"
        >
          <ArrowLeft className="h-4 w-4" />
          콘텐츠 조사 목록
        </Link>

        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <BookMarked className="h-6 w-6 text-accent" />
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-text-tertiary">
                Evidence ledger
              </p>
            </div>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-text-primary">
              {profile.nickname}
            </h1>
            <p className="mt-2 text-sm text-text-secondary">
              {getCelebProfessionLabel(profile.profession)}
              {' · '}
              {profile.profileStatus === 'active' ? '활성' : '비활성'}
              {' · '}
              {profile.celebTier ?? 'tier 미지정'}
              {' · '}
              실제 콘텐츠 {profile.actualContentCount}건
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {profile.slug ? (
              <>
                <Link
                  href={`/celebs/${profile.slug}/contents`}
                  className="inline-flex items-center gap-1.5 rounded border border-border px-3 py-2 text-sm text-text-secondary hover:border-accent hover:text-accent"
                >
                  콘텐츠 관리
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
                <Link
                  href={`/celebs/${profile.slug}/contents/collect`}
                  className="inline-flex items-center gap-1.5 rounded border border-border px-3 py-2 text-sm text-text-secondary hover:border-accent hover:text-accent"
                >
                  수집 작업대
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </>
            ) : null}
            <span className="rounded border border-slate-500/40 bg-slate-500/10 px-3 py-2 font-mono text-xs text-slate-200">
              {profile.researchStatus}
            </span>
          </div>
        </div>
      </header>

      <ResearchLedger detail={detail} />
    </div>
  )
}
