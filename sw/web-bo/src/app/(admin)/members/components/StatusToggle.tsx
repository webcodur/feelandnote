'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { suspendUser, unsuspendUser } from '@/actions/admin/users'
import { type Member } from '@/actions/admin/members'
import { Ban, CheckCircle, Loader2 } from 'lucide-react'

interface StatusToggleProps {
  member: Member
}

export default function StatusToggle({ member }: StatusToggleProps) {
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [reason, setReason] = useState('')
  const router = useRouter()

  const handleSuspend = async () => {
    if (!reason.trim()) return
    setLoading(true)
    try {
      await suspendUser(member.id, reason)
      setShowModal(false)
      setReason('')
      router.refresh()
    } catch {
      alert('정지 실패')
    } finally {
      setLoading(false)
    }
  }

  const handleUnsuspend = async () => {
    if (!confirm('정지를 해제하시겠습니까?')) return
    setLoading(true)
    try {
      await unsuspendUser(member.id)
      router.refresh()
    } catch {
      alert('정지 해제 실패')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {member.status === 'active' ? (
        <button
          onClick={() => setShowModal(true)}
          disabled={loading}
          className="p-2 rounded-lg text-text-secondary hover:text-red-400 hover:bg-red-500/10 disabled:opacity-50"
          title="정지"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
        </button>
      ) : (
        <button
          onClick={handleUnsuspend}
          disabled={loading}
          className="p-2 rounded-lg text-text-secondary hover:text-green-400 hover:bg-green-500/10 disabled:opacity-50"
          title="정지 해제"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
        </button>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="relative bg-bg-card border border-border rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-text-primary mb-4">멤버 정지</h3>
            <p className="text-sm text-text-secondary mb-4">
              {member.nickname || '(닉네임 없음)'}님을 정지합니다.
            </p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="정지 사유를 입력하세요..."
              className="w-full px-4 py-3 bg-bg-secondary border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent focus:outline-none resize-none"
              rows={3}
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-text-secondary hover:text-text-primary"
              >
                취소
              </button>
              <button
                onClick={handleSuspend}
                disabled={loading || !reason.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg disabled:opacity-50"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                정지
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
