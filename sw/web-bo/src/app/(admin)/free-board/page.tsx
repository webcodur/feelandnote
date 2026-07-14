import type { Metadata } from 'next'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import Pagination from '@/components/ui/Pagination'
import Button from '@/components/ui/Button'
import FreeBoardActions from './FreeBoardActions'

export const metadata: Metadata = { title: '자유게시판 관리' }

interface FreeRow {
  id: string
  title?: string
  content: string
  nickname: string | null
  author_id: string | null
  is_anonymous: boolean
  is_deleted: boolean
  view_count?: number
  created_at: string
  author: { nickname: string | null } | null
}

interface PageProps {
  searchParams: Promise<{ page?: string; tab?: string; filter?: string }>
}

function authorLabel(row: FreeRow): string {
  if (row.author_id && !row.is_anonymous) return row.author?.nickname || '(탈퇴/미상)'
  return row.nickname || '익명'
}

const FILTERS = [
  { value: 'all', label: '전체' },
  { value: 'visible', label: '노출' },
  { value: 'hidden', label: '숨김' },
]

export default async function FreeBoardAdminPage({ searchParams }: PageProps) {
  const params = await searchParams
  const page = Number(params.page) || 1
  const tab: 'posts' | 'comments' = params.tab === 'comments' ? 'comments' : 'posts'
  const filter = params.filter || 'all'
  const limit = 20
  const offset = (page - 1) * limit

  const supabase = createAdminClient()
  const table = tab === 'posts' ? 'free_posts' : 'free_post_comments'

  let query = supabase.from(table).select('*, author:author_id(nickname)', { count: 'exact' })
  if (filter === 'visible') query = query.eq('is_deleted', false)
  if (filter === 'hidden') query = query.eq('is_deleted', true)

  const { data, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  const rows = (data ?? []) as unknown as FreeRow[]
  const total = count || 0
  const totalPages = Math.ceil(total / limit)

  const tabHref = (t: string) => `/free-board?tab=${t}${filter !== 'all' ? `&filter=${filter}` : ''}`

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-text-primary">자유게시판 관리</h1>
        <p className="text-sm text-text-secondary mt-1">총 {total.toLocaleString()}개 · 부적절한 글·댓글을 숨김 처리한다</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <Link
          href={tabHref('posts')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            tab === 'posts' ? 'bg-accent text-white' : 'bg-bg-card border border-border text-text-secondary hover:text-text-primary'
          }`}
        >
          글
        </Link>
        <Link
          href={tabHref('comments')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            tab === 'comments' ? 'bg-accent text-white' : 'bg-bg-card border border-border text-text-secondary hover:text-text-primary'
          }`}
        >
          댓글
        </Link>
      </div>

      {/* Filter */}
      <div className="bg-bg-card border border-border rounded-lg p-3 md:p-4">
        <form className="flex gap-2 md:gap-4">
          <input type="hidden" name="tab" value={tab} />
          <select
            name="filter"
            defaultValue={filter}
            className="flex-1 sm:flex-none px-3 py-2 bg-bg-secondary border border-border rounded-lg text-sm text-text-primary focus:border-accent focus:outline-none"
          >
            {FILTERS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
          <Button type="submit" size="sm">적용</Button>
        </form>
      </div>

      {/* Table */}
      <div className="bg-bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead className="bg-bg-secondary border-b border-border">
              <tr className="divide-x divide-border">
                {tab === 'posts' && (
                  <th className="text-center px-3 md:px-6 py-3 md:py-4 text-xs md:text-sm font-medium text-text-secondary">제목</th>
                )}
                <th className="text-center px-3 md:px-6 py-3 md:py-4 text-xs md:text-sm font-medium text-text-secondary">내용</th>
                <th className="text-center px-3 md:px-6 py-3 md:py-4 text-xs md:text-sm font-medium text-text-secondary whitespace-nowrap">작성자</th>
                <th className="text-center px-3 md:px-6 py-3 md:py-4 text-xs md:text-sm font-medium text-text-secondary whitespace-nowrap">작성일</th>
                <th className="text-center px-3 md:px-6 py-3 md:py-4 text-xs md:text-sm font-medium text-text-secondary whitespace-nowrap">상태</th>
                <th className="text-center px-3 md:px-6 py-3 md:py-4 text-xs md:text-sm font-medium text-text-secondary">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={tab === 'posts' ? 6 : 5} className="px-6 py-12 text-center text-text-secondary text-sm">
                    내역이 없습니다
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="odd:bg-white/[0.02] hover:bg-bg-secondary/50 divide-x divide-border">
                    {tab === 'posts' && (
                      <td className="px-3 md:px-6 py-3 md:py-4">
                        <p className="text-xs md:text-sm font-medium text-text-primary line-clamp-1 max-w-[160px]">
                          {row.title || '-'}
                        </p>
                      </td>
                    )}
                    <td className="px-3 md:px-6 py-3 md:py-4">
                      <p className="text-xs md:text-sm text-text-secondary line-clamp-2 max-w-[240px]">
                        {row.content}
                      </p>
                    </td>
                    <td className="px-3 md:px-6 py-3 md:py-4 text-xs md:text-sm text-text-secondary text-center whitespace-nowrap">
                      {authorLabel(row)}
                    </td>
                    <td className="px-3 md:px-6 py-3 md:py-4 text-xs md:text-sm text-text-secondary text-center whitespace-nowrap">
                      {new Date(row.created_at).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="px-3 md:px-6 py-3 md:py-4 text-center">
                      <span
                        className={`inline-flex items-center px-1.5 md:px-2 py-0.5 md:py-1 rounded text-[10px] md:text-xs font-medium whitespace-nowrap ${
                          row.is_deleted ? 'bg-gray-500/10 text-gray-400' : 'bg-green-500/10 text-green-400'
                        }`}
                      >
                        {row.is_deleted ? '숨김' : '노출'}
                      </span>
                    </td>
                    <td className="px-3 md:px-6 py-3 md:py-4 text-center">
                      <FreeBoardActions id={row.id} isDeleted={row.is_deleted} type={tab === 'posts' ? 'post' : 'comment'} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <Pagination
        page={page}
        totalPages={totalPages}
        baseHref="/free-board"
        params={{ tab, filter: filter !== 'all' ? filter : undefined }}
      />
    </div>
  )
}
