import type { Metadata } from 'next'
import { getMembers } from '@/actions/admin/members'
import { Plus, FileEdit, Briefcase, BookOpen, Tag, BarChart3, Compass } from 'lucide-react'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import Pagination from '@/components/ui/Pagination'
import CelebTable from './components/CelebTable'
import CelebFilter from './components/CelebFilter'

export const metadata: Metadata = {
  title: '셀럽 관리',
}

interface PageProps {
  searchParams: Promise<{
    page?: string
    search?: string
    status?: string
    profession?: string
    sort?: string
    sortOrder?: 'asc' | 'desc'
  }>
}

export default async function CelebsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const page = Number(params.page) || 1
  const search = params.search || ''
  const status = params.status || 'all'
  const profession = params.profession || 'all'
  const sort = params.sort || 'created_at'
  const sortOrder = params.sortOrder || 'desc'

  const { members: celebs, total } = await getMembers({
    profileType: 'CELEB',
    page,
    limit: 20,
    search,
    status,
    profession: profession !== 'all' ? profession : undefined,
    sort,
    sortOrder,
  })
  const totalPages = Math.ceil(total / 20)

  // Pagination용 params (page 제외)
  const paginationParams = {
    search: search || undefined,
    status: status !== 'all' ? status : undefined,
    profession: profession !== 'all' ? profession : undefined,
    sort: sort !== 'created_at' ? sort : undefined,
    sortOrder: sortOrder !== 'desc' ? sortOrder : undefined,
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-text-primary">셀럽 관리</h1>
          <p className="text-sm text-text-secondary mt-1">총 {total.toLocaleString()}명</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/celebs/stats">
            <Button size="sm" variant="secondary" className="w-full sm:w-auto">
              <BarChart3 className="w-4 h-4" />통계
            </Button>
          </Link>
          <Link href="/celebs/titles">
            <Button size="sm" variant="secondary" className="w-full sm:w-auto">
              <FileEdit className="w-4 h-4" />수식어 편집
            </Button>
          </Link>
          <Link href="/celebs/professions">
            <Button size="sm" variant="secondary" className="w-full sm:w-auto">
              <Briefcase className="w-4 h-4" />직군 편집
            </Button>
          </Link>
          <Link href="/celebs/philosophies">
            <Button size="sm" variant="secondary" className="w-full sm:w-auto">
              <BookOpen className="w-4 h-4" />감상 철학 편집
            </Button>
          </Link>
          <Link href="/celebs/vectors">
            <Button size="sm" variant="secondary" className="w-full sm:w-auto">
              <Compass className="w-4 h-4" />철학 벡터
            </Button>
          </Link>
          <Link href="/celebs/tags">
            <Button size="sm" variant="secondary" className="w-full sm:w-auto">
              <Tag className="w-4 h-4" />태그 관리
            </Button>
          </Link>
          <Link href="/celebs/new">
            <Button size="sm" className="w-full sm:w-auto">
              <Plus className="w-4 h-4" />셀럽 추가
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <CelebFilter defaultValues={{ search, status, profession }} />

      {/* Table */}
      <div className="bg-bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <CelebTable celebs={celebs} />
        </div>
      </div>

      {/* Pagination */}
      <Pagination page={page} totalPages={totalPages} baseHref="/celebs" params={paginationParams} />
    </div>
  )
}
