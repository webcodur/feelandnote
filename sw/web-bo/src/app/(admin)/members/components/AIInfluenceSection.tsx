'use client'

import { useState } from 'react'
import { generateCelebInfluence } from '@/actions/admin/celebs'
import type { GeneratedInfluence, InfluenceScore } from '@feelandnote/ai-services/celeb-profile'
import { Sparkles, Loader2, Check, X } from 'lucide-react'
import Button from '@/components/ui/Button'

// #region Types
type InfluenceField = 'political' | 'strategic' | 'tech' | 'social' | 'economic' | 'cultural' | 'transhistoricity'

interface Props {
  guessedName: string
  onApply: (fields: Partial<Record<InfluenceField, InfluenceScore>>) => void
}
// #endregion

// #region Constants
const INFLUENCE_LABELS: Record<InfluenceField, { label: string; max: number }> = {
  political: { label: '정치·외교', max: 10 },
  strategic: { label: '전략·안보', max: 10 },
  tech: { label: '기술·과학', max: 10 },
  social: { label: '사회·윤리', max: 10 },
  economic: { label: '산업·경제', max: 10 },
  cultural: { label: '문화·예술', max: 10 },
  transhistoricity: { label: '통시성', max: 40 },
}

const FIELD_ORDER: InfluenceField[] = ['political', 'strategic', 'tech', 'social', 'economic', 'cultural', 'transhistoricity']

const RANK_COLORS: Record<string, string> = {
  S: 'bg-yellow-500 text-yellow-900',
  A: 'bg-purple-500 text-white',
  B: 'bg-blue-500 text-white',
  C: 'bg-green-500 text-white',
  D: 'bg-gray-500 text-white',
}
// #endregion

export default function AIInfluenceSection({ guessedName, onApply }: Props) {
  const [description, setDescription] = useState('')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<GeneratedInfluence | null>(null)
  const [selected, setSelected] = useState<Record<InfluenceField, boolean>>({
    political: true,
    strategic: true,
    tech: true,
    social: true,
    economic: true,
    cultural: true,
    transhistoricity: true,
  })

  async function handleGenerate() {
    if (!guessedName.trim()) {
      setError('먼저 추정 닉네임을 입력하세요.')
      return
    }

    setGenerating(true)
    setError(null)

    try {
      const res = await generateCelebInfluence({ name: guessedName, description })
      if (!res.success) throw new Error(res.error)
      setResult(res.influence!)
      // 모든 필드 기본 선택
      setSelected({
        political: true,
        strategic: true,
        tech: true,
        social: true,
        economic: true,
        cultural: true,
        transhistoricity: true,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI 영향력 생성에 실패했습니다.')
    } finally {
      setGenerating(false)
    }
  }

  function handleToggle(field: InfluenceField) {
    setSelected((prev) => ({ ...prev, [field]: !prev[field] }))
  }

  function handleSelectAll() {
    setSelected({
      political: true,
      strategic: true,
      tech: true,
      social: true,
      economic: true,
      cultural: true,
      transhistoricity: true,
    })
  }

  function handleApply() {
    if (!result) return
    const fields: Partial<Record<InfluenceField, InfluenceScore>> = {}
    FIELD_ORDER.forEach((field) => {
      if (selected[field]) {
        fields[field] = result[field]
      }
    })
    onApply(fields)
    setResult(null)
    setDescription('')
  }

  return (
    <div className="bg-bg-secondary/50 border border-border rounded-lg p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Sparkles className="w-3.5 h-3.5 text-accent" />
        <span className="text-xs font-medium text-text-primary">AI 영향력 생성</span>
      </div>

      <div className="space-y-1.5">
        <textarea
          id="ai-influence-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="인물 설명 입력 (선택)"
          rows={2}
          className="w-full px-3 py-1.5 text-xs bg-bg-secondary border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent focus:outline-none resize-none"
        />
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">{error}</div>
      )}

      {!result && (
        <Button type="button" variant="secondary" onClick={handleGenerate} disabled={generating || !guessedName.trim()}>
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              생성 중...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              AI 생성
            </>
          )}
        </Button>
      )}

      {result && (
        <div className="bg-bg-secondary rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-medium text-text-primary">생성 결과</h4>
            <span className={`px-2 py-0.5 rounded text-xs font-bold ${RANK_COLORS[result.rank]}`}>
              {result.rank}등급 ({result.totalScore}/100)
            </span>
          </div>

          <div className="space-y-1">
            {FIELD_ORDER.map((field) => {
              const { label, max } = INFLUENCE_LABELS[field]
              const data = result[field]
              const percent = (data.score / max) * 100
              return (
                <label key={field} className="flex items-start gap-2 p-1.5 rounded-lg cursor-pointer hover:bg-white/5">
                  <input
                    type="checkbox"
                    checked={selected[field]}
                    onChange={() => handleToggle(field)}
                    className="mt-0.5 w-3.5 h-3.5 rounded border-border bg-bg-secondary text-accent focus:ring-accent"
                  />
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-text-secondary">{label}</span>
                      <span className="text-xs text-text-primary">
                        {data.score}/{max}
                      </span>
                    </div>
                    <div className="h-1 bg-bg-main rounded-full overflow-hidden">
                      <div className="h-full bg-accent rounded-full" style={{ width: `${percent}%` }} />
                    </div>
                    {data.exp && <p className="text-xs text-text-secondary line-clamp-1">{data.exp}</p>}
                  </div>
                </label>
              )
            })}
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" size="sm" onClick={handleApply}>
              <Check className="w-4 h-4" />
              선택 항목 적용
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={handleSelectAll}>
              전체 선택
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setResult(null)}>
              <X className="w-4 h-4" />
              취소
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
