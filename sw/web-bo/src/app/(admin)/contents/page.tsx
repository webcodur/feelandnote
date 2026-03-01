import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: '콘텐츠 관리',
}
import { Library, Search, Users, Calendar, Building2, Hash, Database } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import Button from '@/components/ui/Button'
import Pagination from '@/components/ui/Pagination'
import { CONTENT_TYPE_CONFIG, type ContentType } from '@/constants/contentTypes'

interface PageProps {
  searchParams: Promise<{
    page?: string
    search?: string
    type?: string
  }>
}

export default async function ContentsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const page = Number(params.page) || 1
  const search = params.search || ''
  const type = params.type || 'all'
  const limit = 20
  const offset = (page - 1) * limit

  const supabase = await createClient()

  let query = supabase
    .from('contents')
    .select('*', { count: 'exact' })

  if (search) {
    query = query.or(`title.ilike.%${search}%,title_ko.ilike.%${search}%,title_en.ilike.%${search}%,creator.ilike.%${search}%`)
  }

  if (type !== 'all') {
    query = query.eq('type', type)
  }

  const { data: contents, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  const total = count || 0
  const totalPages = Math.ceil(total / limit)

  // 콘텐츠별 사용자 수 조회
  const contentIds = (contents || []).map(c => c.id)
  const { data: userCounts } = await supabase
    .from('user_contents')
    .select('content_id')
    .in('content_id', contentIds)

  const userCountMap = (userCounts || []).reduce((acc, item) => {
    acc[item.content_id] = (acc[item.content_id] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // BOOK 에디션 조회
  const bookIds = (contents || []).filter(c => c.type === 'BOOK').map(c => c.id)
  const { data: editions } = bookIds.length > 0
    ? await supabase
        .from('content_editions')
        .select('content_id, locale, title, creator, isbn, thumbnail_url, publisher')
        .in('content_id', bookIds)
    : { data: [] }

  interface Edition {
    content_id: string
    locale: string
    title: string | null
    creator: string | null
    isbn: string | null
    thumbnail_url: string | null
    publisher: string | null
  }

  const editionMap = (editions || []).reduce((acc, ed) => {
    const e = ed as Edition
    if (!acc[e.content_id]) acc[e.content_id] = {}
    acc[e.content_id][e.locale] = e
    return acc
  }, {} as Record<string, Record<string, Edition>>)

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-text-primary">콘텐츠 관리</h1>
        <p className="text-sm text-text-secondary mt-1">총 {total.toLocaleString()}개의 콘텐츠</p>
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
                placeholder="제목 또는 제작자 검색..."
                className="w-full pl-10 pr-4 py-2 bg-bg-secondary border border-border rounded-lg text-sm text-text-primary placeholder-text-secondary focus:border-accent focus:outline-none"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <select
              name="type"
              defaultValue={type}
              className="flex-1 sm:flex-none px-3 py-2 bg-bg-secondary border border-border rounded-lg text-sm text-text-primary focus:border-accent focus:outline-none"
            >
              <option value="all">모든 유형</option>
              {Object.entries(CONTENT_TYPE_CONFIG).map(([key, { label }]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>

            <Button type="submit" size="sm">검색</Button>
          </div>
        </form>
      </div>

      {/* Contents Table */}
      <div className="bg-bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-bg-secondary border-b border-border">
              <tr className="divide-x divide-border">
                <th className="text-center px-3 md:px-6 py-3 md:py-4 text-xs md:text-sm font-medium text-text-secondary font-mono">contents</th>
                <th className="text-center px-3 md:px-6 py-3 md:py-4 text-xs md:text-sm font-medium text-text-secondary whitespace-nowrap font-mono">type</th>
                <th className="text-center px-3 md:px-6 py-3 md:py-4 text-xs md:text-sm font-medium text-text-secondary whitespace-nowrap font-mono">publisher</th>
                <th className="text-center px-3 md:px-6 py-3 md:py-4 text-xs md:text-sm font-medium text-text-secondary whitespace-nowrap font-mono">release_date</th>
                <th className="text-center px-3 md:px-6 py-3 md:py-4 text-xs md:text-sm font-medium text-text-secondary whitespace-nowrap font-mono">user_count</th>
                <th className="text-center px-3 md:px-6 py-3 md:py-4 text-xs md:text-sm font-medium text-text-secondary whitespace-nowrap font-mono">created_at</th>
                <th className="text-center px-3 md:px-6 py-3 md:py-4 text-xs md:text-sm font-medium text-text-secondary">actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {!contents || contents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-text-secondary text-sm">
                    콘텐츠가 없습니다
                  </td>
                </tr>
              ) : (
                contents.map((content) => {
                  const typeConfig = CONTENT_TYPE_CONFIG[content.type as keyof typeof CONTENT_TYPE_CONFIG]
                  const TypeIcon = typeConfig?.icon || Library
                  const userCount = userCountMap[content.id] || 0

                  return (
                    <tr key={content.id} className="odd:bg-white/[0.02] hover:bg-bg-secondary/50 divide-x divide-border">
                      <td className="px-3 md:px-6 py-3 md:py-4">
                        {content.type === 'BOOK' && editionMap[content.id] ? (() => {
                          const ko = editionMap[content.id]?.ko
                          const en = editionMap[content.id]?.en
                          const editionFields = (edition: Edition | undefined, fallbackTitle?: string | null) => [
                            { key: 'title', value: edition?.title || fallbackTitle || null },
                            { key: 'creator', value: edition?.creator },
                            { key: 'isbn', value: edition?.isbn, mono: true },
                            { key: 'publisher', value: edition?.publisher },
                            { key: 'thumb', value: edition?.thumbnail_url ? '✓ ' + new URL(edition.thumbnail_url).pathname.split('/').pop() : null, mono: true },
                          ]
                          return (
                            <div className="space-y-2">
                              <div className="flex gap-2">
                                {/* KO 에디션 카드 */}
                                <div className="flex-1 min-w-0 rounded-lg border border-blue-500/20 bg-blue-500/5 p-2">
                                  <div className="flex gap-2.5">
                                    <div className="relative w-14 h-20 rounded bg-bg-secondary flex items-center justify-center overflow-hidden flex-shrink-0">
                                      {ko?.thumbnail_url ? (
                                        <Image src={ko.thumbnail_url} alt="" fill unoptimized className="object-cover" />
                                      ) : (
                                        <span className="text-xs text-text-tertiary font-medium">KO</span>
                                      )}
                                    </div>
                                    <div className="min-w-0 flex-1 space-y-0.5">
                                      <span className="inline-block text-[9px] font-semibold px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 mb-1">KO</span>
                                      {editionFields(ko, content.title_ko).map(f => (
                                        <div key={f.key} className="flex items-baseline gap-1.5 text-[10px] leading-tight">
                                          <span className="text-text-tertiary font-mono shrink-0 w-[72px]">{f.key}</span>
                                          <span className="text-text-tertiary shrink-0">—</span>
                                          <span className={`text-text-secondary min-w-0 line-clamp-1 ${f.mono ? 'font-mono' : ''}`}>
                                            {f.value || '—'}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                                {/* EN 에디션 카드 */}
                                <div className="flex-1 min-w-0 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2">
                                  <div className="flex gap-2.5">
                                    <div className="relative w-14 h-20 rounded bg-bg-secondary flex items-center justify-center overflow-hidden flex-shrink-0">
                                      {en?.thumbnail_url ? (
                                        <Image src={en.thumbnail_url} alt="" fill unoptimized className="object-cover" />
                                      ) : (
                                        <span className="text-xs text-text-tertiary font-medium">EN</span>
                                      )}
                                    </div>
                                    <div className="min-w-0 flex-1 space-y-0.5">
                                      <span className="inline-block text-[9px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 mb-1">EN</span>
                                      {editionFields(en, content.title_en).map(f => (
                                        <div key={f.key} className="flex items-baseline gap-1.5 text-[10px] leading-tight">
                                          <span className="text-text-tertiary font-mono shrink-0 w-[72px]">{f.key}</span>
                                          <span className="text-text-tertiary shrink-0">—</span>
                                          <span className={`text-text-secondary min-w-0 line-clamp-1 ${f.mono ? 'font-mono' : ''}`}>
                                            {f.value || '—'}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                              {/* 공통 메타 */}
                              <div className="rounded border border-border/50 bg-bg-secondary/50 px-2 py-1.5 space-y-0.5">
                                <div className="flex items-baseline gap-1.5 text-[10px] leading-tight">
                                  <span className="text-text-tertiary font-mono shrink-0 w-[72px]">content_id</span>
                                  <span className="text-text-tertiary shrink-0">—</span>
                                  <span className="text-text-secondary font-mono">{content.id}</span>
                                </div>
                                <div className="flex items-baseline gap-1.5 text-[10px] leading-tight">
                                  <span className="text-text-tertiary font-mono shrink-0 w-[72px]">source</span>
                                  <span className="text-text-tertiary shrink-0">—</span>
                                  <span className="text-text-secondary">{content.external_source || '—'}</span>
                                </div>
                              </div>
                            </div>
                          )
                        })() : (
                          <div className="flex items-center gap-2 md:gap-3">
                            <div className="relative w-10 h-14 md:w-12 md:h-16 rounded bg-bg-secondary flex items-center justify-center overflow-hidden flex-shrink-0">
                              {content.thumbnail_url ? (
                                <Image src={content.thumbnail_url} alt="" fill unoptimized className="object-cover" />
                              ) : (
                                <TypeIcon className="w-4 h-4 md:w-5 md:h-5 text-text-secondary" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs md:text-sm font-medium text-text-primary line-clamp-1">
                                {content.title_ko || content.title}
                              </p>
                              {content.title_en && content.title_en !== content.title_ko && (
                                <p className="text-[10px] md:text-xs text-text-tertiary line-clamp-1">
                                  {content.title_en}
                                </p>
                              )}
                              <p className="text-xs text-text-secondary line-clamp-1">
                                {content.creator || '-'}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="inline-flex items-center gap-0.5 text-[10px] text-text-secondary/70 font-mono" title={content.id}>
                                  <Hash className="w-2.5 h-2.5" />
                                  <span className="max-w-[100px] truncate">{content.id}</span>
                                </span>
                                {content.external_source && (
                                  <span className="text-[10px] text-text-secondary/50">
                                    <Database className="w-2.5 h-2.5 inline mr-0.5" />
                                    {content.external_source}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-3 md:px-6 py-3 md:py-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-1.5 md:px-2 py-0.5 md:py-1 rounded text-[10px] md:text-xs font-medium whitespace-nowrap ${typeConfig?.bgColor || 'bg-gray-500/10'} ${typeConfig?.color || 'text-gray-400'}`}>
                          <TypeIcon className="w-3 h-3" />
                          {typeConfig?.label || content.type}
                        </span>
                      </td>
                      <td className="px-3 md:px-6 py-3 md:py-4">
                        {content.publisher ? (
                          <div className="flex items-center gap-1 text-xs md:text-sm text-text-secondary">
                            <Building2 className="w-3 h-3 md:w-3.5 md:h-3.5 shrink-0" />
                            <span className="line-clamp-1">{content.publisher}</span>
                          </div>
                        ) : (
                          <span className="text-text-secondary/50 text-xs md:text-sm">-</span>
                        )}
                      </td>
                      <td className="px-3 md:px-6 py-3 md:py-4">
                        {content.release_date ? (
                          <div className="flex items-center gap-1 text-xs md:text-sm text-text-secondary whitespace-nowrap">
                            <Calendar className="w-3 h-3 md:w-3.5 md:h-3.5 shrink-0" />
                            <span>{content.release_date}</span>
                          </div>
                        ) : (
                          <span className="text-text-secondary/50 text-xs md:text-sm">-</span>
                        )}
                      </td>
                      <td className="px-3 md:px-6 py-3 md:py-4 text-center">
                        <div className="flex items-center justify-center gap-1 text-xs md:text-sm text-text-secondary">
                          <Users className="w-3 h-3 md:w-3.5 md:h-3.5" />
                          <span>{userCount}</span>
                        </div>
                      </td>
                      <td className="px-3 md:px-6 py-3 md:py-4 text-xs md:text-sm text-text-secondary whitespace-nowrap">
                        {new Date(content.created_at).toLocaleDateString('ko-KR')}
                      </td>
                      <td className="px-3 md:px-6 py-3 md:py-4 text-center">
                        <Link
                          href={`/contents/${content.id}`}
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
      <Pagination
        page={page}
        totalPages={totalPages}
        baseHref="/contents"
        params={{ search: search || undefined, type: type !== 'all' ? type : undefined }}
      />
    </div>
  )
}
