import type { Metadata } from 'next'
import { getMembers } from '@/actions/admin/members'

export const metadata: Metadata = {
  title: '멤버 관리',
}
import { Plus, FileEdit, Briefcase, BookOpen } from 'lucide-react'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import MemberTable from './components/MemberTable'
import MembersFilter from './components/MembersFilter'

interface PageProps {
  searchParams: Promise<{
    type?: string
    page?: string
    search?: string
    status?: string
    role?: string
    profession?: string
  }>
}

export default async function MembersPage({ searchParams }: PageProps) {
  const params = await searchParams
  const type = params.type || 'all'
  const page = Number(params.page) || 1
  const search = params.search || ''
  const status = params.status || 'all'
  const role = params.role || 'all'
  const profession = params.profession || 'all'

  const profileType = type === 'celeb' ? 'CELEB' : type === 'user' ? 'USER' : undefined
  const { members, total } = await getMembers({
    profileType,
    page,
    limit: 20,
    search,
    status,
    role: role !== 'all' ? role : undefined,
    profession: profession !== 'all' ? profession : undefined,
  })
  const totalPages = Math.ceil(total / 20)

  const buildUrl = (newPage?: number) => {
    const p = new URLSearchParams()
    if (type !== 'all') p.set('type', type)
    if (search) p.set('search', search)
    if (status !== 'all') p.set('status', status)
    if (role !== 'all') p.set('role', role)
    if (profession !== 'all') p.set('profession', profession)
    if (newPage && newPage > 1) p.set('page', String(newPage))
    const qs = p.toString()
    return `/members${qs ? `?${qs}` : ''}`
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-text-primary">멤버 관리</h1>
          <p className="text-sm text-text-secondary mt-1">총 {total.toLocaleString()}명</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/members/titles">
            <Button size="sm" variant="secondary" className="w-full sm:w-auto">
              <FileEdit className="w-4 h-4" />수식어 편집
            </Button>
          </Link>
          <Link href="/members/professions">
            <Button size="sm" variant="secondary" className="w-full sm:w-auto">
              <Briefcase className="w-4 h-4" />직군 편집
            </Button>
          </Link>
          <Link href="/members/philosophies">
            <Button size="sm" variant="secondary" className="w-full sm:w-auto">
              <BookOpen className="w-4 h-4" />감상 철학 편집
            </Button>
          </Link>
          <Link href="/members/new">
            <Button size="sm" className="w-full sm:w-auto"><Plus className="w-4 h-4" />셀럽 추가</Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <MembersFilter
        defaultValues={{
          search,
          type,
          status,
          role,
          profession,
        }}
      />

      {/* Table */}
      <div className="bg-bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <MemberTable members={members} />
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 md:gap-2 flex-wrap">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={buildUrl(p)}
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
