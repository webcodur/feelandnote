import { setRequestLocale } from 'next-intl/server'
import { getCelebRouteIdentity, getCelebRouteProfile } from '@/lib/profile-route'
import { getCelebSidePresence } from '@/actions/celebs/getCelebSidePresence'
import { getCelebExternalLinks } from '@/actions/celebs/getCelebExternalLinks'
import { getInitialCelebContents } from '@/actions/contents/getInitialCelebContents'
import { getCelebReferenceBooks } from '@/actions/celebs/getCelebReferenceBooks'
import { shouldStreamForRequest } from '@/lib/render-mode'
import { wikidataLink } from '@/lib/celeb/externalLinks'
import Lane from '@/components/ui/pending/Lane'
import { resolveCelebWorld } from '@/lib/celeb/world'
import { getWorldBannerImages } from '@/lib/celeb/worldImages'
import { buildCelebTitle } from '@/lib/celeb/meta'
import { createCelebMetaInput } from './celebPageMetadata'
import CelebPageContent from './CelebPageContent'
import RelatedFigureLinks from './RelatedFigureLinks'
import RelatedFactionLinks from './RelatedFactionLinks'
import CelebExternalLinksServer from './CelebExternalLinksServer'
import CelebSectionPending from './CelebSectionPending'
import { CelebLibraryServer, CelebBooksServer, CelebJsonLdServer, type SectionData } from './CelebDataSections'

interface PageProps { params: Promise<{ locale: string; slug: string }> }
const EMPTY_CONTENTS = { items: [], total: 0, page: 1, totalPages: 0, hasMore: false }

// 실패도 구획의 결과로 받는다. 캐시 조회는 오류를 던져 실패값이 저장되지 않게 유지한다.
function settle<T>(slug: string, name: string, promise: Promise<T>): Promise<SectionData<T>> {
  return promise.then(data => ({ data }), (error: unknown) => {
    console.error(`[celeb/${slug}] ${name} 조회 실패:`, error)
    return { error: true as const }
  })
}

export default async function CelebPageBody({ params }: PageProps) {
  const { locale, slug } = await params
  setRequestLocale(locale)
  const initial = await shouldStreamForRequest()
  // 레이아웃과 공유하는 가벼운 신원 조회로 분석 가용도도 미리 시작한다.
  const [profile, sidePresence] = await Promise.all([
    getCelebRouteProfile(slug, locale),
    getCelebRouteIdentity(slug, locale).then(identity => getCelebSidePresence({ celebId: identity.id, reality: identity.celeb_reality })),
  ])
  const userId = profile.id
  const worldId = resolveCelebWorld({ nationality: profile.nationality, birthDate: profile.birth_date,
    deathDate: profile.death_date, reality: profile.celeb_reality })

  // 작은 감상 조회를 먼저 시작하되 독립 구획은 그 응답을 기다리지 않는다.
  const contentsPromise = settle(slug, '감상 기록', profile.celeb_tier === 'full'
    ? getInitialCelebContents(userId, profile.contentTypeCounts, locale)
    : Promise.resolve(EMPTY_CONTENTS))
  const booksPromise = settle(slug, '관련 도서',
    getCelebReferenceBooks(userId, locale, initial, profile.profession))
  const externalLinksPromise = getCelebExternalLinks(profile.wikidata_qid, locale)
  // 본문·책장의 준비 여부와 무관하게 프로필과 인물 안내를 먼저 내보낸다.
  const factionMemberships = profile.factions.filter(faction => faction.isPublished && faction.slug)
  const sideAvailability = { relations: profile.relations.length > 0,
    influence: sidePresence.influence, spectrum: sidePresence.spectrum,
    relatedFigures: profile.relations.length > 0, relatedFactions: factionMemberships.length > 0, affiliateBooks: true }
  const pageTitle = buildCelebTitle(createCelebMetaInput(profile), locale)
  const clientProfile = { ...profile, greeting: null, explanation: null, dialogue: null }
  const jsonLdLinks = initial
    ? Promise.resolve(profile.wikidata_qid ? [wikidataLink(profile.wikidata_qid)].filter(link => link !== null) : [])
    : externalLinksPromise

  return <>
    <Lane fallback={null}>
      <CelebJsonLdServer contents={contentsPromise} books={booksPromise} profile={profile}
        slug={slug} locale={locale} pageTitle={pageTitle} links={jsonLdLinks} />
    </Lane>
    <CelebPageContent profile={clientProfile} slug={slug} shareTitle={pageTitle} userId={userId}
      greeting={profile.greeting} sideAvailability={sideAvailability} initialAnalysis={null}
      worldId={worldId} worldBannerImages={getWorldBannerImages(worldId)}
      librarySlot={<Lane fallback={<CelebSectionPending kind="library" />}>
        <CelebLibraryServer contents={contentsPromise} profile={profile} slug={slug} locale={locale} initial={initial} />
      </Lane>}
      booksSlot={<Lane fallback={<CelebSectionPending kind="books" />}>
        <CelebBooksServer books={booksPromise} profile={profile} />
      </Lane>}
      externalLinksSlot={<Lane fallback={null}>
        <CelebExternalLinksServer links={externalLinksPromise} name={profile.nickname} />
      </Lane>}
      relatedFiguresSlot={sideAvailability.relatedFigures && <Lane fallback={<CelebSectionPending kind="related" compact />}>
        <RelatedFigureLinks celebId={userId} profession={profile.profession} nationality={profile.nationality}
          birthDate={profile.birth_date} celebReality={profile.celeb_reality} relations={profile.relations} />
      </Lane>}
      relatedFactionsSlot={sideAvailability.relatedFactions && <Lane fallback={<CelebSectionPending kind="factions" count={factionMemberships.length} />}>
        <RelatedFactionLinks memberships={factionMemberships} personId={userId} />
      </Lane>}
    />
  </>
}
