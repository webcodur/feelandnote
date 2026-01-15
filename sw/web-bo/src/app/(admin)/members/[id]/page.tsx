import { getMember } from '@/actions/admin/members'
import { getCelebProfessionLabel } from '@/constants/celebCategories'
import { notFound } from 'next/navigation'
import { ArrowLeft, Star, Users, Mail, Calendar, Clock, MapPin, Quote, BookOpen, BadgeCheck, CheckCircle, Ban, Shield } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import MemberActions from '../components/MemberActions'
import ProfileTypeSwitch from '../components/ProfileTypeSwitch'
import CelebForm from '../components/CelebForm'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function MemberDetailPage({ params }: PageProps) {
  const { id } = await params
  const member = await getMember(id)

  if (!member) notFound()

  const isUser = member.profile_type === 'USER'
  const isCeleb = member.profile_type === 'CELEB'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/members" className="p-2 hover:bg-bg-card rounded-lg"><ArrowLeft className="w-5 h-5 text-text-secondary" /></Link>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{isUser ? '사용자' : '셀럽'} 상세</h1>
          <p className="text-text-secondary mt-1">{member.email || member.nickname}</p>
        </div>
      </div>

      {/* Profile Card */}
      <div className="bg-bg-card border border-border rounded-lg p-6">
        <div className="flex items-start gap-6">
          {/* 프로필 이미지 - 셀럽은 중형(portrait_url), 일반 유저는 소형(avatar_url) */}
          <div className={`relative flex items-center justify-center overflow-hidden shrink-0 ${isCeleb ? 'w-32 h-32 rounded-xl bg-yellow-500/20' : 'w-24 h-24 rounded-full bg-accent/20'}`}>
            {(isCeleb ? (member.portrait_url || member.avatar_url) : member.avatar_url) ? (
              <Image src={(isCeleb ? (member.portrait_url || member.avatar_url) : member.avatar_url)!} alt="" fill unoptimized className="object-cover" />
            ) : isCeleb ? (
              <Star className="w-12 h-12 text-yellow-400" />
            ) : (
              <Users className="w-10 h-10 text-accent" />
            )}
          </div>

          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold text-text-primary">{member.nickname || '닉네임 없음'}</h2>
              {member.is_verified && <BadgeCheck className="w-5 h-5 text-blue-400" />}
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <ProfileTypeBadge type={member.profile_type} />
              {isUser && <RoleBadge role={member.role || 'user'} />}
              {isCeleb && member.profession && (
                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-500/10 text-gray-400">
                  {getCelebProfessionLabel(member.profession)}
                </span>
              )}
              {isCeleb && member.nationality && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-blue-500/10 text-blue-400">
                  <MapPin className="w-3 h-3" />{member.nationality}
                </span>
              )}
              <StatusBadge status={member.status} />
            </div>

            {member.bio && <p className="text-text-secondary">{member.bio}</p>}

            {isCeleb && member.quotes && (
              <div className="flex items-start gap-2 p-3 bg-accent/5 rounded-lg border border-accent/10">
                <Quote className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                <p className="text-sm text-text-secondary italic">"{member.quotes}"</p>
              </div>
            )}

            <div className="flex items-center gap-6 pt-2 text-text-secondary text-sm">
              <span className="flex items-center gap-1.5"><BookOpen className="w-4 h-4" />콘텐츠 {member.content_count}개</span>
              <span className="flex items-center gap-1.5"><Users className="w-4 h-4" />팔로워 {member.follower_count}명</span>
              {isUser && <span className="flex items-center gap-1.5"><Star className="w-4 h-4" />점수 {member.total_score || 0}</span>}
            </div>

            {isCeleb && (
              <Link href={`/members/${member.id}/contents`} className="text-sm text-accent hover:underline inline-block">
                콘텐츠 관리 →
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Profile Type Switch */}
      <ProfileTypeSwitch member={member} />

      {/* User Actions (사용자만) */}
      {isUser && (
        <div className="bg-bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4">관리 액션</h3>
          <MemberActions member={member} />

          {member.status === 'suspended' && member.suspended_at && (
            <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-sm font-medium text-red-400">정지 정보</p>
              <p className="text-xs text-text-secondary mt-1">정지일: {new Date(member.suspended_at).toLocaleDateString('ko-KR')}</p>
              {member.suspended_reason && <p className="text-xs text-text-secondary mt-1">사유: {member.suspended_reason}</p>}
            </div>
          )}
        </div>
      )}

      {/* Celeb Form (셀럽만) */}
      {isCeleb && <CelebForm mode="edit" celeb={member} />}

      {/* Account Info */}
      <div className="bg-bg-card border border-border rounded-lg p-6 space-y-4">
        <h3 className="text-lg font-semibold text-text-primary">계정 정보</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <InfoItem label="계정 ID" value={member.id} mono />
          {isUser && <InfoItem label="이메일" value={member.email || '-'} />}
          {isUser && <InfoItem label="가입일" value={new Date(member.created_at).toLocaleDateString('ko-KR')} />}
          {isUser && <InfoItem label="마지막 접속" value={member.last_seen_at ? new Date(member.last_seen_at).toLocaleDateString('ko-KR') : '-'} />}
          {isCeleb && <InfoItem label="인수 상태" value={member.claimed_by ? '인수됨' : '미인수'} />}
          {isCeleb && member.claimed_by && <InfoItem label="인수자 ID" value={member.claimed_by} mono />}
          {isCeleb && <InfoItem label="생성일" value={new Date(member.created_at).toLocaleString('ko-KR')} />}
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
      <p className={`text-text-primary ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  )
}

function ProfileTypeBadge({ type }: { type: string }) {
  const isUser = type === 'USER'
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${isUser ? 'bg-gray-500/10 text-gray-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
      {isUser ? <Users className="w-3 h-3" /> : <Star className="w-3 h-3" />}
      {isUser ? '일반' : '셀럽'}
    </span>
  )
}

function RoleBadge({ role }: { role: string }) {
  const config: Record<string, { label: string; className: string }> = {
    user: { label: '사용자', className: 'bg-gray-500/10 text-gray-400' },
    admin: { label: '관리자', className: 'bg-blue-500/10 text-blue-400' },
    super_admin: { label: '최고 관리자', className: 'bg-purple-500/10 text-purple-400' },
  }
  const { label, className } = config[role] || config.user
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
// #endregion
