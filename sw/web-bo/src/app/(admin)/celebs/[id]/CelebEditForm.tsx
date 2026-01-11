'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateCeleb, deleteCeleb, Celeb } from '@/actions/admin/celebs'
import { CELEB_CATEGORIES } from '@/constants/celebCategories'
import { Loader2, Trash2 } from 'lucide-react'
import Button from '@/components/ui/Button'

interface Props {
  celeb: Celeb
}

export default function CelebEditForm({ celeb }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    const formData = new FormData(e.currentTarget)
    const nickname = formData.get('nickname') as string
    const category = formData.get('category') as string
    const bio = formData.get('bio') as string
    const avatar_url = formData.get('avatar_url') as string
    const is_verified = formData.get('is_verified') === 'on'
    const status = formData.get('status') as 'active' | 'suspended'

    if (!nickname.trim()) {
      setError('닉네임을 입력해주세요.')
      setLoading(false)
      return
    }

    try {
      await updateCeleb({
        id: celeb.id,
        nickname: nickname.trim(),
        category: category || undefined,
        bio: bio || undefined,
        avatar_url: avatar_url || undefined,
        is_verified,
        status,
      })

      setSuccess(true)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : '수정에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!confirm('정말로 이 셀럽 계정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      return
    }

    setDeleteLoading(true)
    setError(null)

    try {
      await deleteCeleb(celeb.id)
      router.push('/celebs')
    } catch (err) {
      setError(err instanceof Error ? err.message : '삭제에 실패했습니다.')
      setDeleteLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Messages */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 text-green-400 text-sm">
          저장되었습니다.
        </div>
      )}

      {/* Profile Edit */}
      <div className="bg-bg-card border border-border rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold text-text-primary">프로필 수정</h2>

        {/* Nickname */}
        <div className="space-y-2">
          <label htmlFor="nickname" className="block text-sm font-medium text-text-secondary">
            닉네임 <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            id="nickname"
            name="nickname"
            required
            defaultValue={celeb.nickname || ''}
            placeholder="셀럽 닉네임"
            className="w-full px-4 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent focus:outline-none"
          />
        </div>

        {/* Category */}
        <div className="space-y-2">
          <label htmlFor="category" className="block text-sm font-medium text-text-secondary">
            분야
          </label>
          <select
            id="category"
            name="category"
            defaultValue={celeb.category || ''}
            className="w-full px-4 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary focus:border-accent focus:outline-none"
          >
            <option value="">분야 선택</option>
            {CELEB_CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        {/* Bio */}
        <div className="space-y-2">
          <label htmlFor="bio" className="block text-sm font-medium text-text-secondary">
            소개
          </label>
          <textarea
            id="bio"
            name="bio"
            rows={3}
            defaultValue={celeb.bio || ''}
            placeholder="셀럽 소개글"
            className="w-full px-4 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent focus:outline-none resize-none"
          />
        </div>

        {/* Avatar URL */}
        <div className="space-y-2">
          <label htmlFor="avatar_url" className="block text-sm font-medium text-text-secondary">
            프로필 URL
          </label>
          <input
            type="url"
            id="avatar_url"
            name="avatar_url"
            defaultValue={celeb.avatar_url || ''}
            placeholder="https://..."
            className="w-full px-4 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent focus:outline-none"
          />
        </div>

        {/* Verified */}
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="is_verified"
            defaultChecked={celeb.is_verified || false}
            className="w-4 h-4 rounded border-border bg-bg-secondary text-accent focus:ring-accent"
          />
          <span className="text-sm text-text-primary">공식 인증 계정</span>
        </label>

        {/* Status */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-text-secondary">상태</label>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="status"
                value="active"
                defaultChecked={celeb.status === 'active'}
                className="w-4 h-4 border-border bg-bg-secondary text-accent focus:ring-accent"
              />
              <span className="text-sm text-text-primary">활성</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="status"
                value="suspended"
                defaultChecked={celeb.status === 'suspended'}
                className="w-4 h-4 border-border bg-bg-secondary text-accent focus:ring-accent"
              />
              <span className="text-sm text-text-primary">비활성</span>
            </label>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="danger"
          onClick={handleDelete}
          disabled={deleteLoading}
        >
          {deleteLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4" />
          )}
          계정 삭제
        </Button>

        <Button type="submit" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              저장 중...
            </>
          ) : (
            '저장'
          )}
        </Button>
      </div>
    </form>
  )
}
