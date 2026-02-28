import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getCelebsForQuotesEdit } from '@/actions/admin/celebs'
import CelebQuotesEditor from './CelebQuotesEditor'

export const metadata: Metadata = {
  title: '명언 편집',
}

export default async function CelebQuotesPage() {
  const celebs = await getCelebsForQuotesEdit()

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
          <h1 className="text-xl md:text-2xl font-bold text-text-primary">셀럽 명언 편집</h1>
          <p className="text-sm text-text-secondary mt-1">총 {celebs.length}명의 셀럽</p>
        </div>
      </div>

      {/* Editor */}
      <CelebQuotesEditor celebs={celebs} />
    </div>
  )
}
