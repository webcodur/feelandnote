'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { BookOpen, Clock, Lock, Eye, Trash2, ArrowRight, CheckCircle } from 'lucide-react'
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

interface GuestbookEntry {
  id: string
  profile_id: string
  author_id: string
  content: string
  is_private: boolean
  is_read: boolean
  created_at: string
  updated_at: string
  profile: { id: string; nickname: string | null; avatar_url: string | null } | null
  author: { id: string; nickname: string | null; avatar_url: string | null } | null
}

interface Props {
  entries: GuestbookEntry[]
  total: number
  page: number
  totalPages: number
  filter: string
  filterOptions: { value: string; label: string; count: number }[]
}

export default function GuestbooksClient({
  entries,
  total,
  page,
  totalPages,
  filter,
  filterOptions,
}: Props) {
  const router = useRouter()
  const [selectedEntry, setSelectedEntry] = useState<GuestbookEntry | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<GuestbookEntry | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    await new Promise((resolve) => setTimeout(resolve, 500))
    setIsDeleting(false)
    setDeleteTarget(null)
    router.refresh()
  }

  const handleMarkRead = async (entry: GuestbookEntry) => {
    // TODO: 읽음 처리 API
    router.refresh()
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <PageHeader
        title="방명록 관리"
        description={`총 ${total.toLocaleString()}개의 방명록`}
        badge={
          filterOptions[2]?.count > 0 && (
            <Badge variant="info" dot>
              미확인 {filterOptions[2].count}
            </Badge>
          )
        }
      />

      <FilterChips
        options={filterOptions}
        value={filter}
        href={(value) => `/guestbooks${value ? `?filter=${value}` : ''}`}
      />

      {/* 카드 리스트 */}
      {entries.length === 0 ? (
        <div className="bg-bg-card border border-border rounded-xl">
          <EmptyState
            icon={BookOpen}
            title="방명록이 없습니다"
            description="아직 작성된 방명록이 없습니다"
          />
        </div>
      ) : (
        <div className="grid gap-3 md:gap-4">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className={`bg-bg-card border rounded-xl p-5 hover:border-accent/50 transition-colors cursor-pointer ${
                !entry.is_read ? 'border-blue-500/50' : 'border-border'
              }`}
              onClick={() => setSelectedEntry(entry)}
            >
              {/* 헤더 */}
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <Avatar
                    src={entry.author?.avatar_url}
                    name={entry.author?.nickname}
                    size="md"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/members/${entry.author?.id}`}
                        className="font-medium text-text-primary hover:text-accent"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {entry.author?.nickname || '알 수 없음'}
                      </Link>
                      <ArrowRight className="w-3.5 h-3.5 text-text-secondary" />
                      <Link
                        href={`/members/${entry.profile?.id}`}
                        className="font-medium text-text-primary hover:text-accent"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {entry.profile?.nickname || '알 수 없음'}
                      </Link>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-text-secondary">
                        {formatDateTime(entry.created_at)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {entry.is_private && (
                    <Badge variant="warning" icon={<Lock className="w-3 h-3" />}>
                      비공개
                    </Badge>
                  )}
                  {!entry.is_read && <Badge variant="info">미확인</Badge>}
                  <ActionDropdown
                    items={[
                      {
                        key: 'view',
                        label: '상세보기',
                        icon: Eye,
                        onClick: () => setSelectedEntry(entry),
                      },
                      ...(!entry.is_read
                        ? [
                            {
                              key: 'read',
                              label: '읽음 처리',
                              icon: CheckCircle,
                              onClick: () => handleMarkRead(entry),
                            },
                          ]
                        : []),
                      {
                        key: 'delete',
                        label: '삭제',
                        icon: Trash2,
                        variant: 'danger' as const,
                        onClick: () => setDeleteTarget(entry),
                      },
                    ]}
                  />
                </div>
              </div>

              {/* 내용 */}
              <p className="text-sm text-text-primary whitespace-pre-wrap line-clamp-3">
                {entry.content}
              </p>
            </div>
          ))}
        </div>
      )}

      <Pagination
        page={page}
        totalPages={totalPages}
        href={(p) => `/guestbooks?page=${p}${filter ? `&filter=${filter}` : ''}`}
      />

      {/* 상세보기 Drawer */}
      <Drawer
        isOpen={!!selectedEntry}
        onClose={() => setSelectedEntry(null)}
        title="방명록 상세"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setSelectedEntry(null)}>
              닫기
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setDeleteTarget(selectedEntry)
                setSelectedEntry(null)
              }}
            >
              <Trash2 className="w-4 h-4" />
              삭제
            </Button>
          </>
        }
      >
        {selectedEntry && (
          <div className="space-y-6">
            {/* 작성자 → 대상 */}
            <div className="flex items-center gap-4 p-4 bg-bg-secondary rounded-xl">
              <div className="flex items-center gap-3">
                <Avatar
                  src={selectedEntry.author?.avatar_url}
                  name={selectedEntry.author?.nickname}
                  size="md"
                />
                <div>
                  <p className="text-sm text-text-secondary">작성자</p>
                  <Link
                    href={`/members/${selectedEntry.author?.id}`}
                    className="font-medium text-text-primary hover:text-accent"
                  >
                    {selectedEntry.author?.nickname || '알 수 없음'}
                  </Link>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-text-secondary" />
              <div className="flex items-center gap-3">
                <Avatar
                  src={selectedEntry.profile?.avatar_url}
                  name={selectedEntry.profile?.nickname}
                  size="md"
                />
                <div>
                  <p className="text-sm text-text-secondary">대상</p>
                  <Link
                    href={`/members/${selectedEntry.profile?.id}`}
                    className="font-medium text-text-primary hover:text-accent"
                  >
                    {selectedEntry.profile?.nickname || '알 수 없음'}
                  </Link>
                </div>
              </div>
            </div>

            {/* 상태 배지 */}
            <div className="flex gap-2">
              {selectedEntry.is_private && (
                <Badge variant="warning" icon={<Lock className="w-3 h-3" />}>
                  비공개
                </Badge>
              )}
              {!selectedEntry.is_read && <Badge variant="info">미확인</Badge>}
            </div>

            {/* 내용 */}
            <div>
              <label className="text-xs text-text-secondary mb-2 block">내용</label>
              <div className="p-4 bg-bg-secondary rounded-xl">
                <p className="text-text-primary whitespace-pre-wrap">
                  {selectedEntry.content}
                </p>
              </div>
            </div>

            {/* 시간 정보 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-text-secondary mb-1 block">
                  작성일
                </label>
                <p className="text-sm text-text-primary">
                  {formatDateTime(selectedEntry.created_at)}
                </p>
              </div>
              <div>
                <label className="text-xs text-text-secondary mb-1 block">
                  수정일
                </label>
                <p className="text-sm text-text-primary">
                  {formatDateTime(selectedEntry.updated_at)}
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
        title="방명록 삭제"
        description="이 방명록을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
        confirmLabel="삭제"
        variant="danger"
        loading={isDeleting}
      />
    </div>
  )
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
