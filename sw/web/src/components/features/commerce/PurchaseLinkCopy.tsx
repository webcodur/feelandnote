'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { useTranslations } from 'next-intl'

/** 이동이 막힌 브라우저에서도 원래 구매·제휴 주소를 그대로 가져갈 수 있다. */
export default function PurchaseLinkCopy({ href }: { href: string }) {
  const t = useTranslations('content.access')
  const [state, setState] = useState<'idle' | 'copied' | 'manual'>('idle')
  const [manualUrl, setManualUrl] = useState('')
  const copy = async () => {
    const url = new URL(href, window.location.href).href
    try {
      await navigator.clipboard.writeText(url)
      setState('copied')
    } catch {
      setManualUrl(url)
      setState('manual')
    }
  }
  const Icon = state === 'copied' ? Check : Copy
  return <div className="mt-1 text-center">
    <button type="button" onClick={event => { event.stopPropagation(); void copy() }} title={t('copyLinkHelp')}
      className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-control px-3 text-xs text-text-secondary hover:bg-bg-raised hover:text-accent active:text-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
      <Icon className="size-3.5" aria-hidden="true" />
      <span aria-live="polite">{t(state === 'copied' ? 'linkCopied' : 'copyLink')}</span>
    </button>
    {state === 'manual' && <div className="mt-1 space-y-2">
      <p role="status" className="break-keep text-xs leading-relaxed text-text-secondary">{t('copyLinkManual')}</p>
      <input type="url" readOnly value={manualUrl} aria-label={t('copyLink')} autoFocus
        onFocus={event => event.currentTarget.select()} onClick={event => event.stopPropagation()}
        className="w-full min-w-0 rounded-control border border-line bg-bg-main px-2 py-2 text-xs text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" />
    </div>}
  </div>
}
