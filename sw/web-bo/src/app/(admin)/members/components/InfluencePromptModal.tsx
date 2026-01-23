'use client'

import { useState } from 'react'
import { X, Copy, Check } from 'lucide-react'
import Button from '@/components/ui/Button'
import { getInfluenceJSONPrompt } from '@/constants/celebPrompts'

interface InfluencePromptModalProps {
  isOpen: boolean
  onClose: () => void
  guessedName: string
}

export default function InfluencePromptModal({ isOpen, onClose, guessedName }: InfluencePromptModalProps) {
  const [copied, setCopied] = useState(false)

  const projectRulePrompt = getInfluenceJSONPrompt('[입력된 인물명]', '(사용자가 제공한 추가 설명)')

  if (!isOpen) return null

  function handleCopyPrompt() {
    navigator.clipboard.writeText(projectRulePrompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-bold text-text-primary">영향력 평가 프로젝트 룰</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg">
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* 프롬프트 표시 */}
          <div className="bg-accent/5 border border-accent/20 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-text-primary">Claude/GPT 프로젝트 룰에 붙여넣기</p>
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
            <pre className="text-xs text-text-secondary bg-bg-secondary p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">
              {projectRulePrompt}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
          <Button type="button" variant="secondary" onClick={onClose}>
            닫기
          </Button>
        </div>
      </div>
    </div>
  )
}
