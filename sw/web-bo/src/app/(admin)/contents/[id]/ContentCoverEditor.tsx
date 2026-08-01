'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState, useTransition } from 'react'
import { BookImage, Save } from 'lucide-react'
import { updateContentCover } from '@/actions/admin/contents'
import { useToast } from '@/contexts/ToastContext'

type Locale = 'ko' | 'en'

interface CoverEdition {
  locale: string
  thumbnail_url: string | null
  sources: Record<string, unknown> | null
}

interface CoverDraft {
  thumbnailUrl: string
  thumbnailSource: string
}

const LOCALES: Locale[] = ['ko', 'en']
const SOURCE_OPTIONS = [
  'kakao_book',
  'aladin',
  'naver_book', // 26.07.31 API 종료. 기존 등록분 표기용으로만 남긴다
  'openlibrary',
  'goodreads',
  'manual',
  'confirmed_unavailable',
]

function initialDraft(editions: CoverEdition[], locale: Locale): CoverDraft {
  const edition = editions.find(item => item.locale === locale)
  const sources = edition?.sources ?? {}
  return {
    thumbnailUrl: edition?.thumbnail_url ?? '',
    thumbnailSource: String(sources.thumbnail ?? ''),
  }
}

export default function ContentCoverEditor({
  contentId,
  editions,
}: {
  contentId: string
  editions: CoverEdition[]
}) {
  const { showToast } = useToast()
  const [pending, startTransition] = useTransition()
  const [drafts, setDrafts] = useState<Record<Locale, CoverDraft>>(() => ({
    ko: initialDraft(editions, 'ko'),
    en: initialDraft(editions, 'en'),
  }))

  const change = (locale: Locale, patch: Partial<CoverDraft>) => {
    setDrafts(current => ({
      ...current,
      [locale]: { ...current[locale], ...patch },
    }))
  }

  const save = (locale: Locale) => {
    startTransition(async () => {
      try {
        await updateContentCover({
          contentId,
          locale,
          thumbnailUrl: drafts[locale].thumbnailUrl,
          thumbnailSource: drafts[locale].thumbnailSource,
        })
        showToast('success', `${locale.toUpperCase()} 표지를 저장했습니다`)
      } catch (error) {
        showToast('error', error instanceof Error ? error.message : String(error))
      }
    })
  }

  return (
    <section className="rounded-xl border border-border bg-bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-text-primary">
            <BookImage className="h-4 w-4 text-accent" />
            판본별 표지 정비
          </h2>
          <p className="mt-1 text-xs text-text-secondary">
            이 주소가 본 서비스와 서재 탐방 표지의 단일원천입니다. 영상용 파일은 별도 로컬 캐시로 동기화합니다.
          </p>
        </div>
        <Link
          href={`/book-recommend?contentId=${encodeURIComponent(contentId)}`}
          className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-text-secondary hover:border-accent hover:text-accent"
        >
          서재 탐방 사용 현황
        </Link>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {LOCALES.map(locale => {
          const draft = drafts[locale]
          const preview = draft.thumbnailUrl.trim()
          const editionExists = editions.some(item => item.locale === locale)
          return (
            <div key={locale} className="rounded-lg border border-border bg-bg-secondary/50 p-3">
              <div className="mb-3 flex items-center justify-between">
                <span className="rounded bg-accent/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-accent">
                  {locale.toUpperCase()}
                </span>
                <button
                  type="button"
                  disabled={pending || !editionExists}
                  onClick={() => save(locale)}
                  title={editionExists ? undefined : '판본 메타를 먼저 등록해야 합니다'}
                  className="inline-flex items-center gap-1.5 rounded-md border border-accent bg-accent/10 px-2.5 py-1.5 text-xs font-semibold text-accent hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Save className="h-3.5 w-3.5" />
                  저장
                </button>
              </div>

              <div className="flex gap-3">
                <div className="relative h-32 w-24 shrink-0 overflow-hidden rounded-md border border-border bg-bg-card">
                  {preview ? (
                    <Image
                      src={`/api/image-proxy?url=${encodeURIComponent(preview)}`}
                      alt={`${locale.toUpperCase()} 표지 미리보기`}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[10px] text-text-tertiary">
                      {editionExists ? '표지 없음' : '판본 없음'}
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1 space-y-3">
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-medium text-text-secondary">
                      thumbnail_url
                    </span>
                    <textarea
                      value={draft.thumbnailUrl}
                      onChange={event => change(locale, { thumbnailUrl: event.target.value })}
                      disabled={!editionExists}
                      rows={3}
                      placeholder="https://..."
                      className="w-full resize-none rounded-md border border-border bg-bg-card px-2.5 py-2 font-mono text-[11px] text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-medium text-text-secondary">
                      sources.thumbnail
                    </span>
                    <input
                      value={draft.thumbnailSource}
                      onChange={event => change(locale, { thumbnailSource: event.target.value })}
                      disabled={!editionExists}
                      list="book-cover-source-options"
                      placeholder="primary와 같으면 비워도 됨"
                      className="w-full rounded-md border border-border bg-bg-card px-2.5 py-2 font-mono text-[11px] text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none"
                    />
                  </label>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <datalist id="book-cover-source-options">
        {SOURCE_OPTIONS.map(source => <option key={source} value={source} />)}
      </datalist>
    </section>
  )
}
