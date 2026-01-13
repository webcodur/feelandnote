import { getRecord, getRecordComments } from '@/actions/admin/records'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowLeft,
  Users,
  Calendar,
  Library,
  Heart,
  MessageCircle,
  Globe,
  Lock,
  UserCheck,
  StickyNote,
  Quote,
  Link as LinkIcon,
  MapPin,
} from 'lucide-react'
import RecordActions from './RecordActions'

const TYPE_CONFIG = {
  NOTE: { label: '노트', icon: StickyNote, color: 'text-blue-400', bgColor: 'bg-blue-500/10' },
  QUOTE: { label: '인용', icon: Quote, color: 'text-purple-400', bgColor: 'bg-purple-500/10' },
}

const VISIBILITY_CONFIG = {
  public: { label: '공개', icon: Globe, color: 'bg-green-500/10 text-green-400' },
  followers: { label: '팔로워', icon: UserCheck, color: 'bg-blue-500/10 text-blue-400' },
  private: { label: '비공개', icon: Lock, color: 'bg-gray-500/10 text-gray-400' },
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function RecordDetailPage({ params }: PageProps) {
  const { id } = await params
  const record = await getRecord(id)

  if (!record) {
    notFound()
  }

  const comments = await getRecordComments(id)
  const typeConfig = TYPE_CONFIG[record.type as keyof typeof TYPE_CONFIG]
  const visibilityConfig = VISIBILITY_CONFIG[record.visibility as keyof typeof VISIBILITY_CONFIG]
  const TypeIcon = typeConfig?.icon || StickyNote
  const VisibilityIcon = visibilityConfig?.icon || Globe

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/records"
          className="p-2 hover:bg-bg-card rounded-lg"
        >
          <ArrowLeft className="w-5 h-5 text-text-secondary" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">기록 상세</h1>
          <p className="text-text-secondary mt-1">
            {typeConfig?.label || record.type} · {record.user?.nickname || '알 수 없음'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Record Info */}
        <div className="lg:col-span-1 space-y-6">
          {/* User Card */}
          <div className="bg-bg-card border border-border rounded-xl p-6">
            <h3 className="text-sm font-medium text-text-secondary mb-4">작성자</h3>
            <Link
              href={`/users/${record.user_id}`}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-bg-secondary"
            >
              <div className="relative w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center overflow-hidden">
                {record.user?.avatar_url ? (
                  <Image src={record.user.avatar_url} alt="" fill unoptimized className="object-cover" />
                ) : (
                  <Users className="w-6 h-6 text-accent" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-text-primary">
                  {record.user?.nickname || '닉네임 없음'}
                </p>
                <p className="text-xs text-text-secondary">{record.user?.email || '-'}</p>
              </div>
            </Link>
          </div>

          {/* Content Card */}
          {record.content_info && (
            <div className="bg-bg-card border border-border rounded-xl p-6">
              <h3 className="text-sm font-medium text-text-secondary mb-4">연결된 콘텐츠</h3>
              <Link
                href={`/contents/${record.content_id}`}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-bg-secondary"
              >
                <div className="relative w-12 h-16 rounded bg-bg-secondary flex items-center justify-center overflow-hidden flex-shrink-0">
                  {record.content_info.thumbnail_url ? (
                    <Image src={record.content_info.thumbnail_url} alt="" fill unoptimized className="object-cover" />
                  ) : (
                    <Library className="w-5 h-5 text-text-secondary" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-primary line-clamp-2">
                    {record.content_info.title}
                  </p>
                  <p className="text-xs text-text-secondary">{record.content_info.type}</p>
                </div>
              </Link>
            </div>
          )}

          {/* Stats */}
          <div className="bg-bg-card border border-border rounded-xl p-6">
            <h3 className="text-sm font-medium text-text-secondary mb-4">통계</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-bg-secondary rounded-lg">
                <Heart className="w-5 h-5 mx-auto text-red-400 mb-1" />
                <p className="text-lg font-semibold text-text-primary">{record.like_count}</p>
                <p className="text-xs text-text-secondary">좋아요</p>
              </div>
              <div className="text-center p-3 bg-bg-secondary rounded-lg">
                <MessageCircle className="w-5 h-5 mx-auto text-blue-400 mb-1" />
                <p className="text-lg font-semibold text-text-primary">{record.comment_count}</p>
                <p className="text-xs text-text-secondary">댓글</p>
              </div>
            </div>
          </div>
        </div>

        {/* Content & Actions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Record Content */}
          <div className="bg-bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${typeConfig?.bgColor} ${typeConfig?.color}`}>
                  <TypeIcon className="w-3 h-3" />
                  {typeConfig?.label || record.type}
                </span>
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${visibilityConfig?.color}`}>
                  <VisibilityIcon className="w-3 h-3" />
                  {visibilityConfig?.label || record.visibility}
                </span>
              </div>
              <span className="text-xs text-text-secondary">
                {new Date(record.created_at).toLocaleString('ko-KR')}
              </span>
            </div>

            <div className="prose prose-invert max-w-none">
              <p className="text-text-primary whitespace-pre-wrap">{record.content}</p>
            </div>

            {/* Meta info */}
            <div className="mt-4 pt-4 border-t border-border flex flex-wrap gap-4">
              {record.location && (
                <div className="flex items-center gap-1 text-sm text-text-secondary">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{record.location}</span>
                </div>
              )}
              {record.source_url && (
                <a
                  href={record.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-accent hover:underline"
                >
                  <LinkIcon className="w-3.5 h-3.5" />
                  <span>출처 링크</span>
                </a>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="bg-bg-card border border-border rounded-xl p-6">
            <h3 className="text-lg font-semibold text-text-primary mb-4">관리 액션</h3>
            <RecordActions record={record} />
          </div>

          {/* Comments */}
          <div className="bg-bg-card border border-border rounded-xl p-6">
            <h3 className="text-lg font-semibold text-text-primary mb-4">
              댓글 ({comments.length})
            </h3>
            {comments.length === 0 ? (
              <p className="text-text-secondary text-center py-4">댓글이 없습니다</p>
            ) : (
              <div className="space-y-4">
                {comments.map((comment) => {
                  const profiles = comment.profiles as { nickname: string | null; avatar_url: string | null }[] | { nickname: string | null; avatar_url: string | null } | null
                  const profile = Array.isArray(profiles) ? profiles[0] : profiles
                  return (
                    <div key={comment.id} className="flex gap-3">
                      <div className="relative w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {profile?.avatar_url ? (
                          <Image src={profile.avatar_url} alt="" fill unoptimized className="object-cover" />
                        ) : (
                          <Users className="w-4 h-4 text-accent" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-text-primary">
                            {profile?.nickname || '알 수 없음'}
                          </span>
                          <span className="text-xs text-text-secondary">
                            {new Date(comment.created_at).toLocaleString('ko-KR')}
                          </span>
                        </div>
                        <p className="text-sm text-text-primary">{comment.content}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
