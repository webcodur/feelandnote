'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { label: 'Scenario', segment: 'scenario' },
  { label: 'YouTube', segment: 'youtube' },
  { label: 'Cards', segment: 'cards' },
] as const

export function TabNav({ basePath }: { basePath: string }) {
  const pathname = usePathname()

  return (
    <nav className="flex gap-1 border-b border-border">
      {TABS.map(t => {
        const href = `${basePath}/${t.segment}`
        const active = pathname.startsWith(href)
        return (
          <Link key={t.segment} href={href}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
              active ? 'border-accent text-accent' : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}>
            {t.label}
          </Link>
        )
      })}
    </nav>
  )
}
