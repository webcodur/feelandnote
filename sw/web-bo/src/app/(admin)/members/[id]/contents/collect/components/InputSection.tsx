import { useState } from 'react'
import Button from '@/components/ui/Button'
import {
  Check,
  Copy,
  FileText,
  Link2,
  Loader2,
  Sparkles,
  PenTool,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import type { InputMode } from '../lib/types'
import { generateAIPrompt } from '../lib/utils'
import JsonSplitter from './JsonSplitter'

interface InputSectionProps {
  // ... existing props
  inputMode: InputMode
  setInputMode: (mode: InputMode) => void
  text: string
  setText: (value: string) => void
  url: string
  setUrl: (value: string) => void
  jsonText: string
  setJsonText: (value: string) => void
  extracting: boolean
  onExtract: () => void
  promptCopied: boolean
  setPromptCopied: (copied: boolean) => void
}

export default function InputSection({
  inputMode,
  setInputMode,
  text,
  setText,
  url,
  setUrl,
  jsonText,
  setJsonText,
  extracting,
  onExtract,
  promptCopied,
  setPromptCopied,
}: InputSectionProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  return (
    <div className="space-y-2">
      <h2
        className="text-xl font-bold text-text-primary flex items-center justify-center gap-2 cursor-pointer py-2 hover:bg-bg-secondary/50 rounded-lg transition-colors select-none"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <PenTool className="w-6 h-6 text-accent" />
        수집 도구
        {isCollapsed ? (
          <ChevronDown className="w-5 h-5 text-text-tertiary" />
        ) : (
          <ChevronUp className="w-5 h-5 text-text-tertiary" />
        )}
      </h2>
      
      {!isCollapsed && (
        <div className="bg-bg-card border border-border rounded-xl p-4 space-y-4">
          <div className="flex rounded-lg border border-border overflow-hidden w-fit">
            <Button
              unstyled
              onClick={() => setInputMode('json')}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm ${
                inputMode === 'json'
                  ? 'bg-accent text-white'
                  : 'bg-bg-secondary text-text-secondary hover:text-text-primary'
              }`}
            >
              <FileText className="w-4 h-4" />
              JSON
            </Button>
            <Button
              unstyled
              onClick={() => setInputMode('text')}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm ${
                inputMode === 'text'
                  ? 'bg-accent text-white'
                  : 'bg-bg-secondary text-text-secondary hover:text-text-primary'
              }`}
            >
              <FileText className="w-4 h-4" />
              AI 텍스트
            </Button>
            <Button
              unstyled
              onClick={() => setInputMode('url')}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm ${
                inputMode === 'url'
                  ? 'bg-accent text-white'
                  : 'bg-bg-secondary text-text-secondary hover:text-text-primary'
              }`}
            >
              <Link2 className="w-4 h-4" />
              AI URL
            </Button>
          </div>

          {inputMode === 'text' && (
            <div className="space-y-2">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="기사나 인터뷰 내용을 붙여넣으세요..."
                rows={6}
                className="w-full px-4 py-3 bg-bg-secondary border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent focus:outline-none resize-none"
                disabled={extracting}
              />
              <p className="text-xs text-text-secondary">
                💡 긴 텍스트는 여러 번 나눠서 입력하면 더 정확한 결과를 얻을 수 있습니다.
              </p>
            </div>
          )}

          {inputMode === 'url' && (
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onExtract()}
              placeholder="https://example.com/interview/..."
              className="w-full px-4 py-3 bg-bg-secondary border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent focus:outline-none"
              disabled={extracting}
            />
          )}

          {inputMode === 'json' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    navigator.clipboard.writeText(generateAIPrompt())
                    setPromptCopied(true)
                    setTimeout(() => setPromptCopied(false), 2000)
                  }}
                >
                  {promptCopied ? (
                    <>
                      <Check className="w-4 h-4" />
                      복사됨
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      AI 프롬프트 복사
                    </>
                  )}
                </Button>
                <span className="text-xs text-text-secondary">
                  → ChatGPT/Claude에 붙여넣고 결과 JSON을 아래에 입력
                </span>
              </div>
              <textarea
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                placeholder={`[
  {
    "type": "BOOK",
    "title": "작품명(저자)",
    "body": "감상 경위 또는 리뷰 본문",
    "source": "https://원본소스URL"
  },
  {
    "type": "VIDEO",
    "title": "영화명(감독)",
    "body": "리뷰 본문",
    "source": "https://원본소스URL"
  }
]`}
                rows={12}
                className="w-full px-4 py-3 bg-bg-secondary border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent focus:outline-none resize-none font-mono text-sm"
                disabled={extracting}
              />
              <p className="text-xs text-text-secondary">
                💡 type: BOOK/VIDEO/GAME/MUSIC (필수), title: "작품명(저자)", body: 리뷰 (\n으로 개행), source: URL
              </p>
              
              <JsonSplitter jsonText={jsonText} />
            </div>
          )}

          <div className="flex justify-end">
            <Button
              onClick={onExtract}
              disabled={
                extracting ||
                (inputMode === 'url' && !url.trim()) ||
                (inputMode === 'text' && !text.trim()) ||
                (inputMode === 'json' && !jsonText.trim())
              }
            >
              {extracting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {inputMode === 'json' ? '파싱 중...' : '추출 중...'}
                </>
              ) : (
                <>
                  {inputMode === 'json' ? (
                    <FileText className="w-4 h-4" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  {inputMode === 'json' ? 'JSON 파싱' : 'AI 추출'}
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
