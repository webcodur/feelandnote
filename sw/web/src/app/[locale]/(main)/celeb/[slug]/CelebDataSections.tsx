import { getTranslations } from 'next-intl/server'
import type { GetUserContentsResponse } from '@/actions/contents/getUserContents'
import type { CelebReferenceBooks } from '@/actions/celebs/getCelebReferenceBooks'
import type { CelebBySlugProfile } from '@/actions/user/getCelebBySlug'
import type { getCelebExternalLinks } from '@/actions/celebs/getCelebExternalLinks'
import { getInitialContentBrief, getContentBrief } from '@/actions/contents/getContentBrief'
import { getCelebProfessions } from '@/lib/celeb-professions'
import { RetryBlock } from '@/components/ui/pending'
import CelebBookShelf from '@/components/features/celeb/CelebBookShelf'
import { buildCelebPageJsonLd } from './celebPageJsonLd'
import { serializeJsonLd } from '@/lib/jsonLd'
import ReviewsSection from './ReviewsSection'
import styles from './CelebSectionLoading.module.css'

export type SectionData<T> = { data: T; error?: never } | { error: true; data?: never }
type ContentsPromise = Promise<SectionData<GetUserContentsResponse>>
type BooksPromise = Promise<SectionData<CelebReferenceBooks>>

export async function CelebLibraryServer({ contents, profile, slug, locale, initial }: {
  contents: ContentsPromise; profile: CelebBySlugProfile; slug: string; locale: string; initial: boolean
}) {
  const result = await contents
  if (result.error) return <RetryBlock />
  const firstId = result.data.items[0]?.content_id
  const brief = firstId ? await (initial ? getInitialContentBrief : getContentBrief)(firstId, locale) : null
  const t = await getTranslations('celebPage')
  return <div className={styles.arrived} data-celeb-loaded="library">
    <ReviewsSection userId={profile.id} slug={slug} nickname={profile.nickname} avatarUrl={profile.avatar_url}
      emptyMessage={t('libraryEmpty')} initialContents={result.data} initialContentBrief={brief} />
  </div>
}

export async function CelebBooksServer({ books, profile }: { books: BooksPromise; profile: CelebBySlugProfile }) {
  const result = await books
  if (result.error) return <RetryBlock />
  const { appeared, authored, professionBooks, factionGroups } = result.data
  const hasBooks = appeared.length || authored.length || professionBooks.length || factionGroups.some(group => group.books.length)
  const t = await getTranslations('celebPage.loading')
  return <div className={styles.arrived} data-celeb-loaded="books">
    {Boolean(hasBooks) && <CelebBookShelf celebId={profile.id} appeared={appeared} authored={authored}
      professionBooks={professionBooks} profession={profile.profession} factionGroups={factionGroups} id="archive" />}
    {!hasBooks && <p className="py-10 text-center text-sm text-text-tertiary">{t('booksEmpty')}</p>}
  </div>
}

// 구조화 데이터도 본문과 따로 완성한다. 늦은 책장 때문에 이미 읽을 수 있는 안내를 가리지 않는다.
export async function CelebJsonLdServer({ contents, books, profile, slug, locale, pageTitle, links }: {
  contents: ContentsPromise; books: BooksPromise; profile: CelebBySlugProfile; slug: string; locale: string; pageTitle: string
  links: Promise<Awaited<ReturnType<typeof getCelebExternalLinks>>>
}) {
  const [records, reference, professions, externalLinks] = await Promise.all([contents, books,
    getCelebProfessions().catch((error: unknown) => {
      console.error(`[celeb/${slug}] 구조화 데이터 직군 조회 실패:`, error)
      return []
    }), links])
  const jsonLd = buildCelebPageJsonLd({ profile, slug, locale, pageTitle, professions,
    contents: records.data?.items.slice(0, 1) ?? [], figureBooks: reference.data?.appeared ?? [], externalLinks })
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
}
