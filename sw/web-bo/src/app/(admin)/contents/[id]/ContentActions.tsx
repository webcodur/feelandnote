'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Loader2 } from 'lucide-react'
import { deleteContent } from '@/actions/admin/contents'
import Button from '@/components/ui/Button'

interface ContentActionsProps {
  content: {
    id: string
    title: string
  }
}

export default function ContentActions({ content }: ContentActionsProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await deleteContent(content.id)
      router.push('/contents')
    } catch (error) {
      console.error('Failed to delete content:', error)
      alert('콘텐츠 삭제에 실패했습니다')
    } finally {
      setIsDeleting(false)
      setShowConfirm(false)
    }
  }

  return (
    <div className="space-y-4">
      {showConfirm ? (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-sm text-red-400 mb-4">
            정말 이 콘텐츠를 삭제하시겠습니까?<br />
            관련된 모든 사용자 등록 정보와 기록도 함께 삭제됩니다.
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
          콘텐츠 삭제
        </Button>
      )}
    </div>
  )
}
