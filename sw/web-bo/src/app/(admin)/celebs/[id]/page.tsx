import { getCeleb } from '@/actions/admin/celebs'
import { getCelebProfessionLabel } from '@/constants/celebCategories'
import { notFound } from 'next/navigation'
import { ArrowLeft, Star, BookOpen, Users, BadgeCheck, CheckCircle, Ban } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import CelebForm from '../components/CelebForm'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function CelebDetailPage({ params }: PageProps) {
  const { id } = await params
  const celeb = await getCeleb(id)

  if (!celeb) {
    notFound()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/celebs" className="text-text-secondary hover:text-text-primary">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <span className="text-text-secondary">목록으로</span>
      </div>

      {/* Profile Card */}
      <div className="bg-bg-card border border-border rounded-lg p-6">
        <div className="flex items-start gap-6">
          {/* Avatar */}
          <div className="relative w-24 h-24 rounded-full bg-yellow-500/20 flex items-center justify-center overflow-hidden shrink-0">
            {celeb.avatar_url ? (
              <Image src={celeb.avatar_url} alt="" fill unoptimized className="object-cover" />
            ) : (
              <Star className="w-10 h-10 text-yellow-400" />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-text-primary">
                {celeb.nickname || '닉네임 없음'}
              </h1>
              {celeb.is_verified && <BadgeCheck className="w-5 h-5 text-blue-400" />}
            </div>

            <div className="flex items-center gap-4 text-sm text-text-secondary">
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-gray-500/10">
                {getCelebProfessionLabel(celeb.profession)}
              </span>
              <StatusBadge status={celeb.status} />
            </div>

            {celeb.bio && <p className="text-text-secondary">{celeb.bio}</p>}

            {/* Stats */}
            <div className="flex items-center gap-6 pt-2">
              <div className="flex items-center gap-2 text-text-secondary">
                <BookOpen className="w-4 h-4" />
                <span>콘텐츠 {celeb.content_count}개</span>
              </div>
              <div className="flex items-center gap-2 text-text-secondary">
                <Users className="w-4 h-4" />
                <span>팔로워 {celeb.follower_count}명</span>
              </div>
            </div>

            {/* Quick Links */}
            <div className="pt-2">
              <Link
                href={`/celebs/${celeb.id}/contents`}
                className="text-sm text-accent hover:underline"
              >
                콘텐츠 관리 →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Form */}
      <CelebForm mode="edit" celeb={celeb} />

      {/* Account Info */}
      <div className="bg-bg-card border border-border rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold text-text-primary">계정 정보</h2>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-text-secondary">계정 ID</span>
            <p className="text-text-primary font-mono">{celeb.id}</p>
          </div>
          <div>
            <span className="text-text-secondary">인수 상태</span>
            <p className="text-text-primary">{celeb.claimed_by ? '인수됨' : '미인수'}</p>
          </div>
          {celeb.claimed_by && (
            <div>
              <span className="text-text-secondary">인수자 ID</span>
              <p className="text-text-primary font-mono">{celeb.claimed_by}</p>
            </div>
          )}
          <div>
            <span className="text-text-secondary">생성일</span>
            <p className="text-text-primary">
              {new Date(celeb.created_at).toLocaleString('ko-KR')}
            </p>
          </div>
        </div>
      </div>
    </div>
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
