import type { Metadata } from 'next'
import { getContent } from '@/actions/admin/contents'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const content = await getContent(id)
  return {
    title: content ? `${content.title}` : '콘텐츠 상세',
  }
}
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Library, Users, Calendar, Building2, FileText, Hash, Database, Image as ImageIcon } from 'lucide-react'
import ContentActions from './ContentActions'
import { CONTENT_TYPE_CONFIG, type ContentType } from '@/constants/contentTypes'
import { STATUS_CONFIG, type ContentStatus } from '@/constants/statuses'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ContentDetailPage({ params }: PageProps) {
  const { id } = await params
  const content = await getContent(id)

  if (!content) {
    notFound()
  }

  const typeConfig = CONTENT_TYPE_CONFIG[content.type as keyof typeof CONTENT_TYPE_CONFIG]
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
              <InfoRow icon={Hash} label="콘텐츠 ID" value={content.id} mono />
              {content.external_source && (
                <InfoRow icon={Database} label="외부 소스" value={content.external_source} />
              )}
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
              {content.thumbnail_url && (
                <div className="flex items-start gap-3">
                  <ImageIcon className="w-4 h-4 text-text-secondary mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-text-secondary">썸네일 URL</p>
                    <p className="text-xs text-text-primary font-mono break-all">{content.thumbnail_url}</p>
                  </div>
                </div>
              )}
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
                      <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_CONFIG[user.status as ContentStatus]?.bgColor || 'bg-gray-500/10'} ${STATUS_CONFIG[user.status as ContentStatus]?.color || 'text-gray-400'}`}>
                        {STATUS_CONFIG[user.status as ContentStatus]?.label || user.status}
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
  mono,
}: {
  icon: React.ElementType
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="w-4 h-4 text-text-secondary" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-text-secondary">{label}</p>
        <p className={`text-sm text-text-primary break-all ${mono ? 'font-mono text-xs' : ''}`}>{value}</p>
      </div>
    </div>
  )
}
