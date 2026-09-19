import { Plus } from 'lucide-react'
import Link from 'next/link'
import { getMembers } from '@/actions/admin/members'
import { getFactionEntries } from '@/actions/admin/factions/entries'
import { countManagedCelebs, type CelebImageFilter } from '@/actions/admin/celebs'
import Button from '@/components/ui/Button'
import Pagination from '@/components/ui/Pagination'
import { getImageProcessingJobsForCelebs } from '@/lib/image-processing/queue'
import {
  DEFAULT_CELEB_LIST_PAGE_SIZE,
  parseCelebColumnFilters,
  parseCelebPageSize,
  type CelebColumnSearchParams,
} from '@/lib/celeb-list-filters'
import CelebTableToolbar from './CelebTableToolbar'
import { CelebTableQueryProvider } from './columnFilters/CelebTableQuery'
import { CelebImageFilterControls } from './columnFilters/CelebColumnHeader'
import { ColumnPicker, ColumnVisibilityProvider } from './columnFilters/ColumnVisibility'
import StagedChanges from './columnFilters/StagedChanges'
import CelebCardGrid from './CelebCardGrid'
import CelebImageGrid from './CelebImageGrid'
import CelebTable from './CelebTable'
import CelebViewNavigation, { buildCelebViewHref } from './CelebViewNavigation'
import { buildFactionThemes } from './factionOptions'

export interface CelebsSearchParams extends CelebColumnSearchParams {
  page?: string
  pageSize?: string
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
  view: 'table' | 'cards' | 'images'
}

const VIEW_HREFS = {
  table: '/celebs',
  cards: '/celebs/cards',
  images: '/celebs/images',
} as const

const VIEW_TITLES = {
  table: '셀럽 관리',
  cards: '셀럽 카드',
  images: '셀럽 이미지 작업',
} as const

export default async function CelebsPageView({ searchParams, view }: Props) {
  const params = await searchParams
  const columnFilters = parseCelebColumnFilters(params)
  const page = Number(params.page) || 1
  const pageSize = parseCelebPageSize(params.pageSize)
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
  const baseHref = VIEW_HREFS[view]
  const resultSetKey = [page, pageSize, search, status, profession, tier, reality, imageFilter, faction, sort, sortOrder, JSON.stringify(columnFilters)].join(':')

  const [{ members: celebs, total }, { entries }, managedTotal] = await Promise.all([
    getMembers({
      ...columnFilters,
      profileType: 'CELEB',
      page,
      limit: pageSize,
      search,
      status,
      profession: profession !== 'all' ? profession : undefined,
      tier: tier !== 'all' ? tier : undefined,
      reality: reality !== 'all' ? reality : undefined,
      imageFilter,
      factionId: faction !== 'all' ? faction : undefined,
      sort,
      sortOrder,
    }),
    getFactionEntries(),
    countManagedCelebs(),
  ])

  const factionThemes = buildFactionThemes(entries)

  const imageProcessingJobs = view === 'images'
    ? await getImageProcessingJobsForCelebs(celebs.map((celeb) => celeb.id))
    : {}
  const totalPages = Math.ceil(total / pageSize)

  const navigationParams = {
    ...Object.fromEntries(Object.entries(columnFilters).map(([key, value]) => [key, String(value)])),
    page: page > 1 ? String(page) : undefined,
    pageSize: pageSize !== DEFAULT_CELEB_LIST_PAGE_SIZE ? String(pageSize) : undefined,
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
            {VIEW_TITLES[view]}
          </h1>
          <p className="mt-1 text-sm text-text-secondary">총 {total.toLocaleString()}명</p>
        </div>
        {/* 다른 셀럽 화면으로 가는 길은 사이드바가 쥔다. 여기서는 목록에서만 할 수 있는 일만 둔다. */}
        <Link href="/celebs/new">
          <Button size="sm" className="w-full sm:w-auto">
            <Plus className="h-4 w-4" />셀럽 추가
          </Button>
        </Link>
      </div>

      <CelebTableQueryProvider>
        <ColumnVisibilityProvider>
        <div className="rounded-lg border border-border bg-bg-card">
          <CelebTableToolbar factionThemes={factionThemes} soleResult={soleResult} managedTotal={managedTotal}>
            <div className="flex items-center gap-2">
              {view === 'table' && <ColumnPicker />}
              <nav className="flex shrink-0 rounded-lg border border-border bg-bg-card p-1" aria-label="셀럽 목록 보기 방식">
                <CelebViewNavigation
                  tableHref={buildCelebViewHref('/celebs', navigationParams)}
                  cardsHref={buildCelebViewHref('/celebs/cards', navigationParams)}
                  imagesHref={buildCelebViewHref('/celebs/images', navigationParams)}
                  activeView={view}
                />
              </nav>
            </div>
          </CelebTableToolbar>
          <StagedChanges factionThemes={factionThemes} managedTotal={managedTotal} />
          {view !== 'table' && <CelebImageFilterControls />}

          {view === 'images' ? (
            <CelebImageGrid
              key={resultSetKey}
              celebs={celebs}
              imageProcessingJobs={imageProcessingJobs}
            />
          ) : view === 'cards' ? (
            <CelebCardGrid key={resultSetKey} celebs={celebs} />
          ) : (
            <div className="overflow-x-auto rounded-b-lg"><CelebTable celebs={celebs} /></div>
          )}
        </div>
        </ColumnVisibilityProvider>
      </CelebTableQueryProvider>

      <Pagination page={page} totalPages={totalPages} baseHref={baseHref} params={paginationParams} />
    </div>
  )
}
