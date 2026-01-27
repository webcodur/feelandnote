import type { Metadata } from 'next'
import { getCeleb, getCelebContents } from '@/actions/admin/celebs'
import { notFound } from 'next/navigation'
import { ArrowLeft, Star, ListVideo } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import ContentList from './ContentList'
import AddContentForm from './AddContentForm'
import ExportContentButton from './ExportContentButton'
import ProjectRulesButton from '../../components/ProjectRulesButton'
import { CONTENT_TYPE_CONFIG, CONTENT_TYPES } from '@/constants/contentTypes'
import ContentCollector from './components/ContentCollector'
import CollapsibleSection from '@/components/ui/CollapsibleSection'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const celeb = await getCeleb(id)
  return {
    title: celeb ? `${celeb.nickname} 콘텐츠` : '콘텐츠 관리',
  }
}

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ page?: string; type?: string }>
}

export default async function MemberContentsPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const { page: pageStr, type: contentType } = await searchParams
  const page = Number(pageStr) || 1

  const celeb = await getCeleb(id)
  if (!celeb) notFound()

  const { contents, total } = await getCelebContents(id, page, 20, contentType)
  const totalPages = Math.ceil(total / 20)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/members/${id}`} className="text-text-secondary hover:text-text-primary">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center overflow-hidden">
              {celeb.avatar_url ? (
                <Image src={celeb.avatar_url} alt="" fill unoptimized className="object-cover" />
              ) : (
                <Star className="w-5 h-5 text-yellow-400" />
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-text-primary">{celeb.nickname}</h1>
              <p className="text-text-secondary text-sm">콘텐츠 관리</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <ExportContentButton celebId={id} />
           <ProjectRulesButton celebName={celeb.nickname || undefined} />
        </div>
      </div>

      {/* Content List Section - Moved to top */}
      <CollapsibleSection
        title="등록된 콘텐츠 목록"
        icon={<ListVideo className="w-6 h-6" />}
        count={total}
        rightElement={<AddContentForm celebId={id} />}
      >
        <div className="space-y-4">
          {/* Stats & Filter */}
          <div className="bg-bg-card border border-border rounded-lg p-4 flex items-center justify-between">
            <p className="text-text-secondary">
              총 <span className="text-text-primary font-semibold">{total}</span>개의 콘텐츠 기록
            </p>
            <div className="flex items-center gap-2">
              <Link
                href={`/members/${id}/contents`}
                className={`px-3 py-1.5 rounded-lg text-sm ${!contentType ? 'bg-accent text-white' : 'bg-bg-secondary text-text-secondary hover:text-text-primary'}`}
              >
                전체
              </Link>
              {CONTENT_TYPES.map((type) => {
                const config = CONTENT_TYPE_CONFIG[type]
                const Icon = config.icon
                const isActive = contentType === type
                return (
                  <Link
                    key={type}
                    href={`/members/${id}/contents?type=${type}`}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm ${isActive ? 'bg-accent text-white' : 'bg-bg-secondary text-text-secondary hover:text-text-primary'}`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {config.label}
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Content List */}
          <ContentList contents={contents} celebId={id} />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                const params = new URLSearchParams()
                params.set('page', String(p))
                if (contentType) params.set('type', contentType)
                return (
                  <Link
                    key={p}
                    href={`/members/${id}/contents?${params.toString()}`}
                    className={`px-4 py-2 rounded-lg text-sm ${
                      p === page
                        ? 'bg-accent text-white'
                        : 'bg-bg-card border border-border text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {p}
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </CollapsibleSection>

      {/* Divider */}
      <div className="h-px bg-border/50" />

      {/* Collector Section */}
      <ContentCollector celebId={id} celebName={celeb.nickname || ''} />
    </div>
  )
}
