'use client'

import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Star, Users, BookOpen, BadgeCheck, Shield, CheckCircle, Ban, Settings } from 'lucide-react'
import { type Member } from '@/actions/admin/members'
import { getCelebProfessionLabel } from '@/constants/celebCategories'
import StatusToggle from './StatusToggle'

export default function MemberTable({ members }: { members: Member[] }) {
  const router = useRouter()

  return (
    <table className="w-full">
      <thead className="bg-bg-secondary border-b border-border">
        <tr>
          <th className="text-start px-4 py-3 text-sm font-medium text-text-secondary">멤버</th>
          <th className="text-center px-4 py-3 text-sm font-medium text-text-secondary">구분</th>
          <th className="text-center px-4 py-3 text-sm font-medium text-text-secondary">상태</th>
          <th className="text-center px-4 py-3 text-sm font-medium text-text-secondary">콘텐츠</th>
          <th className="text-center px-4 py-3 text-sm font-medium text-text-secondary">팔로워</th>
          <th className="text-center px-4 py-3 text-sm font-medium text-text-secondary w-24">액션</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {members.length === 0 ? (
          <tr><td colSpan={6} className="px-4 py-12 text-center text-text-secondary">멤버가 없습니다</td></tr>
        ) : (
          members.map((m) => {
            const isCeleb = m.profile_type === 'CELEB'
            return (
              <tr
                key={m.id}
                onClick={() => router.push(`/members/${m.id}`)}
                className="odd:bg-white/[0.02] hover:bg-bg-secondary/50 cursor-pointer"
              >
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
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-center gap-1">
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
