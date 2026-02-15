'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Star, BookOpen, BadgeCheck, CheckCircle, Ban, Zap } from 'lucide-react'
import { type Member } from '@/actions/admin/members'
import { getCelebProfessionLabel } from '@/constants/celebCategories'
import StatusToggle from '../../members/components/StatusToggle'
import NationalityBadge from '../../members/components/NationalityBadge'
import SortableTableHeader from '@/components/ui/SortableTableHeader'

export default function CelebTable({ celebs }: { celebs: Member[] }) {
  return (
    <table className="w-full min-w-[800px]">
      <thead className="bg-bg-secondary border-b border-border">
        <tr>
          <th className="w-12 px-3 md:px-4 py-3" />
          <th className="text-start px-3 md:px-4 py-3 text-xs md:text-sm font-medium text-text-secondary">수식어</th>
          <SortableTableHeader column="nickname" label="이름" />
          <SortableTableHeader column="profession" label="직군" />
          <SortableTableHeader column="nationality" label="국적" align="center" />
          <SortableTableHeader column="status" label="상태" align="center" />
          <SortableTableHeader column="influence_total" label="영향력" align="center" />
          <SortableTableHeader column="content_count" label="콘텐츠" align="center" />
          <SortableTableHeader column="follower_count" label="팔로워" align="center" />
          <SortableTableHeader column="created_at" label="등록일시" align="center" />
          <th className="text-center px-3 md:px-4 py-3 text-xs md:text-sm font-medium text-text-secondary w-24">액션</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {celebs.length === 0 ? (
          <tr><td colSpan={11} className="px-4 py-12 text-center text-text-secondary text-sm">셀럽이 없습니다</td></tr>
        ) : (
          celebs.map((celeb) => (
            <tr key={celeb.id} className="odd:bg-white/[0.02] hover:bg-bg-secondary/50">
              <td className="px-3 md:px-4 py-3">
                <div className="relative w-8 h-8 md:w-9 md:h-9 rounded-lg flex items-center justify-center overflow-hidden shrink-0 bg-yellow-500/20">
                  {(celeb.portrait_url || celeb.avatar_url)
                    ? <Image src={celeb.portrait_url || celeb.avatar_url!} alt="" fill unoptimized className="object-cover" />
                    : <Star className="w-4 h-4 text-yellow-400" />
                  }
                </div>
              </td>
              <td className="px-3 md:px-4 py-3">
                {celeb.title && (
                  <p className="text-xs text-accent truncate max-w-[120px]">{celeb.title}</p>
                )}
              </td>
              <td className="px-3 md:px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <Link
                    href={`/celebs/${celeb.id}`}
                    className="text-xs md:text-sm font-medium text-text-primary truncate max-w-[120px] hover:text-accent hover:underline"
                  >
                    {celeb.nickname || '이름 없음'}
                  </Link>
                  {celeb.is_verified && <BadgeCheck className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
                </div>
              </td>
              <td className="px-3 md:px-4 py-3">
                {celeb.profession && (
                  <p className="text-xs text-text-tertiary truncate max-w-[100px]">{getCelebProfessionLabel(celeb.profession)}</p>
                )}
              </td>
              <td className="px-3 md:px-4 py-3 text-center">
                {celeb.nationality && <NationalityBadge code={celeb.nationality} />}
              </td>
              <td className="px-3 md:px-4 py-3 text-center"><StatusBadge status={celeb.status} /></td>
              <td className="px-3 md:px-4 py-3 text-center">
                <span className="inline-flex items-center gap-1 text-xs md:text-sm text-text-secondary">
                  <Zap className="w-3.5 h-3.5" />{celeb.influence_total || 0}
                </span>
              </td>
              <td className="px-3 md:px-4 py-3 text-center">
                <Link
                  href={`/celebs/${celeb.id}/contents`}
                  className="inline-flex items-center gap-1 text-xs md:text-sm text-text-secondary hover:text-accent"
                >
                  <BookOpen className="w-3.5 h-3.5" />{celeb.content_count}
                </Link>
              </td>
              <td className="px-3 md:px-4 py-3 text-center">
                <span className="inline-flex items-center gap-1 text-xs md:text-sm text-text-secondary">
                  <Star className="w-3.5 h-3.5" />{celeb.follower_count}
                </span>
              </td>
              <td className="px-3 md:px-4 py-3 text-center">
                <DateTimeCell date={celeb.created_at} />
              </td>
              <td className="px-3 md:px-4 py-3">
                <div className="flex items-center justify-center">
                  <StatusToggle member={celeb} />
                </div>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
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
  if (!date) return <span className="text-xs text-text-tertiary">-</span>
  const d = new Date(date)
  if (isNaN(d.getTime())) return <span className="text-xs text-text-tertiary">-</span>
  const pad = (n: number) => String(n).padStart(2, '0')
  const ymd = `${String(d.getFullYear()).slice(2)}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`
  const hms = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  return (
    <div className="text-xs text-text-secondary leading-tight">
      <div>{ymd}</div>
      <div className="text-text-tertiary">{hms}</div>
    </div>
  )
}
