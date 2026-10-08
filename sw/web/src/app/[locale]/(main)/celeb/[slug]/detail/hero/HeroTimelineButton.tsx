'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { useTranslations } from 'next-intl'
import { Clock3 } from 'lucide-react'
import { getCelebTimelineEvents, type CelebTimelineEvent } from '@/actions/celebs/getCelebTimelineEvents'
import Modal from '@/components/ui/Modal'
import { RetryBlock } from '@/components/ui/pending'
import CelebSectionPending from '../../CelebSectionPending'

const JourneyTimelineModal = dynamic(() => import('../../JourneyTimelineModal'), { ssr: false })

export default function HeroTimelineButton({ celebId, locale, fiction }: { celebId: string; locale: string; fiction: boolean }) {
  const t = useTranslations('celebPage')
  const [open, setOpen] = useState(false)
  const [events, setEvents] = useState<CelebTimelineEvent[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const title = t(fiction ? 'fictionTimeline' : 'timeline')
  const load = async () => {
    if (busy) return
    setBusy(true)
    setFailed(false)
    try {
      const [data] = await Promise.all([getCelebTimelineEvents(celebId, locale), import('../../JourneyTimelineModal')])
      setEvents(data)
    } catch {
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }
  const show = () => {
    setOpen(true)
    if (events === null) void load()
  }
  return <>
    <button type="button" aria-label={title} title={title} aria-haspopup="dialog" onClick={show}
      className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-white/12 bg-transparent text-text-secondary outline-none hover:border-accent/50 hover:bg-white/[0.04] hover:text-accent active:bg-white/[0.07] focus-visible:ring-2 focus-visible:ring-accent/60">
      <Clock3 size={16} aria-hidden="true" />
    </button>
    {open && (events?.length ?? 0) > 0 && <JourneyTimelineModal open events={events!} title={title}
      closeLabel={t('timelineClose')} onClose={() => setOpen(false)} />}
    {open && !(events?.length ?? 0) && <Modal isOpen onClose={() => setOpen(false)} title={title} size="lg">
      {busy && <CelebSectionPending kind="timeline" compact />}
      {!busy && failed && <RetryBlock onRetry={() => { void load() }} />}
      {!busy && !failed && events !== null && <p className="py-10 text-center text-sm text-text-tertiary">{t('loading.timelineEmpty')}</p>}
    </Modal>}
  </>
}
