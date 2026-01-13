import { createClient } from '@/lib/supabase/server'
import { FileText, Search, Users, Library, Quote, StickyNote, Globe, Lock, UserCheck, Eye } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import Button from '@/components/ui/Button'

const TYPE_CONFIG = {
  NOTE: { label: '노트', color: 'bg-blue-500/10 text-blue-400', icon: StickyNote },
  QUOTE: { label: '인용', color: 'bg-purple-500/10 text-purple-400', icon: Quote },
}

const VISIBILITY_CONFIG = {
  public: { label: '공개', color: 'bg-green-500/10 text-green-400', icon: Globe },
  followers: { label: '팔로워', color: 'bg-blue-500/10 text-blue-400', icon: UserCheck },
  private: { label: '비공개', color: 'bg-gray-500/10 text-gray-400', icon: Lock },
}

interface PageProps {
  searchParams: Promise<{
    page?: string
    type?: string
    visibility?: string
    search?: string
  }>
}

export default async function RecordsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const page = Number(params.page) || 1
  const type = params.type || 'all'
  const visibility = params.visibility || 'all'
  const search = params.search || ''
  const limit = 20
  const offset = (page - 1) * limit

  const supabase = await createClient()

  let query = supabase
    .from('records')
    .select(`
      *,
      profiles:user_id (nickname, email, avatar_url),
      contents:content_id (title, type, thumbnail_url)
    `, { count: 'exact' })

  if (type !== 'all') {
    query = query.eq('type', type)
  }

  if (visibility !== 'all') {
    query = query.eq('visibility', visibility)
  }

  if (search) {
    query = query.ilike('content', `%${search}%`)
  }

  const { data: records, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  const total = count || 0
  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">기록 관리</h1>
          <p className="text-text-secondary mt-1">총 {total.toLocaleString()}개의 기록</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-bg-card border border-border rounded-lg p-4">
        <form className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
              <input
                type="text"
                name="search"
                defaultValue={search}
                placeholder="기록 내용 검색..."
                className="w-full pl-10 pr-4 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent focus:outline-none"
              />
            </div>
          </div>

          <select
            name="type"
            defaultValue={type}
            className="px-4 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary focus:border-accent focus:outline-none"
          >
            <option value="all">모든 유형</option>
            {Object.entries(TYPE_CONFIG).map(([key, { label }]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>

          <select
            name="visibility"
            defaultValue={visibility}
            className="px-4 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary focus:border-accent focus:outline-none"
          >
            <option value="all">모든 공개범위</option>
            {Object.entries(VISIBILITY_CONFIG).map(([key, { label }]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>

          <Button type="submit">검색</Button>
        </form>
      </div>

      {/* Records Table */}
      <div className="bg-bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-bg-secondary border-b border-border">
            <tr className="divide-x divide-border">
              <th className="text-center px-6 py-4 text-sm font-medium text-text-secondary">사용자</th>
              <th className="text-center px-6 py-4 text-sm font-medium text-text-secondary">콘텐츠</th>
              <th className="text-center px-6 py-4 text-sm font-medium text-text-secondary">유형</th>
              <th className="text-center px-6 py-4 text-sm font-medium text-text-secondary">내용</th>
              <th className="text-center px-6 py-4 text-sm font-medium text-text-secondary">공개범위</th>
              <th className="text-center px-6 py-4 text-sm font-medium text-text-secondary">등록일</th>
              <th className="text-center px-6 py-4 text-sm font-medium text-text-secondary">액션</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {!records || records.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-text-secondary">
                  기록이 없습니다
                </td>
              </tr>
            ) : (
              records.map((record) => {
                const profile = record.profiles as { nickname: string; email: string; avatar_url: string | null } | null
                const content = record.contents as { title: string; type: string; thumbnail_url: string | null } | null
                const typeConfig = TYPE_CONFIG[record.type as keyof typeof TYPE_CONFIG]
                const visibilityConfig = VISIBILITY_CONFIG[record.visibility as keyof typeof VISIBILITY_CONFIG]
                const TypeIcon = typeConfig?.icon || FileText
                const VisibilityIcon = visibilityConfig?.icon || Globe

                return (
                  <tr key={record.id} className="odd:bg-white/[0.02] hover:bg-bg-secondary/50 divide-x divide-border">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="relative w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center overflow-hidden">
                          {profile?.avatar_url ? (
                            <Image src={profile.avatar_url} alt="" fill unoptimized className="object-cover" />
                          ) : (
                            <Users className="w-4 h-4 text-accent" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-text-primary">
                            {profile?.nickname || '알 수 없음'}
                          </p>
                          <p className="text-xs text-text-secondary">{profile?.email || '-'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="relative w-8 h-10 rounded bg-bg-secondary flex items-center justify-center overflow-hidden flex-shrink-0">
                          {content?.thumbnail_url ? (
                            <Image src={content.thumbnail_url} alt="" fill unoptimized className="object-cover" />
                          ) : (
                            <Library className="w-4 h-4 text-text-secondary" />
                          )}
                        </div>
                        <span className="text-sm text-text-primary line-clamp-1">
                          {content?.title || '삭제된 콘텐츠'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${typeConfig?.color || 'bg-gray-500/10 text-gray-400'}`}>
                        <TypeIcon className="w-3 h-3" />
                        {typeConfig?.label || record.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-text-primary line-clamp-2 max-w-[200px]">
                        {record.content || '-'}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${visibilityConfig?.color || 'bg-gray-500/10 text-gray-400'}`}>
                        <VisibilityIcon className="w-3 h-3" />
                        {visibilityConfig?.label || record.visibility}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-text-secondary">
                      {new Date(record.created_at).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/records/${record.id}`}
                        className="text-sm text-accent hover:underline"
                      >
                        상세보기
                      </Link>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/records?page=${p}&type=${type}&visibility=${visibility}&search=${search}`}
              className={`
                px-4 py-2 rounded-lg text-sm
                ${p === page
                  ? 'bg-accent text-white'
                  : 'bg-bg-card border border-border text-text-secondary hover:text-text-primary'
                }
              `}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
