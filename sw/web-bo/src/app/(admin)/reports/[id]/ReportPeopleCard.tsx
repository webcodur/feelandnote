import Link from 'next/link'
import Image from 'next/image'
import { UserRound, ShieldAlert } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import { REPORT_REPEAT_THRESHOLD } from '@/constants/moderation'
import type { ReportPersonDetail } from '@/actions/admin/reports/detail'

interface PersonStat {
  label: string
  value: number
  warn: boolean
}

interface PersonBlockProps {
  role: string
  person: ReportPersonDetail | null
  emptyText: string
  stats: readonly PersonStat[]
}

function PersonBlock({ role, person, emptyText, stats }: PersonBlockProps) {
  return (
    <div className="bg-bg-card border border-border rounded-xl p-5 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium text-text-secondary">{role}</h3>
        {person?.status === 'suspended' && (
          <Badge variant="danger" icon={<ShieldAlert className="w-3 h-3" />}>
            정지된 계정
          </Badge>
        )}
      </div>

      {!person && <p className="text-sm text-text-dim">{emptyText}</p>}

      {person && (
        <Link
          href={`/users/${person.id}`}
          className="flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-bg-secondary"
        >
          <div className="relative w-11 h-11 rounded-full bg-accent/20 flex items-center justify-center overflow-hidden shrink-0">
            {person.avatarUrl ? (
              <Image src={person.avatarUrl} alt="" fill unoptimized className="object-cover" />
            ) : (
              <UserRound className="w-5 h-5 text-accent" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-text-primary truncate">
              {person.nickname || '닉네임 없음'}
            </p>
            <p className="text-xs text-text-secondary truncate">{person.email || '-'}</p>
          </div>
        </Link>
      )}

      {person && stats.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {stats.map((stat) => (
            <Badge key={stat.label} variant={stat.warn ? 'danger' : 'default'}>
              {stat.label} {stat.value.toLocaleString()}
            </Badge>
          ))}
        </div>
      )}

      {person?.status === 'suspended' && person.suspendedReason && (
        <p className="text-sm text-danger-text">
          정지 사유: {person.suspendedReason}
          {person.suspendedAt && ` (${new Date(person.suspendedAt).toLocaleString('ko-KR')})`}
        </p>
      )}
    </div>
  )
}

interface ReportPeopleCardProps {
  reporter: ReportPersonDetail | null
  targetUser: ReportPersonDetail | null
  reporterFiledCount: number
  reporterPendingCount: number
  targetUserReceivedCount: number
  targetUserBlockedByCount: number
}

export default function ReportPeopleCard({
  reporter,
  targetUser,
  reporterFiledCount,
  reporterPendingCount,
  targetUserReceivedCount,
  targetUserBlockedByCount,
}: ReportPeopleCardProps) {
  return (
    <div className="space-y-4">
      <PersonBlock
        role="신고한 사람"
        person={reporter}
        emptyText="신고자 계정이 남아 있지 않습니다."
        stats={[
          {
            label: '지금까지 낸 신고',
            value: reporterFiledCount,
            warn: reporterFiledCount >= REPORT_REPEAT_THRESHOLD,
          },
          { label: '그중 미처리', value: reporterPendingCount, warn: false },
        ]}
      />

      <PersonBlock
        role="신고당한 글의 작성자"
        person={targetUser}
        emptyText="이 신고에는 대상 작성자가 기록되지 않았습니다. 위 원문의 작성자를 기준으로 판단해주세요."
        stats={[
          {
            label: '받은 신고',
            value: targetUserReceivedCount,
            warn: targetUserReceivedCount >= REPORT_REPEAT_THRESHOLD,
          },
          {
            label: '차단한 사람',
            value: targetUserBlockedByCount,
            warn: targetUserBlockedByCount >= REPORT_REPEAT_THRESHOLD,
          },
        ]}
      />
    </div>
  )
}
