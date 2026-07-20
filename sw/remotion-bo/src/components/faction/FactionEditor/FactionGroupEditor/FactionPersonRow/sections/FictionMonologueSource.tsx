'use client'

import { useEffect, useState } from 'react'

type MonologueSource = {
  name: string
  monologue: string
}

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; source: MonologueSource }
  | { status: 'empty' }
  | { status: 'error' }

const valueCache = new Map<string, MonologueSource | null>()
const requestCache = new Map<string, Promise<MonologueSource | null>>()

function loadMonologue(slug: string): Promise<MonologueSource | null> {
  if (valueCache.has(slug)) return Promise.resolve(valueCache.get(slug) ?? null)

  const pending = requestCache.get(slug)
  if (pending) return pending

  const request = fetch(`/api/celebs/${encodeURIComponent(slug)}?monologueOnly=1`)
    .then(async response => {
      if (!response.ok) throw new Error(`가상 독백 조회 실패: ${response.status}`)
      const body = await response.json() as {
        profile?: { nickname?: unknown; virtual_monologue?: unknown }
      }
      const raw = body.profile?.virtual_monologue
      const monologue = typeof raw === 'string' ? raw.trim() : ''
      const source = monologue
        ? {
            name: typeof body.profile?.nickname === 'string' ? body.profile.nickname : slug,
            monologue,
          }
        : null
      valueCache.set(slug, source)
      return source
    })
    .finally(() => requestCache.delete(slug))

  requestCache.set(slug, request)
  return request
}

export function FictionMonologueSource({ slug }: { slug: string }) {
  const cached = valueCache.get(slug)
  const [state, setState] = useState<LoadState>(() => cached === undefined
    ? { status: 'loading' }
    : cached
      ? { status: 'ready', source: cached }
      : { status: 'empty' })
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    setState({ status: 'loading' })
    loadMonologue(slug)
      .then(source => {
        if (!active) return
        setState(source ? { status: 'ready', source } : { status: 'empty' })
      })
      .catch(() => {
        if (active) setState({ status: 'error' })
      })
    return () => { active = false }
  }, [slug, attempt])

  if (state.status === 'empty') {
    return (
      <div className="flex items-center gap-2 rounded-md border border-warning/50 bg-warning/5 px-3 py-2 text-xs text-warning-text">
        <span className="font-semibold">가상 독백 원문</span>
        <span>DB에 아직 작성된 독백이 없습니다.</span>
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div className="flex items-center justify-between gap-2 rounded-md border border-danger/40 bg-danger/5 px-3 py-2 text-xs text-danger-text">
        <span>가상 독백 원문을 불러오지 못했습니다.</span>
        <button
          type="button"
          onClick={() => {
            valueCache.delete(slug)
            requestCache.delete(slug)
            setAttempt(value => value + 1)
          }}
          className="rounded border border-danger/50 px-2 py-1 font-semibold hover:bg-danger hover:text-white"
        >
          다시 시도
        </button>
      </div>
    )
  }

  if (state.status === 'loading') {
    return <div className="rounded-md border border-border bg-bg-main/40 px-3 py-2 text-xs text-text-dim">가상 독백 원문을 불러오는 중입니다.</div>
  }

  const { source } = state
  return (
    <div className="overflow-hidden rounded-md border border-border bg-bg-main/40">
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <button
          type="button"
          onClick={() => setOpen(value => !value)}
          className="min-w-0 flex-1 text-left text-xs font-semibold text-text-secondary hover:text-accent"
          aria-expanded={open}
        >
          {open ? '▾' : '▸'} 가상 독백 원문 · {source.name}
        </button>
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(source.monologue)
            setCopied(true)
          }}
          className="shrink-0 rounded border border-border px-2 py-1 text-[11px] font-semibold text-text-secondary hover:border-accent hover:bg-accent/10 hover:text-accent"
        >
          {copied ? '복사됨' : '원문 복사'}
        </button>
      </div>
      {open ? (
        <div className="border-t border-border px-3 py-3">
          <p className="mb-2 text-[11px] leading-relaxed text-text-dim">
            전체를 요약하지 말고, 이번 대사에 필요한 갈등 한 축만 골라 압축합니다. 새 사실이나 새 철학은 여기서 덧붙이지 않습니다.
          </p>
          <p className="max-h-72 overflow-y-auto whitespace-pre-wrap text-[13px] leading-6 text-text-primary">
            {source.monologue}
          </p>
        </div>
      ) : null}
    </div>
  )
}
