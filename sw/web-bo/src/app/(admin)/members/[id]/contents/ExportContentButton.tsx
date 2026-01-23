'use client'

import { useState } from 'react'
import { Download, Loader2, X, Check, Copy } from 'lucide-react'
import Button from '@/components/ui/Button'
import { exportCelebContents } from '@/actions/admin/celebs'
import { CONTENT_TYPES, CONTENT_TYPE_CONFIG, type ContentType } from '@/constants/contentTypes'

interface Props {
  celebId: string
}

const TYPE_OPTIONS = [
  { value: 'ALL', label: '전체' },
  ...CONTENT_TYPES.map((type) => ({ value: type, label: CONTENT_TYPE_CONFIG[type].label })),
]

export default function ExportContentButton({ celebId }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedType, setSelectedType] = useState<string>('ALL')
  const [result, setResult] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleExport() {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await exportCelebContents(celebId, selectedType)
      if (!response.success) throw new Error(response.error)

      const json = JSON.stringify(response.items, null, 2)
      setResult(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : '추출에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  async function handleCopy() {
    if (!result) return
    await navigator.clipboard.writeText(result)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleClose() {
    setIsOpen(false)
    setResult(null)
    setError(null)
    setCopied(false)
  }

  return (
    <>
      <Button variant="secondary" onClick={() => setIsOpen(true)}>
        <Download className="w-4 h-4" />
        추출
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-bg-card border border-border rounded-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-semibold text-text-primary">콘텐츠 추출</h2>
              <button
                onClick={handleClose}
                className="p-2 text-text-secondary hover:text-text-primary hover:bg-bg-secondary rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-4">
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
                  {error}
                </div>
              )}

              {!result ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-text-secondary">카테고리 선택</label>
                    <select
                      value={selectedType}
                      onChange={(e) => setSelectedType(e.target.value as ContentType | 'ALL')}
                      className="w-full px-4 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary focus:border-accent focus:outline-none"
                    >
                      {TYPE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="text-xs text-text-secondary">
                    선택한 카테고리의 콘텐츠를 JSON 형식으로 추출한다. 수집 기능과 동일한 형식이다.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-text-secondary">
                      {JSON.parse(result).length}개 콘텐츠
                    </span>
                    <Button size="sm" variant="secondary" onClick={handleCopy}>
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copied ? '복사됨' : '복사'}
                    </Button>
                  </div>
                  <textarea
                    readOnly
                    value={result}
                    rows={15}
                    className="w-full px-4 py-3 bg-bg-secondary border border-border rounded-lg text-text-primary font-mono text-xs resize-none focus:outline-none"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 p-4 border-t border-border">
              <Button type="button" variant="secondary" onClick={handleClose}>
                닫기
              </Button>
              {!result && (
                <Button onClick={handleExport} disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      추출 중...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      추출
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
