import { getLocale, getTranslations } from 'next-intl/server'
import { ArrowUpRight, Mail } from 'lucide-react'
import SupportCallout from '@/components/features/commerce/SupportCallout'
import { isSupportShopAvailable } from '@/constants/navigation'
import { getVisitorCountry } from '@/lib/visitorCountryServer'
import styles from './HomeIntroduction.module.css'

export default async function HomeContact() {
  const [locale, t, footer, country] = await Promise.all([getLocale(), getTranslations('policy'), getTranslations('nav.footer'), getVisitorCountry()])
  return <div className={styles.contact}>
    <div className={styles.contactPanel}>
      <div className={styles.contactInfo}>
        <h3 className={styles.contactHeading}>{footer('feedback')}</h3>
        <p className={styles.contactCopy}>{t('aboutOperatorBody')}</p>
        <a href="mailto:feelandnote@gmail.com" className={styles.contactAction}><Mail size={16} aria-hidden />feelandnote@gmail.com<ArrowUpRight size={16} aria-hidden /></a>
      </div>
      {country === 'KR' && isSupportShopAvailable(locale) && <div className={styles.support}><SupportCallout headingAs="h3" embedded actionClassName={styles.contactAction} /></div>}
    </div>
  </div>
}
