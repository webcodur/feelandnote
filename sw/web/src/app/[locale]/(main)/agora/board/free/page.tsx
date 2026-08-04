import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { getFreePosts } from '@/actions/board/free'
import FreePostList from '@/components/features/board/free/FreePostList'
import { resolveLocale } from '@/types/locale'

export async function generateMetadata() {
  const t = await getTranslations('agora')
  return { title: t('freeBoard'), description: t('meta.description') }
}

const ITEMS_PER_PAGE = 20

interface FreePageProps {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ page?: string }>
}

export default async function FreePage({ params, searchParams }: FreePageProps) {
  const [{ locale: rawLocale }, { page }] = await Promise.all([params, searchParams])
  const locale = resolveLocale(rawLocale)
  const currentPage = Math.max(1, parseInt(page || '1', 10))
  const offset = (currentPage - 1) * ITEMS_PER_PAGE

  const supabase = await createClient()
  const [{ posts, total }, { data: { user } }] = await Promise.all([
    getFreePosts({ locale, limit: ITEMS_PER_PAGE, offset }),
    supabase.auth.getUser(),
  ])
  const totalPages = Math.ceil(total / ITEMS_PER_PAGE)

  return (
    <FreePostList
      posts={posts}
      total={total}
      currentPage={currentPage}
      totalPages={totalPages}
      isLoggedIn={!!user}
    />
  )
}
