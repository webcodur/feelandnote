'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Eye, Loader2 } from 'lucide-react'
import { deleteRecord, updateRecordVisibility } from '@/actions/admin/records'
import Button from '@/components/ui/Button'

interface RecordActionsProps {
  record: {
    id: string
    visibility: string
  }
}

export default function RecordActions({ record }: RecordActionsProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await deleteRecord(record.id)
      router.push('/records')
    } catch (error) {
      console.error('Failed to delete record:', error)
      alert('기록 삭제에 실패했습니다')
    } finally {
      setIsDeleting(false)
      setShowConfirm(false)
    }
  }

  const handleVisibilityChange = async (visibility: 'public' | 'followers' | 'private') => {
    setIsUpdating(true)
    try {
      await updateRecordVisibility(record.id, visibility)
      router.refresh()
    } catch (error) {
      console.error('Failed to update visibility:', error)
      alert('공개범위 변경에 실패했습니다')
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Visibility */}
      <div>
        <p className="text-sm text-text-secondary mb-2">공개범위 변경</p>
        <div className="flex gap-2">
          {(['public', 'followers', 'private'] as const).map((v) => (
            <Button
              key={v}
              variant={record.visibility === v ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => handleVisibilityChange(v)}
              disabled={isUpdating || record.visibility === v}
            >
              {v === 'public' ? '공개' : v === 'followers' ? '팔로워' : '비공개'}
            </Button>
          ))}
        </div>
      </div>

      {/* Delete */}
      {showConfirm ? (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-sm text-red-400 mb-4">
            정말 이 기록을 삭제하시겠습니까?<br />
            관련된 좋아요와 댓글도 함께 삭제됩니다.
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowConfirm(false)}
              disabled={isDeleting}
            >
              취소
            </Button>
            <Button
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-500 hover:bg-red-600"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  삭제 중...
                </>
              ) : (
                '삭제 확인'
              )}
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="secondary"
          onClick={() => setShowConfirm(true)}
          className="text-red-400 hover:text-red-300"
        >
          <Trash2 className="w-4 h-4" />
          기록 삭제
        </Button>
      )}
    </div>
  )
}
