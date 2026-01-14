'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { suspendUser, unsuspendUser, updateUserRole, updateUserProfile } from '@/actions/admin/users'
import { type Member } from '@/actions/admin/members'
import { Ban, CheckCircle, Loader2, Edit2 } from 'lucide-react'
import Button from '@/components/ui/Button'

interface MemberActionsProps {
  member: Member
}

export default function MemberActions({ member }: MemberActionsProps) {
  const [loading, setLoading] = useState(false)
  const [showSuspendModal, setShowSuspendModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [suspendReason, setSuspendReason] = useState('')
  const [editForm, setEditForm] = useState({
    nickname: member.nickname || '',
    avatar_url: member.avatar_url || '',
    bio: member.bio || '',
    is_verified: member.is_verified || false,
  })
  const router = useRouter()

  const handleSuspend = async () => {
    if (!suspendReason.trim()) return
    setLoading(true)
    try {
      await suspendUser(member.id, suspendReason)
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
      await unsuspendUser(member.id)
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
      await updateUserRole(member.id, newRole)
      router.refresh()
    } catch (error) {
      console.error('Failed to update role:', error)
      alert('역할 변경에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const handleEditProfile = async () => {
    setLoading(true)
    try {
      await updateUserProfile(member.id, {
        nickname: editForm.nickname || undefined,
        avatar_url: editForm.avatar_url || undefined,
        bio: editForm.bio || undefined,
        is_verified: editForm.is_verified,
      })
      setShowEditModal(false)
      router.refresh()
    } catch (error) {
      console.error('Failed to update profile:', error)
      alert('프로필 수정에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" onClick={() => setShowEditModal(true)} disabled={loading}>
          <Edit2 className="w-4 h-4" />프로필 수정
        </Button>

        {member.status === 'active' ? (
          <Button variant="danger" onClick={() => setShowSuspendModal(true)} disabled={loading}>
            <Ban className="w-4 h-4" />정지
          </Button>
        ) : (
          <button
            onClick={handleUnsuspend}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-green-500/10 text-green-400 hover:bg-green-500/20 rounded-lg disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            정지 해제
          </button>
        )}

        <div className="flex items-center gap-2">
          <span className="text-sm text-text-secondary">역할 변경:</span>
          <select
            value={member.role || 'user'}
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
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowSuspendModal(false)} />
          <div className="relative bg-bg-card border border-border rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-text-primary mb-4">사용자 정지</h3>
            <p className="text-sm text-text-secondary mb-4">{member.nickname || member.email} 사용자를 정지합니다.</p>
            <textarea
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              placeholder="정지 사유를 입력하세요..."
              className="w-full px-4 py-3 bg-bg-secondary border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent focus:outline-none resize-none"
              rows={3}
            />
            <div className="flex justify-end gap-3 mt-4">
              <Button variant="ghost" onClick={() => setShowSuspendModal(false)}>취소</Button>
              <button
                onClick={handleSuspend}
                disabled={loading || !suspendReason.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}정지
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowEditModal(false)} />
          <div className="relative bg-bg-card border border-border rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-text-primary mb-4">프로필 수정</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-text-secondary mb-1">닉네임</label>
                <input
                  type="text"
                  value={editForm.nickname}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, nickname: e.target.value }))}
                  className="w-full px-4 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-1">아바타 URL</label>
                <input
                  type="text"
                  value={editForm.avatar_url}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, avatar_url: e.target.value }))}
                  className="w-full px-4 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-1">자기소개</label>
                <textarea
                  value={editForm.bio}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, bio: e.target.value }))}
                  className="w-full px-4 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary focus:border-accent focus:outline-none resize-none"
                  rows={3}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_verified"
                  checked={editForm.is_verified}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, is_verified: e.target.checked }))}
                  className="w-4 h-4 accent-accent"
                />
                <label htmlFor="is_verified" className="text-sm text-text-primary">인증 마크</label>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="ghost" onClick={() => setShowEditModal(false)}>취소</Button>
              <Button variant="primary" onClick={handleEditProfile} disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}저장
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
