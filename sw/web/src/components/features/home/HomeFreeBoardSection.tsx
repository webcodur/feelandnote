import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/auth/checkAdmin'
import { getFreePosts } from '@/actions/board/free'
import HomeFreeBoardList from './HomeFreeBoardList'

const ITEMS_PER_PAGE = 20

// 홈 탭에 자유게시판을 그대로 펼쳐 보여준다 (글 클릭 시 페이지 이동 없이 아코디언 확장)
export default async function HomeFreeBoardSection() {
  const supabase = await createClient()
  const [{ posts, hasMore }, { data: { user } }, admin] = await Promise.all([
    getFreePosts({ limit: ITEMS_PER_PAGE, offset: 0 }),
    supabase.auth.getUser(),
    isAdmin(supabase),
  ])

  return (
    <div className="max-w-2xl mx-auto px-4">
      <HomeFreeBoardList
        posts={posts}
        initialHasMore={hasMore}
        currentUserId={user?.id}
        isAdmin={admin}
        isLoggedIn={!!user}
      />
    </div>
  )
}
