import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { REMOTION_LOCAL } from '@/lib/remotion-local'

export const metadata: Metadata = {
  title: '서재 탐방 제작',
  robots: { index: false, follow: false },
}

export default async function BookRecommendProductionLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ series: string }>
}) {
  const { series } = await params
  if (series !== 'book-recommend') notFound()

  if (!REMOTION_LOCAL) {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5">
        <h1 className="font-semibold text-amber-300">로컬 렌더 저장소가 연결되지 않았습니다</h1>
        <p className="mt-2 text-sm text-text-secondary">
          서재 탐방 제작 화면은 <code className="font-mono text-text-primary">REMOTION_LOCAL=1</code>인
          로컬 관리자 환경에서만 동작합니다.
        </p>
      </div>
    )
  }

  return <div className="remotion-ui min-w-0">{children}</div>
}
