'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

type EpisodeR2 = {
  name: string
  files: number
  sizeMB: number
  r2Synced: number
  r2Total: number
  engines: string[]
}

type R2Data = {
  totalFiles: number
  totalSizeMB: number
  episodes: EpisodeR2[]
}

const R2_FREE_LIMIT_GB = 10

function statusIcon(ep: EpisodeR2) {
  if (ep.name === 'common') return '\u2014'
  if (ep.r2Total === 0) return <span className="text-text-dim">\u25CB</span>
  if (ep.r2Synced >= ep.files) return <span className="text-success-text">\u25CF</span>
  return <span className="text-warning-text">\u26A0</span>
}

export default function R2OverviewPage() {
  const [data, setData] = useState<R2Data | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(() => {
    setLoading(true)
    fetch('/api/infra/r2')
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  useEffect(refresh, [refresh])

  const pct = data ? +((data.totalSizeMB / 1024 / R2_FREE_LIMIT_GB) * 100).toFixed(1) : 0

  return (
    <div>
      <h1 className="text-xl font-bold mb-1">R2 Storage</h1>
      <p className="text-sm text-text-secondary mb-6">음성 파일 저장소 현황</p>

      {loading && !data && (
        <div className="text-text-secondary text-sm py-8 text-center">스캔 중...</div>
      )}

      {data && (
        <>
          {/* Summary */}
          <div className="bg-bg-secondary border border-border rounded-lg p-5 mb-6">
            <div className="text-sm text-text-secondary mb-2">
              전체: <span className="text-text-primary font-semibold">{data.totalSizeMB}MB</span>
              {' \u00B7 '}
              <span className="text-text-primary font-semibold">{data.totalFiles}</span> files
              {' \u00B7 '}
              R2 무료 한도 {R2_FREE_LIMIT_GB}GB
            </div>

            {/* Progress bar */}
            <div className="w-full bg-bg-card rounded-full h-3 overflow-hidden">
              <div
                className="h-full rounded-full bg-accent transition-all"
                style={{ width: `${Math.min(pct, 100)}%` }}
              />
            </div>
            <div className="text-xs text-text-dim mt-1">{pct}% 사용</div>
          </div>

          {/* Episode table */}
          <h2 className="text-sm font-bold text-text-secondary mb-3">에피소드별 사용량</h2>
          <div className="bg-bg-secondary border border-border rounded-lg overflow-hidden mb-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-text-dim text-xs border-b border-border">
                  <th className="text-left px-4 py-2 font-medium">에피소드</th>
                  <th className="text-right px-4 py-2 font-medium">파일</th>
                  <th className="text-right px-4 py-2 font-medium">용량</th>
                  <th className="text-center px-4 py-2 font-medium">R2 상태</th>
                  <th className="text-left px-4 py-2 font-medium">엔진</th>
                </tr>
              </thead>
              <tbody>
                {data.episodes.map(ep => (
                  <tr key={ep.name} className="border-b border-border/50 hover:bg-bg-hover transition-colors">
                    <td className="px-4 py-2.5">
                      {ep.name === 'common' ? (
                        <span className="text-text-secondary">{ep.name}</span>
                      ) : (
                        <Link
                          href={`/book-recommend/${ep.name}`}
                          className="text-accent hover:text-accent-hover transition-colors"
                        >
                          {ep.name}
                        </Link>
                      )}
                    </td>
                    <td className="text-right px-4 py-2.5 tabular-nums">{ep.files}</td>
                    <td className="text-right px-4 py-2.5 tabular-nums">{ep.sizeMB}MB</td>
                    <td className="text-center px-4 py-2.5">
                      <span className="mr-1.5">{statusIcon(ep)}</span>
                      {ep.name !== 'common' && (
                        <span className="text-xs text-text-secondary tabular-nums">
                          {ep.r2Synced}/{ep.r2Total}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-text-secondary text-xs">
                      {ep.engines.length > 0 ? ep.engines.join(', ') : '\u2014'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={refresh}
              disabled={loading}
              className="px-4 py-2 text-sm bg-bg-secondary border border-border rounded-lg hover:border-accent/30 transition-colors disabled:opacity-50"
            >
              {loading ? '스캔 중...' : '새로고침'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
