'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
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

      {/* 시리즈 현황 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {stats.map(s => (
          <Link key={s.id} href={`/${s.id}`}
            className="bg-bg-secondary border border-border rounded-lg p-4 hover:border-accent/30 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{s.icon}</span>
              <span className="font-semibold">{s.label}</span>
            </div>
            <div className="text-2xl font-bold text-accent mb-1">{s.synced}/{s.total}</div>
            <div className="text-xs text-text-secondary">
              <span className="text-success-text">● {s.synced}</span>
              <span className="mx-1.5 text-warning-text">◐ {s.voiced - s.synced}</span>
              <span className="text-text-dim">○ {s.total - s.voiced}</span>
            </div>
          </Link>
        ))}
      </div>

      <TaskPanel />
    </div>
  )
}
