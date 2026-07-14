'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import {
  hideFreePost,
  restoreFreePost,
  hideFreeComment,
  restoreFreeComment,
} from '@/actions/admin/free-board'

interface FreeBoardActionsProps {
  id: string
  isDeleted: boolean
  type: 'post' | 'comment'
}

export default function FreeBoardActions({ id, isDeleted, type }: FreeBoardActionsProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const label = type === 'post' ? '글' : '댓글'

  const handleClick = async () => {
    const hide = !isDeleted
    if (hide && !confirm(`이 ${label}을(를) 숨기시겠습니까?`)) return

    setLoading(true)
    try {
      if (type === 'post') {
        hide ? await hideFreePost(id) : await restoreFreePost(id)
      } else {
        hide ? await hideFreeComment(id) : await restoreFreeComment(id)
      }
      router.refresh()
    } catch {
      alert('처리에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`inline-flex items-center gap-1.5 px-2 md:px-3 py-1 md:py-1.5 rounded-lg text-xs md:text-sm disabled:opacity-50 ${
        isDeleted
          ? 'text-green-400 hover:bg-green-500/10'
          : 'text-orange-400 hover:bg-orange-500/10'
      }`}
      title={isDeleted ? '복원' : '숨김'}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : isDeleted ? (
        <Eye className="w-4 h-4" />
      ) : (
        <EyeOff className="w-4 h-4" />
      )}
      {isDeleted ? '복원' : '숨김'}
    </button>
  )
}
