import { ArrowRight } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import Logo from '@/components/ui/Logo'

/** 기존 홈 테마 비교 화면의 제호. 서비스 홈의 새 소개문과 독립적으로 보존한다. */
export default function HomeThemeBrandHeader({ brandHeading, brandAlias, aboutLabel }: {
  brandHeading: string; brandAlias: string; aboutLabel: string
}) {
  return <header className="flex w-full min-w-0 flex-col items-center border-b border-line px-4 pt-4 pb-1 md:pt-6 md:pb-2">
    <h1 className="sr-only">{brandHeading}</h1>
    <Logo size="sm" variant="hero" subtitle="YOUR CULTURAL LEGACY" />
    <p className="mt-3 text-center text-sm font-medium tracking-[0.08em] text-accent break-keep">{brandAlias}</p>
    <Link href="/#about" className="inline-flex min-h-11 items-center gap-1.5 text-sm text-text-secondary hover:text-accent">
      {aboutLabel}<ArrowRight size={14} aria-hidden />
    </Link>
  </header>
}
