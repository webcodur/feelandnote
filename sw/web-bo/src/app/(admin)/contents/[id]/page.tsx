import { getContent } from '@/actions/admin/contents'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowLeft,
  Library,
  Users,
  Calendar,
  Building2,
  FileText,
  Book,
  Film,
  Gamepad2,
  Music,
  Award,
} from 'lucide-react'
import ContentActions from './ContentActions'

const CONTENT_TYPES = {
  BOOK: { label: '도서', icon: Book, color: 'text-blue-400', bgColor: 'bg-blue-500/10' },
  VIDEO: { label: '영상', icon: Film, color: 'text-red-400', bgColor: 'bg-red-500/10' },
  GAME: { label: '게임', icon: Gamepad2, color: 'text-green-400', bgColor: 'bg-green-500/10' },
  MUSIC: { label: '음악', icon: Music, color: 'text-purple-400', bgColor: 'bg-purple-500/10' },
  CERTIFICATE: { label: '자격증', icon: Award, color: 'text-yellow-400', bgColor: 'bg-yellow-500/10' },
}

const STATUS_CONFIG = {
  WANT: { label: '예정', color: 'bg-yellow-500/10 text-yellow-400' },
  WATCHING: { label: '진행중', color: 'bg-green-500/10 text-green-400' },
  FINISHED: { label: '완료', color: 'bg-purple-500/10 text-purple-400' },
  DROPPED: { label: '중단', color: 'bg-red-500/10 text-red-400' },
  RECOMMENDED: { label: '추천', color: 'bg-blue-500/10 text-blue-400' },
  NOT_RECOMMENDED: { label: '비추천', color: 'bg-gray-500/10 text-gray-400' },
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ContentDetailPage({ params }: PageProps) {
  const { id } = await params
  const content = await getContent(id)

  if (!content) {
    notFound()
  }

  const typeConfig = CONTENT_TYPES[content.type as keyof typeof CONTENT_TYPES]
  const TypeIcon = typeConfig?.icon || Library

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/contents"
          className="p-2 hover:bg-bg-card rounded-lg"
        >
          <ArrowLeft className="w-5 h-5 text-text-secondary" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">콘텐츠 상세</h1>
          <p className="text-text-secondary mt-1">{content.title}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Content Card */}
        <div className="lg:col-span-1">
          <div className="bg-bg-card border border-border rounded-xl p-6">
            <div className="text-center">
              <div className="relative w-32 h-44 mx-auto rounded-lg bg-bg-secondary flex items-center justify-center overflow-hidden">
                {content.thumbnail_url ? (
                  <Image src={content.thumbnail_url} alt="" fill unoptimized className="object-cover" />
                ) : (
                  <TypeIcon className="w-12 h-12 text-text-secondary" />
                )}
              </div>

              <h2 className="mt-4 text-lg font-semibold text-text-primary line-clamp-2">
                {content.title}
              </h2>

              {content.creator && (
                <p className="text-text-secondary text-sm mt-1">{content.creator}</p>
              )}

              <div className="mt-4">
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${typeConfig?.bgColor} ${typeConfig?.color}`}>
                  <TypeIcon className="w-3 h-3" />
                  {typeConfig?.label || content.type}
                </span>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-border space-y-4">
              <InfoRow icon={Users} label="등록 사용자" value={`${content.user_count}명`} />
              {content.publisher && (
                <InfoRow icon={Building2} label="출판/제작" value={content.publisher} />
              )}
              {content.release_date && (
                <InfoRow icon={Calendar} label="출시일" value={content.release_date} />
              )}
              <InfoRow
                icon={Calendar}
                label="등록일"
                value={new Date(content.created_at).toLocaleDateString('ko-KR')}
              />
            </div>

            {content.description && (
              <div className="mt-6 pt-6 border-t border-border">
                <p className="text-xs text-text-secondary mb-2">설명</p>
                <p className="text-sm text-text-primary">{content.description}</p>
              </div>
            )}
          </div>
        </div>

        {/* Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Actions */}
          <div className="bg-bg-card border border-border rounded-xl p-6">
            <h3 className="text-lg font-semibold text-text-primary mb-4">관리 액션</h3>
            <ContentActions content={content} />
          </div>

          {/* Users who have this content */}
          <div className="bg-bg-card border border-border rounded-xl p-6">
            <h3 className="text-lg font-semibold text-text-primary mb-4">등록한 사용자</h3>
            {content.users.length === 0 ? (
              <p className="text-text-secondary text-center py-4">등록한 사용자가 없습니다</p>
            ) : (
              <div className="space-y-3">
                {content.users.map((user) => (
                  <Link
                    key={user.id}
                    href={`/users/${user.id}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-bg-secondary"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center overflow-hidden">
                        {user.avatar_url ? (
                          <Image src={user.avatar_url} alt="" fill unoptimized className="object-cover" />
                        ) : (
                          <Users className="w-5 h-5 text-accent" />
                        )}
                      </div>
                      <span className="text-sm font-medium text-text-primary">
                        {user.nickname || '닉네임 없음'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_CONFIG[user.status as keyof typeof STATUS_CONFIG]?.color || 'bg-gray-500/10 text-gray-400'}`}>
                        {STATUS_CONFIG[user.status as keyof typeof STATUS_CONFIG]?.label || user.status}
                      </span>
                      <span className="text-xs text-text-secondary">
                        {new Date(user.created_at).toLocaleDateString('ko-KR')}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Records */}
          <div className="bg-bg-card border border-border rounded-xl p-6">
            <h3 className="text-lg font-semibold text-text-primary mb-4">관련 기록</h3>
            {content.records.length === 0 ? (
              <p className="text-text-secondary text-center py-4">관련 기록이 없습니다</p>
            ) : (
              <div className="space-y-3">
                {content.records.map((record) => (
                  <Link
                    key={record.id}
                    href={`/records/${record.id}`}
                    className="block p-3 rounded-lg hover:bg-bg-secondary"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <FileText className="w-3.5 h-3.5 text-text-secondary" />
                          <span className="text-xs text-text-secondary">
                            {record.type === 'NOTE' ? '노트' : '인용'}
                          </span>
                          <span className="text-xs text-text-secondary">·</span>
                          <span className="text-xs text-text-secondary">
                            {record.user.nickname || '알 수 없음'}
                          </span>
                        </div>
                        <p className="text-sm text-text-primary line-clamp-2">
                          {record.content}
                        </p>
                      </div>
                      <span className="text-xs text-text-secondary flex-shrink-0">
                        {new Date(record.created_at).toLocaleDateString('ko-KR')}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
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
