'use client'

import { useState } from 'react'
import { BookOpen, X, Copy, Check } from 'lucide-react'
import Button from '@/components/ui/Button'
import { BASIC_PROFILE_JSON_PROMPT, getInfluenceJSONPrompt, PHILOSOPHY_PROMPT } from '@/constants/celebPrompts'

interface ProjectRulesButtonProps {
  celebName?: string
}

type TabType = 'basicInfo' | 'influence' | 'philosophy'

const TABS: { key: TabType; label: string }[] = [
  { key: 'basicInfo', label: '기본 정보' },
  { key: 'influence', label: '영향력' },
  { key: 'philosophy', label: '감상 철학' },
]

export default function ProjectRulesButton({ celebName }: ProjectRulesButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>('basicInfo')
  const [copied, setCopied] = useState(false)

  const prompts: Record<TabType, string> = {
    basicInfo: `입력된 인물의 기본 정보를 아래 JSON 형식에 맞춰 작성해주세요:\n\n## JSON 형식\n${BASIC_PROFILE_JSON_PROMPT}`,
    influence: getInfluenceJSONPrompt(celebName || '[입력된 인물명]', '(사용자가 제공한 추가 설명)'),
    philosophy: celebName ? PHILOSOPHY_PROMPT.replace('[입력된 인물]', celebName) : PHILOSOPHY_PROMPT,
  }

  function handleCopy() {
    navigator.clipboard.writeText(prompts[activeTab])
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => setIsOpen(true)}
      >
        <BookOpen className="w-4 h-4" />
        프로젝트 룰
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-modal flex items-center justify-center">
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/60" onClick={() => setIsOpen(false)} />

          {/* Modal */}
          <div className="relative w-full max-w-3xl max-h-[90vh] bg-bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-xl font-bold text-text-primary">프로젝트 룰</h2>
              <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/5 rounded-lg">
                <X className="w-5 h-5 text-text-secondary" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => {
                    setActiveTab(tab.key)
                    setCopied(false)
                  }}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                    activeTab === tab.key
                      ? 'text-accent border-b-2 border-accent bg-accent/5'
                      : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="bg-accent/5 border border-accent/20 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-text-primary">Claude/GPT 프로젝트 룰에 붙여넣기</p>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleCopy}
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? '복사됨' : '복사'}
                  </Button>
                </div>
                <pre className="text-xs text-text-secondary bg-bg-secondary p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">
                  {prompts[activeTab]}
                </pre>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
              <Button type="button" variant="secondary" onClick={() => setIsOpen(false)}>
                닫기
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
