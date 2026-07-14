import { getTranslations } from 'next-intl/server'
import { getFreePosts } from '@/actions/board/free'
import FreePostList from '@/components/features/board/free/FreePostList'

export async function generateMetadata() {
  const t = await getTranslations('agora')
  return { title: t('freeBoard'), description: t('meta.description') }
}

const ITEMS_PER_PAGE = 20

interface FreePageProps {
  searchParams: Promise<{ page?: string }>
}

export default async function FreePage({ searchParams }: FreePageProps) {
  const { page } = await searchParams
  const currentPage = Math.max(1, parseInt(page || '1', 10))
  const offset = (currentPage - 1) * ITEMS_PER_PAGE

  const { posts, total } = await getFreePosts({ limit: ITEMS_PER_PAGE, offset })
  const totalPages = Math.ceil(total / ITEMS_PER_PAGE)

  return (
    <FreePostList
      posts={posts}
      total={total}
      currentPage={currentPage}
      totalPages={totalPages}
    />
  )
}
