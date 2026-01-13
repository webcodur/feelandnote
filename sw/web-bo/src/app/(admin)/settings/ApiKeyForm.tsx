'use client'

import { useState } from 'react'
import { saveGeminiApiKey } from '@/actions/admin/settings'
import { Key, Eye, EyeOff, Loader2, Check } from 'lucide-react'
import Button from '@/components/ui/Button'

interface Props {
  initialApiKey: string | null
}

export default function ApiKeyForm({ initialApiKey }: Props) {
  const [apiKey, setApiKey] = useState(initialApiKey || '')
  const [showKey, setShowKey] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    if (!apiKey.trim()) return

    setSaving(true)
    setError(null)
    setSaved(false)

    try {
      const result = await saveGeminiApiKey({ geminiApiKey: apiKey.trim() })

      if (!result.success) {
        throw new Error(result.error)
      }

      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const hasChanged = apiKey !== (initialApiKey || '')

  return (
    <div className="bg-bg-card border border-border rounded-xl p-6">
      <div className="flex items-start gap-4 mb-4">
        <div className="p-3 rounded-lg bg-accent/10">
          <Key className="w-6 h-6 text-accent" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-text-primary">AI API 키 설정</h3>
          <p className="text-sm text-text-secondary mt-1">
            AI 콘텐츠 수집에 사용할 Gemini API 키를 설정합니다
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Gemini API Key
          </label>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full px-4 py-2 pr-10 bg-bg-secondary border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent focus:outline-none font-mono text-sm"
            />
            <Button
              unstyled
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
          </div>
          <p className="text-xs text-text-secondary mt-2">
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              Google AI Studio
            </a>
            에서 API 키를 발급받을 수 있습니다.
          </p>
        </div>

        <div className="flex items-center justify-end pt-2">
          <Button
            onClick={handleSave}
            disabled={saving || !apiKey.trim() || !hasChanged}
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                저장 중...
              </>
            ) : saved ? (
              <>
                <Check className="w-4 h-4" />
                저장됨
              </>
            ) : (
              '저장'
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
