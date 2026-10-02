'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { getCelebForModal } from '@/actions/celebs/getCelebForModal'
import type { BookShelfPerson } from '@/actions/books/getBookShelfPeople'
import type { CelebProfile } from '@/types/home'
import CelebDetailModal from '@/components/features/celeb/modals/CelebDetailModal'
import Modal from '@/components/ui/Modal'
import { PendingMark, RetryBlock } from '@/components/ui/pending'
import { Z_INDEX } from '@/constants/zIndex'

/** 책을 고른 상태를 유지하면서 인물 프로필과 이 책의 공개 감상 배경을 함께 연다. */
export default function BookShelfPersonModal({ person, bookTitle, onClose }: {
  person: BookShelfPerson; bookTitle: string; onClose: () => void
}) {
  const t = useTranslations('common')
  const [profile, setProfile] = useState<CelebProfile | null>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let alive = true
    getCelebForModal(person.id).then(
      (result) => { if (alive) { setProfile(result); setFailed(!result) } },
      () => { if (alive) setFailed(true) },
    )
    return () => { alive = false }
  }, [person.id, attempt])

  if (profile) return <CelebDetailModal celeb={profile} isOpen onClose={onClose}
    escapeCapture zIndex={Z_INDEX.modal + 2}
    contextReview={person.review || person.sourceUrl ? {
      review: person.review ?? '', isSpoiler: person.isSpoiler ?? false,
      bookTitle, sourceUrl: person.sourceUrl,
    } : null} />

  return <Modal isOpen onClose={onClose} title={person.name} size="sm" animateHeight={false}
    escapeCapture zIndex={Z_INDEX.modal + 2}>
    {failed ? <RetryBlock onRetry={() => { setFailed(false); setAttempt((value) => value + 1) }} />
      : <div role="status" className="flex min-h-36 flex-col items-center justify-center gap-3 p-4 text-sm text-text-secondary">
        <PendingMark /><span>{t('loading')}</span>
      </div>}
  </Modal>
}
