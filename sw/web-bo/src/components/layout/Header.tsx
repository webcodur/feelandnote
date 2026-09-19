'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/db/client'
import { LogOut, User, ChevronDown, Menu } from 'lucide-react'
import Button from '@/components/ui/Button'
import { useMobileSidebar } from '@/contexts/MobileSidebarContext'

interface HeaderProps {
  user: {
    email: string
    nickname?: string
    role?: string
  }
}

export default function Header({ user }: HeaderProps) {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()
  const { toggle } = useMobileSidebar()

  const handleLogout = async () => {
    const db = createClient()
    await db.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="flex h-11 items-center justify-between border-b border-border bg-bg-secondary px-3 md:px-5">
      {/* Left: Menu button + Title */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* 모바일 메뉴 버튼 */}
        <button
          onClick={toggle}
          className="-ml-1 rounded-lg p-1.5 text-text-secondary hover:bg-bg-card md:hidden"
          title="메뉴 열기"
        >
          <Menu className="h-5 w-5" />
        </button>

        <h1 className="text-sm font-medium text-text-primary">관리자 패널</h1>
      </div>

      {/* Right: User menu */}
      <div className="relative">
        <Button
          unstyled
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-bg-card"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/20">
            <User className="h-3.5 w-3.5 text-accent" />
          </div>
          <span className="hidden text-xs font-medium text-text-primary md:inline">
            {user.nickname || user.email.split('@')[0]}
          </span>
          <ChevronDown className={`hidden h-3.5 w-3.5 text-text-secondary md:block ${isOpen ? 'rotate-180' : ''}`} />
        </Button>

        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute right-0 z-20 mt-1 w-48 rounded-lg border border-border bg-bg-card shadow-lg">
              <div className="border-b border-border p-3">
                <p className="truncate text-sm text-text-primary">{user.email}</p>
                <p className="text-xs capitalize text-text-secondary">
                  {user.role || 'admin'}
                </p>
              </div>
              <Button
                unstyled
                onClick={handleLogout}
                className="flex w-full items-center gap-2 px-4 py-3 text-sm text-danger hover:bg-bg-secondary"
              >
                <LogOut className="h-4 w-4" />
                로그아웃
              </Button>
            </div>
          </>
        )}
      </div>
    </header>
  )
}
