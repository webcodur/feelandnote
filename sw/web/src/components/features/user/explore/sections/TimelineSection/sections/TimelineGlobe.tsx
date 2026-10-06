'use client'

import { useCallback, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { useTranslations } from 'next-intl'
import Modal from '@/components/ui/Modal'
import { PendingBlock } from '@/components/ui/pending'
import type { GlobeMarker } from '@/components/shared/WorldGlobe'
import { getGlobeCountryName } from '@/components/shared/WorldGlobe/countryNames'
import { useRouter } from '@/i18n/navigation'
import useMediaQuery from '@/hooks/useMediaQuery'
import type { CountryGroup } from '@/actions/home'
import { getTimelinePath } from '../pagination'

const WorldGlobe = dynamic(() => import('@/components/shared/WorldGlobe'), {
  ssr: false,
  loading: () => <PendingBlock variant="panel" minHeight="min-h-full" className="absolute inset-0" />,
})
const markers: GlobeMarker[] = []

export default function TimelineGlobe({ countries, country, defaultCountry }: {
  countries: CountryGroup[]; country: string; defaultCountry: string;
}) {
  const t = useTranslations('explore.ui.timeline')
  const map = useTranslations('celebPage')
  const router = useRouter()
  const hasMouse = useMediaQuery('(hover: hover) and (pointer: fine)')
  const [expanded, setExpanded] = useState(false)
  const countryOptions = useMemo(() => countries.map(item => ({
    id: item.code, name: getGlobeCountryName(item.code), label: t('figureCount', { count: item.count }),
  })), [countries, t])
  const selectCountry = useCallback((code: string) => {
    if (code === country) return
    setExpanded(false)
    router.push(getTimelinePath(code, defaultCountry), { scroll: false })
  }, [country, defaultCountry, router])
  const globeProps = useMemo(() => ({
    markers,
    countries: countryOptions,
    activeId: country,
    focusId: country,
    onCountrySelect: selectCountry,
    label: t('globeLabel'),
    controlLabels: {
      zoomIn: map('timelineZoomIn'),
      zoomOut: map('timelineZoomOut'),
      reset: map('timelineResetView'),
    },
    mapNote: map('timelineModernBorders'),
  }), [country, countryOptions, map, selectCountry, t])

  return <div className="w-full md:col-start-2 md:row-start-1 md:row-span-2" data-timeline-globe data-country={country}>
    <div className="relative h-[170px] md:h-[220px]">
      <WorldGlobe {...globeProps} fillContainer className="h-full" allowPageScroll={!hasMouse}
        onExpand={() => setExpanded(true)} expandLabel={map('timelineExpandMap')} expandAriaLabel={map('timelineExpandMapLabel')} />
      <p className="pointer-events-none absolute bottom-3 left-3 max-w-[calc(100%-90px)] rounded bg-black/70 px-2 py-1 text-[10px] text-text-secondary">{t('globeHint')}</p>
    </div>
    {expanded && <Modal isOpen onClose={() => setExpanded(false)} title={t('globeLabel')} size="full" stickyHeader frame="plain" boxClassName="rounded-panel border border-white/20 bg-bg-main">
      <div className="relative h-[min(65dvh,640px)]" data-timeline-globe-expanded>
        <WorldGlobe {...globeProps} className="h-full rounded-none border-0" fillContainer initialZoom={0.48} />
      </div>
    </Modal>}
  </div>
}
