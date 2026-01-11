'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, XCircle, Loader2, Ban, Trash2 } from 'lucide-react'
import { resolveReport, rejectReport } from '@/actions/admin/reports'
import Button from '@/components/ui/Button'

interface ReportActionsProps {
  report: {
    id: string
    target_type: string
    target_id: string
  }
}

export default function ReportActions({ report }: ReportActionsProps) {
  const router = useRouter()
  const [isProcessing, setIsProcessing] = useState(false)
  const [note, setNote] = useState('')
  const [action, setAction] = useState<'none' | 'suspend_user' | 'delete_content'>('none')

  const handleResolve = async () => {
    if (!note.trim()) {
      alert('처리 메모를 입력해주세요')
      return
    }

    setIsProcessing(true)
    try {
      // TODO: 실제 사용자 ID 가져오기
      await resolveReport(report.id, '', note, action)
      router.refresh()
    } catch (error) {
      console.error('Failed to resolve report:', error)
      alert('신고 처리에 실패했습니다')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReject = async () => {
    if (!note.trim()) {
      alert('반려 사유를 입력해주세요')
      return
    }

    setIsProcessing(true)
    try {
      await rejectReport(report.id, '', note)
      router.refresh()
    } catch (error) {
      console.error('Failed to reject report:', error)
      alert('신고 반려에 실패했습니다')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Note */}
      <div>
        <label className="block text-sm text-text-secondary mb-2">
          처리 메모 <span className="text-red-400">*</span>
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="처리 내용을 입력하세요..."
          className="w-full px-4 py-3 bg-bg-secondary border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent focus:outline-none resize-none"
          rows={3}
        />
      </div>

      {/* Action Options */}
      {report.target_type === 'user' && (
        <div>
          <label className="block text-sm text-text-secondary mb-2">추가 조치</label>
          <div className="flex gap-2">
            <Button
              variant={action === 'none' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setAction('none')}
            >
              조치 없음
            </Button>
            <Button
              variant={action === 'suspend_user' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setAction('suspend_user')}
              className={action === 'suspend_user' ? 'bg-red-500' : ''}
            >
              <Ban className="w-4 h-4" />
              사용자 정지
            </Button>
          </div>
        </div>
      )}

      {['record', 'comment', 'guestbook'].includes(report.target_type) && (
        <div>
          <label className="block text-sm text-text-secondary mb-2">추가 조치</label>
          <div className="flex gap-2">
            <Button
              variant={action === 'none' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setAction('none')}
            >
              조치 없음
            </Button>
            <Button
              variant={action === 'delete_content' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setAction('delete_content')}
              className={action === 'delete_content' ? 'bg-red-500' : ''}
            >
              <Trash2 className="w-4 h-4" />
              콘텐츠 삭제
            </Button>
          </div>
        </div>
      )}

      {/* Buttons */}
      <div className="flex gap-2 pt-4 border-t border-border">
        <Button
          onClick={handleResolve}
          disabled={isProcessing || !note.trim()}
          className="flex-1"
        >
          {isProcessing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <CheckCircle className="w-4 h-4" />
          )}
          처리 완료
        </Button>
        <Button
          variant="secondary"
          onClick={handleReject}
          disabled={isProcessing || !note.trim()}
          className="text-gray-400"
        >
          {isProcessing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <XCircle className="w-4 h-4" />
          )}
          반려
        </Button>
      </div>
    </div>
  )
}
