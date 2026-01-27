import { useState, useMemo } from 'react'
import Button from '@/components/ui/Button'
import { Download, Scissors, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react'

interface JsonSplitterProps {
  jsonText: string
}

export default function JsonSplitter({ jsonText }: JsonSplitterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedChunkSize, setSelectedChunkSize] = useState<number | null>(null)
  const [copiedChunkIndex, setCopiedChunkIndex] = useState<number | null>(null)

  const { isValid, totalCount, divisors, parsedData } = useMemo(() => {
    try {
      if (!jsonText.trim()) return { isValid: false, totalCount: 0, divisors: [], parsedData: [] }
      const data = JSON.parse(jsonText)
      if (!Array.isArray(data)) return { isValid: false, totalCount: 0, divisors: [], parsedData: [] }
      
      const total = data.length
      if (total <= 1) return { isValid: true, totalCount: total, divisors: [], parsedData: data }

      const divs = [5, 10, 20]
      return { isValid: true, totalCount: total, divisors: divs, parsedData: data }
    } catch {
      return { isValid: false, totalCount: 0, divisors: [], parsedData: [] }
    }
  }, [jsonText])

  const chunks = useMemo(() => {
    if (!selectedChunkSize || !parsedData || parsedData.length === 0) return []
    const result = []
    for (let i = 0; i < parsedData.length; i += selectedChunkSize) {
      result.push(parsedData.slice(i, i + selectedChunkSize))
    }
    return result
  }, [selectedChunkSize, parsedData])

  if (!isValid || totalCount <= 1) {
    if (jsonText.trim() && !isValid) {
      return (
        <div className="mt-2 text-xs text-red-500">
          ⚠️ 유효하지 않은 JSON 형식입니다.
        </div>
      )
    }
    return null
  }

  const handleDownload = (chunk: any[], index: number) => {
    const blob = new Blob([JSON.stringify(chunk, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `split_part_${index + 1}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleCopy = (chunk: any[], index: number) => {
    navigator.clipboard.writeText(JSON.stringify(chunk, null, 2))
    setCopiedChunkIndex(index)
    setTimeout(() => setCopiedChunkIndex(null), 2000)
  }

  return (
    <div className="mt-4 border border-border rounded-lg bg-bg-secondary/20 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 text-sm font-medium text-text-secondary hover:bg-bg-secondary/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Scissors className="w-4 h-4 text-accent" />
          <span>JSON 분할 도구 (총 {totalCount}개 항목)</span>
        </div>
        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {isOpen && (
        <div className="p-3 border-t border-border space-y-4">
          <div className="space-y-2">
            <span className="text-xs text-text-secondary">자를 단위(개수)를 선택하세요:</span>
            <div className="flex flex-wrap gap-2">
              {divisors.map((size) => (
                <button
                  key={size}
                  onClick={() => setSelectedChunkSize(size)}
                  className={`px-3 py-1.5 text-xs rounded border transition-colors ${
                    selectedChunkSize === size
                      ? 'bg-accent text-white border-accent'
                      : 'bg-bg-card border-border hover:border-accent text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {size}개씩 ({Math.ceil(totalCount / size)} 묶음)
                </button>
              ))}
            </div>
          </div>

          {selectedChunkSize && chunks.length > 0 && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-text-primary">
                  분할된 결과 ({chunks.length}개 파일):
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto custom-scrollbar">
                {chunks.map((chunk, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded bg-bg-card border border-border text-xs"
                  >
                    <span className="text-text-secondary">
                      Part {idx + 1} ({chunk.length}개)
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleCopy(chunk, idx)}
                        className="h-6 w-6 p-0"
                        title="복사"
                      >
                         {copiedChunkIndex === idx ? (
                           <Check className="w-3 h-3 text-green-500" />
                         ) : (
                           <Copy className="w-3 h-3" />
                         )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDownload(chunk, idx)}
                        className="h-6 w-6 p-0"
                        title="다운로드"
                      >
                        <Download className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
