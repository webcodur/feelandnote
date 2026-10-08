import { useTranslations } from 'next-intl'
import { PendingBlock } from '@/components/ui/pending'
import styles from './CelebSectionLoading.module.css'

export type CelebLoadingKind = 'profile' | 'library' | 'books' | 'related' | 'timeline' | 'analysis'

export default function CelebSectionPending({ kind, compact = false }: { kind: CelebLoadingKind; compact?: boolean }) {
  const t = useTranslations('celebPage.loading')
  return <PendingBlock variant="panel" minHeight={compact ? 'min-h-40' : 'min-h-72'}
    className={styles.pending} label={t(kind)} message={t(kind)} hint={t('hint')}>
    <div className={`${styles.surface} ${compact ? 'min-h-40' : 'min-h-72'}`} />
  </PendingBlock>
}
