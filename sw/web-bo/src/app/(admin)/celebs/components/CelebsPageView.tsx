import { BarChart3, BookOpen, Briefcase, Compass, FileEdit, Plus, Route, Tag, Volume2 } from 'lucide-react'
import Link from 'next/link'
import { getMembers } from '@/actions/admin/members'
import { getFactionEntries } from '@/actions/admin/factions/entries'
import type { CelebImageFilter } from '@/actions/admin/celebs'
import Button from '@/components/ui/Button'
import Pagination from '@/components/ui/Pagination'
import { getImageProcessingJobsForCelebs } from '@/lib/image-processing/queue'
import { parseCelebColumnFilters, type CelebColumnSearchParams } from '@/lib/celeb-list-filters'
import CelebTableToolbar from './CelebTableToolbar'
import { CelebTableQueryProvider } from './columnFilters/CelebTableQuery'
import { CelebImageFilterControls } from './columnFilters/CelebColumnHeader'
import CelebImageGrid from './CelebImageGrid'
import CelebTable from './CelebTable'
import CelebViewNavigation, { buildCelebViewHref } from './CelebViewNavigation'
import { buildFactionThemes } from './factionOptions'

export interface CelebsSearchParams extends CelebColumnSearchParams {
  page?: string
  search?: string
  status?: string
  profession?: string
  tier?: string
  reality?: string
  image?: string
  faction?: string
  sort?: string
  sortOrder?: 'asc' | 'desc'
}

interface Props {
  searchParams: Promise<CelebsSearchParams>
  view: 'table' | 'images'
}

export default async function CelebsPageView({ searchParams, view }: Props) {
  const params = await searchParams
  const columnFilters = parseCelebColumnFilters(params)
  const page = Number(params.page) || 1
  const search = params.search || ''
  const status = params.status || 'all'
  const profession = params.profession || 'all'
  const tier = params.tier || 'all'
  const reality = params.reality || 'all'
  const imageFilter: CelebImageFilter = params.image === 'missing-avatar'
    || params.image === 'missing-portrait'
    || params.image === 'missing-awakened'
    ? params.image
    : 'all'
  const faction = params.faction || 'all'
  const sort = params.sort || 'created_at'
  const sortOrder = params.sortOrder || 'desc'
  const baseHref = view === 'images' ? '/celebs/images' : '/celebs'
  const resultSetKey = [page, search, status, profession, tier, reality, imageFilter, faction, sort, sortOrder, JSON.stringify(columnFilters)].join(':')

  const [{ members: celebs, total }, { entries }] = await Promise.all([
    getMembers({
      ...columnFilters,
      profileType: 'CELEB',
      page,
      limit: 20,
      search,
      status,
      profession: profession !== 'all' ? profession : undefined,
      tier: tier !== 'all' ? tier : undefined,
      reality: reality !== 'all' ? reality : undefined,
      imageFilter,
      tagId: faction !== 'all' ? faction : undefined,
      sort,
      sortOrder,
    }),
    getFactionEntries()
  ])

  const factionThemes = buildFactionThemes(entries)

  const imageProcessingJobs = view === 'images'
    ? await getImageProcessingJobsForCelebs(celebs.map((celeb) => celeb.id))
    : {}
  const totalPages = Math.ceil(total / 20)

  const navigationParams = {
    ...Object.fromEntries(Object.entries(columnFilters).map(([key, value]) => [key, String(value)])),
    page: page > 1 ? String(page) : undefined,
    search: search || undefined,
    status: status !== 'all' ? status : undefined,
    profession: profession !== 'all' ? profession : undefined,
    tier: tier !== 'all' ? tier : undefined,
    reality: reality !== 'all' ? reality : undefined,
    image: imageFilter !== 'all' ? imageFilter : undefined,
    faction: faction !== 'all' ? faction : undefined,
    sort: sort !== 'created_at' ? sort : undefined,
    sortOrder: sortOrder !== 'desc' ? sortOrder : undefined,
  }
  const paginationParams = { ...navigationParams, page: undefined }

  // 검색 결과가 한 명뿐이면 그 사람의 상세를 새 탭으로 바로 열 수 있게 한다.
  const soleCeleb = total === 1 && celebs.length === 1 && celebs[0].slug ? celebs[0] : null
  const soleResult = soleCeleb
    ? { href: `/celebs/${soleCeleb.slug}`, name: soleCeleb.nickname?.trim() || '이 인물' }
    : null

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
              <Route className="h-4 w-4" />타임라인
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

      <CelebTableQueryProvider>
        <div className="overflow-hidden rounded-lg border border-border bg-bg-card">
          <CelebTableToolbar factionThemes={factionThemes} soleResult={soleResult}>
            <nav className="flex shrink-0 rounded-lg border border-border bg-bg-card p-1" aria-label="셀럽 목록 보기 방식">
              <CelebViewNavigation
                tableHref={buildCelebViewHref('/celebs', navigationParams)}
                imagesHref={buildCelebViewHref('/celebs/images', navigationParams)}
                activeView={view}
              />
            </nav>
          </CelebTableToolbar>
          {view === 'images' && <CelebImageFilterControls />}

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
      </CelebTableQueryProvider>

      <Pagination page={page} totalPages={totalPages} baseHref={baseHref} params={paginationParams} />
    </div>
  )
}
