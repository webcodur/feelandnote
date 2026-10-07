import { getTranslations } from 'next-intl/server'
import { getRequestUser } from '@/lib/db/server'
import { getFreePosts } from '@/actions/board/free'
import FreePostList from '@/components/features/board/free/FreePostList'
import { resolveLocale } from '@/types/locale'
import Lane from '@/components/ui/pending/Lane'
import { PendingBlock, RetryBlock } from '@/components/ui/pending'

export async function generateMetadata() {
  const t = await getTranslations('agora')
  return { title: t('freeBoard'), description: t('meta.description') }
}

const ITEMS_PER_PAGE = 20

interface FreePageProps {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ page?: string }>
}

export default function FreePage(props: FreePageProps) {
  return <Lane fallback={<PendingBlock variant="rows" count={6} />}><FreeBody {...props} /></Lane>
}

async function FreeBody({ params, searchParams }: FreePageProps) {
  const [{ locale: rawLocale }, { page }] = await Promise.all([params, searchParams])
  const locale = resolveLocale(rawLocale)
  const currentPage = Math.max(1, parseInt(page || '1', 10))
  const offset = (currentPage - 1) * ITEMS_PER_PAGE

  const result = await Promise.all([
    getFreePosts({ locale, limit: ITEMS_PER_PAGE, offset }),
    getRequestUser(),
  ]).catch(error => {
    console.error('[FreeBoard:list]', error)
    return null
  })
  if (!result) return <RetryBlock />
  const [{ posts, total }, { data: { user } }] = result
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
