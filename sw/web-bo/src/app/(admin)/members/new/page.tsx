import type { Metadata } from 'next'
import { ArrowLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: '셀럽 추가',
}
import Link from 'next/link'
import CelebForm from '../components/CelebForm'

export default function NewCelebPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/members?tab=celeb" className="text-text-secondary hover:text-text-primary">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">셀럽 계정 생성</h1>
          <p className="text-text-secondary mt-1">새로운 셀럽 계정을 생성합니다.</p>
        </div>
      </div>

      {/* Form */}
      <CelebForm mode="create" />
    </div>
  )
}
