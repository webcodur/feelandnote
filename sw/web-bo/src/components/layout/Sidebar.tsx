'use client'

import { useEffect, useState, useCallback } from 'react'
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
  ChevronDown,
  Megaphone,
  MonitorCog,
  Sparkles,
  Brain,
  Dices,
  Radar,
  Target,
  Flame,
  Volume2,
  type LucideIcon,
} from 'lucide-react'
import { useMobileSidebar } from '@/contexts/MobileSidebarContext'

type MenuItem = { href: string; label: string; icon: LucideIcon }
type MenuGroup = {
  key: string
  label: string
  icon: LucideIcon
  href?: string
  children?: MenuItem[]
}

const menuGroups: MenuGroup[] = [
  { key: 'dashboard', label: '대시보드', icon: LayoutDashboard, href: '/' },
  {
    key: 'celebs', label: '셀럽', icon: Star,
    children: [
      { href: '/celebs', label: '목록', icon: Star },
      { href: '/celebs/titles', label: '수식어', icon: Sparkles },
      { href: '/celebs/professions', label: '직군', icon: Target },
      { href: '/celebs/tags', label: '태그', icon: Layers },
      { href: '/celebs/philosophies', label: '감상 편력', icon: Brain },
      { href: '/celebs/vectors', label: '페르소나', icon: Radar },
      { href: '/celebs/influence', label: '영향력', icon: Flame },
      { href: '/celebs/voice-gen', label: '대사/음성', icon: Volume2 },
      { href: '/celebs/stats', label: '통계', icon: BarChart3 },
    ],
  },
  {
    key: 'users', label: '유저', icon: Users,
    children: [
      { href: '/users', label: '목록', icon: Users },
    ],
  },
  {
    key: 'contents', label: '콘텐츠', icon: Library,
    children: [
      { href: '/contents', label: '콘텐츠 관리', icon: Library },
      { href: '/records', label: '기록', icon: FileText },
      { href: '/notes', label: '노트', icon: StickyNote },
      { href: '/playlists', label: '플레이리스트', icon: ListMusic },
    ],
  },
  {
    key: 'games', label: '게임', icon: Gamepad2,
    children: [
      { href: '/blind-game', label: '블라인드 게임', icon: Dices },
      { href: '/scores', label: '점수/랭킹', icon: Trophy },
      { href: '/tier-lists', label: '티어 리스트', icon: Layers },
    ],
  },
  {
    key: 'operations', label: '운영', icon: Megaphone,
    children: [
      { href: '/today-figure', label: '오늘의 인물', icon: Calendar },
      { href: '/guestbooks', label: '방명록', icon: BookOpen },
      { href: '/reports', label: '신고 관리', icon: Flag },
      { href: '/titles', label: '칭호 관리', icon: Award },
    ],
  },
  {
    key: 'system', label: '시스템', icon: MonitorCog,
    children: [
      { href: '/activity-logs', label: '활동 로그', icon: Activity },
      { href: '/api-usage', label: 'API 사용량', icon: BarChart3 },
      { href: '/settings', label: '설정', icon: Settings },
    ],
  },
]

function isGroupActive(group: MenuGroup, pathname: string): boolean {
  if (group.href) return pathname === group.href
  return group.children?.some(c =>
    pathname === c.href || (c.href !== '/' && pathname.startsWith(c.href + '/'))
  ) ?? false
}

function getInitialOpen(pathname: string): Set<string> {
  const open = new Set<string>()
  for (const group of menuGroups) {
    if (group.children && isGroupActive(group, pathname)) {
      open.add(group.key)
    }
  }
  return open
}

function SidebarContent({ onItemClick, collapsed, onToggle }: { onItemClick?: () => void; collapsed?: boolean; onToggle?: () => void }) {
  const pathname = usePathname()
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => getInitialOpen(pathname))

  // 페이지 이동 시 해당 그룹 자동 펼침
  useEffect(() => {
    setOpenGroups(prev => {
      const next = new Set(prev)
      for (const group of menuGroups) {
        if (group.children && isGroupActive(group, pathname)) {
          next.add(group.key)
        }
      }
      return next.size !== prev.size ? next : prev
    })
  }, [pathname])

  const toggleGroup = useCallback((key: string) => {
    setOpenGroups(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

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
          {menuGroups.map((group) => {
            const GroupIcon = group.icon

            // 단독 항목 (대시보드)
            if (group.href) {
              const isActive = pathname === group.href
              return (
                <li key={group.key}>
                  <Link
                    href={group.href}
                    onClick={onItemClick}
                    className={`
                      flex items-center ${collapsed ? 'justify-center' : 'gap-3'} px-3 md:px-4 py-2.5 md:py-3 rounded-lg
                      ${isActive
                        ? 'bg-accent/10 text-accent'
                        : 'text-text-secondary hover:bg-bg-card hover:text-text-primary'
                      }
                    `}
                    title={collapsed ? group.label : undefined}
                  >
                    <GroupIcon className="w-5 h-5 shrink-0" />
                    {!collapsed && <span className="text-sm md:text-base">{group.label}</span>}
                  </Link>
                </li>
              )
            }

            // 그룹 항목
            const isOpen = openGroups.has(group.key)
            const groupActive = isGroupActive(group, pathname)

            return (
              <li key={group.key}>
                {/* 그룹 헤더 */}
                <button
                  onClick={() => toggleGroup(group.key)}
                  className={`
                    w-full flex items-center ${collapsed ? 'justify-center' : 'gap-3'} px-3 md:px-4 py-2.5 md:py-3 rounded-lg
                    ${groupActive
                      ? 'text-accent'
                      : 'text-text-secondary hover:bg-bg-card hover:text-text-primary'
                    }
                  `}
                  title={collapsed ? group.label : undefined}
                >
                  <GroupIcon className="w-5 h-5 shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="text-sm md:text-base flex-1 text-left">{group.label}</span>
                      <ChevronDown className={`w-4 h-4 shrink-0 transition-transform duration-200 ${isOpen ? '' : '-rotate-90'}`} />
                    </>
                  )}
                </button>

                {/* 하위 메뉴 */}
                {!collapsed && isOpen && group.children && (
                  <ul className="mt-0.5 ml-4 pl-3 border-l border-border/50 space-y-0.5">
                    {group.children.map((item) => {
                      const isActive = pathname === item.href ||
                        (item.href !== '/' && pathname.startsWith(item.href + '/'))
                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            onClick={onItemClick}
                            className={`
                              flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm
                              ${isActive
                                ? 'bg-accent/10 text-accent'
                                : 'text-text-secondary hover:bg-bg-card hover:text-text-primary'
                              }
                            `}
                          >
                            <item.icon className="w-4 h-4 shrink-0" />
                            <span>{item.label}</span>
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                )}
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
