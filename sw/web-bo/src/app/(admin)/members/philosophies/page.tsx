import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: '감상 철학 편집',
}
import { ArrowLeft } from 'lucide-react'
import { getCelebsForPhilosophyEdit } from '@/actions/admin/celebs'
import CelebPhilosophyEditor from './CelebPhilosophyEditor'

interface PageProps {
  searchParams: Promise<{
    page?: string
  }>
}

export default async function CelebPhilosophiesPage({ searchParams }: PageProps) {
  const params = await searchParams
  const page = Number(params.page) || 1
  const limit = 50
  
  const { celebs, total } = await getCelebsForPhilosophyEdit(page, limit)

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/members?type=celeb"
          className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-secondary"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-text-primary">셀럽 감상 철학 편집</h1>
          <p className="text-sm text-text-secondary mt-1">총 {total}명의 셀럽</p>
        </div>
      </div>

      {/* Editor */}
      <CelebPhilosophyEditor celebs={celebs} page={page} total={total} limit={limit} />
    </div>
  )
}
