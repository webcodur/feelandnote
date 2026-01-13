import { getCelebs } from '@/actions/admin/celebs'
import { CELEB_PROFESSIONS, getCelebProfessionLabel } from '@/constants/celebCategories'
import { Search, Star, Plus, BookOpen, Users, CheckCircle, Ban, BadgeCheck, Settings } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import Button from '@/components/ui/Button'

interface PageProps {
  searchParams: Promise<{
    page?: string
    search?: string
    status?: string
    profession?: string
  }>
}

export default async function CelebsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const page = Number(params.page) || 1
  const search = params.search || ''
  const status = (params.status || 'all') as 'active' | 'suspended' | 'all'
  const profession = params.profession || 'all'

  const { celebs, total } = await getCelebs({ page, limit: 20, search, status, profession })
  const totalPages = Math.ceil(total / 20)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">셀럽 관리</h1>
          <p className="text-text-secondary mt-1">총 {total.toLocaleString()}명의 셀럽</p>
        </div>
        <Link href="/celebs/new">
          <Button>
            <Plus className="w-4 h-4" />
            셀럽 추가
          </Button>
        </Link>
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
                placeholder="닉네임 검색..."
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
            <option value="suspended">비활성</option>
          </select>

          {/* Profession Filter */}
          <select
            name="profession"
            defaultValue={profession}
            className="px-4 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary focus:border-accent focus:outline-none"
          >
            <option value="all">모든 직군</option>
            {CELEB_PROFESSIONS.map((prof) => (
              <option key={prof.value} value={prof.value}>
                {prof.label}
              </option>
            ))}
          </select>

          <Button type="submit">검색</Button>
        </form>
      </div>

      {/* Celebs Table */}
      <div className="bg-bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-bg-secondary border-b border-border">
            <tr className="divide-x divide-border">
              <th className="text-center px-6 py-4 text-sm font-medium text-text-secondary">셀럽</th>
              <th className="text-center px-6 py-4 text-sm font-medium text-text-secondary">직군</th>
              <th className="text-center px-6 py-4 text-sm font-medium text-text-secondary">인증</th>
              <th className="text-center px-6 py-4 text-sm font-medium text-text-secondary">콘텐츠</th>
              <th className="text-center px-6 py-4 text-sm font-medium text-text-secondary">팔로워</th>
              <th className="text-center px-6 py-4 text-sm font-medium text-text-secondary">상태</th>
              <th className="text-center px-6 py-4 text-sm font-medium text-text-secondary">인수</th>
              <th className="text-center px-6 py-4 text-sm font-medium text-text-secondary">생성일</th>
              <th className="text-center px-6 py-4 text-sm font-medium text-text-secondary">관리</th>
              <th className="text-center px-6 py-4 text-sm font-medium text-text-secondary">액션</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {celebs.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-6 py-12 text-center text-text-secondary">
                  셀럽이 없습니다
                </td>
              </tr>
            ) : (
              celebs.map((celeb) => (
                <tr key={celeb.id} className="odd:bg-white/[0.02] hover:bg-bg-secondary/50 divide-x divide-border">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="relative w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center overflow-hidden">
                        {celeb.avatar_url ? (
                          <Image src={celeb.avatar_url} alt="" fill unoptimized className="object-cover" />
                        ) : (
                          <Star className="w-5 h-5 text-yellow-400" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium text-text-primary">
                            {celeb.nickname || '닉네임 없음'}
                          </p>
                          {celeb.is_verified && <BadgeCheck className="w-3.5 h-3.5 text-blue-400" />}
                        </div>
                        {celeb.bio && (
                          <p className="text-xs text-text-secondary truncate max-w-[200px]">
                            {celeb.bio}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <ProfessionBadge profession={celeb.profession} />
                  </td>
                  <td className="px-6 py-4">
                    <VerifiedBadge verified={celeb.is_verified} />
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-1 text-sm text-text-secondary">
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>{celeb.content_count}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-1 text-sm text-text-secondary">
                      <Users className="w-3.5 h-3.5" />
                      <span>{celeb.follower_count}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={celeb.status} />
                  </td>
                  <td className="px-6 py-4">
                    <ClaimStatusBadge claimedBy={celeb.claimed_by} />
                  </td>
                  <td className="px-6 py-4 text-sm text-text-secondary text-center">
                    {new Date(celeb.created_at).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <Link
                      href={`/celebs/${celeb.id}/contents`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 text-accent text-sm font-medium hover:bg-accent/20"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      콘텐츠 관리
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <Link
                      href={`/celebs/${celeb.id}`}
                      className="text-sm text-text-secondary hover:text-accent hover:underline"
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
              href={`/celebs?page=${p}&search=${search}&status=${status}&profession=${profession}`}
              className={`
                px-4 py-2 rounded-lg text-sm
                ${
                  p === page
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

function ProfessionBadge({ profession }: { profession: string | null }) {
  return (
    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-500/10 text-gray-400">
      {getCelebProfessionLabel(profession)}
    </span>
  )
}

function VerifiedBadge({ verified }: { verified: boolean | null }) {
  return verified ? (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-blue-500/10 text-blue-400">
      <BadgeCheck className="w-3 h-3" />
      인증됨
    </span>
  ) : (
    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-500/10 text-gray-400">
      미인증
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string; icon: React.ElementType }> = {
    active: { label: '활성', className: 'bg-green-500/10 text-green-400', icon: CheckCircle },
    suspended: { label: '비활성', className: 'bg-red-500/10 text-red-400', icon: Ban },
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

function ClaimStatusBadge({ claimedBy }: { claimedBy: string | null }) {
  return claimedBy ? (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-green-500/10 text-green-400">
      <CheckCircle className="w-3 h-3" />
      인수됨
    </span>
  ) : (
    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-500/10 text-gray-400">
      미인수
    </span>
  )
}
