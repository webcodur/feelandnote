import { getMembers, type ProfileType } from '@/actions/admin/members'
import { CELEB_PROFESSIONS, getCelebProfessionLabel } from '@/constants/celebCategories'
import {
  Search, Star, Plus, BookOpen, Users, CheckCircle, Ban,
  BadgeCheck, Settings, Shield, Clock, MapPin, UserCheck,
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import Button from '@/components/ui/Button'

interface PageProps {
  searchParams: Promise<{
    tab?: string
    page?: string
    search?: string
    status?: string
    role?: string
    profession?: string
  }>
}

export default async function MembersPage({ searchParams }: PageProps) {
  const params = await searchParams
  const tab = (params.tab === 'celeb' ? 'celeb' : 'user') as 'user' | 'celeb'
  const profileType: ProfileType = tab === 'celeb' ? 'CELEB' : 'USER'
  const page = Number(params.page) || 1
  const search = params.search || ''
  const status = params.status || 'all'
  const role = params.role || 'all'
  const profession = params.profession || 'all'

  const { members, total } = await getMembers({
    profileType,
    page,
    limit: 20,
    search,
    status,
    role: tab === 'user' ? role : undefined,
    profession: tab === 'celeb' ? profession : undefined,
  })
  const totalPages = Math.ceil(total / 20)

  const baseUrl = `/members?tab=${tab}&search=${search}&status=${status}`
  const paginationUrl = tab === 'celeb' ? `${baseUrl}&profession=${profession}` : `${baseUrl}&role=${role}`

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">멤버 관리</h1>
          <p className="text-text-secondary mt-1">
            총 {total.toLocaleString()}명의 {tab === 'celeb' ? '셀럽' : '사용자'}
          </p>
        </div>
        {tab === 'celeb' && (
          <Link href="/members/new">
            <Button>
              <Plus className="w-4 h-4" />
              셀럽 추가
            </Button>
          </Link>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        <Link
          href={`/members?tab=user&search=${search}&status=${status}&role=${role}`}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            tab === 'user'
              ? 'border-accent text-accent'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          <Users className="w-4 h-4 inline-block mr-1.5" />
          사용자
        </Link>
        <Link
          href={`/members?tab=celeb&search=${search}&status=${status}&profession=${profession}`}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            tab === 'celeb'
              ? 'border-accent text-accent'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          <Star className="w-4 h-4 inline-block mr-1.5" />
          셀럽
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-bg-card border border-border rounded-lg p-4">
        <form className="flex flex-wrap gap-4">
          <input type="hidden" name="tab" value={tab} />
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
              <input
                type="text"
                name="search"
                defaultValue={search}
                placeholder={tab === 'celeb' ? '닉네임 검색...' : '이메일 또는 닉네임 검색...'}
                className="w-full pl-10 pr-4 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent focus:outline-none"
              />
            </div>
          </div>

          <select
            name="status"
            defaultValue={status}
            className="px-4 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary focus:border-accent focus:outline-none"
          >
            <option value="all">모든 상태</option>
            <option value="active">활성</option>
            <option value="suspended">{tab === 'celeb' ? '비활성' : '정지'}</option>
          </select>

          {tab === 'user' && (
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
          )}

          {tab === 'celeb' && (
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
          )}

          <Button type="submit">검색</Button>
        </form>
      </div>

      {/* Table */}
      <div className="bg-bg-card border border-border rounded-lg overflow-hidden">
        {tab === 'user' ? (
          <UserTable members={members} />
        ) : (
          <CelebTable members={members} />
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`${paginationUrl}&page=${p}`}
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

// #region UserTable
import { type Member } from '@/actions/admin/members'

function UserTable({ members }: { members: Member[] }) {
  return (
    <table className="w-full">
      <thead className="bg-bg-secondary border-b border-border">
        <tr className="divide-x divide-border">
          <th className="text-center px-6 py-4 text-sm font-medium text-text-secondary">사용자</th>
          <th className="text-center px-6 py-4 text-sm font-medium text-text-secondary">역할</th>
          <th className="text-center px-6 py-4 text-sm font-medium text-text-secondary">상태</th>
          <th className="text-center px-6 py-4 text-sm font-medium text-text-secondary">콘텐츠</th>
          <th className="text-center px-6 py-4 text-sm font-medium text-text-secondary">팔로워</th>
          <th className="text-center px-6 py-4 text-sm font-medium text-text-secondary">점수</th>
          <th className="text-center px-6 py-4 text-sm font-medium text-text-secondary">최근 접속</th>
          <th className="text-center px-6 py-4 text-sm font-medium text-text-secondary">액션</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {members.length === 0 ? (
          <tr><td colSpan={8} className="px-6 py-12 text-center text-text-secondary">사용자가 없습니다</td></tr>
        ) : (
          members.map((m) => (
            <tr key={m.id} className="odd:bg-white/[0.02] hover:bg-bg-secondary/50 divide-x divide-border">
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="relative w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center overflow-hidden">
                    {m.avatar_url ? <Image src={m.avatar_url} alt="" fill unoptimized className="object-cover" /> : <Users className="w-5 h-5 text-accent" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-text-primary">{m.nickname || '닉네임 없음'}</p>
                      {m.is_verified && <UserCheck className="w-3.5 h-3.5 text-blue-400" />}
                    </div>
                    <p className="text-xs text-text-secondary">{m.email}</p>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4"><RoleBadge role={m.role || 'user'} /></td>
              <td className="px-6 py-4"><StatusBadge status={m.status} /></td>
              <td className="px-6 py-4 text-center"><StatCell icon={BookOpen} value={m.content_count} /></td>
              <td className="px-6 py-4 text-center"><StatCell icon={Users} value={m.follower_count} /></td>
              <td className="px-6 py-4 text-center"><StatCell icon={Star} value={m.total_score || 0} /></td>
              <td className="px-6 py-4 text-sm text-text-secondary">
                {m.last_seen_at ? <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{formatRelativeTime(m.last_seen_at)}</span> : '-'}
              </td>
              <td className="px-6 py-4 text-center"><Link href={`/members/${m.id}`} className="text-sm text-accent hover:underline">상세보기</Link></td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  )
}
// #endregion

// #region CelebTable
function CelebTable({ members }: { members: Member[] }) {
  return (
    <table className="w-full">
      <thead className="bg-bg-secondary border-b border-border">
        <tr className="divide-x divide-border">
          <th className="text-center px-6 py-4 text-sm font-medium text-text-secondary">셀럽</th>
          <th className="text-center px-6 py-4 text-sm font-medium text-text-secondary">직군</th>
          <th className="text-center px-6 py-4 text-sm font-medium text-text-secondary">인증</th>
          <th className="text-center px-6 py-4 text-sm font-medium text-text-secondary">콘텐츠</th>
          <th className="text-center px-6 py-4 text-sm font-medium text-text-secondary">팔로워</th>
          <th className="text-center px-6 py-4 text-sm font-medium text-text-secondary">상태</th>
          <th className="text-center px-6 py-4 text-sm font-medium text-text-secondary">관리</th>
          <th className="text-center px-6 py-4 text-sm font-medium text-text-secondary">액션</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {members.length === 0 ? (
          <tr><td colSpan={8} className="px-6 py-12 text-center text-text-secondary">셀럽이 없습니다</td></tr>
        ) : (
          members.map((m) => (
            <tr key={m.id} className="odd:bg-white/[0.02] hover:bg-bg-secondary/50 divide-x divide-border">
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="relative w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center overflow-hidden">
                    {m.avatar_url ? <Image src={m.avatar_url} alt="" fill unoptimized className="object-cover" /> : <Star className="w-5 h-5 text-yellow-400" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-text-primary">{m.nickname || '닉네임 없음'}</p>
                      {m.is_verified && <BadgeCheck className="w-3.5 h-3.5 text-blue-400" />}
                    </div>
                    {m.nationality && <p className="text-xs text-text-secondary flex items-center gap-1"><MapPin className="w-3 h-3" />{m.nationality}</p>}
                  </div>
                </div>
              </td>
              <td className="px-6 py-4"><span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-500/10 text-gray-400">{getCelebProfessionLabel(m.profession)}</span></td>
              <td className="px-6 py-4">{m.is_verified ? <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-blue-500/10 text-blue-400"><BadgeCheck className="w-3 h-3" />인증됨</span> : <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-500/10 text-gray-400">미인증</span>}</td>
              <td className="px-6 py-4 text-center"><StatCell icon={BookOpen} value={m.content_count} /></td>
              <td className="px-6 py-4 text-center"><StatCell icon={Users} value={m.follower_count} /></td>
              <td className="px-6 py-4"><StatusBadge status={m.status} /></td>
              <td className="px-6 py-4 text-center"><Link href={`/members/${m.id}/contents`} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 text-accent text-sm font-medium hover:bg-accent/20"><Settings className="w-3.5 h-3.5" />콘텐츠</Link></td>
              <td className="px-6 py-4 text-center"><Link href={`/members/${m.id}`} className="text-sm text-accent hover:underline">상세보기</Link></td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  )
}
// #endregion

// #region Badge Components
function RoleBadge({ role }: { role: string }) {
  const config: Record<string, { label: string; className: string; icon: React.ElementType }> = {
    user: { label: '사용자', className: 'bg-gray-500/10 text-gray-400', icon: Users },
    admin: { label: '관리자', className: 'bg-blue-500/10 text-blue-400', icon: Shield },
    super_admin: { label: '최고 관리자', className: 'bg-purple-500/10 text-purple-400', icon: Shield },
  }
  const { label, className, icon: Icon } = config[role] || config.user
  return <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${className}`}><Icon className="w-3 h-3" />{label}</span>
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string; icon: React.ElementType }> = {
    active: { label: '활성', className: 'bg-green-500/10 text-green-400', icon: CheckCircle },
    suspended: { label: '정지', className: 'bg-red-500/10 text-red-400', icon: Ban },
    deleted: { label: '삭제됨', className: 'bg-gray-500/10 text-gray-400', icon: Ban },
  }
  const { label, className, icon: Icon } = config[status] || config.active
  return <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${className}`}><Icon className="w-3 h-3" />{label}</span>
}

function StatCell({ icon: Icon, value }: { icon: React.ElementType; value: number }) {
  return <div className="flex items-center justify-center gap-1 text-sm text-text-secondary"><Icon className="w-3.5 h-3.5" /><span>{value}</span></div>
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
// #endregion
