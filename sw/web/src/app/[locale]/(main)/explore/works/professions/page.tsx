import { getLocale, getTranslations } from 'next-intl/server'
import { getProfessionBookCatalog } from '@/actions/books/getProfessionBookCatalog'
import { getProfessionBooks } from '@/actions/books/getProfessionBooks'
import ProfessionBooksShelf from '@/components/features/library/professions/ProfessionBooksShelf'
import { PendingBlock, RetryBlock } from '@/components/ui/pending'
import Lane from '@/components/ui/pending/Lane'
import { Link } from '@/i18n/navigation'
import { getLocalizedAlternates } from '@/lib/seo'

type SearchParams = Promise<{ profession?: string | string[] }>

export async function generateMetadata() {
  const t = await getTranslations('library.professionBooks')
  return {
    title: t('title'), description: t('description'),
    alternates: await getLocalizedAlternates('/explore/works/professions'),
  }
}

export default async function ProfessionBooksPage({ searchParams }: { searchParams: SearchParams }) {
  const [params, pending] = await Promise.all([searchParams, getTranslations('pending')])
  const profession = typeof params.profession === 'string' ? params.profession : undefined
  return <div className="pb-20">
    <Lane fallback={<PendingBlock variant="grid" count={6} label={pending('loading')} />}>
      <ProfessionBooksSection requestedProfession={profession} />
    </Lane>
  </div>
}

async function ProfessionBooksSection({ requestedProfession }: { requestedProfession?: string }) {
  const [locale, t, pending] = await Promise.all([
    getLocale(), getTranslations('library.professionBooks'), getTranslations('pending'),
  ])
  let professions: Awaited<ReturnType<typeof getProfessionBookCatalog>>
  try {
    professions = await getProfessionBookCatalog()
  } catch (error) {
    console.error('[profession-books] Catalog failed:', error)
    return <RetryBlock />
  }
  const selected = professions.find((profession) => profession.value === requestedProfession) ?? professions[0]
  if (!selected) return <p className="py-8 text-center text-sm text-text-secondary">{t('empty')}</p>
  const label = locale === 'en' ? selected.label_en : selected.label
  const description = locale === 'en' ? selected.description_en : selected.description

  return <div className="space-y-6">
    <p className="mx-auto max-w-2xl text-center text-sm leading-relaxed text-text-secondary">{t('description')}</p>
    <nav aria-label={t('chooseProfession')} className="flex flex-wrap justify-center gap-2">
      {professions.map((profession) => {
        const active = profession.value === selected.value
        return <Link key={profession.value} href={`/explore/works/professions?profession=${encodeURIComponent(profession.value)}`}
          scroll={false} prefetch={false} aria-current={active ? 'page' : undefined}
          className={`inline-flex min-h-11 items-center justify-center rounded-control border px-4 py-2 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-accent active:bg-accent/10 ${active
            ? 'border-accent bg-accent/10 text-accent hover:bg-accent/15'
            : 'border-line bg-bg-card text-text-secondary hover:border-accent/60 hover:text-accent'}`}>
          {locale === 'en' ? profession.label_en : profession.label}
        </Link>
      })}
    </nav>
    <section aria-labelledby="profession-books-heading" className="space-y-5">
      <div className="mx-auto max-w-2xl text-center">
        <h2 id="profession-books-heading" className="text-lg font-semibold text-text-primary">{label}</h2>
        {description && <p className="mt-2 text-sm leading-relaxed text-text-secondary">{description}</p>}
      </div>
      <Lane key={selected.value} fallback={<PendingBlock variant="grid" count={4} label={pending('loading')} />}>
        <ProfessionBookList profession={selected.value} label={label} locale={locale} />
      </Lane>
    </section>
  </div>
}

async function ProfessionBookList({ profession, label, locale }: { profession: string; label: string; locale: string }) {
  let books: Awaited<ReturnType<typeof getProfessionBooks>>
  try {
    books = await getProfessionBooks(profession, locale)
  } catch (error) {
    console.error('[profession-books] Books failed:', error)
    return <RetryBlock />
  }
  if (!books.length) {
    const t = await getTranslations('library.professionBooks')
    return <p className="py-8 text-center text-sm text-text-secondary">{t('empty')}</p>
  }
  return <ProfessionBooksShelf books={books} profession={label} />
}
