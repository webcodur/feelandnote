'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  Star,
  Library,
  FileText,
  Flag,
  Award,
  Settings,
  Activity,
  BookOpen,
  StickyNote,
  ListMusic,
  Layers,
  Gamepad2,
  Trophy,
  BarChart3,
  Calendar,
  Menu,
  X,
} from 'lucide-react'
import { useMobileSidebar } from '@/contexts/MobileSidebarContext'

const menuItems = [
  { href: '/', label: '대시보드', icon: LayoutDashboard },
  { href: '/users', label: '유저 관리', icon: Users },
  { href: '/celebs', label: '셀럽 관리', icon: Star },
  { href: '/today-figure', label: '오늘의 인물', icon: Calendar },
  { href: '/contents', label: '콘텐츠 관리', icon: Library },
  { href: '/records', label: '기록 관리', icon: FileText },
  { href: '/notes', label: '노트 관리', icon: StickyNote },
  { href: '/playlists', label: '플레이리스트', icon: ListMusic },
  { href: '/tier-lists', label: '티어 리스트', icon: Layers },
  { href: '/guestbooks', label: '방명록', icon: BookOpen },
  { href: '/reports', label: '신고 관리', icon: Flag },
  { href: '/titles', label: '칭호 관리', icon: Award },
  { href: '/scores', label: '점수/랭킹', icon: Trophy },
  { href: '/blind-game', label: '블라인드 게임', icon: Gamepad2 },
  { href: '/activity-logs', label: '활동 로그', icon: Activity },
  { href: '/api-usage', label: 'API 사용량', icon: BarChart3 },
  { href: '/settings', label: '설정', icon: Settings },
]

function SidebarContent({ onItemClick, collapsed, onToggle }: { onItemClick?: () => void; collapsed?: boolean; onToggle?: () => void }) {
  const pathname = usePathname()

  return (
    <>
      {/* Header */}
      <div className="p-4 md:p-6 border-b border-border flex items-center gap-3">
        {onToggle ? (
          <button
            onClick={onToggle}
            className="p-1.5 rounded-lg hover:bg-bg-card text-text-secondary shrink-0"
            title="사이드바 접기/펼치기 (Ctrl+B)"
          >
            <Menu className="w-5 h-5" />
          </button>
        ) : (
          <Menu className="w-5 h-5 text-text-secondary shrink-0" />
        )}
        {!collapsed && (
          <Link href="/" className="text-xl font-bold text-text-primary whitespace-nowrap" onClick={onItemClick}>
            FEEL&NOTE
          </Link>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 md:p-4 overflow-y-auto">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(item.href))
            const Icon = item.icon

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onItemClick}
                  className={`
                    flex items-center ${collapsed ? 'justify-center' : 'gap-3'} px-3 md:px-4 py-2.5 md:py-3 rounded-lg
                    ${isActive
                      ? 'bg-accent/10 text-accent'
                      : 'text-text-secondary hover:bg-bg-card hover:text-text-primary'
                    }
                  `}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  {!collapsed && <span className="text-sm md:text-base">{item.label}</span>}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="p-4 border-t border-border">
          <p className="text-xs text-text-secondary text-center">
            Feel&Note Admin v0.1
          </p>
        </div>
      )}
    </>
  )
}

// 데스크톱 사이드바
export function DesktopSidebar() {
  const { desktopCollapsed, toggleDesktop } = useMobileSidebar()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'B' || e.key === 'ㅠ')) {
        e.preventDefault()
        toggleDesktop()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toggleDesktop])

  return (
    <aside className={`
      hidden md:flex bg-bg-secondary border-r border-border min-h-screen flex-col shrink-0
      ${desktopCollapsed ? 'w-16' : 'w-64'}
    `}>
      <SidebarContent collapsed={desktopCollapsed} onToggle={toggleDesktop} />
    </aside>
  )
}

// 모바일 사이드바 (Drawer)
export function MobileSidebar() {
  const { isOpen, close } = useMobileSidebar()

  if (!isOpen) return null

  return (
    <div className="md:hidden fixed inset-0 z-50">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={close}
      />

      {/* Drawer */}
      <aside className="absolute left-0 top-0 bottom-0 w-72 bg-bg-secondary flex flex-col animate-slide-in-left">
        {/* Close button */}
        <button
          onClick={close}
          className="absolute top-4 right-4 p-2 rounded-lg hover:bg-bg-card text-text-secondary"
        >
          <X className="w-5 h-5" />
        </button>

        <SidebarContent onItemClick={close} />
      </aside>
    </div>
  )
}

// 기존 호환성을 위한 기본 export
export default function Sidebar() {
  return <DesktopSidebar />
}
