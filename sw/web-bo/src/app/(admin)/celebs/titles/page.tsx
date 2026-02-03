import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getCelebsForTitleEdit } from '@/actions/admin/celebs'
import CelebTitleEditor from '../../members/titles/CelebTitleEditor'

export const metadata: Metadata = {
  title: '수식어 편집',
}

export default async function CelebTitlesPage() {
  const celebs = await getCelebsForTitleEdit()

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/celebs"
          className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-secondary"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-text-primary">셀럽 수식어 편집</h1>
          <p className="text-sm text-text-secondary mt-1">총 {celebs.length}명의 셀럽</p>
        </div>
      </div>

      {/* Editor */}
      <CelebTitleEditor celebs={celebs} />
    </div>
  )
}
