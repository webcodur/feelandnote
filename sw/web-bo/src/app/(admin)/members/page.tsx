import { getMembers } from '@/actions/admin/members'
import { CELEB_PROFESSIONS } from '@/constants/celebCategories'
import { Search, Plus } from 'lucide-react'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import MemberTable from './components/MemberTable'

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">멤버 관리</h1>
          <p className="text-text-secondary mt-1">총 {total.toLocaleString()}명</p>
        </div>
        <Link href="/members/new">
          <Button><Plus className="w-4 h-4" />셀럽 추가</Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-bg-card border border-border rounded-lg p-4">
        <form className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
              <input
                type="text"
                name="search"
                defaultValue={search}
                placeholder="닉네임 또는 이메일 검색..."
                className="w-full pl-10 pr-4 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent focus:outline-none"
              />
            </div>
          </div>

          <select
            name="type"
            defaultValue={type}
            className="px-4 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary focus:border-accent focus:outline-none"
          >
            <option value="all">전체 타입</option>
            <option value="user">사용자</option>
            <option value="celeb">셀럽</option>
          </select>

          <select
            name="status"
            defaultValue={status}
            className="px-4 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary focus:border-accent focus:outline-none"
          >
            <option value="all">모든 상태</option>
            <option value="active">활성</option>
            <option value="suspended">정지</option>
          </select>

          <select
            name="role"
            defaultValue={role}
            className="px-4 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary focus:border-accent focus:outline-none"
          >
            <option value="all">모든 역할</option>
            <option value="user">일반</option>
            <option value="admin">관리자</option>
            <option value="super_admin">최고관리자</option>
          </select>

          <select
            name="profession"
            defaultValue={profession}
            className="px-4 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary focus:border-accent focus:outline-none"
          >
            <option value="all">모든 직군</option>
            {CELEB_PROFESSIONS.map((prof) => (
              <option key={prof.value} value={prof.value}>{prof.label}</option>
            ))}
          </select>

          <Button type="submit">검색</Button>
        </form>
      </div>

      {/* Table */}
      <div className="bg-bg-card border border-border rounded-lg overflow-hidden">
        <MemberTable members={members} />
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={buildUrl(p)}
              className={`px-4 py-2 rounded-lg text-sm ${
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
