'use client'

import { useTranslations } from 'next-intl'
import { CategoryTabFilter } from '@/components/ui/CategoryTabFilter'
import { getCategoryByDbType } from '@/constants/categories'
import { CLASSICS_ERAS, CLASSICS_MEDIA, type ClassicsQuery } from '@/lib/library/classicsQuery'

interface Props {
  query: ClassicsQuery
  professions: string[]
  onChange: (next: Partial<ClassicsQuery>) => void
}

export default function ClassicsFilters({ query, professions, onChange }: Props) {
  const t = useTranslations('library.popular')
  const te = useTranslations('library.page.eraPage.eraTabs')
  const tp = useTranslations('profession')
  const tc = useTranslations('content.category')

  const media = CLASSICS_MEDIA.map(value => ({ value,
    label: tc(value === 'ALL' ? 'all' : getCategoryByDbType(value)!.id) }))
  const bases = [
    { value: 'all' as const, label: t('basisAll') },
    { value: 'era' as const, label: t('basisEra') },
    { value: 'profession' as const, label: t('basisProfession'), disabled: professions.length === 0 },
  ]

  return (
    <div className="space-y-3">
      <div className="flex justify-center">
        <CategoryTabFilter media options={media} value={query.category} onChange={category => onChange({ category })} subtle size="sm" />
      </div>
      <div className="flex justify-center">
        <CategoryTabFilter options={bases} value={query.basis} onChange={basis => onChange({ basis })} subtle size="sm" />
      </div>
      {query.basis === 'era' && (
        <div className="flex justify-center">
          <CategoryTabFilter options={CLASSICS_ERAS.map(value => ({ value, label: te(value) }))}
            value={query.era} onChange={era => onChange({ era })} subtle size="sm" />
        </div>
      )}
      {query.basis === 'profession' && professions.length > 0 && (
        <CategoryTabFilter options={professions.map(value => ({ value, label: tp(value) }))}
          value={query.profession} onChange={profession => onChange({ profession })}
          subtle size="sm" gridCols={3} className="mx-auto max-w-md" />
      )}
    </div>
  )
}
