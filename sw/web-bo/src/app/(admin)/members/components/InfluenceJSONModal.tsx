'use client'

import { useState } from 'react'
import { X, Copy, Check } from 'lucide-react'
import Button from '@/components/ui/Button'
import { getInfluenceJSONPrompt } from '@/constants/celebPrompts'

interface InfluenceJSONModalProps {
  isOpen: boolean
  onClose: () => void
  onApply: (data: InfluenceJSONData) => void
  guessedName: string
}

export interface InfluenceJSONData {
  political: { score: number; exp: string }
  strategic: { score: number; exp: string }
  tech: { score: number; exp: string }
  social: { score: number; exp: string }
  economic: { score: number; exp: string }
  cultural: { score: number; exp: string }
  transhistoricity: { score: number; exp: string }
}

const MAX_SCORES: Record<string, number> = {
  political: 10,
  strategic: 10,
  tech: 10,
  social: 10,
  economic: 10,
  cultural: 10,
  transhistoricity: 40,
}

export default function InfluenceJSONModal({ isOpen, onClose, onApply, guessedName }: InfluenceJSONModalProps) {
  const [jsonInput, setJsonInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [description, setDescription] = useState('')

  // AI 서비스와 동일한 프롬프트 사용 (추정 닉네임과 설명 포함)
  const INFLUENCE_JSON_PROMPT = getInfluenceJSONPrompt(
    guessedName || '[인물명을 입력하세요]',
    description || '(없음)'
  )

  if (!isOpen) return null

  function handleCopyPrompt() {
    navigator.clipboard.writeText(INFLUENCE_JSON_PROMPT)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleApply() {
    setError(null)

    if (!jsonInput.trim()) {
      setError('JSON을 입력해주세요.')
      return
    }

    try {
      const parsed = JSON.parse(jsonInput) as InfluenceJSONData

      // 영향력 점수 검증
      const influenceFields = ['political', 'strategic', 'tech', 'social', 'economic', 'cultural', 'transhistoricity']

      for (const field of influenceFields) {
        const value = parsed[field as keyof typeof parsed]
        if (value && typeof value === 'object') {
          const max = MAX_SCORES[field]
          if (value.score < 0 || value.score > max) {
            setError(`${field} 점수는 0~${max} 범위여야 합니다.`)
            return
          }
        }
      }

      onApply(parsed)
      setJsonInput('')
      setError(null)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'JSON 파싱 실패. 형식을 확인해주세요.')
    }
  }

  function handleClose() {
    setJsonInput('')
    setError(null)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60" onClick={handleClose} />

      {/* Modal */}
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-bold text-text-primary">영향력 JSON 입력</h2>
          <button onClick={handleClose} className="p-2 hover:bg-white/5 rounded-lg">
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* 추가 설명 입력 */}
          <div className="space-y-2">
            <label htmlFor="description" className="block text-sm font-medium text-text-primary">
              추가 설명 (선택)
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value)
              }}
              placeholder="예: 테슬라 CEO, 스페이스X 창업자..."
              rows={2}
              className="w-full px-3 py-2 text-sm bg-bg-secondary border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent focus:outline-none resize-none"
            />
          </div>

          {/* AI 프롬프트 복사 */}
          <div className="bg-accent/5 border border-accent/20 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-text-primary">AI에게 요청할 프롬프트</p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleCopyPrompt}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? '복사됨' : '복사'}
              </Button>
            </div>
            <pre className="text-xs text-text-secondary bg-bg-secondary p-3 rounded-lg overflow-x-auto max-h-60">
              {INFLUENCE_JSON_PROMPT}
            </pre>
          </div>

          {/* JSON 입력 */}
          <div className="space-y-2">
            <label htmlFor="json-input" className="block text-sm font-medium text-text-primary">
              JSON 데이터 입력
            </label>
            <textarea
              id="json-input"
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              placeholder={`{\n  "political": { "score": 0, "exp": "..." },\n  ...\n}`}
              rows={12}
              className="w-full px-4 py-3 bg-bg-secondary border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent focus:outline-none resize-none font-mono text-sm"
            />
            {error && (
              <p className="text-sm text-red-400">{error}</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
          <Button type="button" variant="secondary" onClick={handleClose}>
            취소
          </Button>
          <Button type="button" onClick={handleApply}>
            적용
          </Button>
        </div>
      </div>
    </div>
  )
}
