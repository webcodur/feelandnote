import { createClient } from '@/lib/supabase/server'
import { Flag, AlertTriangle, CheckCircle, Clock } from 'lucide-react'
import Link from 'next/link'
import Button from '@/components/ui/Button'

const STATUS_CONFIG = {
  pending: { label: '대기중', color: 'bg-yellow-500/10 text-yellow-400', icon: Clock },
  resolved: { label: '처리완료', color: 'bg-green-500/10 text-green-400', icon: CheckCircle },
  rejected: { label: '반려', color: 'bg-gray-500/10 text-gray-400', icon: AlertTriangle },
}

interface PageProps {
  searchParams: Promise<{
    page?: string
    status?: string
  }>
}

export default async function ReportsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const page = Number(params.page) || 1
  const status = params.status || 'all'
  const limit = 20
  const offset = (page - 1) * limit

  const supabase = await createClient()

  let query = supabase
    .from('reports')
    .select(`
      *,
      reporter:reporter_id (nickname, email)
    `, { count: 'exact' })

  if (status !== 'all') {
    query = query.eq('status', status)
  }

  const { data: reports, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  const total = count || 0
  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">신고 관리</h1>
          <p className="text-text-secondary mt-1">총 {total.toLocaleString()}개의 신고</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-bg-card border border-border rounded-lg p-4">
        <form className="flex flex-wrap gap-4">
          <select
            name="status"
            defaultValue={status}
            className="px-4 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary focus:border-accent focus:outline-none"
          >
            <option value="all">모든 상태</option>
            {Object.entries(STATUS_CONFIG).map(([key, { label }]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>

          <Button type="submit">검색</Button>
        </form>
      </div>

      {/* Reports Table */}
      <div className="bg-bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-bg-secondary border-b border-border">
            <tr className="divide-x divide-border">
              <th className="text-center px-6 py-4 text-sm font-medium text-text-secondary">신고자</th>
              <th className="text-center px-6 py-4 text-sm font-medium text-text-secondary">사유</th>
              <th className="text-center px-6 py-4 text-sm font-medium text-text-secondary">상태</th>
              <th className="text-center px-6 py-4 text-sm font-medium text-text-secondary">신고일</th>
              <th className="text-center px-6 py-4 text-sm font-medium text-text-secondary">액션</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {!reports || reports.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-text-secondary">
                  신고 내역이 없습니다
                </td>
              </tr>
            ) : (
              reports.map((report) => {
                const reporter = report.reporter as { nickname: string; email: string } | null
                const statusInfo = STATUS_CONFIG[report.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending
                const StatusIcon = statusInfo.icon

                return (
                  <tr key={report.id} className="odd:bg-white/[0.02] hover:bg-bg-secondary/50 divide-x divide-border">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
                          <Flag className="w-4 h-4 text-red-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-text-primary">
                            {reporter?.nickname || '알 수 없음'}
                          </p>
                          <p className="text-xs text-text-secondary">{reporter?.email || '-'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-text-primary line-clamp-2">
                        {report.reason || '-'}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${statusInfo.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-text-secondary">
                      {new Date(report.created_at).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/reports/${report.id}`}
                        className="text-sm text-accent hover:underline"
                      >
                        상세보기
                      </Link>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/reports?page=${p}&status=${status}`}
              className={`
                px-4 py-2 rounded-lg text-sm transition-colors
                ${p === page
                  ? 'bg-accent text-white'
                  : 'bg-bg-card border border-border text-text-secondary hover:text-text-primary'
                }
              `}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
