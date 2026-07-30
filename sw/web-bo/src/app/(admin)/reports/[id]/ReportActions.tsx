'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, Loader2, RotateCcw, XCircle } from 'lucide-react'
import Button from '@/components/ui/Button'
import { rejectReport, reopenReport, resolveReport } from '@/actions/admin/reports/moderation'
import { ENUM_REPORT_STATUS } from '@/constants/moderation'

interface ReportActionsProps {
  reportId: string
  status: string
  resolutionNote: string | null
  resolverNickname: string | null
  resolvedAt: string | null
}

export default function ReportActions({
  reportId,
  status,
  resolutionNote,
  resolverNickname,
  resolvedAt,
}: ReportActionsProps) {
  const router = useRouter()
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async (kind: 'resolve' | 'reject' | 'reopen') => {
    setLoading(true)
    setError('')
    try {
      if (kind === 'resolve') await resolveReport(reportId, note)
      if (kind === 'reject') await rejectReport(reportId, note)
      if (kind === 'reopen') await reopenReport(reportId)
      setNote('')
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '처리에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const closed = status !== ENUM_REPORT_STATUS.PENDING
  const spinner = loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null

  if (closed) {
    return (
      <div className="space-y-3">
        <div className="p-4 bg-bg-secondary rounded-lg space-y-1">
          <p className="text-sm text-text-secondary">처리 메모</p>
          <p className="text-sm text-text-primary whitespace-pre-wrap">
            {resolutionNote || '메모가 남아 있지 않습니다'}
          </p>
        </div>
        <p className="text-sm text-text-secondary">
          처리자 {resolverNickname || '기록 없음'}
          {resolvedAt && ` · ${new Date(resolvedAt).toLocaleString('ko-KR')}`}
        </p>
        <Button variant="secondary" onClick={() => submit('reopen')} disabled={loading}>
          {spinner ?? <RotateCcw className="w-4 h-4" />}
          다시 대기로 돌리기
        </Button>
        {error && <p className="text-sm text-danger-text">{error}</p>}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="report-note" className="block text-sm text-text-secondary mb-2">
          처리 메모 <span className="text-danger-text">*</span>
        </label>
        <textarea
          id="report-note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="무엇을 확인하고 어떻게 조치했는지 남겨주세요. 이 기록이 심사 근거가 됩니다."
          rows={3}
          className="w-full px-4 py-3 bg-bg-secondary border border-border rounded-lg text-sm text-text-primary placeholder:text-text-secondary resize-none focus:border-accent focus:outline-none"
        />
      </div>

      <div className="flex flex-wrap gap-2 pt-4 border-t border-border">
        <Button onClick={() => submit('resolve')} disabled={loading || note.trim().length === 0}>
          {spinner ?? <CheckCircle className="w-4 h-4" />}
          처리 완료
        </Button>
        <Button
          variant="secondary"
          onClick={() => submit('reject')}
          disabled={loading || note.trim().length === 0}
        >
          {spinner ?? <XCircle className="w-4 h-4" />}
          반려
        </Button>
      </div>

      {error && <p className="text-sm text-danger-text">{error}</p>}
    </div>
  )
}
