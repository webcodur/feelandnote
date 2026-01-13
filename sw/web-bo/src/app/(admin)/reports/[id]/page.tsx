import { getReport } from '@/actions/admin/reports'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowLeft,
  Users,
  Calendar,
  Flag,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  MessageSquare,
  User,
} from 'lucide-react'
import ReportActions from './ReportActions'

const STATUS_CONFIG = {
  pending: { label: '대기중', icon: Clock, color: 'bg-yellow-500/10 text-yellow-400' },
  resolved: { label: '처리완료', icon: CheckCircle, color: 'bg-green-500/10 text-green-400' },
  rejected: { label: '반려', icon: AlertTriangle, color: 'bg-gray-500/10 text-gray-400' },
}

const TARGET_TYPE_CONFIG = {
  user: { label: '사용자', icon: User },
  record: { label: '기록', icon: FileText },
  content: { label: '콘텐츠', icon: FileText },
  comment: { label: '댓글', icon: MessageSquare },
  guestbook: { label: '방명록', icon: MessageSquare },
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ReportDetailPage({ params }: PageProps) {
  const { id } = await params
  const report = await getReport(id)

  if (!report) {
    notFound()
  }

  const statusConfig = STATUS_CONFIG[report.status as keyof typeof STATUS_CONFIG]
  const targetConfig = TARGET_TYPE_CONFIG[report.target_type as keyof typeof TARGET_TYPE_CONFIG]
  const StatusIcon = statusConfig?.icon || Clock
  const TargetIcon = targetConfig?.icon || Flag

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/reports"
          className="p-2 hover:bg-bg-card rounded-lg"
        >
          <ArrowLeft className="w-5 h-5 text-text-secondary" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-text-primary">신고 상세</h1>
          <p className="text-text-secondary mt-1">
            {targetConfig?.label || report.target_type} 신고
          </p>
        </div>
        <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium ${statusConfig?.color}`}>
          <StatusIcon className="w-4 h-4" />
          {statusConfig?.label || report.status}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Info */}
        <div className="lg:col-span-1 space-y-6">
          {/* Reporter */}
          <div className="bg-bg-card border border-border rounded-xl p-6">
            <h3 className="text-sm font-medium text-text-secondary mb-4">신고자</h3>
            <Link
              href={`/users/${report.reporter_id}`}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-bg-secondary"
            >
              <div className="relative w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center overflow-hidden">
                {report.reporter?.avatar_url ? (
                  <Image src={report.reporter.avatar_url} alt="" fill unoptimized className="object-cover" />
                ) : (
                  <Users className="w-6 h-6 text-accent" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-text-primary">
                  {report.reporter?.nickname || '닉네임 없음'}
                </p>
                <p className="text-xs text-text-secondary">{report.reporter?.email || '-'}</p>
              </div>
            </Link>
          </div>

          {/* Timeline */}
          <div className="bg-bg-card border border-border rounded-xl p-6">
            <h3 className="text-sm font-medium text-text-secondary mb-4">타임라인</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-text-secondary" />
                <div>
                  <p className="text-xs text-text-secondary">신고일</p>
                  <p className="text-sm text-text-primary">
                    {new Date(report.created_at).toLocaleString('ko-KR')}
                  </p>
                </div>
              </div>
              {report.resolved_at && (
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-4 h-4 text-text-secondary" />
                  <div>
                    <p className="text-xs text-text-secondary">처리일</p>
                    <p className="text-sm text-text-primary">
                      {new Date(report.resolved_at).toLocaleString('ko-KR')}
                    </p>
                  </div>
                </div>
              )}
              {report.resolver && (
                <div className="flex items-center gap-3">
                  <Users className="w-4 h-4 text-text-secondary" />
                  <div>
                    <p className="text-xs text-text-secondary">처리자</p>
                    <p className="text-sm text-text-primary">
                      {report.resolver.nickname || '알 수 없음'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content & Actions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Report Content */}
          <div className="bg-bg-card border border-border rounded-xl p-6">
            <h3 className="text-lg font-semibold text-text-primary mb-4">신고 내용</h3>

            <div className="space-y-4">
              <div>
                <p className="text-xs text-text-secondary mb-1">신고 대상</p>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-bg-secondary text-text-primary">
                    <TargetIcon className="w-3 h-3" />
                    {targetConfig?.label || report.target_type}
                  </span>
                  <code className="text-xs text-text-secondary bg-bg-secondary px-2 py-1 rounded">
                    {report.target_id}
                  </code>
                </div>
              </div>

              <div>
                <p className="text-xs text-text-secondary mb-1">신고 사유</p>
                <p className="text-sm font-medium text-text-primary">{report.reason}</p>
              </div>

              {report.description && (
                <div>
                  <p className="text-xs text-text-secondary mb-1">상세 설명</p>
                  <p className="text-sm text-text-primary whitespace-pre-wrap">
                    {report.description}
                  </p>
                </div>
              )}

              {report.resolution_note && (
                <div className="mt-4 p-4 bg-bg-secondary rounded-lg">
                  <p className="text-xs text-text-secondary mb-1">처리 메모</p>
                  <p className="text-sm text-text-primary">{report.resolution_note}</p>
                </div>
              )}
            </div>
          </div>

          {/* Target Info */}
          {report.target_info && (
            <div className="bg-bg-card border border-border rounded-xl p-6">
              <h3 className="text-lg font-semibold text-text-primary mb-4">신고 대상 정보</h3>
              <div className="p-4 bg-bg-secondary rounded-lg">
                <pre className="text-xs text-text-primary overflow-auto">
                  {JSON.stringify(report.target_info, null, 2)}
                </pre>
              </div>
              {report.target_type === 'user' && (
                <Link
                  href={`/users/${report.target_id}`}
                  className="inline-block mt-4 text-sm text-accent hover:underline"
                >
                  사용자 상세 보기 →
                </Link>
              )}
              {report.target_type === 'record' && (
                <Link
                  href={`/records/${report.target_id}`}
                  className="inline-block mt-4 text-sm text-accent hover:underline"
                >
                  기록 상세 보기 →
                </Link>
              )}
            </div>
          )}

          {/* Actions */}
          {report.status === 'pending' && (
            <div className="bg-bg-card border border-border rounded-xl p-6">
              <h3 className="text-lg font-semibold text-text-primary mb-4">신고 처리</h3>
              <ReportActions report={report} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
