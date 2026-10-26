import { HelpCircle } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Mascot from './Mascot'
import styles from './Mascot.module.css'

export default function BookShelfGuide({ groups }: { groups: { key: string; label: string; intro: string }[] }) {
  const t = useTranslations('mascot')
  return <details className={styles.guide}>
    <summary><HelpCircle size={14} aria-hidden="true" />{t('shelfGuide')}</summary>
    <div className={styles.guideBody}>
      <Mascot kind="owl" size={80} />
      <dl>{groups.filter(group => group.intro).map(group => <div key={group.key}>
        <dt>{group.label}</dt><dd>{group.intro}</dd>
      </div>)}</dl>
    </div>
  </details>
}
