import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getCelebsForHeadlineEdit } from '@/actions/admin/celebs'
import CelebSearchBar from '@/components/celeb/CelebSearchBar'
import CelebHeadlineEditor from './CelebHeadlineEditor'

export const metadata: Metadata = {
  title: '헤드라인 관리',
}

export default async function CelebHeadlinesPage() {
  const celebs = await getCelebsForHeadlineEdit()

  return (
    <div className="space-y-4 md:space-y-6">
      <CelebSearchBar
        className="max-w-xl"
        detailPathTemplate="/celebs/[slug]"
      />

      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/celebs"
          className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-secondary active:scale-95 transition-transform"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-text-primary">셀럽 헤드라인(한 줄 정의) 관리</h1>
          <p className="text-sm text-text-secondary mt-1">
            인물별 국문·영문 한 줄 정의 현황을 조회하고 빠르게 편집합니다 (총 {celebs.length}명)
          </p>
        </div>
      </div>

      {/* Editor & List */}
      <CelebHeadlineEditor initialCelebs={celebs} />
    </div>
  )
}
