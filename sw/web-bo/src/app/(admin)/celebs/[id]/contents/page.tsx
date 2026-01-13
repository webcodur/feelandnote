import { getCeleb, getCelebContents } from '@/actions/admin/celebs'
import { notFound } from 'next/navigation'
import { ArrowLeft, Star, Sparkles } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import ContentList from './ContentList'
import AddContentForm from './AddContentForm'

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ page?: string }>
}

export default async function CelebContentsPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const { page: pageStr } = await searchParams
  const page = Number(pageStr) || 1

  const celeb = await getCeleb(id)
  if (!celeb) {
    notFound()
  }

  const { contents, total } = await getCelebContents(id, page, 20)
  const totalPages = Math.ceil(total / 20)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/celebs/${id}`} className="text-text-secondary hover:text-text-primary">
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
      </div>

      {/* Stats */}
      <div className="bg-bg-card border border-border rounded-lg p-4">
        <p className="text-text-secondary">
          총 <span className="text-text-primary font-semibold">{total}</span>개의 콘텐츠 기록
        </p>
      </div>

      {/* Add Content Form */}
      <div className="flex items-center gap-2">
        <AddContentForm celebId={id} />
        <Link
          href={`/celebs/${id}/contents/ai-collect`}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-border rounded-lg text-sm text-text-secondary hover:text-text-primary hover:bg-white/10"
        >
          <Sparkles className="w-4 h-4" />
          AI 수집
        </Link>
      </div>

      {/* Content List */}
      <ContentList contents={contents} celebId={id} />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/celebs/${id}/contents?page=${p}`}
              className={`
                px-4 py-2 rounded-lg text-sm
                ${
                  p === page
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
