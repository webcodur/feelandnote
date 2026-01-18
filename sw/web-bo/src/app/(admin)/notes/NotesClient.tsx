'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  StickyNote,
  Clock,
  Eye,
  EyeOff,
  Users,
  Lock,
  FileText,
  Trash2,
  CheckCircle,
} from 'lucide-react'
import {
  PageHeader,
  Badge,
  Avatar,
  FilterChips,
  Pagination,
  Drawer,
  ConfirmDialog,
  ActionDropdown,
  EmptyState,
  Button,
} from '@/components/ui'

const VISIBILITY_CONFIG = {
  public: { label: '공개', icon: Eye, variant: 'success' as const },
  followers: { label: '팔로워', icon: Users, variant: 'info' as const },
  private: { label: '비공개', icon: Lock, variant: 'warning' as const },
}

interface Note {
  id: string
  user_id: string
  content_id: string
  visibility: 'public' | 'followers' | 'private'
  snapshot: Record<string, unknown> | null
  template: Record<string, unknown> | null
  created_at: string
  updated_at: string
  user: { id: string; nickname: string | null; avatar_url: string | null } | null
  content: {
    id: string
    title: string
    type: string
    thumbnail_url: string | null
  } | null
  sections: { id: string; title: string; is_completed: boolean }[]
}

interface Props {
  notes: Note[]
  total: number
  page: number
  totalPages: number
  visibilityFilter: string
  filterOptions: { value: string; label: string; count: number }[]
}

export default function NotesClient({
  notes,
  total,
  page,
  totalPages,
  visibilityFilter,
  filterOptions,
}: Props) {
  const router = useRouter()
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Note | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    await new Promise((resolve) => setTimeout(resolve, 500))
    setIsDeleting(false)
    setDeleteTarget(null)
    router.refresh()
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <PageHeader
        title="노트 관리"
        description={`총 ${total.toLocaleString()}개의 노트`}
      />

      <FilterChips
        options={filterOptions}
        value={visibilityFilter}
        href={(value) => `/notes${value ? `?visibility=${value}` : ''}`}
      />

      {/* 카드 그리드 */}
      {notes.length === 0 ? (
        <div className="bg-bg-card border border-border rounded-xl">
          <EmptyState
            icon={StickyNote}
            title="노트가 없습니다"
            description="아직 작성된 노트가 없습니다"
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {notes.map((note) => {
            const visibilityConfig = VISIBILITY_CONFIG[note.visibility]
            const VisibilityIcon = visibilityConfig.icon
            const completedCount = note.sections.filter((s) => s.is_completed).length

            return (
              <div
                key={note.id}
                className="bg-bg-card border border-border rounded-xl p-4 hover:border-accent/50 transition-colors cursor-pointer group"
                onClick={() => setSelectedNote(note)}
              >
                {/* 헤더 - 사용자 */}
                <div className="flex items-center justify-between mb-3">
                  <Link
                    href={`/members/${note.user?.id}`}
                    className="flex items-center gap-2 hover:text-accent"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Avatar
                      src={note.user?.avatar_url}
                      name={note.user?.nickname}
                      size="sm"
                    />
                    <span className="text-sm text-text-primary">
                      {note.user?.nickname || '알 수 없음'}
                    </span>
                  </Link>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={visibilityConfig.variant}
                      icon={<VisibilityIcon className="w-3 h-3" />}
                      size="sm"
                    >
                      {visibilityConfig.label}
                    </Badge>
                    <ActionDropdown
                      items={[
                        {
                          key: 'view',
                          label: '상세보기',
                          icon: Eye,
                          onClick: () => setSelectedNote(note),
                        },
                        {
                          key: 'delete',
                          label: '삭제',
                          icon: Trash2,
                          variant: 'danger',
                          onClick: () => setDeleteTarget(note),
                        },
                      ]}
                    />
                  </div>
                </div>

                {/* 콘텐츠 정보 */}
                {note.content && (
                  <div className="flex items-center gap-3 p-3 bg-bg-secondary rounded-lg mb-3">
                    {note.content.thumbnail_url && (
                      <div className="relative w-10 h-14 rounded overflow-hidden flex-shrink-0">
                        <Image
                          src={note.content.thumbnail_url}
                          alt=""
                          fill
                          unoptimized
                          className="object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">
                        {note.content.title}
                      </p>
                      <p className="text-xs text-text-secondary">
                        {note.content.type}
                      </p>
                    </div>
                  </div>
                )}

                {/* 섹션 진행률 */}
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs text-text-secondary mb-1.5">
                    <span className="flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5" />
                      섹션 진행률
                    </span>
                    <span>
                      {completedCount}/{note.sections.length}
                    </span>
                  </div>
                  <div className="h-1.5 bg-bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent rounded-full transition-all"
                      style={{
                        width: `${note.sections.length > 0 ? (completedCount / note.sections.length) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>

                {/* 시간 */}
                <div className="flex items-center gap-1 text-xs text-text-secondary">
                  <Clock className="w-3 h-3" />
                  <span>{formatDate(note.updated_at)}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Pagination
        page={page}
        totalPages={totalPages}
        href={(p) =>
          `/notes?page=${p}${visibilityFilter ? `&visibility=${visibilityFilter}` : ''}`
        }
      />

      {/* 상세보기 Drawer */}
      <Drawer
        isOpen={!!selectedNote}
        onClose={() => setSelectedNote(null)}
        title="노트 상세"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setSelectedNote(null)}>
              닫기
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setDeleteTarget(selectedNote)
                setSelectedNote(null)
              }}
            >
              <Trash2 className="w-4 h-4" />
              삭제
            </Button>
          </>
        }
      >
        {selectedNote && (
          <div className="space-y-6">
            {/* 사용자 정보 */}
            <div className="flex items-center gap-4 p-4 bg-bg-secondary rounded-xl">
              <Avatar
                src={selectedNote.user?.avatar_url}
                name={selectedNote.user?.nickname}
                size="lg"
              />
              <div>
                <p className="font-medium text-text-primary">
                  {selectedNote.user?.nickname || '알 수 없음'}
                </p>
                <Link
                  href={`/members/${selectedNote.user?.id}`}
                  className="text-sm text-accent hover:underline"
                >
                  프로필 보기
                </Link>
              </div>
              <div className="ml-auto">
                {(() => {
                  const Icon = VISIBILITY_CONFIG[selectedNote.visibility].icon
                  return (
                    <Badge
                      variant={VISIBILITY_CONFIG[selectedNote.visibility].variant}
                      icon={<Icon className="w-3 h-3" />}
                    >
                      {VISIBILITY_CONFIG[selectedNote.visibility].label}
                    </Badge>
                  )
                })()}
              </div>
            </div>

            {/* 콘텐츠 정보 */}
            {selectedNote.content && (
              <div>
                <label className="text-xs text-text-secondary mb-2 block">
                  연결된 콘텐츠
                </label>
                <div className="flex items-center gap-4 p-4 bg-bg-secondary rounded-xl">
                  {selectedNote.content.thumbnail_url && (
                    <div className="relative w-16 h-24 rounded-lg overflow-hidden flex-shrink-0">
                      <Image
                        src={selectedNote.content.thumbnail_url}
                        alt=""
                        fill
                        unoptimized
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-text-primary">
                      {selectedNote.content.title}
                    </p>
                    <Badge variant="default" size="sm" className="mt-1">
                      {selectedNote.content.type}
                    </Badge>
                  </div>
                </div>
              </div>
            )}

            {/* 섹션 목록 */}
            <div>
              <label className="text-xs text-text-secondary mb-2 block">
                섹션 ({selectedNote.sections.length}개)
              </label>
              <div className="space-y-2">
                {selectedNote.sections.map((section) => (
                  <div
                    key={section.id}
                    className="flex items-center gap-3 p-3 bg-bg-secondary rounded-lg"
                  >
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        section.is_completed
                          ? 'bg-green-500 border-green-500'
                          : 'border-border'
                      }`}
                    >
                      {section.is_completed && (
                        <CheckCircle className="w-3 h-3 text-white" />
                      )}
                    </div>
                    <span
                      className={`text-sm ${
                        section.is_completed
                          ? 'text-text-secondary line-through'
                          : 'text-text-primary'
                      }`}
                    >
                      {section.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 시간 정보 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-text-secondary mb-1 block">
                  생성일
                </label>
                <p className="text-sm text-text-primary">
                  {formatDateTime(selectedNote.created_at)}
                </p>
              </div>
              <div>
                <label className="text-xs text-text-secondary mb-1 block">
                  수정일
                </label>
                <p className="text-sm text-text-primary">
                  {formatDateTime(selectedNote.updated_at)}
                </p>
              </div>
            </div>
          </div>
        )}
      </Drawer>

      {/* 삭제 확인 */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="노트 삭제"
        description="이 노트를 삭제하시겠습니까? 연결된 모든 섹션도 함께 삭제됩니다."
        confirmLabel="삭제"
        variant="danger"
        loading={isDeleting}
      />
    </div>
  )
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
