import { BarChart3, BookOpen, Briefcase, Compass, FileEdit, Images, Plus, Route, Rows3, Tag, Volume2 } from 'lucide-react'
import Link from 'next/link'
import { getMembers } from '@/actions/admin/members'
import type { CelebImageFilter } from '@/actions/admin/celebs'
import Button from '@/components/ui/Button'
import Pagination from '@/components/ui/Pagination'
import { getImageProcessingJobsForCelebs } from '@/lib/image-processing/queue'
import ActiveSortChips from './ActiveSortChips'
import CelebFilter from './CelebFilter'
import CelebImageGrid from './CelebImageGrid'
import CelebTable from './CelebTable'

export interface CelebsSearchParams {
  page?: string
  search?: string
  status?: string
  profession?: string
  tier?: string
  image?: string
  sort?: string
  sortOrder?: 'asc' | 'desc'
}

interface Props {
  searchParams: Promise<CelebsSearchParams>
  view: 'table' | 'images'
}

export default async function CelebsPageView({ searchParams, view }: Props) {
  const params = await searchParams
  const page = Number(params.page) || 1
  const search = params.search || ''
  const status = params.status || 'all'
  const profession = params.profession || 'all'
  const tier = params.tier || 'all'
  const imageFilter: CelebImageFilter = params.image === 'missing-avatar' || params.image === 'missing-portrait'
    ? params.image
    : 'all'
  const sort = params.sort || 'created_at'
  const sortOrder = params.sortOrder || 'desc'
  const baseHref = view === 'images' ? '/celebs/images' : '/celebs'
  const resultSetKey = [page, search, status, profession, tier, imageFilter, sort, sortOrder].join(':')

  const { members: celebs, total } = await getMembers({
    profileType: 'CELEB',
    page,
    limit: 20,
    search,
    status,
    profession: profession !== 'all' ? profession : undefined,
    tier: tier !== 'all' ? tier : undefined,
    imageFilter: view === 'images' ? imageFilter : undefined,
    sort,
    sortOrder,
  })
  const imageProcessingJobs = view === 'images'
    ? await getImageProcessingJobsForCelebs(celebs.map((celeb) => celeb.id))
    : {}
  const totalPages = Math.ceil(total / 20)

  const navigationParams = {
    page: page > 1 ? String(page) : undefined,
    search: search || undefined,
    status: status !== 'all' ? status : undefined,
    profession: profession !== 'all' ? profession : undefined,
    tier: tier !== 'all' ? tier : undefined,
    image: imageFilter !== 'all' ? imageFilter : undefined,
    sort: sort !== 'created_at' ? sort : undefined,
    sortOrder: sortOrder !== 'desc' ? sortOrder : undefined,
  }
  const paginationParams = { ...navigationParams, page: undefined }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary md:text-2xl">
            {view === 'images' ? '셀럽 이미지 작업' : '셀럽 관리'}
          </h1>
          <p className="mt-1 text-sm text-text-secondary">총 {total.toLocaleString()}명</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/celebs/stats">
            <Button size="sm" variant="secondary" className="w-full sm:w-auto">
              <BarChart3 className="h-4 w-4" />통계
            </Button>
          </Link>
          <Link href="/celebs/titles">
            <Button size="sm" variant="secondary" className="w-full sm:w-auto">
              <FileEdit className="h-4 w-4" />수식어 편집
            </Button>
          </Link>
          <Link href="/celebs/professions">
            <Button size="sm" variant="secondary" className="w-full sm:w-auto">
              <Briefcase className="h-4 w-4" />직군 편집
            </Button>
          </Link>
          <Link href="/celebs/journeys">
            <Button size="sm" variant="secondary" className="w-full sm:w-auto">
              <BookOpen className="h-4 w-4" />감상 여정 편집
            </Button>
          </Link>
          <Link href="/celebs/timeline">
            <Button size="sm" variant="secondary" className="w-full sm:w-auto">
              <Route className="h-4 w-4" />생애 행적
            </Button>
          </Link>
          <Link href="/celebs/vectors">
            <Button size="sm" variant="secondary" className="w-full sm:w-auto">
              <Compass className="h-4 w-4" />철학 벡터
            </Button>
          </Link>
          <Link href="/celebs/voice-gen">
            <Button size="sm" variant="secondary" className="w-full sm:w-auto">
              <Volume2 className="h-4 w-4" />대사/음성
            </Button>
          </Link>
          <Link href="/factions">
            <Button size="sm" variant="secondary" className="w-full sm:w-auto">
              <Tag className="h-4 w-4" />도감 테마
            </Button>
          </Link>
          <Link href="/celebs/new">
            <Button size="sm" className="w-full sm:w-auto">
              <Plus className="h-4 w-4" />셀럽 추가
            </Button>
          </Link>
        </div>
      </div>

      <CelebFilter
        key={`${search}:${status}:${profession}:${tier}:${imageFilter}`}
        action={baseHref}
        showImageFilter={view === 'images'}
        defaultValues={{ search, status, profession, tier, imageFilter }}
      />

      <ActiveSortChips />

      <div className="overflow-hidden rounded-lg border border-border bg-bg-card">
        <div className="flex items-center justify-between gap-3 border-b border-border bg-bg-secondary/60 px-3 py-2">
          <p className="text-xs text-text-tertiary">
            {view === 'images' ? '이미지를 끌어 놓아 교체하고, 클릭하면 원본을 엽니다.' : '전체 관리 정보'}
          </p>
          <nav className="flex shrink-0 rounded-lg border border-border bg-bg-card p-1" aria-label="셀럽 목록 보기 방식">
            <ViewLink href={buildHref('/celebs', navigationParams)} active={view === 'table'}>
              <Rows3 className="h-4 w-4" />표
            </ViewLink>
            <ViewLink href={buildHref('/celebs/images', navigationParams)} active={view === 'images'}>
              <Images className="h-4 w-4" />이미지
            </ViewLink>
          </nav>
        </div>

        {view === 'images' ? (
          <CelebImageGrid
            key={resultSetKey}
            celebs={celebs}
            imageProcessingJobs={imageProcessingJobs}
          />
        ) : (
          <div className="overflow-x-auto"><CelebTable celebs={celebs} /></div>
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} baseHref={baseHref} params={paginationParams} />
    </div>
  )
}

function buildHref(pathname: string, params: Record<string, string | undefined>): string {
  const searchParams = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value) searchParams.set(key, value)
  }
  const query = searchParams.toString()
  return query ? `${pathname}?${query}` : pathname
}

function ViewLink({
  href,
  active,
  children,
}: {
  href: string
  active: boolean
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold ${
        active
          ? 'bg-accent text-white'
          : 'text-text-secondary hover:bg-white/5 hover:text-text-primary'
      }`}
    >
      {children}
    </Link>
  )
}
