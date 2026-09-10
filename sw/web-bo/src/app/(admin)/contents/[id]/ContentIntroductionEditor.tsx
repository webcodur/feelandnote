'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateContent } from '@/actions/admin/contents'
import { BOOK_INTRODUCTION_SOURCES } from '@feelandnote/content-search/book-introduction-contract'

export default function ContentIntroductionEditor({ contentId, editions }: {
  contentId: string
  editions: { locale: string; description: string | null }[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)
  const [draft, setDraft] = useState(() => ({
    ko: editions.find((edition) => edition.locale === 'ko')?.description ?? '',
    en: editions.find((edition) => edition.locale === 'en')?.description ?? '',
  }))

  const save = (locale: 'ko' | 'en') => {
    setMessage(null)
    startTransition(async () => {
      try {
        await updateContent(contentId, locale === 'ko' ? { description: draft.ko } : { description_en: draft.en })
        setMessage(`${locale === 'ko' ? '한국어' : '영어'} 소개를 저장했습니다.`)
        router.refresh()
      } catch (error) {
        setMessage(error instanceof Error ? error.message : '소개를 저장하지 못했습니다.')
      }
    })
  }

  return (
    <section className="space-y-4 rounded-xl border border-border bg-bg-card p-5">
      <div>
        <h2 className="text-sm font-semibold text-text-primary">책 소개</h2>
        <p className="mt-1 text-xs text-text-secondary">
          외부 소개는 {BOOK_INTRODUCTION_SOURCES.join(' · ')} 중 확인한 출처를 입력합니다.
          직접 보관할 번역문은 본문을 입력하고, 빈칸은 조사 필요로 남깁니다.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {(['ko', 'en'] as const).map((locale) => (
          <div key={locale} className="space-y-2">
            <label className="block space-y-2 text-xs font-semibold text-text-secondary">
              <span>{locale === 'ko' ? '한국어' : '영어'}</span>
              <textarea
                rows={5}
                value={draft[locale]}
                onChange={(event) => setDraft((current) => ({ ...current, [locale]: event.target.value }))}
                className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm font-normal text-text-primary focus:border-accent focus:outline-none"
              />
            </label>
            <button type="button" disabled={pending} onClick={() => save(locale)}
              className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-text-primary hover:border-accent hover:text-accent disabled:cursor-wait disabled:opacity-50">
              {locale === 'ko' ? '한국어' : '영어'} 소개 저장
            </button>
          </div>
        ))}
      </div>
      {message && <p role="status" className="text-sm text-text-secondary">{message}</p>}
    </section>
  )
}
