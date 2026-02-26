import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getCelebsForDialogueEdit } from '@/actions/admin/dialogues'
import DialogueEditor from './DialogueEditor'

export const metadata: Metadata = {
  title: '대사 관리',
}

interface PageProps {
  searchParams: Promise<{ page?: string }>
}

export default async function CelebDialoguesPage({ searchParams }: PageProps) {
  const params = await searchParams
  const page = Number(params.page) || 1
  const limit = 50

  const { celebs, total } = await getCelebsForDialogueEdit(page, limit)

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/celebs"
          className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-secondary"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-text-primary">셀럽 대사 관리</h1>
          <p className="text-sm text-text-secondary mt-1">총 {total}명 · speech_tone + 고유 대사 편집</p>
        </div>
      </div>

      <DialogueEditor celebs={celebs} page={page} total={total} limit={limit} />
    </div>
  )
}
