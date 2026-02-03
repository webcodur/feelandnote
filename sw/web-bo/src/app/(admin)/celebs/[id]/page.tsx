import type { Metadata } from 'next'
import { getMember } from '@/actions/admin/members'
import { getCelebProfessionLabel } from '@/constants/celebCategories'
import { notFound } from 'next/navigation'
import { ArrowLeft, Star, Users, Quote, BookOpen, BadgeCheck, CheckCircle, Ban } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import CelebForm from '../../members/components/CelebForm'
import NationalityBadge from '../../members/components/NationalityBadge'
import ProjectRulesButton from '../../members/components/ProjectRulesButton'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const celeb = await getMember(id)
  return {
    title: celeb ? `${celeb.nickname} 상세` : '셀럽 상세',
  }
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function CelebDetailPage({ params }: PageProps) {
  const { id } = await params
  const celeb = await getMember(id)

  if (!celeb || celeb.profile_type !== 'CELEB') notFound()

  return (
    <div className="space-y-6">
      {/* Profile Card */}
      <div className="bg-bg-card border border-border rounded-lg p-6">
        <div className="flex justify-between mb-4">
          <Link href="/celebs" className="p-2 hover:bg-bg-secondary rounded-lg">
            <ArrowLeft className="w-5 h-5 text-text-secondary" />
          </Link>
          <ProjectRulesButton celebName={celeb.nickname || undefined} />
        </div>

        <div className="flex items-start gap-6">
          <div className="relative w-32 h-32 rounded-xl flex items-center justify-center overflow-hidden shrink-0 bg-yellow-500/20">
            {(celeb.portrait_url || celeb.avatar_url) ? (
              <Image src={celeb.portrait_url || celeb.avatar_url!} alt="" fill unoptimized className="object-cover" />
            ) : (
              <Star className="w-12 h-12 text-yellow-400" />
            )}
          </div>

          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold text-text-primary">{celeb.nickname || '이름 없음'}</h2>
              {celeb.is_verified && <BadgeCheck className="w-5 h-5 text-blue-400" />}
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {celeb.title && (
                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-accent/10 text-accent border border-accent/20">
                  {celeb.title}
                </span>
              )}
              {celeb.profession && (
                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-500/10 text-gray-400">
                  {getCelebProfessionLabel(celeb.profession)}
                </span>
              )}
              {celeb.nationality && <NationalityBadge code={celeb.nationality} />}
              <StatusBadge status={celeb.status} />
            </div>

            {celeb.bio && <p className="text-text-secondary">{celeb.bio}</p>}

            {celeb.quotes && (
              <div className="flex items-start gap-2 p-3 bg-accent/5 rounded-lg border border-accent/10">
                <Quote className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                <p className="text-sm text-text-secondary italic">"{celeb.quotes}"</p>
              </div>
            )}

            <div className="flex items-center gap-6 pt-2 text-text-secondary text-sm">
              <span className="flex items-center gap-1.5"><BookOpen className="w-4 h-4" />콘텐츠 {celeb.content_count}개</span>
              <span className="flex items-center gap-1.5"><Users className="w-4 h-4" />팔로워 {celeb.follower_count}명</span>
            </div>

            <Link href={`/celebs/${celeb.id}/contents`} className="text-sm text-accent hover:underline inline-block">
              콘텐츠 관리 →
            </Link>
          </div>
        </div>
      </div>

      {/* Celeb Form */}
      <CelebForm mode="edit" celeb={celeb} />

      {/* Account Info */}
      <div className="bg-bg-card border border-border rounded-lg p-6 space-y-4">
        <h3 className="text-lg font-semibold text-text-primary">계정 정보</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <InfoItem label="계정 ID" value={celeb.id} mono />
          <InfoItem label="인수 상태" value={celeb.claimed_by ? '인수됨' : '미인수'} />
          {celeb.claimed_by && <InfoItem label="인수자 ID" value={celeb.claimed_by} mono />}
          <InfoItem label="생성일" value={new Date(celeb.created_at).toLocaleString('ko-KR')} />
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
