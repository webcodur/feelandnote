'use client'

import { useRouter, usePathname } from 'next/navigation'
import { FileText, MessageSquare } from 'lucide-react'
import { Tab, Tabs } from '@/components/ui/Tab'

const BOARD_TABS = [
  { href: '/board/notice', label: '공지사항', icon: <FileText size={16} /> },
  { href: '/board/feedback', label: '피드백', icon: <MessageSquare size={16} /> },
]

export default function BoardHeader() {
  const router = useRouter()
  const pathname = usePathname()

  const handleTabChange = (href: string) => {
    router.push(href)
  }

  return (
    <div className="relative w-full mb-8">
      {/* 모바일 페이드 효과 */}
      <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-bg-main to-transparent z-10 pointer-events-none md:hidden" />
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-bg-main to-transparent z-10 pointer-events-none md:hidden" />

      <div className="overflow-x-auto overflow-y-hidden scrollbar-hidden px-2 sm:px-4">
        <Tabs className="min-w-max border-b border-accent-dim/10 justify-center">
          {BOARD_TABS.map((tab) => {
            const isActive = pathname.startsWith(tab.href)
            return (
              <Tab
                key={tab.href}
                active={isActive}
                onClick={() => handleTabChange(tab.href)}
                className="group whitespace-nowrap px-1.5 sm:px-4"
                label={
                  <span className="flex items-center gap-1 sm:gap-2 py-0.5 sm:py-1">
                    <span className={`transition-transform duration-300 ${isActive ? 'scale-105 text-accent' : 'text-text-secondary opacity-70'}`}>
                      <span className="scale-75 sm:scale-100">{tab.icon}</span>
                    </span>
                    <span className={`font-serif tracking-normal sm:tracking-widest text-[11px] sm:text-base ${isActive ? 'font-black text-accent' : 'font-medium text-text-secondary'}`}>
                      {tab.label}
                    </span>
                  </span>
                }
              />
            )
          })}
        </Tabs>
      </div>
    </div>
  )
}
