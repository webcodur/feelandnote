'use client'

import { Link, useRouter } from '@/i18n/navigation'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Plus, FileText } from 'lucide-react'
import { Button, Pagination } from '@/components/ui'
import type { FreePost } from '@/types/database'
import FreePostItem from './FreePostItem'

interface FreePostListProps {
  posts: FreePost[]
  total: number
  currentPage: number
  totalPages: number
}

export default function FreePostList({ posts, currentPage, totalPages }: FreePostListProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useTranslations('board')

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString())
    if (page === 1) {
      params.delete('page')
    } else {
      params.set('page', String(page))
    }
    const query = params.toString()
    router.push(`/agora/board/free${query ? `?${query}` : ''}`)
  }

  return (
    <div>
      {/* 글쓰기 (누구나) */}
      <div className="flex justify-end mb-6">
        <Link href="/agora/board/free/write">
          <Button size="sm" className="gap-2">
            <Plus size={16} />
            <span className="font-serif">{t('free.write')}</span>
          </Button>
        </Link>
      </div>

      {posts.length === 0 ? (
        <div className="text-center py-20">
          <div className="inline-block p-6 rounded-full bg-bg-card/50 border border-accent-dim/20 mb-6">
            <FileText size={48} strokeWidth={1} className="text-accent-dim" />
          </div>
          <p className="font-serif text-text-secondary">{t('free.emptyTitle')}</p>
          <p className="text-xs text-text-tertiary mt-2">{t('free.emptySubtitle')}</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {posts.map((post) => (
              <FreePostItem key={post.id} post={post} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-8">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}
