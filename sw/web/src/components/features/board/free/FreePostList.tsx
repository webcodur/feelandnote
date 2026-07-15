'use client'

import { useRouter } from '@/i18n/navigation'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { FileText } from 'lucide-react'
import { Pagination } from '@/components/ui'
import type { FreePost } from '@/types/database'
import FreePostItem from './FreePostItem'
import FreePostComposer from './FreePostComposer'

interface FreePostListProps {
  posts: FreePost[]
  total: number
  currentPage: number
  totalPages: number
  isLoggedIn: boolean
}

export default function FreePostList({ posts, currentPage, totalPages, isLoggedIn }: FreePostListProps) {
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
      {/* 글쓰기 (누구나) — 이 자리에서 펼쳐 쓴다 */}
      <div className="mb-6">
        <FreePostComposer isLoggedIn={isLoggedIn} />
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
