import { useTranslations } from 'next-intl'
import { PendingBlock } from '@/components/ui/pending'
import styles from './CelebSectionLoading.module.css'

export type CelebLoadingKind = 'profile' | 'library' | 'books' | 'related' | 'factions' | 'timeline' | 'analysis'

export default function CelebSectionPending({ kind, compact = false, count = 1 }: { kind: CelebLoadingKind; compact?: boolean; count?: number }) {
  const t = useTranslations('celebPage.loading')
  if (kind === 'factions') return <div className="mx-auto w-full max-w-5xl">
    <p className="mb-5 text-center text-sm leading-relaxed text-text-secondary md:mb-6">{t(kind)}</p>
    <PendingBlock variant="grid" count={count} cols={`${styles.factionGrid} md:gap-4`} aspect="aspect-[3/2]"
      className={styles.pending} label={t(kind)} message={t(kind)} hint={t('hint')} />
  </div>
  return <PendingBlock variant="panel" minHeight={compact ? 'min-h-40' : 'min-h-72'}
    className={styles.pending} label={t(kind)} message={t(kind)} hint={t('hint')}>
    <div className={`${styles.surface} ${compact ? 'min-h-40' : 'min-h-72'}`} />
  </PendingBlock>
}
