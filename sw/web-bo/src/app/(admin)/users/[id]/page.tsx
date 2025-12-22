import { getUser } from '@/actions/admin/users'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Users, Mail, Calendar, Shield, Ban, CheckCircle, Clock } from 'lucide-react'
import UserActions from './UserActions'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function UserDetailPage({ params }: PageProps) {
  const { id } = await params
  const user = await getUser(id)

  if (!user) {
    notFound()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/users"
          className="p-2 hover:bg-bg-card rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-text-secondary" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">사용자 상세</h1>
          <p className="text-text-secondary mt-1">{user.email}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="lg:col-span-1">
          <div className="bg-bg-card border border-border rounded-lg p-6">
            <div className="text-center">
              <div className="w-24 h-24 mx-auto rounded-full bg-accent/20 flex items-center justify-center overflow-hidden">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Users className="w-12 h-12 text-accent" />
                )}
              </div>
              <h2 className="mt-4 text-xl font-semibold text-text-primary">
                {user.nickname || '닉네임 없음'}
              </h2>
              <p className="text-text-secondary text-sm">{user.email}</p>

              <div className="flex items-center justify-center gap-2 mt-4">
                <RoleBadge role={user.role} />
                <StatusBadge status={user.status} />
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-border space-y-4">
              <InfoRow icon={Mail} label="이메일" value={user.email} />
              <InfoRow
                icon={Calendar}
                label="가입일"
                value={new Date(user.created_at).toLocaleDateString('ko-KR')}
              />
              <InfoRow
                icon={Clock}
                label="마지막 접속"
                value={user.last_seen_at ? new Date(user.last_seen_at).toLocaleDateString('ko-KR') : '-'}
              />
            </div>

            {/* Suspension Info */}
            {user.status === 'suspended' && user.suspended_at && (
              <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-sm font-medium text-red-400">정지 정보</p>
                <p className="text-xs text-text-secondary mt-1">
                  정지일: {new Date(user.suspended_at).toLocaleDateString('ko-KR')}
                </p>
                {user.suspended_reason && (
                  <p className="text-xs text-text-secondary mt-1">
                    사유: {user.suspended_reason}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Actions & Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Actions */}
          <div className="bg-bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold text-text-primary mb-4">관리 액션</h3>
            <UserActions user={user} />
          </div>

          {/* Activity placeholder */}
          <div className="bg-bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold text-text-primary mb-4">활동 내역</h3>
            <p className="text-text-secondary text-center py-8">
              활동 내역 기능은 추후 구현 예정입니다
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="w-4 h-4 text-text-secondary" />
      <div>
        <p className="text-xs text-text-secondary">{label}</p>
        <p className="text-sm text-text-primary">{value}</p>
      </div>
    </div>
  )
}

function RoleBadge({ role }: { role: string }) {
  const config: Record<string, { label: string; className: string }> = {
    user: { label: '사용자', className: 'bg-gray-500/10 text-gray-400' },
    admin: { label: '관리자', className: 'bg-blue-500/10 text-blue-400' },
    super_admin: { label: '최고 관리자', className: 'bg-purple-500/10 text-purple-400' },
  }

  const { label, className } = config[role] || config.user

  return (
    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${className}`}>
      <Shield className="w-3 h-3" />
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
    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${className}`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  )
}
