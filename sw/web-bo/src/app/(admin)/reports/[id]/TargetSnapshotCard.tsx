import Link from 'next/link'
import { EyeOff, FileWarning, ExternalLink } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import type { ReportTargetSnapshot } from '@/lib/report-snapshot'
import { reportTargetTypeLabel } from '@/constants/moderation'

interface TargetSnapshotCardProps {
  targetType: string
  targetId: string
  snapshot: ReportTargetSnapshot
}

const CARD = 'bg-bg-card border border-border rounded-xl p-6 space-y-4'

export default function TargetSnapshotCard({
  targetType,
  targetId,
  snapshot,
}: TargetSnapshotCardProps) {
  const typeLabel = reportTargetTypeLabel(targetType)

  // 원문이 없으면 조용히 빈 화면을 두지 않고 무엇을 어디서 찾았는지 밝힌다.
  if (!snapshot.found) {
    return (
      <div className={CARD}>
        <div className="flex items-center gap-2">
          <FileWarning className="w-5 h-5 text-danger-text" />
          <h3 className="text-lg font-semibold text-text-primary">신고된 원문</h3>
          <Badge variant="danger">이미 삭제됨</Badge>
        </div>
        <p className="text-sm text-text-secondary">
          신고 접수 당시의 {typeLabel}이 지금은 남아 있지 않습니다. 작성자가 직접 지웠거나 이미
          운영에서 삭제한 것입니다.
        </p>
        {snapshot.searchedTables.length > 0 && (
          <p className="text-sm text-text-dim">
            찾아본 곳: {snapshot.searchedTables.join(', ')}
          </p>
        )}
        {snapshot.lookupError && (
          <p className="text-sm text-danger-text">조회 실패 사유: {snapshot.lookupError}</p>
        )}
        <code className="block text-xs text-text-secondary bg-bg-secondary px-2 py-1 rounded break-all">
          {targetId}
        </code>
      </div>
    )
  }

  return (
    <div className={CARD}>
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-lg font-semibold text-text-primary">신고된 원문</h3>
        <Badge variant="default">{typeLabel}</Badge>
        {snapshot.tableLabel && <Badge variant="info">{snapshot.tableLabel}</Badge>}
        {snapshot.hidden && (
          <Badge variant="warning" icon={<EyeOff className="w-3 h-3" />}>
            현재 감춰진 상태
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-text-secondary">작성자</p>
          {snapshot.authorId ? (
            <Link
              href={`/users/${snapshot.authorId}`}
              className="text-text-primary hover:text-accent hover:underline"
            >
              {snapshot.authorNickname || '닉네임 없음'}
            </Link>
          ) : (
            <p className="text-text-dim">확인할 수 없음</p>
          )}
        </div>
        <div>
          <p className="text-text-secondary">작성일</p>
          <p className="text-text-primary">
            {snapshot.createdAt
              ? new Date(snapshot.createdAt).toLocaleString('ko-KR')
              : '기록 없음'}
          </p>
        </div>
      </div>

      {snapshot.title && (
        <div>
          <p className="text-sm text-text-secondary mb-1">제목</p>
          <p className="text-base font-medium text-text-primary break-words">{snapshot.title}</p>
        </div>
      )}

      <div>
        <p className="text-sm text-text-secondary mb-1">본문</p>
        {snapshot.body ? (
          <p className="text-sm text-text-primary whitespace-pre-wrap break-words bg-bg-secondary rounded-lg p-4 max-h-96 overflow-auto">
            {snapshot.body}
          </p>
        ) : (
          <p className="text-sm text-text-dim bg-bg-secondary rounded-lg p-4">
            글로 된 내용이 없습니다. 사진·설정만 있는 항목이거나 본문이 비어 있습니다.
          </p>
        )}
      </div>

      {snapshot.adminHref && (
        <Link
          href={snapshot.adminHref}
          className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline"
        >
          <ExternalLink className="w-4 h-4" />
          원래 관리 화면에서 보기
        </Link>
      )}
    </div>
  )
}
