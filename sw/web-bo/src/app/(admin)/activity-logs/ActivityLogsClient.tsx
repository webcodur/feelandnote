'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Activity, Clock, Eye, Trash2 } from 'lucide-react'
import {
  PageHeader,
  Badge,
  Avatar,
  SearchInput,
  FilterChips,
  DataTable,
  Pagination,
  Drawer,
  ConfirmDialog,
  ActionDropdown,
} from '@/components/ui'
import type { Column } from '@/components/ui'

interface ActivityLog {
  id: string
  user_id: string
  action_type: string
  target_type: string
  target_id: string
  content_id: string | null
  metadata: Record<string, unknown> | null
  created_at: string
  profiles: {
    id: string
    nickname: string | null
    avatar_url: string | null
  } | null
}

interface Props {
  logs: ActivityLog[]
  total: number
  page: number
  totalPages: number
  actionFilter: string
  searchQuery: string
  filterOptions: { value: string; label: string; count: number }[]
  actionTypeMap: Record<string, { label: string; color: string }>
  targetTypeMap: Record<string, string>
}

export default function ActivityLogsClient({
  logs,
  total,
  page,
  totalPages,
  actionFilter,
  searchQuery,
  filterOptions,
  actionTypeMap,
  targetTypeMap,
}: Props) {
  const router = useRouter()
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ActivityLog | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleSearch = (value: string) => {
    const params = new URLSearchParams()
    if (value) params.set('search', value)
    if (actionFilter) params.set('action', actionFilter)
    router.push(`/activity-logs?${params.toString()}`)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    // TODO: 실제 삭제 API 호출
    await new Promise((resolve) => setTimeout(resolve, 500))
    setIsDeleting(false)
    setDeleteTarget(null)
    router.refresh()
  }

  const columns: Column<ActivityLog>[] = [
    {
      key: 'user',
      header: '사용자',
      width: '200px',
      render: (_, row) => (
        <Link
          href={`/members/${row.profiles?.id}`}
          className="flex items-center gap-3 hover:text-accent"
          onClick={(e) => e.stopPropagation()}
        >
          <Avatar
            src={row.profiles?.avatar_url}
            name={row.profiles?.nickname}
            size="sm"
          />
          <span className="text-text-primary truncate">
            {row.profiles?.nickname || '알 수 없음'}
          </span>
        </Link>
      ),
    },
    {
      key: 'action_type',
      header: '액션',
      width: '140px',
      render: (value) => {
        const config = actionTypeMap[value as string] || {
          label: value as string,
          color: 'default',
        }
        return (
          <Badge variant={config.color as 'default' | 'success' | 'danger' | 'info' | 'warning' | 'purple' | 'pink' | 'orange' | 'cyan'}>
            {config.label}
          </Badge>
        )
      },
    },
    {
      key: 'target_type',
      header: '대상',
      width: '100px',
      render: (value) => (
        <span className="text-text-secondary">
          {targetTypeMap[value as string] || (value as string)}
        </span>
      ),
    },
    {
      key: 'created_at',
      header: '시간',
      width: '180px',
      render: (value) => (
        <div className="flex items-center gap-1.5 text-text-secondary">
          <Clock className="w-3.5 h-3.5" />
          <span>{formatDateTime(value as string)}</span>
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      width: '50px',
      align: 'center',
      render: (_, row) => (
        <ActionDropdown
          items={[
            {
              key: 'view',
              label: '상세보기',
              icon: Eye,
              onClick: () => setSelectedLog(row),
            },
            {
              key: 'delete',
              label: '삭제',
              icon: Trash2,
              variant: 'danger',
              onClick: () => setDeleteTarget(row),
            },
          ]}
        />
      ),
    },
  ]

  return (
    <div className="space-y-4 md:space-y-6">
      <PageHeader
        title="활동 로그"
        description={`총 ${total.toLocaleString()}개의 활동 기록 (90일 보관)`}
      />

      {/* 검색 및 필터 */}
      <div className="flex flex-col md:flex-row gap-4">
        <SearchInput
          defaultValue={searchQuery}
          placeholder="사용자 검색..."
          onSearch={handleSearch}
          className="md:w-80"
        />
      </div>

      <FilterChips
        options={filterOptions}
        value={actionFilter}
        href={(value) =>
          `/activity-logs${value ? `?action=${value}` : ''}${searchQuery ? `&search=${searchQuery}` : ''}`
        }
      />

      {/* 테이블 */}
      <DataTable
        data={logs}
        columns={columns}
        keyExtractor={(row) => row.id}
        onRowClick={(row) => setSelectedLog(row)}
        emptyIcon={Activity}
        emptyTitle="활동 로그가 없습니다"
        emptyDescription="아직 기록된 활동이 없습니다"
      />

      {/* 페이지네이션 */}
      <Pagination
        page={page}
        totalPages={totalPages}
        href={(p) => {
          const params = new URLSearchParams()
          params.set('page', String(p))
          if (actionFilter) params.set('action', actionFilter)
          if (searchQuery) params.set('search', searchQuery)
          return `/activity-logs?${params.toString()}`
        }}
      />

      {/* 상세보기 Drawer */}
      <Drawer
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title="활동 상세"
        size="md"
      >
        {selectedLog && (
          <div className="space-y-6">
            {/* 사용자 정보 */}
            <div className="flex items-center gap-4 p-4 bg-bg-secondary rounded-xl">
              <Avatar
                src={selectedLog.profiles?.avatar_url}
                name={selectedLog.profiles?.nickname}
                size="lg"
              />
              <div>
                <p className="font-medium text-text-primary">
                  {selectedLog.profiles?.nickname || '알 수 없음'}
                </p>
                <Link
                  href={`/members/${selectedLog.profiles?.id}`}
                  className="text-sm text-accent hover:underline"
                >
                  프로필 보기
                </Link>
              </div>
            </div>

            {/* 활동 정보 */}
            <div className="space-y-4">
              <div>
                <label className="text-xs text-text-secondary mb-1 block">
                  액션
                </label>
                <Badge
                  variant={
                    (actionTypeMap[selectedLog.action_type]?.color || 'default') as
                      | 'default'
                      | 'success'
                      | 'danger'
                      | 'info'
                  }
                  size="md"
                >
                  {actionTypeMap[selectedLog.action_type]?.label ||
                    selectedLog.action_type}
                </Badge>
              </div>

              <div>
                <label className="text-xs text-text-secondary mb-1 block">
                  대상 유형
                </label>
                <p className="text-text-primary">
                  {targetTypeMap[selectedLog.target_type] ||
                    selectedLog.target_type}
                </p>
              </div>

              <div>
                <label className="text-xs text-text-secondary mb-1 block">
                  대상 ID
                </label>
                <p className="text-text-primary font-mono text-sm">
                  {selectedLog.target_id}
                </p>
              </div>

              {selectedLog.content_id && (
                <div>
                  <label className="text-xs text-text-secondary mb-1 block">
                    콘텐츠 ID
                  </label>
                  <p className="text-text-primary font-mono text-sm">
                    {selectedLog.content_id}
                  </p>
                </div>
              )}

              <div>
                <label className="text-xs text-text-secondary mb-1 block">
                  시간
                </label>
                <p className="text-text-primary">
                  {formatDateTime(selectedLog.created_at)}
                </p>
              </div>

              {selectedLog.metadata && (
                <div>
                  <label className="text-xs text-text-secondary mb-1 block">
                    메타데이터
                  </label>
                  <pre className="p-3 bg-bg-secondary rounded-lg text-xs text-text-secondary overflow-x-auto">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
      </Drawer>

      {/* 삭제 확인 Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="활동 로그 삭제"
        description="이 활동 로그를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
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
