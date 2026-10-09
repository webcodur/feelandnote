import hubStyles from "@/components/shared/HubSection.module.css";
import { getLocale, getTranslations } from 'next-intl/server'
import { getProfessionBookCatalog } from '@/actions/books/getProfessionBookCatalog'
import { getProfessionBooks } from '@/actions/books/getProfessionBooks'
import ProfessionBooksShelf from '@/components/features/library/professions/ProfessionBooksShelf'
import ProfessionStudyHeader from '@/components/features/library/professions/ProfessionStudyHeader'
import PageContainer from '@/components/layout/PageContainer'
import HubSection from '@/components/shared/HubSection'
import AtlasNavSections from '@/components/shared/atlasNav/AtlasNavSections'
import { LIBRARY_CONTROL_LAYOUT as controlLayout } from '@/components/shared/libraryControlLayout'
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
  return <div className="pb-20 min-[1340px]:pb-8">
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

  return <PageContainer width="detail" className={hubStyles.page}>
    <AtlasNavSections items={[
      { key: 'selection', sectionId: 'profession-selection', chapter: '01', label: t('chooseProfession') },
      { key: 'reading', sectionId: 'profession-reading', chapter: '02', label: t('readingSection') },
    ]} />
    <HubSection id="profession-selection" title={t('chooseProfession')} index={0} total={2} compact hideDivider>
      <dl aria-label={t('readingGuide')} className="mx-auto mb-6 grid max-w-4xl gap-4 rounded-xl border border-accent/20 bg-accent/[0.035] px-4 py-5 text-center sm:mb-8 sm:grid-cols-3 sm:gap-5 sm:px-6">
        {(['train', 'become', 'about'] as const).map((track) => <div key={track}>
          <dt className="mb-1.5 text-sm font-semibold text-accent sm:text-base">{t(`guide.${track}.title`)}</dt>
          <dd className="text-sm leading-6 text-text-primary">{t(`guide.${track}.description`)}</dd>
        </div>)}
      </dl>
      <div data-profession-selector-layout className="flex min-w-0 flex-col items-center gap-6 sm:gap-7">
        <nav aria-label={t('chooseProfession')} className={controlLayout.professionGrid}>
          {professions.map((profession) => {
            const active = profession.value === selected.value
            return <Link key={profession.value} href={`/explore/works/professions?profession=${encodeURIComponent(profession.value)}`}
              scroll={false} prefetch={false} aria-current={active ? 'page' : undefined}
              className={`inline-flex min-w-0 items-center justify-center rounded-control border ${controlLayout.professionChip} font-semibold outline-none focus-visible:ring-2 focus-visible:ring-accent active:bg-accent/10 ${active
                ? 'border-accent bg-accent/10 text-accent hover:bg-accent/15'
                : 'border-line bg-bg-card text-text-secondary hover:border-accent/60 hover:text-accent'}`}>
              {locale === 'en' ? profession.label_en : profession.label}
            </Link>
          })}
        </nav>
        <ProfessionStudyHeader profession={selected.value} label={label} description={description}
          caption={t.has(`plates.${selected.value}`) ? t(`plates.${selected.value}`) : undefined} />
      </div>
    </HubSection>
    <HubSection id="profession-reading" title={t('readingSection')} index={1} total={2} compact>
      <Lane key={selected.value} fallback={<PendingBlock variant="grid" count={4} label={pending('loading')} />}>
        <ProfessionBookList profession={selected.value} label={label} locale={locale} />
      </Lane>
    </HubSection>
  </PageContainer>
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
  return <ProfessionBooksShelf books={books} profession={profession} professionLabel={label} />
}
