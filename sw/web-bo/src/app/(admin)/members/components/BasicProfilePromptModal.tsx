'use client'

import { useState } from 'react'
import { X, Copy, Check } from 'lucide-react'
import Button from '@/components/ui/Button'
import { BASIC_PROFILE_JSON_PROMPT } from '@/constants/celebPrompts'

interface BasicProfilePromptModalProps {
  isOpen: boolean
  onClose: () => void
  guessedName: string
}

export default function BasicProfilePromptModal({ isOpen, onClose, guessedName }: BasicProfilePromptModalProps) {
  const [copied, setCopied] = useState(false)

  const projectRulePrompt = `입력된 인물의 기본 정보를 아래 JSON 형식에 맞춰 작성해주세요:

## JSON 형식
${BASIC_PROFILE_JSON_PROMPT}`

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
          <h2 className="text-xl font-bold text-text-primary">기본 정보 프로젝트 룰</h2>
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
