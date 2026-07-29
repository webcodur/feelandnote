import { ExternalLink, Link2, Loader2, Plus, X } from 'lucide-react'
import type {
  ContentResearchScope,
  ContentResearchSource,
} from '@/actions/admin/content-research-types'
import { SOURCE_KIND_OPTIONS } from '../meta'

function SourceRow({
  source,
  editable,
  pending,
  onDelete,
}: {
  source: ContentResearchSource
  editable: boolean
  pending: boolean
  onDelete: (source: ContentResearchSource) => void
}) {
  return (
    <li className="flex items-start justify-between gap-2 rounded border border-border bg-bg-secondary/60 px-3 py-2">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={`rounded px-1.5 py-0.5 text-[10px] ${
              source.sourceTier === 'primary'
                ? 'bg-emerald-500/15 text-emerald-200'
                : 'bg-slate-500/15 text-slate-300'
            }`}
          >
            {source.sourceTier}
          </span>
          <span className="text-[10px] text-text-tertiary">{source.sourceKind}</span>
          {source.findingId ? (
            <span className="text-[10px] text-blue-300">후보 연결</span>
          ) : (
            <span className="text-[10px] text-amber-300">유형 근거</span>
          )}
        </div>
        <a
          href={source.url}
          target="_blank"
          rel="noreferrer"
          className="mt-1 flex min-w-0 items-center gap-1 text-xs text-accent hover:text-accent-hover hover:underline"
        >
          <span className="truncate">{source.title || source.url}</span>
          <ExternalLink className="h-3 w-3 shrink-0" />
        </a>
        {source.notes ? (
          <p className="mt-1 text-[11px] leading-4 text-text-tertiary">{source.notes}</p>
        ) : null}
      </div>
      {editable ? (
        <button
          type="button"
          onClick={() => onDelete(source)}
          disabled={pending}
          aria-label="출처 삭제"
          className="shrink-0 rounded p-1 text-text-tertiary hover:bg-rose-500/10 hover:text-rose-300 disabled:opacity-50"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </li>
  )
}

export default function SourceSection({
  scope,
  editable,
  pending,
  onSave,
  onDelete,
}: {
  scope: ContentResearchScope
  editable: boolean
  pending: boolean
  onSave: (formData: FormData) => void
  onDelete: (source: ContentResearchSource) => void
}) {
  return (
    <div className="space-y-3 border-t border-border p-4">
      <div className="flex items-center gap-1.5">
        <Link2 className="h-3.5 w-3.5 text-text-tertiary" />
        <h4 className="text-xs font-semibold text-text-secondary">
          확인 출처 {scope.sources.length}
        </h4>
      </div>

      <ul className="space-y-2">
        {scope.sources.map((source) => (
          <SourceRow
            key={source.id}
            source={source}
            editable={editable}
            pending={pending}
            onDelete={onDelete}
          />
        ))}
        {scope.sources.length === 0 ? (
          <li className="rounded border border-dashed border-rose-500/30 px-3 py-4 text-center text-[11px] text-rose-300">
            유형 완료에 필요한 출처가 없습니다.
          </li>
        ) : null}
      </ul>

      {editable ? (
        <details className="rounded border border-dashed border-border">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 px-3 py-2 text-xs text-text-secondary hover:bg-white/[0.035] hover:text-accent">
            <Plus className="h-3.5 w-3.5" />
            출처 URL 추가
          </summary>
          <form action={onSave} className="grid gap-3 border-t border-border p-3 sm:grid-cols-2">
            <label className="space-y-1 sm:col-span-2">
              <span className="text-[11px] text-text-secondary">URL</span>
              <input
                name="url"
                type="url"
                required
                placeholder="https://..."
                className="w-full rounded border border-border bg-bg-primary px-2.5 py-2 font-mono text-xs text-text-primary outline-none focus:border-accent"
              />
            </label>
            <label className="space-y-1">
              <span className="text-[11px] text-text-secondary">출처 등급</span>
              <select
                name="sourceTier"
                defaultValue="primary"
                className="w-full rounded border border-border bg-bg-primary px-2.5 py-2 text-xs text-text-primary outline-none focus:border-accent"
              >
                <option value="primary">1차 출처</option>
                <option value="secondary">2차 보조 출처</option>
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-[11px] text-text-secondary">출처 종류</span>
              <select
                name="sourceKind"
                defaultValue="interview"
                className="w-full rounded border border-border bg-bg-primary px-2.5 py-2 text-xs text-text-primary outline-none focus:border-accent"
              >
                {SOURCE_KIND_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-[11px] text-text-secondary">연결 후보</span>
              <select
                name="findingId"
                defaultValue=""
                className="w-full rounded border border-border bg-bg-primary px-2.5 py-2 text-xs text-text-primary outline-none focus:border-accent"
              >
                <option value="">유형 전체 조사 근거</option>
                {scope.findings.map((finding) => (
                  <option key={finding.id} value={finding.id}>
                    {finding.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-[11px] text-text-secondary">접근 상태</span>
              <select
                name="accessStatus"
                defaultValue="accessible"
                className="w-full rounded border border-border bg-bg-primary px-2.5 py-2 text-xs text-text-primary outline-none focus:border-accent"
              >
                <option value="accessible">접근 가능</option>
                <option value="bot_blocked">봇 차단·육안 확인</option>
                <option value="archived">아카이브</option>
                <option value="unavailable">현재 접근 불가</option>
              </select>
            </label>
            <label className="space-y-1 sm:col-span-2">
              <span className="text-[11px] text-text-secondary">출처 제목</span>
              <input
                name="sourceTitle"
                className="w-full rounded border border-border bg-bg-primary px-2.5 py-2 text-xs text-text-primary outline-none focus:border-accent"
              />
            </label>
            <label className="space-y-1 sm:col-span-2">
              <span className="text-[11px] text-text-secondary">확인 메모</span>
              <textarea
                name="sourceNotes"
                rows={2}
                className="w-full rounded border border-border bg-bg-primary px-2.5 py-2 text-xs leading-5 text-text-primary outline-none focus:border-accent"
              />
            </label>
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={pending}
                className="inline-flex items-center gap-1 rounded bg-accent px-2.5 py-1.5 text-xs font-semibold text-black hover:bg-accent-hover disabled:opacity-50"
              >
                {pending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Plus className="h-3.5 w-3.5" />
                )}
                출처 저장
              </button>
            </div>
          </form>
        </details>
      ) : null}
    </div>
  )
}
