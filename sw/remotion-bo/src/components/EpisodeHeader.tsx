'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEpisode } from '@/lib/episode-context'

const BTN = 'px-3 py-1 rounded text-sm font-semibold'
const BTN_PRIMARY = `bg-accent text-bg-main ${BTN} hover:bg-accent-hover`
const BTN_SECONDARY = `bg-bg-card border border-border ${BTN} hover:bg-bg-hover`

/** 현재 path에서 sub-route(scenario/youtube/render/voice) 추출. 없으면 'scenario' */
function pickSubRoute(pathname: string, series: string, name: string): string {
  const prefix = `/${series}/${name}`
  if (!pathname.startsWith(prefix)) return 'scenario'
  const rest = pathname.slice(prefix.length).replace(/^\//, '')
  const seg = rest.split('/')[0]
  return seg || 'scenario'
}

export function EpisodeHeader() {
  const { series, name, isEn, episode, dirty, saving, save, reload } = useEpisode()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const withoutEn = isEn ? name.slice(0, -3) : name
  const partMatch = withoutEn.match(/-(\d+)$/)
  const partNum = partMatch ? parseInt(partMatch[1]) : 1
  const baseName = withoutEn.replace(/-\d+$/, '')
  // ko/en 토글에는 파트 접미사(-2, -3)를 보존해야 한다
  const counterpart = isEn ? withoutEn : `${withoutEn}-en`
  const [hasCounterpart, setHasCounterpart] = useState(false)

  useEffect(() => {
    fetch(`/api/${series}/episodes/${counterpart}`)
      .then(r => { setHasCounterpart(r.ok) })
      .catch(() => setHasCounterpart(false))
  }, [series, counterpart])

  if (!episode) return null

  // 현재 sub-route + 쿼리스트링을 KO/EN 토글에 보존
  const subRoute = pickSubRoute(pathname, series, name)
  const qs = searchParams.toString()
  const suffix = qs ? `?${qs}` : ''
  const koHref = `/${series}/${withoutEn}/${subRoute}${suffix}`
  const enHref = `/${series}/${withoutEn}-en/${subRoute}${suffix}`

  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold">
            {episode.host?.nickname ?? name}
            {((episode as Record<string, unknown>).series != null || partNum > 1) && (
              <span className="ml-2 text-sm font-medium text-accent">{partNum}편</span>
            )}
          </h1>
          <div className="flex rounded-md overflow-hidden border border-border text-xs">
            <Link href={koHref}
              className={`px-2 py-0.5 font-semibold transition-colors ${!isEn ? 'bg-blue-500/20 text-blue-400' : hasCounterpart ? 'text-text-dim hover:text-text-secondary' : 'text-text-dim/30 pointer-events-none'}`}>
              KO
            </Link>
            <Link href={enHref}
              className={`px-2 py-0.5 font-semibold transition-colors ${isEn ? 'bg-green-500/20 text-green-400' : hasCounterpart ? 'text-text-dim hover:text-text-secondary' : 'text-text-dim/30 pointer-events-none'}`}>
              EN
            </Link>
          </div>
        </div>
        <span className="text-sm text-text-secondary">{name} · {episode.books?.length ?? 0}권{episode.shorts ? ' · Shorts' : ''}</span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {dirty && <span className="text-xs text-warning-text">미저장</span>}
        <button onClick={() => save()} disabled={!dirty || saving}
          className={`${BTN_PRIMARY} ${!dirty ? 'opacity-40 cursor-default' : ''}`}>
          {saving ? '저장 중...' : '저장'}
        </button>
        <button onClick={reload} className={BTN_SECONDARY}>새로고침</button>
      </div>
    </div>
  )
}
