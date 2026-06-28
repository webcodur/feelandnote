'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function Header() {
  const pathname = usePathname()

  return (
    <header className="relative h-11 border-b border-border flex items-center px-4 gap-4 shrink-0">
      <Link href="/" className="text-sm font-bold text-accent tracking-wide">
        Remotion BO
      </Link>
      <Link href="/search"
        className={`text-xs px-2.5 py-1 rounded transition-colors ${
          pathname === '/search' ? 'bg-bg-card text-text-primary' : 'text-text-secondary hover:text-text-primary'
        }`}>
        인물 검색
      </Link>
      <div className="flex-1" />
      <Link href="/guide"
        className={`text-xs px-2.5 py-1 rounded transition-colors ${
          pathname === '/guide' ? 'bg-bg-card text-text-primary' : 'text-text-dim hover:text-text-secondary'
        }`}>
        가이드
      </Link>
    </header>
  )
}
