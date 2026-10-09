import { getLocale, getTranslations } from 'next-intl/server'
import { ShoppingBag, Wheat } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { getSupportShopLinks } from '@/constants/navigation'

/** 세력도감의 화면 전환과 같은 두 칸짜리 내비게이션. */
export default async function SupportShopNavigation({ active }: { active: 'support' | 'shop' }) {
  const t = await getTranslations('support')
  const links = getSupportShopLinks(await getLocale())
  if (links.length < 2) return null
  return (
    <nav aria-label={t('tabs.label')} className="mx-auto grid w-full max-w-[420px] grid-cols-2 gap-1 rounded-lg border border-white/20 bg-bg-main p-1">
      {links.map(item => {
        const Icon = item.key === 'support' ? Wheat : ShoppingBag
        const label = <><Icon className="size-4 shrink-0" strokeWidth={1.5} aria-hidden="true" />{t(`tabs.${item.key}`)}</>
        return item.key === active ? (
          <span key={item.key} aria-current="page" className="flex min-h-11 items-center justify-center gap-2 rounded-md bg-accent/15 px-2 text-center text-sm font-bold text-accent">
            {label}
          </span>
        ) : (
          <Link key={item.key} href={item.href} prefetch={false} className="flex min-h-11 items-center justify-center gap-2 rounded-md px-2 text-center text-sm font-semibold text-text-secondary outline-none hover:bg-white/10 hover:text-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent">
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
