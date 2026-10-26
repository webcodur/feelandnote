import { getTranslations } from 'next-intl/server'
import Logo from '@/components/ui/Logo'
import Mascot from '@/components/shared/mascots/Mascot'
import styles from './introduction/HomeIntroduction.module.css'

export default async function HomeBrandHeader() {
  const [intro, site] = await Promise.all([
    getTranslations('home.ui.intro'), getTranslations('site'),
  ])
  return <header className={styles.hero}>
    <div className={styles.heroBrand}><Logo size="sm" variant="hero" className={styles.brandMark} subtitle="YOUR CULTURAL LEGACY" /></div>
    <div className={styles.headlineGroup}>
      <h1 className={styles.headline}>{intro('introSub').split('\n').map(line => <span key={line}>{line}</span>)}</h1>
      <Mascot kind="flame" size={64} eager className={styles.heroMascot} />
    </div>
    <p className={styles.definition}>{site('description')}</p>
  </header>
}
