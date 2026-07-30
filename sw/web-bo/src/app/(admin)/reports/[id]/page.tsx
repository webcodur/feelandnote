import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import { getReportDetail } from '@/actions/admin/reports/detail'
import { getReportContext } from '@/actions/admin/reports/history'
import {
  reportStatusBadge,
  reportStatusLabel,
  reportTargetTypeLabel,
} from '@/constants/moderation'
import ReportActions from './ReportActions'
import ReportHistoryCard from './ReportHistoryCard'
import ReportPeopleCard from './ReportPeopleCard'
import ReportSummaryCard from './ReportSummaryCard'
import TargetModerationActions from './TargetModerationActions'
import TargetSnapshotCard from './TargetSnapshotCard'

export const metadata: Metadata = { title: '신고 상세' }

interface PageProps {
  params: Promise<{ id: string }>
}

const CARD = 'bg-bg-card border border-border rounded-xl p-6 space-y-4'

export default async function ReportDetailPage({ params }: PageProps) {
  const { id } = await params
  const report = await getReportDetail(id)

  if (!report) notFound()

  const context = await getReportContext({
    reportId: report.id,
    targetType: report.targetType,
    targetId: report.targetId,
    reporterId: report.reporterId,
    targetUserId: report.targetUserId,
  })

  // 신고에 대상 작성자가 안 적혀 있으면 원문에서 찾은 작성자로 대신한다.
  const sanctionUserId = report.targetUser?.id ?? report.snapshot.authorId
  const sanctionUserName =
    report.targetUser?.nickname ?? report.snapshot.authorNickname ?? '이름 없는 사용자'
  const sanctionSuspended = report.targetUser?.status === 'suspended'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/reports" className="p-2 rounded-lg hover:bg-bg-card hover:text-accent">
          <ArrowLeft className="w-5 h-5 text-text-secondary" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-text-primary">신고 상세</h1>
          <p className="text-sm text-text-secondary mt-1">
            {reportTargetTypeLabel(report.targetType)} 신고
          </p>
        </div>
        <Badge variant={reportStatusBadge(report.status)} dot>
          {reportStatusLabel(report.status)}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 사람 */}
        <div className="lg:col-span-1">
          <ReportPeopleCard
            reporter={report.reporter}
            targetUser={report.targetUser}
            reporterFiledCount={context.reporterFiledCount}
            reporterPendingCount={context.reporterPendingCount}
            targetUserReceivedCount={context.targetUserReceivedCount}
            targetUserBlockedByCount={context.targetUserBlockedByCount}
          />
        </div>

        {/* 내용·조치 */}
        <div className="lg:col-span-2 space-y-6">
          <ReportSummaryCard
            targetType={report.targetType}
            targetId={report.targetId}
            reason={report.reason}
            description={report.description}
            createdAt={report.createdAt}
            resolvedAt={report.resolvedAt}
            stackedCount={context.stackedCount}
          />

          <TargetSnapshotCard
            targetType={report.targetType}
            targetId={report.targetId}
            snapshot={report.snapshot}
          />

          <div className={CARD}>
            <h3 className="text-lg font-semibold text-text-primary">대상 조치</h3>
            <TargetModerationActions
              reportId={report.id}
              found={report.snapshot.found}
              hidden={report.snapshot.hidden}
              hideLabel={report.snapshot.hideLabel}
              restoreLabel={report.snapshot.restoreLabel}
              deletable={report.snapshot.deletable}
              deleteBlockedReason={report.snapshot.deleteBlockedReason}
              targetUserId={sanctionUserId}
              targetUserName={sanctionUserName}
              targetUserSuspended={sanctionSuspended}
            />
          </div>

          <div className={CARD}>
            <h3 className="text-lg font-semibold text-text-primary">신고 종결</h3>
            <ReportActions
              reportId={report.id}
              status={report.status}
              resolutionNote={report.resolutionNote}
              resolverNickname={report.resolverNickname}
              resolvedAt={report.resolvedAt}
            />
          </div>

          <ReportHistoryCard
            groups={[
              {
                title: '같은 대상에 들어온 다른 신고',
                emptyText: '이 대상에 들어온 다른 신고는 없습니다.',
                items: context.sameTarget,
              },
              {
                title: '이 작성자가 받은 다른 신고',
                emptyText: '이 작성자가 받은 다른 신고는 없습니다.',
                items: context.targetUserReceived,
              },
              {
                title: '이 신고자가 낸 다른 신고',
                emptyText: '이 신고자가 낸 다른 신고는 없습니다.',
                items: context.reporterFiled,
              },
            ]}
          />
        </div>
      </div>
    </div>
  )
}
