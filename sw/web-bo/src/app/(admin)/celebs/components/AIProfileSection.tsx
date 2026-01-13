'use client'

import { useState } from 'react'
import Image from 'next/image'
import { generateCelebProfile } from '@/actions/admin/celebs'
import type { GeneratedInfluence } from '@feelnnote/api-clients'
import { getCelebProfessionLabel } from '@/constants/celebCategories'
import { Sparkles, Loader2, Check, X } from 'lucide-react'
import Button from '@/components/ui/Button'

// #region Types
interface GeneratedProfile {
  bio: string
  profession: string
  avatarUrl: string
  influence: GeneratedInfluence
}

interface Props {
  nickname: string
  onProfileGenerated: (profile: GeneratedProfile) => void
}

const INFLUENCE_LABELS: Record<string, { label: string; max: number }> = {
  political: { label: '정치·외교', max: 10 },
  strategic: { label: '전략·안보', max: 10 },
  tech: { label: '기술·과학', max: 10 },
  social: { label: '사회·윤리', max: 10 },
  economic: { label: '산업·경제', max: 10 },
  cultural: { label: '문화·예술', max: 10 },
  transhistoricity: { label: '통시성', max: 40 },
}

const RANK_COLORS: Record<string, string> = {
  S: 'bg-yellow-500 text-yellow-900',
  A: 'bg-purple-500 text-white',
  B: 'bg-blue-500 text-white',
  C: 'bg-green-500 text-white',
  D: 'bg-gray-500 text-white',
}
// #endregion

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
    <div className="bg-bg-secondary/50 border border-border rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-accent" />
        <span className="text-sm font-medium text-text-primary">AI 프로필 + 영향력 생성</span>
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
          AI가 프로필과 7개 항목 영향력을 함께 생성합니다.
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
        <div className="bg-bg-secondary rounded-lg p-4 space-y-4">
          <h3 className="font-medium text-text-primary">생성된 프로필</h3>

          {/* 기본 정보 */}
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
                <div className="relative w-10 h-10">
                  <Image
                    src={result.avatarUrl}
                    alt=""
                    fill
                    unoptimized
                    className="rounded-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* 영향력 섹션 */}
          <div className="border-t border-border pt-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-text-primary">영향력 평가</span>
              <span className={`px-2 py-0.5 rounded text-xs font-bold ${RANK_COLORS[result.influence.rank]}`}>
                {result.influence.rank}등급 ({result.influence.totalScore}/100)
              </span>
            </div>

            <div className="space-y-2">
              {Object.entries(INFLUENCE_LABELS).map(([key, { label, max }]) => {
                const field = result.influence[key as keyof typeof result.influence]
                if (typeof field === 'object' && 'score' in field) {
                  const percent = (field.score / max) * 100
                  return (
                    <div key={key} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-text-secondary">{label}</span>
                        <span className="text-text-primary">{field.score}/{max}</span>
                      </div>
                      <div className="h-1.5 bg-bg-main rounded-full overflow-hidden">
                        <div
                          className="h-full bg-accent rounded-full"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      {field.exp && (
                        <p className="text-xs text-text-secondary pl-1">{field.exp}</p>
                      )}
                    </div>
                  )
                }
                return null
              })}
            </div>
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
