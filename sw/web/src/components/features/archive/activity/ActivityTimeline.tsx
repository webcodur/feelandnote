'use client'

import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Plus, Trash2, RefreshCw, FileText, Edit2, Star, History } from 'lucide-react'
import type { ActivityLogWithContent, ActivityActionType } from '@/types/database'

// #region 액션 설정
const ACTION_CONFIG: Record<ActivityActionType, {
  icon: typeof Plus
  label: string
  color: string
}> = {
  CONTENT_ADD: { icon: Plus, label: '추가', color: 'text-green-400' },
  CONTENT_REMOVE: { icon: Trash2, label: '삭제', color: 'text-red-400' },
  STATUS_CHANGE: { icon: RefreshCw, label: '상태 변경', color: 'text-blue-400' },
  PROGRESS_CHANGE: { icon: History, label: '진행도 변경', color: 'text-yellow-400' },
  REVIEW_UPDATE: { icon: Star, label: '리뷰 수정', color: 'text-purple-400' },
  RECORD_CREATE: { icon: FileText, label: '기록 작성', color: 'text-green-400' },
  RECORD_UPDATE: { icon: Edit2, label: '기록 수정', color: 'text-blue-400' },
  RECORD_DELETE: { icon: Trash2, label: '기록 삭제', color: 'text-red-400' },
}
// #endregion

// #region 메타데이터 설명
function MetadataDescription({ metadata, actionType }: {
  metadata: Record<string, unknown> | null
  actionType: ActivityActionType
}) {
  if (!metadata) return null

  if (actionType === 'STATUS_CHANGE' && metadata.from && metadata.to) {
    return <span className="text-text-tertiary"> ({String(metadata.from)} → {String(metadata.to)})</span>
  }

  if (actionType === 'PROGRESS_CHANGE' && metadata.from !== undefined && metadata.to !== undefined) {
    return <span className="text-text-tertiary"> ({String(metadata.from)}% → {String(metadata.to)}%)</span>
  }

  if (actionType === 'RECORD_CREATE' && metadata.type) {
    const typeLabel = metadata.type === 'NOTE' ? '노트' : metadata.type === 'QUOTE' ? '인용' : '창작'
    return <span className="text-text-tertiary"> ({typeLabel})</span>
  }

  return null
}
// #endregion

// #region 활동 아이템
function ActivityItem({ log }: { log: ActivityLogWithContent }) {
  const config = ACTION_CONFIG[log.action_type]
  const Icon = config?.icon ?? RefreshCw

  return (
    <div className="flex gap-3 p-3 rounded-xl hover:bg-white/5">
      {/* 아이콘 */}
      <div className={`w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0 ${config?.color ?? 'text-text-secondary'}`}>
        <Icon size={16} />
      </div>

      {/* 내용 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text-primary truncate">
            {log.content?.title ?? '알 수 없는 콘텐츠'}
          </span>
          <span className="text-xs text-text-tertiary shrink-0">
            {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: ko })}
          </span>
        </div>
        <p className="text-xs text-text-secondary mt-0.5">
          {config?.label}
          <MetadataDescription metadata={log.metadata} actionType={log.action_type} />
        </p>
      </div>

      {/* 썸네일 */}
      {log.content?.thumbnail_url && (
        <img
          src={log.content.thumbnail_url}
          alt=""
          className="w-10 h-10 rounded-lg object-cover shrink-0"
        />
      )}
    </div>
  )
}
// #endregion

// #region 빈 상태
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-text-secondary">
      <History size={40} className="mb-3 opacity-50" />
      <p className="text-sm font-medium text-text-primary mb-4">아직 활동 내역이 없습니다</p>
      <div className="text-xs text-text-tertiary space-y-1 text-center">
        <p className="font-medium text-text-secondary mb-2">다음 활동이 기록됩니다:</p>
        <p>• 콘텐츠 추가 / 삭제</p>
        <p>• 상태 변경 (관심 → 감상중 → 완료)</p>
        <p>• 진행도 변경</p>
        <p>• 리뷰 / 평점 수정</p>
        <p>• 노트, 인용 작성 / 수정 / 삭제</p>
      </div>
    </div>
  )
}
// #endregion

// #region 메인 컴포넌트
interface ActivityTimelineProps {
  logs: ActivityLogWithContent[]
  loading?: boolean
}

export default function ActivityTimeline({ logs, loading }: ActivityTimelineProps) {
  if (!loading && logs.length === 0) {
    return <EmptyState />
  }

  return (
    <div className="space-y-1">
      {logs.map((log) => (
        <ActivityItem key={log.id} log={log} />
      ))}
      {loading && (
        <div className="flex justify-center py-4">
          <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  )
}
// #endregion
