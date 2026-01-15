'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight, Home } from 'lucide-react'

// 경로 세그먼트 → 한글 라벨 매핑
const ROUTE_LABELS: Record<string, string> = {
  members: '멤버 관리',
  new: '새 멤버',
  contents: '콘텐츠',
  'ai-collect': 'AI 수집',
  records: '기록 관리',
  reports: '신고 관리',
  titles: '칭호 관리',
  settings: '설정',
  users: '사용자',
  celebs: '셀럽',
}

// 클릭 가능한 경로 (실제 페이지가 존재하는 경로)
const CLICKABLE_PATHS = new Set([
  '/',
  '/members',
  '/members/new',
  '/contents',
  '/records',
  '/reports',
  '/titles',
  '/settings',
  '/users',
  '/celebs',
])

// 동적 세그먼트 패턴을 포함하는 클릭 가능한 경로
const CLICKABLE_PATTERNS = [
  /^\/members\/[^/]+$/, // /members/[id]
  /^\/members\/[^/]+\/contents$/, // /members/[id]/contents
  /^\/contents\/[^/]+$/, // /contents/[id]
  /^\/records\/[^/]+$/, // /records/[id]
  /^\/reports\/[^/]+$/, // /reports/[id]
]

function isClickable(path: string): boolean {
  if (CLICKABLE_PATHS.has(path)) return true
  return CLICKABLE_PATTERNS.some((pattern) => pattern.test(path))
}

function isUUID(segment: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)
}

function getLabel(segment: string): string {
  if (isUUID(segment)) return '상세'
  return ROUTE_LABELS[segment] || segment
}

export default function Breadcrumb() {
  const pathname = usePathname()

  // 홈페이지면 브레드크럼 표시 안 함
  if (pathname === '/') return null

  const segments = pathname.split('/').filter(Boolean)
  const breadcrumbs = segments.map((segment, index) => {
    const path = '/' + segments.slice(0, index + 1).join('/')
    const label = getLabel(segment)
    const clickable = isClickable(path)
    const isLast = index === segments.length - 1

    return { path, label, clickable, isLast }
  })

  return (
    <nav className="flex items-center gap-2 px-6 py-3 bg-bg-secondary/50 border-b border-border text-sm">
      <Link
        href="/"
        className="text-text-secondary hover:text-text-primary"
      >
        <Home className="w-4 h-4" />
      </Link>

      {breadcrumbs.map(({ path, label, clickable, isLast }) => (
        <div key={path} className="flex items-center gap-2">
          <ChevronRight className="w-4 h-4 text-text-secondary" />
          {clickable && !isLast ? (
            <Link
              href={path}
              className="text-text-secondary hover:text-text-primary"
            >
              {label}
            </Link>
          ) : (
            <span className={isLast ? 'text-text-primary font-medium' : 'text-text-secondary'}>
              {label}
            </span>
          )}
        </div>
      ))}
    </nav>
  )
}
