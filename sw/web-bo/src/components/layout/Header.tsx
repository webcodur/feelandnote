'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogOut, User, ChevronDown } from 'lucide-react'

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

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="h-16 bg-bg-secondary border-b border-border flex items-center justify-between px-6">
      {/* Left: Breadcrumb or title */}
      <div>
        <h1 className="text-lg font-medium text-text-primary">관리자 패널</h1>
      </div>

      {/* Right: User menu */}
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-bg-card transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
            <User className="w-4 h-4 text-accent" />
          </div>
          <div className="text-left">
            <p className="text-sm font-medium text-text-primary">
              {user.nickname || user.email.split('@')[0]}
            </p>
            <p className="text-xs text-text-secondary capitalize">
              {user.role || 'admin'}
            </p>
          </div>
          <ChevronDown className={`w-4 h-4 text-text-secondary transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute right-0 mt-2 w-48 bg-bg-card border border-border rounded-lg shadow-lg z-20">
              <div className="p-3 border-b border-border">
                <p className="text-sm text-text-primary truncate">{user.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-4 py-3 text-sm text-danger hover:bg-bg-secondary transition-colors"
              >
                <LogOut className="w-4 h-4" />
                로그아웃
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  )
}
