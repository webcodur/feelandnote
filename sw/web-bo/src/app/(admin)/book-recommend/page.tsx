import type { Metadata } from 'next'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { BookOpenText } from 'lucide-react'
import { getBookRecommendResourceAudit } from '@/actions/admin/book-recommend'
import { REMOTION_LOCAL } from '@/lib/remotion-local'
import BookRecommendResourceBoard from './BookRecommendResourceBoard'

const BookRecommendProductionDashboard = dynamic(
  () => import('@/features/book-recommend/components/BookRecommendProductionDashboard'),
)

export const metadata: Metadata = {
  title: '서재 탐방 제작',
  robots: { index: false, follow: false },
}

export default async function BookRecommendPage({
  searchParams,
}: {
  searchParams: Promise<{ contentId?: string; view?: 'production' | 'resources' }>
}) {
  const params = await searchParams
  const view = params.contentId || params.view === 'resources' ? 'resources' : 'production'
  const audit = view === 'resources' && REMOTION_LOCAL
    ? await getBookRecommendResourceAudit()
    : null

  return (
    <div className="space-y-5">
      <header>
        <div className="flex items-center gap-2">
          <BookOpenText className="h-6 w-6 text-accent" />
          <h1 className="text-xl font-bold text-text-primary md:text-2xl">서재 탐방</h1>
        </div>
        <p className="mt-1 text-sm text-text-secondary">
          원고·음성·렌더·배포와 본 서비스 리소스를 한 작업대에서 관리합니다.
        </p>
      </header>

      <nav className="flex w-fit overflow-hidden rounded-lg border border-border bg-bg-card">
        <Link
          href="/book-recommend?view=production"
          className={`px-4 py-2 text-sm font-semibold ${
            view === 'production' ? 'bg-accent text-white' : 'text-text-secondary hover:text-accent'
          }`}
        >
          제작
        </Link>
        <Link
          href="/book-recommend?view=resources"
          className={`border-l border-border px-4 py-2 text-sm font-semibold ${
            view === 'resources' ? 'bg-accent text-white' : 'text-text-secondary hover:text-accent'
          }`}
        >
          리소스
        </Link>
      </nav>

      {view === 'production' ? (
        REMOTION_LOCAL ? (
          <div className="remotion-ui">
            <BookRecommendProductionDashboard />
          </div>
        ) : (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5">
            <h2 className="font-semibold text-amber-300">로컬 렌더 저장소가 연결되지 않았습니다</h2>
            <p className="mt-2 text-sm text-text-secondary">
              제작 화면은 <code className="font-mono text-text-primary">REMOTION_LOCAL=1</code>인
              로컬 관리자 환경에서만 동작합니다.
            </p>
          </div>
        )
      ) : (
        <BookRecommendResourceBoard
          audit={audit}
          remotionLocal={REMOTION_LOCAL}
          initialContentId={params.contentId ?? ''}
        />
      )}
    </div>
  )
}
