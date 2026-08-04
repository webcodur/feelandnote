import type { CelebExplanation } from '@/lib/admin/celeb-explanations'

interface CelebExplanationSectionProps {
  explanation: CelebExplanation | null
}

const REVIEW_STATUS = {
  ai_reviewed: { label: 'AI 검수 완료', className: 'bg-blue-500/10 text-blue-400' },
  human_reviewed: { label: '인간 검수 완료', className: 'bg-violet-500/10 text-violet-400' },
  unreviewed: { label: '미검수', className: 'bg-slate-500/10 text-slate-400' },
}

export default function CelebExplanationSection({ explanation }: CelebExplanationSectionProps) {
  return (
    <section className="bg-bg-card border border-border rounded-lg p-5 space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-text-primary">읽어보기</h2>
          <p className="mt-1 text-xs text-text-tertiary">
            처음 보는 독자를 위한 안내와, 사실을 한 번 더 연결해 읽는 탐구
          </p>
        </div>
        {explanation && (() => {
          const review = REVIEW_STATUS[explanation.review_status ?? 'unreviewed']
          return (
            <div className="flex flex-wrap gap-2">
              <span className={`rounded px-2 py-1 text-xs font-medium ${review.className}`}>
                {review.label}
              </span>
              <span
                className={`rounded px-2 py-1 text-xs font-medium ${
                  explanation.published_at
                    ? 'bg-green-500/10 text-green-400'
                    : 'bg-yellow-500/10 text-yellow-400'
                }`}
              >
                {explanation.published_at ? '게시됨' : '미게시 · 검토용'}
              </span>
            </div>
          )
        })()}
      </header>

      {!explanation ? (
        <p className="rounded-lg border border-dashed border-border bg-bg-secondary/40 px-4 py-6 text-sm text-text-secondary">
          아직 작성된 읽어보기 원고가 없습니다.
        </p>
      ) : (
        <>
          <article className="space-y-2">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-sm font-semibold text-accent">인물 안내</h3>
              <span className="text-[11px] text-text-tertiary">{explanation.plain_text.length}자</span>
            </div>
            <div className="whitespace-pre-wrap rounded-lg bg-bg-secondary/60 px-4 py-3 text-sm leading-7 text-text-primary">
              {explanation.plain_text}
            </div>
          </article>

          <article className="space-y-2">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-sm font-semibold text-accent">인물 탐구</h3>
              <span className="text-[11px] text-text-tertiary">{explanation.interpretive_text.length}자</span>
            </div>
            <h4 className="text-base font-semibold leading-7 text-text-primary">
              {explanation.interpretive_title}
            </h4>
            <div className="whitespace-pre-wrap rounded-lg bg-bg-secondary/60 px-4 py-3 text-sm leading-7 text-text-primary">
              {explanation.interpretive_text}
            </div>
          </article>

          <p className="border-t border-border pt-3 text-[11px] text-text-tertiary">
            최종 수정 {new Date(explanation.updated_at).toLocaleString('ko-KR')}
          </p>
        </>
      )}
    </section>
  )
}
