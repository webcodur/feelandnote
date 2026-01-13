'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createCeleb, updateCeleb, deleteCeleb, type Celeb } from '@/actions/admin/celebs'
import { CELEB_PROFESSIONS } from '@/constants/celebCategories'
import { Loader2, Trash2, Star } from 'lucide-react'
import Button from '@/components/ui/Button'
import AIProfileSection from './AIProfileSection'

// #region Types
interface CelebFormData {
  nickname: string
  profession: string
  bio: string
  avatar_url: string
  is_verified: boolean
  status: 'active' | 'suspended'
}

interface Props {
  mode: 'create' | 'edit'
  celeb?: Celeb
}

interface GeneratedProfile {
  bio: string
  profession: string
  avatarUrl: string
}
// #endregion

// #region Helpers
function getInitialFormData(celeb?: Celeb): CelebFormData {
  return {
    nickname: celeb?.nickname || '',
    profession: celeb?.profession || '',
    bio: celeb?.bio || '',
    avatar_url: celeb?.avatar_url || '',
    is_verified: celeb?.is_verified || false,
    status: (celeb?.status as 'active' | 'suspended') || 'active',
  }
}
// #endregion

export default function CelebForm({ mode, celeb }: Props) {
  const router = useRouter()
  const [formData, setFormData] = useState<CelebFormData>(getInitialFormData(celeb))
  const [loading, setLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // AI 생성 결과 적용
  function applyAIProfile(profile: GeneratedProfile) {
    setFormData((prev) => ({
      ...prev,
      bio: profile.bio,
      profession: profile.profession,
      avatar_url: profile.avatarUrl || prev.avatar_url,
    }))
  }

  // 폼 필드 변경
  function handleChange(field: keyof CelebFormData, value: string | boolean) {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  // 폼 제출
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    if (!formData.nickname.trim()) {
      setError('닉네임을 입력해주세요.')
      setLoading(false)
      return
    }

    try {
      if (mode === 'create') {
        const result = await createCeleb({
          nickname: formData.nickname.trim(),
          profession: formData.profession || undefined,
          bio: formData.bio || undefined,
          avatar_url: formData.avatar_url || undefined,
          is_verified: formData.is_verified,
        })
        router.push(`/celebs/${result.id}`)
      } else if (celeb) {
        await updateCeleb({
          id: celeb.id,
          nickname: formData.nickname.trim(),
          profession: formData.profession || undefined,
          bio: formData.bio || undefined,
          avatar_url: formData.avatar_url || undefined,
          is_verified: formData.is_verified,
          status: formData.status,
        })
        setSuccess(true)
        router.refresh()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 삭제
  async function handleDelete() {
    if (!celeb) return
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

      {/* AI Profile Section */}
      <AIProfileSection nickname={formData.nickname} onProfileGenerated={applyAIProfile} />

      {/* Basic Info */}
      <div className="bg-bg-card border border-border rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold text-text-primary">
          {mode === 'create' ? '기본 정보' : '프로필 수정'}
        </h2>

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
            value={formData.nickname}
            onChange={(e) => handleChange('nickname', e.target.value)}
            placeholder="셀럽 닉네임"
            className="w-full px-4 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent focus:outline-none"
          />
        </div>

        {/* Profession */}
        <div className="space-y-2">
          <label htmlFor="profession" className="block text-sm font-medium text-text-secondary">
            직군
          </label>
          <select
            id="profession"
            name="profession"
            value={formData.profession}
            onChange={(e) => handleChange('profession', e.target.value)}
            className="w-full px-4 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary focus:border-accent focus:outline-none"
          >
            <option value="">직군 선택</option>
            {CELEB_PROFESSIONS.map((prof) => (
              <option key={prof.value} value={prof.value}>
                {prof.label}
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
            value={formData.bio}
            onChange={(e) => handleChange('bio', e.target.value)}
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
            value={formData.avatar_url}
            onChange={(e) => handleChange('avatar_url', e.target.value)}
            placeholder="https://..."
            className="w-full px-4 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent focus:outline-none"
          />
        </div>

        {/* Verified */}
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="is_verified"
            checked={formData.is_verified}
            onChange={(e) => handleChange('is_verified', e.target.checked)}
            className="w-4 h-4 rounded border-border bg-bg-secondary text-accent focus:ring-accent"
          />
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-blue-400" />
            <span className="text-sm text-text-primary">공식 인증 계정</span>
          </div>
        </label>

        {/* Status (edit only) */}
        {mode === 'edit' && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-text-secondary">상태</label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  value="active"
                  checked={formData.status === 'active'}
                  onChange={() => handleChange('status', 'active')}
                  className="w-4 h-4 border-border bg-bg-secondary text-accent focus:ring-accent"
                />
                <span className="text-sm text-text-primary">활성</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  value="suspended"
                  checked={formData.status === 'suspended'}
                  onChange={() => handleChange('status', 'suspended')}
                  className="w-4 h-4 border-border bg-bg-secondary text-accent focus:ring-accent"
                />
                <span className="text-sm text-text-primary">비활성</span>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        {mode === 'edit' ? (
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
        ) : (
          <div />
        )}

        <div className="flex items-center gap-3">
          {mode === 'create' && (
            <Button type="button" variant="secondary" onClick={() => router.push('/celebs')}>
              취소
            </Button>
          )}
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {mode === 'create' ? '생성 중...' : '저장 중...'}
              </>
            ) : mode === 'create' ? (
              '생성'
            ) : (
              '저장'
            )}
          </Button>
        </div>
      </div>
    </form>
  )
}
