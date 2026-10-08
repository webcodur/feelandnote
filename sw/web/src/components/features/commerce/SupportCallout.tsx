import { getTranslations } from 'next-intl/server'
import { ArrowRight, Wheat } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { SUPPORT_LINK } from '@/constants/navigation'

export default async function SupportCallout() {
  const t = await getTranslations('support')

  return (
    <aside className="rounded-card border border-line bg-bg-card p-5 sm:p-6">
      <div className="flex items-start gap-3 sm:gap-4">
        <Wheat className="mt-1 size-5 shrink-0 text-accent" strokeWidth={1.5} aria-hidden="true" />
        <div className="min-w-0">
          <h2 className="break-keep text-base font-semibold text-text-primary sm:text-lg">{t('entry.title')}</h2>
          <p className="mt-2 break-keep text-sm leading-relaxed text-text-secondary">{t('entry.body')}</p>
          <Link
            href={SUPPORT_LINK.href}
            className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-control border border-line-strong px-4 py-2 text-sm font-medium text-text-primary hover:border-accent hover:bg-bg-raised hover:text-accent active:bg-bg-stone-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-card"
          >
            {t('tabs.support')}<ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </aside>
  )
}
