import { getLocale, getTranslations } from 'next-intl/server'
import { ArrowRight, Search } from 'lucide-react'
import { getPathname } from '@/i18n/navigation'
import Lane from '@/components/ui/pending/Lane'
import HomeDiscoveryGallery from './HomeDiscoveryGallery'
import galleryStyles from './HomeDiscoveryGallery.module.css'
import styles from './HomeIntroduction.module.css'

export default async function HomeClosing() {
  const [locale, t] = await Promise.all([getLocale(), getTranslations('home.landing')])
  return <>
    <Lane fallback={<div className={galleryStyles.gallery} aria-hidden>
      {[0, 1].map(index => <div className={galleryStyles.entry} key={index}><span className={galleryStyles.stack} /><span className={galleryStyles.label} /></div>)}
    </div>}>
      <HomeDiscoveryGallery />
    </Lane>
    <form action={getPathname({ locale, href: '/search' })} className={styles.search} role="search">
      <Search size={20} aria-hidden className={styles.searchIcon} />
      <input type="search" name="q" aria-label={t('searchLabel')} placeholder={t('searchPlaceholder')} required />
      <button type="submit">{t('searchAction')}<ArrowRight size={18} aria-hidden /></button>
    </form>
  </>
}
