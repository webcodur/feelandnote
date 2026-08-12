import { Images, Rows3 } from 'lucide-react'
import Link from 'next/link'

export function buildCelebViewHref(
  pathname: string,
  params: Record<string, string | undefined>,
): string {
  const searchParams = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value) searchParams.set(key, value)
  }
  const query = searchParams.toString()
  return query ? `${pathname}?${query}` : pathname
}

function ViewLink({ href, active, children }: {
  href: string
  active: boolean
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold ${
        active
          ? 'bg-accent text-white'
          : 'text-text-secondary hover:bg-white/5 hover:text-text-primary active:bg-white/10'
      }`}
    >
      {children}
    </Link>
  )
}

export default function CelebViewNavigation({ tableHref, imagesHref, activeView }: {
  tableHref: string
  imagesHref: string
  activeView: 'table' | 'images'
}) {
  return (
    <>
      <ViewLink href={tableHref} active={activeView === 'table'}>
        <Rows3 className="h-4 w-4" />표
      </ViewLink>
      <ViewLink href={imagesHref} active={activeView === 'images'}>
        <Images className="h-4 w-4" />이미지
      </ViewLink>
    </>
  )
}
