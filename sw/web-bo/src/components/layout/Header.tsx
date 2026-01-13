'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogOut, User, ChevronDown, Key } from 'lucide-react'
import Button from '@/components/ui/Button'
import ApiKeyManager from '@/components/ApiKeyManager'

interface HeaderProps {
  user: {
    email: string
    nickname?: string
    role?: string
  }
}

// 선택된 API 키 ID를 로컬스토리지에서 관리
const SELECTED_KEY_STORAGE = 'feelnnote_selected_api_key'

export default function Header({ user }: HeaderProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [keyManagerOpen, setKeyManagerOpen] = useState(false)
  const [selectedKeyId, setSelectedKeyId] = useState<string | null>(null)
  const router = useRouter()

  // 로컬스토리지에서 선택된 키 복원
  useEffect(() => {
    const stored = localStorage.getItem(SELECTED_KEY_STORAGE)
    if (stored) {
      setSelectedKeyId(stored)
    }
  }, [])

  function handleSelectKey(keyId: string | null) {
    setSelectedKeyId(keyId)
    if (keyId) {
      localStorage.setItem(SELECTED_KEY_STORAGE, keyId)
    } else {
      localStorage.removeItem(SELECTED_KEY_STORAGE)
    }
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <>
    <header className="h-16 bg-bg-secondary border-b border-border flex items-center justify-between px-6">
      {/* Left: Breadcrumb or title */}
      <div>
        <h1 className="text-lg font-medium text-text-primary">관리자 패널</h1>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        {/* API Key Manager Button */}
        <Button
          unstyled
          onClick={() => setKeyManagerOpen(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-bg-card text-text-secondary hover:text-text-primary"
          title="API 키 관리"
        >
          <Key className="w-4 h-4" />
          <span className="text-sm">API 키</span>
        </Button>

        {/* User menu */}
        <div className="relative">
        <Button
          unstyled
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-bg-card"
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
        </Button>

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
              <Button
                unstyled
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-4 py-3 text-sm text-danger hover:bg-bg-secondary"
              >
                <LogOut className="w-4 h-4" />
                로그아웃
              </Button>
            </div>
          </>
        )}
        </div>
      </div>
    </header>

    {/* API Key Manager Modal */}
    <ApiKeyManager
      isOpen={keyManagerOpen}
      onClose={() => setKeyManagerOpen(false)}
      selectedKeyId={selectedKeyId}
      onSelectKey={handleSelectKey}
    />
    </>
  )
}
