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
} from 'lucide-react'

const menuItems = [
  { href: '/', label: '대시보드', icon: LayoutDashboard },
  { href: '/users', label: '사용자 관리', icon: Users },
  { href: '/contents', label: '콘텐츠 관리', icon: Library },
  { href: '/records', label: '기록 관리', icon: FileText },
  { href: '/reports', label: '신고 관리', icon: Flag },
  { href: '/titles', label: '칭호 관리', icon: Award },
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
