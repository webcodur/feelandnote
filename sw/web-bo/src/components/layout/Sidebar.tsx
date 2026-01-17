'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
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
} from 'lucide-react'

const menuItems = [
  { href: '/', label: '대시보드', icon: LayoutDashboard },
  { href: '/members', label: '멤버 관리', icon: Users },
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

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 bg-bg-secondary border-r border-border min-h-screen flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <Link href="/" className="flex items-center gap-2">
          <LayoutDashboard className="w-8 h-8 text-accent" />
          <span className="text-xl font-bold text-text-primary">Admin</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(item.href))
            const Icon = item.icon

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                    ${isActive
                      ? 'bg-accent/10 text-accent'
                      : 'text-text-secondary hover:bg-bg-card hover:text-text-primary'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <p className="text-xs text-text-secondary text-center">
          Feel&Note Admin v0.1
        </p>
      </div>
    </aside>
  )
}
