import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getTags } from '@/actions/admin/tags'
import TagList from '../../members/tags/TagList'

export const metadata: Metadata = {
  title: '태그 관리',
}

export default async function TagsPage() {
  const { tags } = await getTags()

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
          <h1 className="text-xl md:text-2xl font-bold text-text-primary">셀럽 태그 관리</h1>
          <p className="text-sm text-text-secondary mt-1">총 {tags.length}개의 태그</p>
        </div>
      </div>

      <TagList initialTags={tags} />
    </div>
  )
}
