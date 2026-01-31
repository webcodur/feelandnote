'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FileText, MessageSquare } from 'lucide-react'

const BOARD_TABS = [
  { href: '/lounge/board/notice', label: '공지사항', icon: FileText },
  { href: '/lounge/board/feedback', label: '피드백', icon: MessageSquare },
]

export default function BoardHeader() {
  const pathname = usePathname()

  return (
    <div className="mb-8">
      <div className="flex gap-2 p-1 bg-white/5 rounded-xl overflow-x-auto scrollbar-hidden">
        {BOARD_TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = pathname.startsWith(tab.href)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`
                flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium text-sm whitespace-nowrap
                ${isActive
                  ? "bg-accent text-bg-main"
                  : "text-text-secondary hover:text-text-primary hover:bg-white/5"
                }
              `}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
