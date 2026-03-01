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
import { ArrowLeft, Library, Users, FileText } from 'lucide-react'
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
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-14 rounded bg-bg-secondary flex items-center justify-center overflow-hidden shrink-0">
            {content.thumbnail_url ? (
              <Image src={content.thumbnail_url} alt="" fill unoptimized className="object-cover" />
            ) : (
              <TypeIcon className="w-5 h-5 text-text-secondary" />
            )}
          </div>
          <div>
            <h1 className="text-xl font-bold text-text-primary leading-tight">{content.title}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              {content.creator && (
                <span className="text-sm text-text-secondary">{content.creator}</span>
              )}
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${typeConfig?.bgColor} ${typeConfig?.color}`}>
                <TypeIcon className="w-2.5 h-2.5" />
                {typeConfig?.label || content.type}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 정보 그리드 — 2열 수평 */}
      <div className="bg-bg-card border border-border rounded-xl p-5">
        <div className="grid grid-cols-2 gap-x-8 gap-y-2">
          <Field label="contents.id" value={content.id} mono />
          {content.external_id && (
            <Field label="external_id" value={content.external_id} mono />
          )}
          <Field label="user_count" value={`${content.user_count}명`} />
          {content.external_source && (
            <Field label="external_source" value={content.external_source} />
          )}
          {content.publisher && (
            <Field label="publisher" value={content.publisher} />
          )}
          {content.release_date && (
            <Field label="release_date" value={content.release_date} />
          )}
          <Field label="created_at" value={new Date(content.created_at).toLocaleDateString('ko-KR')} />
          {content.thumbnail_url && (
            <div className="col-span-2">
              <Field label="thumbnail_url" value={content.thumbnail_url} mono />
            </div>
          )}
        </div>

        {/* 에디션 (BOOK) */}
        {content.editions.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border">
            <span className="text-xs font-medium text-text-secondary font-mono">editions</span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              {content.editions.map((ed) => (
                <div key={ed.locale} className="flex gap-3 p-3 bg-bg-secondary rounded-lg">
                  <div className="relative w-12 h-16 rounded bg-bg-card flex items-center justify-center overflow-hidden shrink-0">
                    {ed.thumbnail_url ? (
                      <Image src={ed.thumbnail_url} alt="" fill unoptimized className="object-cover" />
                    ) : (
                      <span className="text-xs text-text-tertiary">—</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-accent/10 text-accent">
                        {ed.locale.toUpperCase()}
                      </span>
                      <p className="text-sm font-medium text-text-primary truncate">{ed.title || '—'}</p>
                    </div>
                    <p className="text-xs text-text-secondary truncate">{ed.creator || '—'}</p>
                    {ed.isbn && <p className="text-[10px] font-mono text-text-tertiary">ISBN {ed.isbn}</p>}
                    {ed.publisher && <p className="text-[10px] text-text-tertiary">{ed.publisher}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* i18n 필드 (에디션 없는 콘텐츠) */}
        {content.editions.length === 0 && (content.title_ko || content.title_en) && (
          <div className="mt-4 pt-4 border-t border-border">
            <span className="text-xs font-medium text-text-secondary">다국어 제목</span>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 mt-2">
              <Field label="🇰🇷 제목" value={content.title_ko || '—'} />
              <Field label="🇺🇸 제목" value={content.title_en || '—'} />
            </div>
          </div>
        )}

        {content.description && (
          <div className="mt-4 pt-4 border-t border-border">
            <span className="text-xs text-text-secondary">설명</span>
            <p className="text-sm text-text-primary mt-1">{content.description}</p>
          </div>
        )}

        {/* 제휴 링크 */}
        {content.affiliate_url && content.affiliate_url.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border">
            <span className="text-xs text-text-secondary">제휴 링크</span>
            <div className="flex flex-wrap gap-2 mt-1">
              {content.affiliate_url.map((link, i) => (
                <a
                  key={i}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-accent hover:underline"
                >
                  <span className="font-medium text-text-secondary bg-bg-secondary px-1.5 py-0.5 rounded text-[10px]">
                    {link.platform}
                  </span>
                  <span className="truncate max-w-[300px]">{link.url}</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 관리 액션 */}
        <div className="bg-bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-3">관리 액션</h3>
          <ContentActions content={content} />
        </div>

        {/* 등록한 사용자 */}
        <div className="bg-bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-3">등록한 사용자</h3>
          {content.users.length === 0 ? (
            <p className="text-text-secondary text-center py-4 text-sm">등록한 사용자가 없습니다</p>
          ) : (
            <div className="space-y-1">
              {content.users.map((user) => (
                <Link
                  key={user.id}
                  href={`/users/${user.id}`}
                  className="flex items-center justify-between py-2 px-2 rounded hover:bg-bg-secondary"
                >
                  <div className="flex items-center gap-2">
                    <div className="relative w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center overflow-hidden">
                      {user.avatar_url ? (
                        <Image src={user.avatar_url} alt="" fill unoptimized className="object-cover" />
                      ) : (
                        <Users className="w-3.5 h-3.5 text-accent" />
                      )}
                    </div>
                    <span className="text-sm text-text-primary">
                      {user.nickname || '닉네임 없음'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${STATUS_CONFIG[user.status as ContentStatus]?.bgColor || 'bg-gray-500/10'} ${STATUS_CONFIG[user.status as ContentStatus]?.color || 'text-gray-400'}`}>
                      {STATUS_CONFIG[user.status as ContentStatus]?.label || user.status}
                    </span>
                    <span className="text-[10px] text-text-tertiary">
                      {new Date(user.created_at).toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* 관련 기록 */}
        <div className="lg:col-span-2 bg-bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-3">관련 기록</h3>
          {content.records.length === 0 ? (
            <p className="text-text-secondary text-center py-4 text-sm">관련 기록이 없습니다</p>
          ) : (
            <div className="space-y-1">
              {content.records.map((record) => (
                <Link
                  key={record.id}
                  href={`/records/${record.id}`}
                  className="flex items-start justify-between gap-4 py-2 px-2 rounded hover:bg-bg-secondary"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <FileText className="w-3 h-3 text-text-secondary" />
                      <span className="text-[10px] text-text-tertiary">
                        {record.type === 'NOTE' ? '노트' : '인용'} · {record.user.nickname || '알 수 없음'}
                      </span>
                    </div>
                    <p className="text-sm text-text-primary line-clamp-1">{record.content}</p>
                  </div>
                  <span className="text-[10px] text-text-tertiary shrink-0">
                    {new Date(record.created_at).toLocaleDateString('ko-KR')}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline gap-3 py-1">
      <span className="text-xs text-text-secondary shrink-0 w-20">{label}</span>
      <span className={`text-sm text-text-primary truncate ${mono ? 'font-mono text-xs' : ''}`}>{value}</span>
    </div>
  )
}
