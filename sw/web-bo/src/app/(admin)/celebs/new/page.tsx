'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createCeleb } from '@/actions/admin/celebs'
import { CELEB_CATEGORIES } from '@/constants/celebCategories'
import { ArrowLeft, Star, Loader2 } from 'lucide-react'
import Link from 'next/link'
import Button from '@/components/ui/Button'

export default function NewCelebPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const nickname = formData.get('nickname') as string
    const category = formData.get('category') as string
    const bio = formData.get('bio') as string
    const avatar_url = formData.get('avatar_url') as string
    const is_verified = formData.get('is_verified') === 'on'

    if (!nickname.trim()) {
      setError('닉네임을 입력해주세요.')
      setLoading(false)
      return
    }

    try {
      const result = await createCeleb({
        nickname: nickname.trim(),
        category: category || undefined,
        bio: bio || undefined,
        avatar_url: avatar_url || undefined,
        is_verified,
      })

      router.push(`/celebs/${result.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : '셀럽 생성에 실패했습니다.')
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/celebs" className="text-text-secondary hover:text-text-primary">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">셀럽 계정 생성</h1>
          <p className="text-text-secondary mt-1">새로운 셀럽 계정을 생성합니다.</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Basic Info */}
        <div className="bg-bg-card border border-border rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold text-text-primary">기본 정보</h2>

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
              placeholder="https://..."
              className="w-full px-4 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent focus:outline-none"
            />
          </div>
        </div>

        {/* Account Settings */}
        <div className="bg-bg-card border border-border rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold text-text-primary">계정 설정</h2>

          {/* Verified */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              name="is_verified"
              className="w-4 h-4 rounded border-border bg-bg-secondary text-accent focus:ring-accent"
            />
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-text-primary">공식 인증 계정으로 표시</span>
            </div>
          </label>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Link href="/celebs">
            <Button type="button" variant="secondary">
              취소
            </Button>
          </Link>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                생성 중...
              </>
            ) : (
              '생성'
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
