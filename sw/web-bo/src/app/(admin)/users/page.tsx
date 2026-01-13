import { getUsers } from '@/actions/admin/users'
import { Users, Search, Shield, Ban, CheckCircle, Star, BookOpen, UserCheck, Clock } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import Button from '@/components/ui/Button'

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

          <Button type="submit">
            검색
          </Button>
        </form>
      </div>

      {/* Users Table */}
      <div className="bg-bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-bg-secondary border-b border-border">
            <tr className="divide-x divide-border">
              <th className="text-center px-6 py-4 text-sm font-medium text-text-secondary">사용자</th>
              <th className="text-center px-6 py-4 text-sm font-medium text-text-secondary">유형</th>
              <th className="text-center px-6 py-4 text-sm font-medium text-text-secondary">역할</th>
              <th className="text-center px-6 py-4 text-sm font-medium text-text-secondary">상태</th>
              <th className="text-center px-6 py-4 text-sm font-medium text-text-secondary">콘텐츠</th>
              <th className="text-center px-6 py-4 text-sm font-medium text-text-secondary">팔로워</th>
              <th className="text-center px-6 py-4 text-sm font-medium text-text-secondary">점수</th>
              <th className="text-center px-6 py-4 text-sm font-medium text-text-secondary">최근 접속</th>
              <th className="text-center px-6 py-4 text-sm font-medium text-text-secondary">가입일</th>
              <th className="text-center px-6 py-4 text-sm font-medium text-text-secondary">액션</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-6 py-12 text-center text-text-secondary">
                  사용자가 없습니다
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="odd:bg-white/[0.02] hover:bg-bg-secondary/50 divide-x divide-border">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="relative w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center overflow-hidden">
                        {user.avatar_url ? (
                          <Image src={user.avatar_url} alt="" fill unoptimized className="object-cover" />
                        ) : (
                          <Users className="w-5 h-5 text-accent" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium text-text-primary">
                            {user.nickname || '닉네임 없음'}
                          </p>
                          {user.is_verified && (
                            <UserCheck className="w-3.5 h-3.5 text-blue-400" />
                          )}
                        </div>
                        <p className="text-xs text-text-secondary">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <ProfileTypeBadge type={user.profile_type} />
                  </td>
                  <td className="px-6 py-4">
                    <RoleBadge role={user.role} />
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={user.status} />
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-1 text-sm text-text-secondary">
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>{user.content_count}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-1 text-sm text-text-secondary">
                      <Users className="w-3.5 h-3.5" />
                      <span>{user.follower_count}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-1 text-sm text-text-secondary">
                      <Star className="w-3.5 h-3.5" />
                      <span>{user.total_score}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-text-secondary">
                    {user.last_seen_at ? (
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{formatRelativeTime(user.last_seen_at)}</span>
                      </div>
                    ) : (
                      <span className="text-text-secondary/50">-</span>
                    )}
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

function ProfileTypeBadge({ type }: { type: string | null }) {
  const config: Record<string, { label: string; className: string; icon: React.ElementType }> = {
    USER: { label: '일반', className: 'bg-gray-500/10 text-gray-400', icon: Users },
    CELEB: { label: '셀럽', className: 'bg-yellow-500/10 text-yellow-400', icon: Star },
  }

  const { label, className, icon: Icon } = config[type || 'USER'] || config.USER

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${className}`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  )
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHour = Math.floor(diffMs / 3600000)
  const diffDay = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return '방금 전'
  if (diffMin < 60) return `${diffMin}분 전`
  if (diffHour < 24) return `${diffHour}시간 전`
  if (diffDay < 7) return `${diffDay}일 전`
  return date.toLocaleDateString('ko-KR')
}
