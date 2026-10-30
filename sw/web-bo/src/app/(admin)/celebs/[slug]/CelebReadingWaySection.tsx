'use client'

import { useLangMode } from '@/contexts/LangModeContext'

interface Props {
  readingWay: string | null
  readingWayEn: string | null
}

export default function CelebReadingWaySection({ readingWay, readingWayEn }: Props) {
  const langMode = useLangMode()
  const insufficient = readingWay === '' && readingWayEn === ''
  const hasKo = Boolean(readingWay?.trim())
  const hasEn = Boolean(readingWayEn?.trim())
  const status = insufficient ? '조사 미달' : hasKo ? '원문 있음' : '미조사'

  return (
    <section id="reading-way" aria-labelledby="reading-way-title" className="rounded-lg border border-border bg-bg-card p-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 id="reading-way-title" className="text-base font-semibold text-text-primary">독서 방식</h2>
        <span className="rounded-full border border-border px-2 py-1 text-xs text-text-secondary">{status}</span>
      </div>

      {insufficient && (
        <p className="text-sm text-text-secondary">조사했으나 독립된 글을 구성할 만큼의 내용이 없어 미달로 기록했습니다.</p>
      )}
      {!insufficient && !hasKo && !hasEn && (
        <p className="text-sm text-text-secondary">아직 조사한 원문이 없습니다.</p>
      )}
      {(hasKo || hasEn) && (
        <div className={`grid gap-6 ${langMode === 'both' ? 'xl:grid-cols-2' : ''}`}>
          {langMode !== 'en' && <Manuscript label="국문" lang="ko" text={readingWay} />}
          {langMode !== 'ko' && <Manuscript label="영문" lang="en" text={readingWayEn} />}
        </div>
      )}
    </section>
  )
}

function Manuscript({ label, lang, text }: { label: string; lang: string; text: string | null }) {
  return (
    <div className="min-w-0 space-y-3" lang={lang}>
      <h3 className="text-xs font-semibold text-text-secondary">{label}</h3>
      {text?.trim() && <p className="whitespace-pre-wrap break-words text-sm leading-7 text-text-primary">{text}</p>}
      {!text?.trim() && <p className="text-sm text-text-tertiary">아직 작성된 원문이 없습니다.</p>}
    </div>
  )
}
