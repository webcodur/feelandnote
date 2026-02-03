'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Users, BookOpen, BadgeCheck, Shield, CheckCircle, Ban } from 'lucide-react'
import { type Member } from '@/actions/admin/members'
import StatusToggle from '../../members/components/StatusToggle'
import SortableTableHeader from '@/components/ui/SortableTableHeader'

export default function UserTable({ users }: { users: Member[] }) {
  return (
    <table className="w-full min-w-[700px]">
      <thead className="bg-bg-secondary border-b border-border">
        <tr>
          <th className="w-12 px-3 md:px-4 py-3" />
          <SortableTableHeader column="nickname" label="이름" />
          <SortableTableHeader column="email" label="이메일" />
          <SortableTableHeader column="role" label="역할" align="center" />
          <SortableTableHeader column="status" label="상태" align="center" />
          <SortableTableHeader column="content_count" label="콘텐츠" align="center" />
          <SortableTableHeader column="created_at" label="가입일" align="center" />
          <th className="text-center px-3 md:px-4 py-3 text-xs md:text-sm font-medium text-text-secondary w-16">액션</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {users.length === 0 ? (
          <tr><td colSpan={8} className="px-4 py-12 text-center text-text-secondary text-sm">사용자가 없습니다</td></tr>
        ) : (
          users.map((user) => (
            <tr key={user.id} className="odd:bg-white/[0.02] hover:bg-bg-secondary/50">
              <td className="px-3 md:px-4 py-3">
                <div className="relative w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center overflow-hidden shrink-0 bg-accent/20">
                  {user.avatar_url
                    ? <Image src={user.avatar_url} alt="" fill unoptimized className="object-cover" />
                    : <Users className="w-4 h-4 text-accent" />
                  }
                </div>
              </td>
              <td className="px-3 md:px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <Link
                    href={`/users/${user.id}`}
                    className="text-xs md:text-sm font-medium text-text-primary truncate max-w-[120px] hover:text-accent hover:underline"
                  >
                    {user.nickname || '닉네임 없음'}
                  </Link>
                  {user.is_verified && <BadgeCheck className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
                </div>
              </td>
              <td className="px-3 md:px-4 py-3">
                <p className="text-xs text-text-secondary truncate max-w-[160px]">{user.email || '-'}</p>
              </td>
              <td className="px-3 md:px-4 py-3 text-center"><RoleBadge role={user.role} /></td>
              <td className="px-3 md:px-4 py-3 text-center"><StatusBadge status={user.status} /></td>
              <td className="px-3 md:px-4 py-3 text-center">
                <span className="inline-flex items-center gap-1 text-xs md:text-sm text-text-secondary">
                  <BookOpen className="w-3.5 h-3.5" />{user.content_count}
                </span>
              </td>
              <td className="px-3 md:px-4 py-3 text-center">
                <DateTimeCell date={user.created_at} />
              </td>
              <td className="px-3 md:px-4 py-3">
                <div className="flex items-center justify-center">
                  <StatusToggle member={user} />
                </div>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  )
}

function RoleBadge({ role }: { role?: string }) {
  const config: Record<string, { label: string; className: string }> = {
    user: { label: '사용자', className: 'bg-gray-500/10 text-gray-400' },
    admin: { label: '관리자', className: 'bg-blue-500/10 text-blue-400' },
    super_admin: { label: '최고관리자', className: 'bg-purple-500/10 text-purple-400' },
  }
  const { label, className } = config[role || 'user'] || config.user
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 md:px-2 py-0.5 md:py-1 rounded text-[10px] md:text-xs font-medium whitespace-nowrap ${className}`}>
      <Shield className="w-3 h-3" />{label}
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
    <span className={`inline-flex items-center gap-1 px-1.5 md:px-2 py-0.5 md:py-1 rounded text-[10px] md:text-xs font-medium whitespace-nowrap ${className}`}>
      <Icon className="w-3 h-3" />{label}
    </span>
  )
}

function DateTimeCell({ date }: { date: string }) {
  const d = new Date(date)
  const pad = (n: number) => String(n).padStart(2, '0')
  const ymd = `${d.getFullYear()}. ${pad(d.getMonth() + 1)}. ${pad(d.getDate())}.`
  const hms = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  return (
    <div className="text-xs text-text-secondary leading-tight">
      <div>{ymd}</div>
      <div className="text-text-tertiary">{hms}</div>
    </div>
  )
}
