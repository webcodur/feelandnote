'use client'

import { useState, useCallback } from 'react'
import Button from '@/components/ui/Button'
import { RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react'

type RegenResult = { ok: boolean; measuredAt?: string; log?: string[]; error?: string }

export default function ReadinessReport() {
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<RegenResult | null>(null)
  const [iframeKey, setIframeKey] = useState(0)

  const regenerate = useCallback(async () => {
    setBusy(true)
    setResult(null)
    try {
      const res = await fetch('/api/celeb-readiness', { method: 'POST' })
      const data = (await res.json()) as RegenResult
      setResult(data)
      if (data.ok) setIframeKey((k) => k + 1)
    } catch (err) {
      setResult({ ok: false, error: err instanceof Error ? err.message : String(err) })
    } finally {
      setBusy(false)
    }
  }, [])

  const measured = result?.measuredAt
    ? new Date(result.measuredAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
    : null

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={regenerate} disabled={busy}>
          <RefreshCw className={`w-4 h-4 ${busy ? 'animate-spin' : ''}`} />
          {busy ? '갱신 중…' : '지금 갱신'}
        </Button>
        {result?.ok && (
          <span className="inline-flex items-center gap-1.5 text-sm text-green-400">
            <CheckCircle2 className="w-4 h-4" />
            갱신 완료{measured ? ` · ${measured}` : ''}
          </span>
        )}
        {result && !result.ok && (
          <span className="inline-flex items-center gap-1.5 text-sm text-red-400">
            <AlertTriangle className="w-4 h-4" />
            실패 · {result.error ?? '알 수 없는 오류'}
          </span>
        )}
      </div>

      {result && !result.ok && result.log && result.log.length > 0 && (
        <pre className="max-h-40 overflow-auto rounded-lg border border-border bg-bg-card p-3 text-xs text-text-secondary">
          {result.log.join('\n')}
        </pre>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-bg-card">
        <iframe
          key={iframeKey}
          src="/api/celeb-readiness"
          title="인물 데이터 준비도 보고서"
          className="h-[80vh] w-full bg-[#f1eee5]"
        />
      </div>
    </div>
  )
}