import { getTranslations } from 'next-intl/server'
import { getLocalizedAlternates, getWebSiteJsonLd } from '@/lib/seo'
import { serializeJsonLd } from '@/lib/jsonLd'
import AsyncIntlProvider from '@/components/shared/AsyncIntlProvider'
import PageContainer from '@/components/layout/PageContainer'
import HomeBrandHeader from '@/components/features/home/HomeBrandHeader'
import HomeStats, { HomeStatsPending } from '@/components/features/home/introduction/HomeStats'
import HomeGraphSection from '@/components/features/home/introduction/HomeGraphSection'
import HomeShowcase from '@/components/features/home/introduction/HomeShowcase'
import HomeClosing from '@/components/features/home/introduction/HomeClosing'
import HomeContact from '@/components/features/home/introduction/HomeContact'
import { HomeNoticePending } from '@/components/features/home/HomeNoticeSection'
import HubSection from '@/components/shared/HubSection'
import AtlasNavSections from '@/components/shared/atlasNav/AtlasNavSections'
import { HOME_GROUP_ID, HOME_SECTIONS, hubSection, hubSectionId } from '@/components/shared/hubSectionUtils'
import Lane from '@/components/ui/pending/Lane'
import { PendingBlock } from '@/components/ui/pending'
import { NoticeSection } from './sections'
import hubStyles from '@/components/shared/HubSection.module.css'
import styles from '@/components/features/home/introduction/HomeIntroduction.module.css'

export const maxDuration = 30

export async function generateMetadata() {
  const t = await getTranslations('site')
  return { title: { absolute: t('title') }, description: t('description'), alternates: await getLocalizedAlternates('/') }
}

export default async function MainPage() {
  const [t, siteT, pending] = await Promise.all([
    getTranslations('home.landing'), getTranslations('site'), getTranslations('pending'),
  ])
  const sec = (key: string) => hubSection(HOME_SECTIONS, HOME_GROUP_ID, key, t)
  const sectionClass = `${styles.homeSection} ${hubStyles.homeRhythm}`
  const contents = [
    { key: 'about', sectionId: 'about', label: t('navAbout') },
    ...HOME_SECTIONS.map((section, index) => ({
      key: section.key, sectionId: section.id ?? hubSectionId(index, HOME_GROUP_ID),
      chapter: String(index + 1).padStart(2, '0'), label: t(section.navTitleKey ?? section.titleKey),
    })),
  ]
  const graphPending = <PendingBlock variant="panel" minHeight="min-h-[520px]" label={pending('loading')} />
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(getWebSiteJsonLd(siteT('description'))) }} />
    <AsyncIntlProvider>
      <PageContainer width="detail" className={hubStyles.page}>
        <AtlasNavSections items={contents} />
        <section id="about" tabIndex={-1} className={styles.opening} data-home-opening>
          <HomeBrandHeader />
          <div className={styles.why}>
            <h2>{t('whyTitle')}</h2>
            <p>{t('whyBody')}</p>
          </div>
          <Lane fallback={<HomeStatsPending label={pending('loading')} />}><HomeStats /></Lane>
        </section>
        <HubSection {...sec('appreciations')} hideDivider={false} tabIndex={-1} className={sectionClass}>
          <HomeShowcase
            appreciations={<Lane fallback={graphPending}><HomeGraphSection mode="appreciations" /></Lane>}
            books={<Lane fallback={graphPending}><HomeGraphSection mode="books" /></Lane>}
          />
        </HubSection>
        <HubSection {...sec('search')} tabIndex={-1} className={sectionClass}>
          <HomeClosing />
        </HubSection>
        <HubSection {...sec('notice')} tabIndex={-1} className={sectionClass}>
          <Lane fallback={<HomeNoticePending label={pending('loading')} />}><NoticeSection /></Lane>
        </HubSection>
        <HubSection {...sec('contact')} tabIndex={-1} className={sectionClass}>
          <HomeContact />
        </HubSection>
      </PageContainer>
    </AsyncIntlProvider>
  </>
}
