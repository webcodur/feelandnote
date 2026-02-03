import type { Metadata } from 'next'
import { getMembers } from '@/actions/admin/members'
import Pagination from '@/components/ui/Pagination'
import UserTable from './components/UserTable'
import UserFilter from './components/UserFilter'

export const metadata: Metadata = {
  title: '유저 관리',
}

interface PageProps {
  searchParams: Promise<{
    page?: string
    search?: string
    status?: string
    role?: string
    sort?: string
    sortOrder?: 'asc' | 'desc'
  }>
}

export default async function UsersPage({ searchParams }: PageProps) {
  const params = await searchParams
  const page = Number(params.page) || 1
  const search = params.search || ''
  const status = params.status || 'all'
  const role = params.role || 'all'
  const sort = params.sort || 'created_at'
  const sortOrder = params.sortOrder || 'desc'

  const { members: users, total } = await getMembers({
    profileType: 'USER',
    page,
    limit: 20,
    search,
    status,
    role: role !== 'all' ? role : undefined,
    sort,
    sortOrder,
  })
  const totalPages = Math.ceil(total / 20)

  // Pagination용 params (page 제외)
  const paginationParams = {
    search: search || undefined,
    status: status !== 'all' ? status : undefined,
    role: role !== 'all' ? role : undefined,
    sort: sort !== 'created_at' ? sort : undefined,
    sortOrder: sortOrder !== 'desc' ? sortOrder : undefined,
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-text-primary">유저 관리</h1>
          <p className="text-sm text-text-secondary mt-1">총 {total.toLocaleString()}명</p>
        </div>
      </div>

      {/* Filters */}
      <UserFilter defaultValues={{ search, status, role }} />

      {/* Table */}
      <div className="bg-bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <UserTable users={users} />
        </div>
      </div>

      {/* Pagination */}
      <Pagination page={page} totalPages={totalPages} baseHref="/users" params={paginationParams} />
    </div>
  )
}
