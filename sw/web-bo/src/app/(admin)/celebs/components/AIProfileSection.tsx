'use client'

import { useState } from 'react'
import { generateCelebProfile } from '@/actions/admin/celebs'
import { getCelebProfessionLabel } from '@/constants/celebCategories'
import { Sparkles, Loader2, Check, X } from 'lucide-react'
import Button from '@/components/ui/Button'

interface GeneratedProfile {
  bio: string
  profession: string
  avatarUrl: string
}

interface Props {
  nickname: string
  onProfileGenerated: (profile: GeneratedProfile) => void
}

export default function AIProfileSection({ nickname, onProfileGenerated }: Props) {
  const [description, setDescription] = useState('')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<GeneratedProfile | null>(null)

  async function handleGenerate() {
    if (!nickname.trim()) {
      setError('먼저 닉네임(인물명)을 입력하세요.')
      return
    }

    setGenerating(true)
    setError(null)

    try {
      const res = await generateCelebProfile({
        name: nickname,
        description,
      })

      if (!res.success) throw new Error(res.error)

      setResult(res.profile!)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI 프로필 생성에 실패했습니다.')
    } finally {
      setGenerating(false)
    }
  }

  function handleApply() {
    if (result) {
      onProfileGenerated(result)
      setResult(null)
      setDescription('')
    }
  }

  function handleCancel() {
    setResult(null)
  }

  return (
    <div className="bg-bg-card border border-border rounded-lg p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-accent" />
        <h2 className="text-lg font-semibold text-text-primary">AI 프로필 생성</h2>
      </div>

      {/* 설명 입력 */}
      <div className="space-y-2">
        <label htmlFor="ai-description" className="block text-sm font-medium text-text-secondary">
          인물 설명 (선택)
        </label>
        <textarea
          id="ai-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="예: 테슬라 CEO, 스페이스X 창업자..."
          rows={2}
          className="w-full px-4 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent focus:outline-none resize-none"
        />
        <p className="text-xs text-text-secondary">
          AI가 알려진 인물 정보를 바탕으로 프로필을 생성합니다.
        </p>
      </div>

      {/* 에러 */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* 생성 버튼 */}
      {!result && (
        <Button
          type="button"
          variant="secondary"
          onClick={handleGenerate}
          disabled={generating || !nickname.trim()}
        >
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              생성 중...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              AI 프로필 생성
            </>
          )}
        </Button>
      )}

      {/* 결과 미리보기 */}
      {result && (
        <div className="bg-bg-secondary rounded-lg p-4 space-y-3">
          <h3 className="font-medium text-text-primary">생성된 프로필</h3>

          <div className="space-y-2 text-sm">
            <div>
              <span className="text-text-secondary">직군:</span>
              <span className="ml-2 text-text-primary">
                {getCelebProfessionLabel(result.profession)}
              </span>
            </div>
            <div>
              <span className="text-text-secondary">소개:</span>
              <p className="mt-1 text-text-primary">{result.bio}</p>
            </div>
            {result.avatarUrl && (
              <div className="flex items-center gap-2">
                <span className="text-text-secondary">이미지:</span>
                <img
                  src={result.avatarUrl}
                  alt=""
                  className="w-10 h-10 rounded-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" size="sm" onClick={handleApply}>
              <Check className="w-4 h-4" />
              적용
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={handleCancel}>
              <X className="w-4 h-4" />
              취소
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
