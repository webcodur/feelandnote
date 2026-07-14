import { getFreePosts } from '@/actions/board/free'
import FreePostList from '@/components/features/board/free/FreePostList'

const ITEMS_PER_PAGE = 20

// 홈 탭에 자유게시판 목록을 그대로 펼쳐 보여준다 (별도 페이지로 넘기지 않음)
export default async function HomeFreeBoardSection() {
  const { posts, total } = await getFreePosts({ limit: ITEMS_PER_PAGE, offset: 0 })
  const totalPages = Math.ceil(total / ITEMS_PER_PAGE)

  return (
    <div className="max-w-2xl mx-auto px-4">
      <FreePostList posts={posts} total={total} currentPage={1} totalPages={totalPages} />
    </div>
  )
}
