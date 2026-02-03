import type { Metadata } from 'next'
import { getMember } from '@/actions/admin/members'
import { notFound } from 'next/navigation'
import { ArrowLeft, Users, Mail, BookOpen, BadgeCheck, CheckCircle, Ban, Shield, Star } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import MemberActions from '../../members/components/MemberActions'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const member = await getMember(id)
  return {
    title: member ? `${member.nickname} 상세` : '유저 상세',
  }
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function UserDetailPage({ params }: PageProps) {
  const { id } = await params
  const user = await getMember(id)

  if (!user || user.profile_type === 'CELEB') notFound()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/users" className="p-2 hover:bg-bg-card rounded-lg">
          <ArrowLeft className="w-5 h-5 text-text-secondary" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">유저 상세</h1>
          <p className="text-text-secondary mt-1">{user.email || user.nickname}</p>
        </div>
      </div>

      {/* Profile Card */}
      <div className="bg-bg-card border border-border rounded-lg p-6">
        <div className="flex items-start gap-6">
          <div className="relative w-24 h-24 rounded-full flex items-center justify-center overflow-hidden shrink-0 bg-accent/20">
            {user.avatar_url ? (
              <Image src={user.avatar_url} alt="" fill unoptimized className="object-cover" />
            ) : (
              <Users className="w-10 h-10 text-accent" />
            )}
          </div>

          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold text-text-primary">{user.nickname || '닉네임 없음'}</h2>
              {user.is_verified && <BadgeCheck className="w-5 h-5 text-blue-400" />}
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <RoleBadge role={user.role || 'user'} />
              <StatusBadge status={user.status} />
            </div>

            {user.bio && <p className="text-text-secondary">{user.bio}</p>}

            <div className="flex items-center gap-6 pt-2 text-text-secondary text-sm">
              <span className="flex items-center gap-1.5"><BookOpen className="w-4 h-4" />콘텐츠 {user.content_count}개</span>
              <span className="flex items-center gap-1.5"><Users className="w-4 h-4" />팔로워 {user.follower_count}명</span>
              <span className="flex items-center gap-1.5"><Star className="w-4 h-4" />점수 {user.total_score || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* User Actions */}
      <div className="bg-bg-card border border-border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4">관리 액션</h3>
        <MemberActions member={user} />

        {user.status === 'suspended' && user.suspended_at && (
          <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-sm font-medium text-red-400">정지 정보</p>
            <p className="text-xs text-text-secondary mt-1">
              정지일: {new Date(user.suspended_at).toLocaleDateString('ko-KR')}
            </p>
            {user.suspended_reason && (
              <p className="text-xs text-text-secondary mt-1">사유: {user.suspended_reason}</p>
            )}
          </div>
        )}
      </div>

      {/* Account Info */}
      <div className="bg-bg-card border border-border rounded-lg p-6 space-y-4">
        <h3 className="text-lg font-semibold text-text-primary">계정 정보</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <InfoItem label="계정 ID" value={user.id} mono />
          <InfoItem label="이메일" value={user.email || '-'} />
          <InfoItem label="가입일" value={new Date(user.created_at).toLocaleDateString('ko-KR')} />
          <InfoItem label="마지막 접속" value={user.last_seen_at ? new Date(user.last_seen_at).toLocaleDateString('ko-KR') : '-'} />
        </div>
      </div>
    </div>
  )
}

// #region Helper Components
function InfoItem({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <span className="text-text-secondary">{label}</span>
      <p className={`text-text-primary ${mono ? 'font-mono text-xs' : ''}`}>{value}</p>
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
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${className}`}>
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
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${className}`}>
      <Icon className="w-3 h-3" />{label}
    </span>
  )
}
// #endregion
