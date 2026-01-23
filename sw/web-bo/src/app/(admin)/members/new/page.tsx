import type { Metadata } from 'next'
import { ArrowLeft, Star } from 'lucide-react'

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

      {/* Profile Card Placeholder */}
      <div className="bg-bg-card border border-border border-dashed rounded-lg p-6">
        <div className="flex items-start gap-6">
          <div className="relative w-32 h-32 rounded-xl bg-yellow-500/10 flex items-center justify-center shrink-0">
            <Star className="w-12 h-12 text-yellow-400/40" />
          </div>
          <div className="flex-1 flex items-center justify-center min-h-[128px]">
            <p className="text-text-secondary text-sm">셀럽 생성 시 여기에 인물 정보가 출력됩니다</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <CelebForm mode="create" />
    </div>
  )
}
