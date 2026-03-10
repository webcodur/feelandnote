import type { Metadata } from 'next'
import { getCelebWorksAdmin } from '@/actions/admin/celebs'
import { getMemberBySlug } from '@/actions/admin/members'
import { notFound } from 'next/navigation'
import { ArrowLeft, Star, Palette } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import Pagination from '@/components/ui/Pagination'
import CelebSearchBar from '@/components/celeb/CelebSearchBar'
import CollapsibleSection from '@/components/ui/CollapsibleSection'
import WorksList from './WorksList'
import AddWorkForm from './AddWorkForm'

const WORK_TYPES = [
  { value: 'BOOK', label: '도서' },
  { value: 'VIDEO', label: '영상' },
  { value: 'MUSIC', label: '음악' },
  { value: 'GAME', label: '게임' },
  { value: 'ART', label: '미술' },
]

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const celeb = await getMemberBySlug(slug)
  return {
    title: celeb ? `${celeb.nickname} 창작물` : '창작물 관리',
  }
}

interface PageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ page?: string; type?: string }>
}

export default async function CelebWorksPage({ params, searchParams }: PageProps) {
  const { slug } = await params
  const { page: pageStr, type: workType } = await searchParams
  const page = Number(pageStr) || 1

  const celeb = await getMemberBySlug(slug)
  if (!celeb) notFound()

  const celebId = celeb.id
  const { works, total } = await getCelebWorksAdmin(celebId, page, 20, workType)
  const totalPages = Math.ceil(total / 20)

  return (
    <div className="space-y-8">
      <CelebSearchBar
        className="max-w-xl"
        detailPathTemplate="/celebs/[slug]/works"
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/celebs/${slug}`} className="text-text-secondary hover:text-text-primary">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-full bg-teal-500/20 flex items-center justify-center overflow-hidden">
              {celeb.avatar_url ? (
                <Image src={celeb.avatar_url} alt="" fill unoptimized className="object-cover" />
              ) : (
                <Star className="w-5 h-5 text-teal-400" />
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-text-primary">{celeb.nickname}</h1>
              <p className="text-text-secondary text-sm">창작물 관리</p>
            </div>
          </div>
        </div>
      </div>

      {/* Works List Section */}
      <CollapsibleSection
        title="등록된 창작물 목록"
        icon={<Palette className="w-6 h-6" />}
        count={total}
        rightElement={<AddWorkForm celebId={celebId} />}
      >
        <div className="space-y-4">
          {/* Filter */}
          <div className="bg-bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-2">
              <Link
                href={`/celebs/${slug}/works`}
                className={`px-3 py-1.5 rounded-lg text-sm ${!workType ? 'bg-accent text-white' : 'bg-bg-secondary text-text-secondary hover:text-text-primary'}`}
              >
                전체
              </Link>
              {WORK_TYPES.map((type) => (
                <Link
                  key={type.value}
                  href={`/celebs/${slug}/works?type=${type.value}`}
                  className={`px-3 py-1.5 rounded-lg text-sm ${workType === type.value ? 'bg-accent text-white' : 'bg-bg-secondary text-text-secondary hover:text-text-primary'}`}
                >
                  {type.label}
                </Link>
              ))}
            </div>
          </div>

          {/* List */}
          <WorksList works={works} celebId={celebId} />

          {/* Pagination */}
          <Pagination
            page={page}
            totalPages={totalPages}
            baseHref={`/celebs/${slug}/works`}
            params={{ type: workType }}
          />
        </div>
      </CollapsibleSection>
    </div>
  )
}
