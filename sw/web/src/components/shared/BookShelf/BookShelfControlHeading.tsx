'use client'

import { useTranslations } from 'next-intl'
import BookShelfTransition from './BookShelfTransition'
import styles from './BookShelf.module.css'

/** 소속과 직군 머리말은 같은 글자 규격·중앙축을 사용한다. */
export default function BookShelfControlHeading({ label, count, actions = false }: {
  label: string
  count: number | null
  actions?: boolean
}) {
  const t = useTranslations('celebPage')
  return <span className={`${styles.controlHeading} ${actions ? styles.controlHeadingWithActions : ''}`} data-bookshelf-heading>
    <span className="flex min-w-0 items-center justify-center gap-2" data-bookshelf-summary>
      <span className={`${styles.controlLabel} min-w-0 truncate`} data-bookshelf-control-label title={label}>
        <BookShelfTransition inline changeKey={label} className="max-w-full truncate align-middle">{label}</BookShelfTransition>
      </span>
      <span className={`${styles.controlCount} shrink-0`} data-bookshelf-control-count aria-label={t('bookShelfCount', { count: count ?? '–' })}>
        <BookShelfTransition inline changeKey={count ?? 'pending'}>{count ?? '–'}</BookShelfTransition>
      </span>
    </span>
  </span>
}
