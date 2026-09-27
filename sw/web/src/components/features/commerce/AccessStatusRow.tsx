'use client'

import { Loader2, CircleAlert } from 'lucide-react'

/** 조회 중·조회 실패·연결 없음도 링크와 동일한 한 줄 높이를 유지한다. */
export default function AccessStatusRow({ name, description, loading = false, failed = false }: {
  name: string; description: string; loading?: boolean; failed?: boolean
}) {
  return <div role="status" aria-label={`${name} · ${description}`} title={description}
    className="relative flex h-[46px] min-w-0 items-center justify-center rounded-md border border-border bg-bg-main/30 px-9 text-center">
    <span aria-hidden className={`truncate text-sm font-semibold ${loading || failed ? 'text-text-secondary' : 'text-text-secondary/70 line-through decoration-text-secondary/50'}`}>{name}</span>
    {loading && <Loader2 size={15} aria-hidden className="absolute end-3 animate-spin text-text-secondary motion-reduce:animate-none" />}
    {failed && <CircleAlert size={15} aria-hidden className="absolute end-3 text-text-secondary" />}
  </div>
}
