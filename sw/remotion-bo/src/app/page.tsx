'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { SERIES } from '@/lib/series-registry'
import { TaskPanel } from '@/components/TaskPanel'

type SeriesStats = {
  id: string
  label: string
  icon: string
  total: number
  voiced: number
  synced: number
}

export default function DashboardPage() {
  const [stats, setStats] = useState<SeriesStats[]>([])
  const router = useRouter()

  useEffect(() => { document.title = 'Dashboard — Remotion BO' }, [])

  useEffect(() => {
    Promise.all(
      SERIES.map(async (s) => {
        try {
          const res = await fetch(`/api/${s.id}/episodes`)
          const eps = await res.json()
          return {
            id: s.id,
            label: s.label,
            icon: s.icon,
            total: eps.length,
            voiced: eps.filter((e: { voiceCount: number }) => e.voiceCount > 0).length,
            synced: eps.filter((e: { synced: boolean }) => e.synced).length,
          }
        } catch {
          return { id: s.id, label: s.label, icon: s.icon, total: 0, voiced: 0, synced: 0 }
        }
      })
    ).then(setStats)
  }, [])

  return (
    <div>
      <h1 className="text-xl font-bold mb-1">Dashboard</h1>
      <p className="text-sm text-text-secondary mb-6">영상 제작 관리</p>

      {/* 시리즈 현황 테이블 */}
      <div className="mb-8 overflow-x-auto border border-border rounded-lg bg-bg-secondary/20">
        <table className="w-full text-left border-collapse text-sm whitespace-nowrap">
          <thead>
            <tr className="border-b border-border text-text-secondary bg-bg-secondary/50">
              <th className="py-2 px-3 font-semibold w-12">아이콘</th>
              <th className="py-2 px-3 font-semibold">시리즈명</th>
              <th className="py-2 px-3 font-semibold text-right">총계</th>
              <th className="py-2 px-3 font-semibold text-right">진행 (● 완료 / ◐ 음성 / ○ 대기)</th>
            </tr>
          </thead>
          <tbody>
            {stats.map(s => (
              <tr key={s.id} className="group border-b border-border/50 hover:bg-bg-card cursor-pointer"
                  onClick={(e) => {
                    const target = e.target as HTMLElement
                    if (target.closest('a')) return
                    router.push(`/${s.id}`)
                  }}>
                <td className="py-3 px-3 align-middle text-lg">{s.icon}</td>
                <td className="py-3 px-3 align-middle font-semibold group-hover:text-accent transition-colors">
                  <Link href={`/${s.id}`}>{s.label}</Link>
                </td>
                <td className="py-3 px-3 align-middle text-right">
                  <span className="text-accent font-bold">{s.synced}</span> / {s.total}
                </td>
                <td className="py-3 px-3 align-middle text-right text-xs">
                  <span className="text-success-text">● {s.synced}</span>
                  <span className="mx-2 text-warning-text">◐ {s.voiced - s.synced}</span>
                  <span className="text-text-dim">○ {s.total - s.voiced}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <TaskPanel />
    </div>
  )
}
