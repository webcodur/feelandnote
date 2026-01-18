import { createClient } from '@/lib/supabase/server'
import { FileText, Search, Users, Library, Quote, StickyNote, Globe, Lock, UserCheck } from 'lucide-react'
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
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-text-primary">기록 관리</h1>
        <p className="text-sm text-text-secondary mt-1">총 {total.toLocaleString()}개의 기록</p>
      </div>

      {/* Filters */}
      <div className="bg-bg-card border border-border rounded-lg p-3 md:p-4">
        <form className="flex flex-col sm:flex-row flex-wrap gap-2 md:gap-4">
          <div className="flex-1 min-w-0 sm:min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
              <input
                type="text"
                name="search"
                defaultValue={search}
                placeholder="기록 내용 검색..."
                className="w-full pl-10 pr-4 py-2 bg-bg-secondary border border-border rounded-lg text-sm text-text-primary placeholder-text-secondary focus:border-accent focus:outline-none"
              />
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <select
              name="type"
              defaultValue={type}
              className="flex-1 sm:flex-none px-3 py-2 bg-bg-secondary border border-border rounded-lg text-sm text-text-primary focus:border-accent focus:outline-none"
            >
              <option value="all">모든 유형</option>
              {Object.entries(TYPE_CONFIG).map(([key, { label }]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>

            <select
              name="visibility"
              defaultValue={visibility}
              className="flex-1 sm:flex-none px-3 py-2 bg-bg-secondary border border-border rounded-lg text-sm text-text-primary focus:border-accent focus:outline-none"
            >
              <option value="all">모든 공개범위</option>
              {Object.entries(VISIBILITY_CONFIG).map(([key, { label }]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>

            <Button type="submit" size="sm">검색</Button>
          </div>
        </form>
      </div>

      {/* Records Table */}
      <div className="bg-bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="bg-bg-secondary border-b border-border">
              <tr className="divide-x divide-border">
                <th className="text-center px-3 md:px-6 py-3 md:py-4 text-xs md:text-sm font-medium text-text-secondary">사용자</th>
                <th className="text-center px-3 md:px-6 py-3 md:py-4 text-xs md:text-sm font-medium text-text-secondary">콘텐츠</th>
                <th className="text-center px-3 md:px-6 py-3 md:py-4 text-xs md:text-sm font-medium text-text-secondary whitespace-nowrap">유형</th>
                <th className="text-center px-3 md:px-6 py-3 md:py-4 text-xs md:text-sm font-medium text-text-secondary">내용</th>
                <th className="text-center px-3 md:px-6 py-3 md:py-4 text-xs md:text-sm font-medium text-text-secondary whitespace-nowrap">공개범위</th>
                <th className="text-center px-3 md:px-6 py-3 md:py-4 text-xs md:text-sm font-medium text-text-secondary whitespace-nowrap">등록일</th>
                <th className="text-center px-3 md:px-6 py-3 md:py-4 text-xs md:text-sm font-medium text-text-secondary">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {!records || records.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-text-secondary text-sm">
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
                      <td className="px-3 md:px-6 py-3 md:py-4">
                        <div className="flex items-center gap-2 md:gap-3">
                          <div className="relative w-7 h-7 md:w-8 md:h-8 rounded-full bg-accent/20 flex items-center justify-center overflow-hidden shrink-0">
                            {profile?.avatar_url ? (
                              <Image src={profile.avatar_url} alt="" fill unoptimized className="object-cover" />
                            ) : (
                              <Users className="w-3.5 h-3.5 md:w-4 md:h-4 text-accent" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs md:text-sm font-medium text-text-primary truncate max-w-[80px] md:max-w-none">
                              {profile?.nickname || '알 수 없음'}
                            </p>
                            <p className="text-xs text-text-secondary truncate max-w-[80px] md:max-w-none hidden md:block">{profile?.email || '-'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 md:px-6 py-3 md:py-4">
                        <div className="flex items-center gap-2">
                          <div className="relative w-7 h-9 md:w-8 md:h-10 rounded bg-bg-secondary flex items-center justify-center overflow-hidden flex-shrink-0">
                            {content?.thumbnail_url ? (
                              <Image src={content.thumbnail_url} alt="" fill unoptimized className="object-cover" />
                            ) : (
                              <Library className="w-3.5 h-3.5 md:w-4 md:h-4 text-text-secondary" />
                            )}
                          </div>
                          <span className="text-xs md:text-sm text-text-primary line-clamp-1 max-w-[100px] md:max-w-none">
                            {content?.title || '삭제된 콘텐츠'}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 md:px-6 py-3 md:py-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-1.5 md:px-2 py-0.5 md:py-1 rounded text-[10px] md:text-xs font-medium whitespace-nowrap ${typeConfig?.color || 'bg-gray-500/10 text-gray-400'}`}>
                          <TypeIcon className="w-3 h-3" />
                          {typeConfig?.label || record.type}
                        </span>
                      </td>
                      <td className="px-3 md:px-6 py-3 md:py-4">
                        <p className="text-xs md:text-sm text-text-primary line-clamp-2 max-w-[120px] md:max-w-[200px]">
                          {record.content || '-'}
                        </p>
                      </td>
                      <td className="px-3 md:px-6 py-3 md:py-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-1.5 md:px-2 py-0.5 md:py-1 rounded text-[10px] md:text-xs font-medium whitespace-nowrap ${visibilityConfig?.color || 'bg-gray-500/10 text-gray-400'}`}>
                          <VisibilityIcon className="w-3 h-3" />
                          {visibilityConfig?.label || record.visibility}
                        </span>
                      </td>
                      <td className="px-3 md:px-6 py-3 md:py-4 text-xs md:text-sm text-text-secondary whitespace-nowrap">
                        {new Date(record.created_at).toLocaleDateString('ko-KR')}
                      </td>
                      <td className="px-3 md:px-6 py-3 md:py-4 text-center">
                        <Link
                          href={`/records/${record.id}`}
                          className="text-xs md:text-sm text-accent hover:underline"
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
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 md:gap-2 flex-wrap">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/records?page=${p}&type=${type}&visibility=${visibility}&search=${search}`}
              className={`px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm ${
                p === page
                  ? 'bg-accent text-white'
                  : 'bg-bg-card border border-border text-text-secondary hover:text-text-primary'
              }`}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
