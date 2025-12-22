'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { suspendUser, unsuspendUser, updateUserRole, type User } from '@/actions/admin/users'
import { Ban, CheckCircle, Shield, Loader2 } from 'lucide-react'

interface UserActionsProps {
  user: User
}

export default function UserActions({ user }: UserActionsProps) {
  const [loading, setLoading] = useState(false)
  const [showSuspendModal, setShowSuspendModal] = useState(false)
  const [suspendReason, setSuspendReason] = useState('')
  const router = useRouter()

  const handleSuspend = async () => {
    if (!suspendReason.trim()) return

    setLoading(true)
    try {
      await suspendUser(user.id, suspendReason)
      setShowSuspendModal(false)
      setSuspendReason('')
      router.refresh()
    } catch (error) {
      console.error('Failed to suspend user:', error)
      alert('사용자 정지에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const handleUnsuspend = async () => {
    if (!confirm('정지를 해제하시겠습니까?')) return

    setLoading(true)
    try {
      await unsuspendUser(user.id)
      router.refresh()
    } catch (error) {
      console.error('Failed to unsuspend user:', error)
      alert('정지 해제에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const handleRoleChange = async (newRole: string) => {
    if (!confirm(`역할을 ${newRole}(으)로 변경하시겠습니까?`)) return

    setLoading(true)
    try {
      await updateUserRole(user.id, newRole)
      router.refresh()
    } catch (error) {
      console.error('Failed to update role:', error)
      alert('역할 변경에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="flex flex-wrap gap-3">
        {/* Suspend / Unsuspend */}
        {user.status === 'active' ? (
          <button
            onClick={() => setShowSuspendModal(true)}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors disabled:opacity-50"
          >
            <Ban className="w-4 h-4" />
            정지
          </button>
        ) : (
          <button
            onClick={handleUnsuspend}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-green-500/10 text-green-400 hover:bg-green-500/20 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            정지 해제
          </button>
        )}

        {/* Role Change */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-text-secondary">역할 변경:</span>
          <select
            value={user.role}
            onChange={(e) => handleRoleChange(e.target.value)}
            disabled={loading}
            className="px-3 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary focus:border-accent focus:outline-none disabled:opacity-50"
          >
            <option value="user">일반 사용자</option>
            <option value="admin">관리자</option>
            <option value="super_admin">최고 관리자</option>
          </select>
        </div>
      </div>

      {/* Suspend Modal */}
      {showSuspendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowSuspendModal(false)}
          />
          <div className="relative bg-bg-card border border-border rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-text-primary mb-4">
              사용자 정지
            </h3>
            <p className="text-sm text-text-secondary mb-4">
              {user.nickname || user.email} 사용자를 정지합니다.
            </p>
            <textarea
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              placeholder="정지 사유를 입력하세요..."
              className="w-full px-4 py-3 bg-bg-secondary border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent focus:outline-none resize-none"
              rows={3}
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setShowSuspendModal(false)}
                className="px-4 py-2 text-text-secondary hover:text-text-primary transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleSuspend}
                disabled={loading || !suspendReason.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
                정지
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
