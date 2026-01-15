import { getMembers } from '@/actions/admin/members'
import { CELEB_PROFESSIONS, getCelebProfessionLabel } from '@/constants/celebCategories'
import {
  Search, Star, Plus, BookOpen, Users, CheckCircle, Ban,
  BadgeCheck, Shield, Eye, Settings,
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import Button from '@/components/ui/Button'

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

// #region MemberTable
import { type Member } from '@/actions/admin/members'

function MemberTable({ members }: { members: Member[] }) {
  return (
    <table className="w-full">
      <thead className="bg-bg-secondary border-b border-border">
        <tr>
          <th className="text-start px-4 py-3 text-sm font-medium text-text-secondary">멤버</th>
          <th className="text-center px-4 py-3 text-sm font-medium text-text-secondary">구분</th>
          <th className="text-center px-4 py-3 text-sm font-medium text-text-secondary">상태</th>
          <th className="text-center px-4 py-3 text-sm font-medium text-text-secondary">콘텐츠</th>
          <th className="text-center px-4 py-3 text-sm font-medium text-text-secondary">팔로워</th>
          <th className="text-center px-4 py-3 text-sm font-medium text-text-secondary w-32">액션</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {members.length === 0 ? (
          <tr><td colSpan={6} className="px-4 py-12 text-center text-text-secondary">멤버가 없습니다</td></tr>
        ) : (
          members.map((m) => {
            const isCeleb = m.profile_type === 'CELEB'
            return (
              <tr key={m.id} className="odd:bg-white/[0.02] hover:bg-bg-secondary/50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className={`relative w-9 h-9 rounded-full flex items-center justify-center overflow-hidden ${isCeleb ? 'bg-yellow-500/20' : 'bg-accent/20'}`}>
                      {m.avatar_url
                        ? <Image src={m.avatar_url} alt="" fill unoptimized className="object-cover" />
                        : isCeleb ? <Star className="w-4 h-4 text-yellow-400" /> : <Users className="w-4 h-4 text-accent" />
                      }
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium text-text-primary truncate">{m.nickname || '닉네임 없음'}</p>
                        {m.is_verified && <BadgeCheck className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
                      </div>
                      <p className="text-xs text-text-secondary truncate">
                        {isCeleb ? getCelebProfessionLabel(m.profession) : m.email}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-center"><TypeBadge type={m.profile_type} role={m.role} /></td>
                <td className="px-4 py-3 text-center"><StatusBadge status={m.status} /></td>
                <td className="px-4 py-3 text-center">
                  <span className="inline-flex items-center gap-1 text-sm text-text-secondary">
                    <BookOpen className="w-3.5 h-3.5" />{m.content_count}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="inline-flex items-center gap-1 text-sm text-text-secondary">
                    <Users className="w-3.5 h-3.5" />{m.follower_count}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-1">
                    <Link
                      href={`/members/${m.id}`}
                      className="p-2 rounded-lg text-text-secondary hover:text-accent hover:bg-accent/10"
                      title="상세보기"
                    >
                      <Eye className="w-4 h-4" />
                    </Link>
                    {isCeleb && (
                      <Link
                        href={`/members/${m.id}/contents`}
                        className="p-2 rounded-lg text-text-secondary hover:text-accent hover:bg-accent/10"
                        title="콘텐츠 관리"
                      >
                        <Settings className="w-4 h-4" />
                      </Link>
                    )}
                    <StatusToggle member={m} />
                  </div>
                </td>
              </tr>
            )
          })
        )}
      </tbody>
    </table>
  )
}

function TypeBadge({ type, role }: { type: string; role?: string }) {
  if (type === 'CELEB') {
    return <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-yellow-500/10 text-yellow-400"><Star className="w-3 h-3" />셀럽</span>
  }
  const roleConfig: Record<string, { label: string; className: string }> = {
    user: { label: '사용자', className: 'bg-gray-500/10 text-gray-400' },
    admin: { label: '관리자', className: 'bg-blue-500/10 text-blue-400' },
    super_admin: { label: '최고관리자', className: 'bg-purple-500/10 text-purple-400' },
  }
  const { label, className } = roleConfig[role || 'user'] || roleConfig.user
  return <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${className}`}><Shield className="w-3 h-3" />{label}</span>
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

import StatusToggle from './components/StatusToggle'
// #endregion
