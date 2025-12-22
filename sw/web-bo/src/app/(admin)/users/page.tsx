import { getUsers } from '@/actions/admin/users'
import { Users, Search, Shield, Ban, CheckCircle } from 'lucide-react'
import Link from 'next/link'

interface PageProps {
  searchParams: Promise<{
    page?: string
    search?: string
    status?: string
    role?: string
  }>
}

export default async function UsersPage({ searchParams }: PageProps) {
  const params = await searchParams
  const page = Number(params.page) || 1
  const search = params.search || ''
  const status = params.status || 'all'
  const role = params.role || 'all'

  const { users, total } = await getUsers(page, 20, search, status, role)
  const totalPages = Math.ceil(total / 20)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">사용자 관리</h1>
          <p className="text-text-secondary mt-1">총 {total.toLocaleString()}명의 사용자</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-bg-card border border-border rounded-lg p-4">
        <form className="flex flex-wrap gap-4">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
              <input
                type="text"
                name="search"
                defaultValue={search}
                placeholder="이메일 또는 닉네임 검색..."
                className="w-full pl-10 pr-4 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent focus:outline-none"
              />
            </div>
          </div>

          {/* Status Filter */}
          <select
            name="status"
            defaultValue={status}
            className="px-4 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary focus:border-accent focus:outline-none"
          >
            <option value="all">모든 상태</option>
            <option value="active">활성</option>
            <option value="suspended">정지</option>
          </select>

          {/* Role Filter */}
          <select
            name="role"
            defaultValue={role}
            className="px-4 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary focus:border-accent focus:outline-none"
          >
            <option value="all">모든 역할</option>
            <option value="user">일반 사용자</option>
            <option value="admin">관리자</option>
            <option value="super_admin">최고 관리자</option>
          </select>

          <button
            type="submit"
            className="px-6 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg transition-colors"
          >
            검색
          </button>
        </form>
      </div>

      {/* Users Table */}
      <div className="bg-bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-bg-secondary border-b border-border">
            <tr>
              <th className="text-left px-6 py-4 text-sm font-medium text-text-secondary">사용자</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-text-secondary">역할</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-text-secondary">상태</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-text-secondary">가입일</th>
              <th className="text-right px-6 py-4 text-sm font-medium text-text-secondary">액션</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-text-secondary">
                  사용자가 없습니다
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="hover:bg-bg-secondary/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center overflow-hidden">
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Users className="w-5 h-5 text-accent" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-text-primary">
                          {user.nickname || '닉네임 없음'}
                        </p>
                        <p className="text-xs text-text-secondary">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <RoleBadge role={user.role} />
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={user.status} />
                  </td>
                  <td className="px-6 py-4 text-sm text-text-secondary">
                    {new Date(user.created_at).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/users/${user.id}`}
                      className="text-sm text-accent hover:underline"
                    >
                      상세보기
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/users?page=${p}&search=${search}&status=${status}&role=${role}`}
              className={`
                px-4 py-2 rounded-lg text-sm transition-colors
                ${p === page
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

function RoleBadge({ role }: { role: string }) {
  const config: Record<string, { label: string; className: string; icon: React.ElementType }> = {
    user: { label: '사용자', className: 'bg-gray-500/10 text-gray-400', icon: Users },
    admin: { label: '관리자', className: 'bg-blue-500/10 text-blue-400', icon: Shield },
    super_admin: { label: '최고 관리자', className: 'bg-purple-500/10 text-purple-400', icon: Shield },
  }

  const { label, className, icon: Icon } = config[role] || config.user

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${className}`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string; icon: React.ElementType }> = {
    active: { label: '활성', className: 'bg-green-500/10 text-green-400', icon: CheckCircle },
    suspended: { label: '정지', className: 'bg-red-500/10 text-red-400', icon: Ban },
    deleted: { label: '삭제됨', className: 'bg-gray-500/10 text-gray-400', icon: Ban },
  }

  const { label, className, icon: Icon } = config[status] || config.active

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${className}`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  )
}
