import { getLocale, getTranslations } from 'next-intl/server'
import { ArrowRight, Images, Users } from 'lucide-react'
import { getHomeDiscoveryPeople } from '@/actions/home/getHomePeople'
import { getHomeGraphDeck } from '@/actions/home/getHomeGraphData'
import CelebAvatarImage from '@/components/ui/CelebAvatarImage'
import ContentCover from '@/components/ui/ContentCover'
import { NAV_ITEMS } from '@/constants/navigation'
import { Link } from '@/i18n/navigation'
import { getCelebProfileUrl } from '@/lib/url'
import { getVisitorCountry } from '@/lib/visitorCountryServer'
import { HOME_PEOPLE_COUNT } from '@/lib/homePeople'
import { HOME_GRAPH_MEDIA } from './config'
import styles from './HomeDiscoveryGallery.module.css'

const GALLERY_IMAGE_COUNT = HOME_PEOPLE_COUNT

export default async function HomeDiscoveryGallery() {
  const [locale, t, country] = await Promise.all([getLocale(), getTranslations('nav'), getVisitorCountry()])
  const [peopleResult, worksResult] = await Promise.allSettled([
    getHomeDiscoveryPeople(country),
    getHomeGraphDeck('appreciations', locale),
  ])
  if (peopleResult.status === 'rejected') console.error('[home] 탐색 인물 이미지 조회 실패', peopleResult.reason)
  if (worksResult.status === 'rejected') console.error('[home] 탐색 작품 이미지 조회 실패', worksResult.reason)
  const people = peopleResult.status === 'fulfilled'
    ? peopleResult.value.filter(person => person.avatar_url).slice(0, GALLERY_IMAGE_COUNT) : []
  const workCandidates = worksResult.status === 'fulfilled'
    ? worksResult.value.flatMap(data => data.branches.flatMap(branch => branch.items.filter(item => item.thumbnailUrl))) : []
  const mediaSamples = HOME_GRAPH_MEDIA.flatMap(type => workCandidates.find(item => item.type === type) ?? [])
  const works = [...new Map([...mediaSamples, ...workCandidates].map(item => [item.id, item])).values()].slice(0, GALLERY_IMAGE_COUNT)
  const peopleHref = NAV_ITEMS.find(item => item.key === 'explore')!.href
  const worksHref = NAV_ITEMS.find(item => item.key === 'library')!.href

  return <div className={styles.gallery} data-home-discovery-gallery>
    <div className={`${styles.entry} ${styles.people}`}>
      <div className={styles.stack}>
        {people.map(person => <Link href={getCelebProfileUrl(person)} className={styles.picture} key={person.id}
          data-discovery-kind="person" aria-label={locale === 'en' ? person.nickname_en || person.nickname : person.nickname}
          title={locale === 'en' ? person.nickname_en || person.nickname : person.nickname}>
          <CelebAvatarImage src={person.avatar_url!} alt="" sizes="(max-width: 640px) 80px, 130px" className={styles.avatar} draggable={false} />
        </Link>)}
        {!people.length && <Users size={48} className={styles.fallback} aria-hidden />}
      </div>
      <Link href={peopleHref} className={styles.label} data-discovery-kind="people">{t('explore')}<ArrowRight size={17} aria-hidden /></Link>
    </div>
    <div className={`${styles.entry} ${styles.works}`}>
      <div className={styles.stack}>
        {works.map(item => <Link href={`/content/${item.id}`} className={styles.picture} data-media={item.type} key={item.id}
          data-discovery-kind="work" aria-label={item.title} title={item.title}>
          <ContentCover src={item.thumbnailUrl} alt="" sizes="(max-width: 640px) 80px, 130px" dissolve={false} draggable={false} />
        </Link>)}
        {!works.length && <Images size={48} className={styles.fallback} aria-hidden />}
      </div>
      <Link href={worksHref} className={styles.label} data-discovery-kind="works">{t('library')}<ArrowRight size={17} aria-hidden /></Link>
    </div>
  </div>
}
