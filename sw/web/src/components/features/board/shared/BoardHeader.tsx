'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const BOARD_TABS = [
  { href: '/board/notice', label: '공지사항' },
  { href: '/board/feedback', label: '피드백' },
]

export default function BoardHeader() {
  const pathname = usePathname()

  return (
    <div className="flex items-center gap-1 border-b border-border mb-6">
      {BOARD_TABS.map((tab) => {
        const isActive = pathname.startsWith(tab.href)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`
              px-4 py-3 text-sm font-medium border-b-2 -mb-px
              ${isActive
                ? 'border-accent text-accent'
                : 'border-transparent text-text-secondary hover:text-text-primary'
              }
            `}
          >
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
