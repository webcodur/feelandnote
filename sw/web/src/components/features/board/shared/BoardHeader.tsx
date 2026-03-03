'use client'

import { Link, usePathname } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import { FileText, MessageSquare } from 'lucide-react'

const BOARD_TABS = [
  { href: '/agora/board/notice', labelKey: 'notice' as const, icon: FileText },
  { href: '/agora/board/feedback', labelKey: 'feedback' as const, icon: MessageSquare },
]

export default function BoardHeader() {
  const pathname = usePathname()
  const t = useTranslations('board.tabs')

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
              <span>{t(tab.labelKey)}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
