'use client'

import { useState } from 'react'
import { BarChart3, Clock, Key, CheckCircle, XCircle, AlertCircle, Eye, Trash2 } from 'lucide-react'
import {
  PageHeader,
  Badge,
  FilterChips,
  Pagination,
  Drawer,
  ConfirmDialog,
  ActionDropdown,
  EmptyState,
  Button,
} from '@/components/ui'

const ACTION_TYPE_CONFIG: Record<string, { label: string; color: 'info' | 'danger' | 'success' | 'purple' | 'warning' | 'orange' | 'pink' }> = {
  search_books: { label: '도서 검색', color: 'info' },
  search_videos: { label: '영상 검색', color: 'danger' },
  search_games: { label: '게임 검색', color: 'success' },
  search_music: { label: '음악 검색', color: 'purple' },
  ai_generate: { label: 'AI 생성', color: 'warning' },
  ai_analyze: { label: 'AI 분석', color: 'orange' },
  ai_recommend: { label: 'AI 추천', color: 'pink' },
}

interface ApiKey {
  id: string
  title: string
}

interface UsageLog {
  id: string
  api_key_id: string
  action_type: string
  success: boolean
  error_code: string | null
  created_at: string
  api_key: { id: string; title: string } | null
}

interface Props {
  usageLogs: UsageLog[]
  apiKeys: ApiKey[]
  total: number
  page: number
  totalPages: number
  keyFilter: string
  successFilter: string
  stats: { totalUsage: number; successCount: number; failCount: number; successRate: number }
  keyStats: { id: string; title: string; count: number; percentage: number }[]
  actionStats: { key: string; label: string; color: string; count: number; percentage: number }[]
  keyFilterOptions: { value: string; label: string; count?: number }[]
  successFilterOptions: { value: string; label: string; count?: number }[]
}

export default function ApiUsageClient({
  usageLogs,
  apiKeys,
  total,
  page,
  totalPages,
  keyFilter,
  successFilter,
  stats,
  keyStats,
  actionStats,
  keyFilterOptions,
  successFilterOptions,
}: Props) {
  const [selectedLog, setSelectedLog] = useState<UsageLog | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<UsageLog | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    await new Promise((r) => setTimeout(r, 500))
    setIsDeleting(false)
    setDeleteTarget(null)
  }

  const buildHref = (params: { page?: number; key?: string; success?: string }) => {
    const sp = new URLSearchParams()
    const k = params.key ?? keyFilter
    const s = params.success ?? successFilter
    if (k) sp.set('key', k)
    if (s) sp.set('success', s)
    if (params.page && params.page > 1) sp.set('page', String(params.page))
    const q = sp.toString()
    return `/api-usage${q ? `?${q}` : ''}`
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="API 사용량"
        description={`총 ${stats.totalUsage.toLocaleString()}회 호출`}
      />

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <BarChart3 className="w-5 h-5 text-blue-400" />
            </div>
            <span className="text-sm text-text-secondary">총 호출</span>
          </div>
          <p className="text-2xl font-bold text-text-primary">{stats.totalUsage.toLocaleString()}</p>
        </div>
        <div className="bg-bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-400" />
            </div>
            <span className="text-sm text-text-secondary">성공</span>
          </div>
          <p className="text-2xl font-bold text-green-400">{stats.successCount.toLocaleString()}</p>
        </div>
        <div className="bg-bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-500/10 rounded-lg">
              <XCircle className="w-5 h-5 text-red-400" />
            </div>
            <span className="text-sm text-text-secondary">실패</span>
          </div>
          <p className="text-2xl font-bold text-red-400">{stats.failCount.toLocaleString()}</p>
        </div>
        <div className="bg-bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-yellow-500/10 rounded-lg">
              <AlertCircle className="w-5 h-5 text-yellow-400" />
            </div>
            <span className="text-sm text-text-secondary">성공률</span>
          </div>
          <p className="text-2xl font-bold text-yellow-400">{stats.successRate}%</p>
        </div>
      </div>

      {/* 통계 차트 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-bg-card border border-border rounded-xl p-5">
          <h3 className="text-lg font-semibold text-text-primary mb-4">API 키별 사용량</h3>
          <div className="space-y-3">
            {keyStats.map((stat) => (
              <div key={stat.id}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-text-primary">{stat.title}</span>
                  <span className="text-sm text-text-secondary">
                    {stat.count.toLocaleString()} ({stat.percentage}%)
                  </span>
                </div>
                <div className="h-2 bg-bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-accent rounded-full" style={{ width: `${stat.percentage}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-bg-card border border-border rounded-xl p-5">
          <h3 className="text-lg font-semibold text-text-primary mb-4">액션 타입별 사용량</h3>
          <div className="space-y-3">
            {actionStats.map((stat) => (
              <div key={stat.key}>
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-sm ${stat.color}`}>{stat.label}</span>
                  <span className="text-sm text-text-secondary">
                    {stat.count.toLocaleString()} ({stat.percentage}%)
                  </span>
                </div>
                <div className="h-2 bg-bg-secondary rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${stat.color.replace('text-', 'bg-').replace('-400', '-500')}`}
                    style={{ width: `${stat.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 필터 */}
      <div className="space-y-3">
        <FilterChips options={keyFilterOptions} value={keyFilter} href={(v) => buildHref({ key: v })} />
        <FilterChips options={successFilterOptions} value={successFilter} href={(v) => buildHref({ success: v })} />
      </div>

      {/* 로그 테이블 */}
      {usageLogs.length === 0 ? (
        <div className="bg-bg-card border border-border rounded-xl">
          <EmptyState icon={BarChart3} title="API 사용 기록이 없습니다" />
        </div>
      ) : (
        <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-bg-secondary border-b border-border">
              <tr>
                <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">API 키</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">액션</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-text-secondary">결과</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">에러</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-text-secondary">시간</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {usageLogs.map((log) => {
                const actionConfig = ACTION_TYPE_CONFIG[log.action_type] || { label: log.action_type, color: 'default' as const }

                return (
                  <tr
                    key={log.id}
                    className="hover:bg-bg-secondary/50 cursor-pointer transition-colors"
                    onClick={() => setSelectedLog(log)}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Key className="w-4 h-4 text-text-secondary" />
                        <span className="text-sm text-text-primary">{log.api_key?.title || '알 수 없음'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={actionConfig.color} size="sm">{actionConfig.label}</Badge>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {log.success ? (
                        <CheckCircle className="w-5 h-5 text-green-400 mx-auto" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-400 mx-auto" />
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {log.error_code && <Badge variant="danger" size="sm">{log.error_code}</Badge>}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-sm text-text-secondary flex items-center justify-end gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDateTime(log.created_at)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <ActionDropdown
                        items={[
                          { key: 'view', label: '상세보기', icon: Eye, onClick: () => setSelectedLog(log) },
                          { key: 'delete', label: '삭제', icon: Trash2, variant: 'danger', onClick: () => setDeleteTarget(log) },
                        ]}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} href={(p) => buildHref({ page: p })} />

      {/* 상세 Drawer */}
      <Drawer
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title="API 사용 상세"
        footer={
          <>
            <Button variant="secondary" onClick={() => setSelectedLog(null)}>닫기</Button>
            <Button variant="danger" onClick={() => { setDeleteTarget(selectedLog); setSelectedLog(null) }}>
              <Trash2 className="w-4 h-4" />삭제
            </Button>
          </>
        }
      >
        {selectedLog && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 p-4 bg-bg-secondary rounded-xl">
              <Key className="w-8 h-8 text-accent" />
              <div>
                <p className="font-medium text-text-primary">{selectedLog.api_key?.title || '알 수 없음'}</p>
                <p className="text-sm text-text-secondary">API Key</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-text-secondary mb-1 block">액션 타입</label>
                <Badge variant={ACTION_TYPE_CONFIG[selectedLog.action_type]?.color || 'default'}>
                  {ACTION_TYPE_CONFIG[selectedLog.action_type]?.label || selectedLog.action_type}
                </Badge>
              </div>
              <div>
                <label className="text-xs text-text-secondary mb-1 block">결과</label>
                <Badge variant={selectedLog.success ? 'success' : 'danger'}>
                  {selectedLog.success ? '성공' : '실패'}
                </Badge>
              </div>
            </div>

            {selectedLog.error_code && (
              <div>
                <label className="text-xs text-text-secondary mb-1 block">에러 코드</label>
                <Badge variant="danger">{selectedLog.error_code}</Badge>
              </div>
            )}

            <div>
              <label className="text-xs text-text-secondary mb-1 block">호출 시간</label>
              <p className="text-sm text-text-primary">{formatDateTime(selectedLog.created_at)}</p>
            </div>
          </div>
        )}
      </Drawer>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="로그 삭제"
        description="이 API 사용 로그를 삭제하시겠습니까?"
        confirmLabel="삭제"
        variant="danger"
        loading={isDeleting}
      />
    </div>
  )
}

function formatDateTime(d: string) {
  return new Date(d).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
