import { FileQuestion, Plus, Save, Trash2 } from 'lucide-react'
import type {
  ContentResearchFinding,
  ContentResearchScope,
} from '@/actions/admin/content-research-types'
import { DECISION_META } from '../meta'

function FindingFields({ finding }: { finding?: ContentResearchFinding }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="space-y-1 sm:col-span-2">
        <span className="text-[11px] text-text-secondary">작품명</span>
        <input
          name="title"
          required
          defaultValue={finding?.title ?? ''}
          className="w-full rounded border border-border bg-bg-primary px-2.5 py-2 text-xs text-text-primary outline-none focus:border-accent"
        />
      </label>
      <label className="space-y-1">
        <span className="text-[11px] text-text-secondary">창작자·제작자</span>
        <input
          name="creator"
          defaultValue={finding?.creator ?? ''}
          className="w-full rounded border border-border bg-bg-primary px-2.5 py-2 text-xs text-text-primary outline-none focus:border-accent"
        />
      </label>
      <label className="space-y-1">
        <span className="text-[11px] text-text-secondary">판정</span>
        <select
          name="decision"
          defaultValue={finding?.decision ?? 'candidate'}
          className="w-full rounded border border-border bg-bg-primary px-2.5 py-2 text-xs text-text-primary outline-none focus:border-accent"
        >
          <option value="candidate">검토 중</option>
          <option value="accepted">채택</option>
          <option value="rejected">기각</option>
        </select>
      </label>
      <label className="space-y-1 sm:col-span-2">
        <span className="text-[11px] text-text-secondary">
          연결 content_id · 채택일 때 필수
        </span>
        <input
          name="contentId"
          defaultValue={finding?.contentId ?? ''}
          className="w-full rounded border border-border bg-bg-primary px-2.5 py-2 font-mono text-xs text-text-primary outline-none focus:border-accent"
        />
      </label>
      <label className="space-y-1 sm:col-span-2">
        <span className="text-[11px] text-text-secondary">근거 요약</span>
        <textarea
          name="evidenceSummary"
          rows={3}
          defaultValue={finding?.evidenceSummary ?? ''}
          placeholder="본인이 무엇을 읽고·보고·듣고·플레이했다고 확인되는지"
          className="w-full rounded border border-border bg-bg-primary px-2.5 py-2 text-xs leading-5 text-text-primary outline-none focus:border-accent"
        />
      </label>
      <label className="space-y-1 sm:col-span-2">
        <span className="text-[11px] text-text-secondary">기각 사유</span>
        <textarea
          name="rejectionReason"
          rows={2}
          defaultValue={finding?.rejectionReason ?? ''}
          placeholder="동명이인·본인 창작·후대 영향·작품 미식별 등"
          className="w-full rounded border border-border bg-bg-primary px-2.5 py-2 text-xs leading-5 text-text-primary outline-none focus:border-accent"
        />
      </label>
    </div>
  )
}

function FindingCard({
  finding,
  editable,
  pending,
  onSave,
  onDelete,
}: {
  finding: ContentResearchFinding
  editable: boolean
  pending: boolean
  onSave: (finding: ContentResearchFinding, formData: FormData) => void
  onDelete: (finding: ContentResearchFinding) => void
}) {
  const meta = DECISION_META[finding.decision]
  const hasPrimary = finding.sources.some((source) => source.sourceTier === 'primary')

  return (
    <article className="rounded border border-border bg-bg-secondary/60">
      <div className="flex items-start justify-between gap-3 px-3 py-2.5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-text-primary">{finding.title}</p>
            <span className={`rounded border px-1.5 py-0.5 text-[10px] ${meta.className}`}>
              {meta.label}
            </span>
            {finding.decision === 'accepted' ? (
              <span
                className={`text-[10px] ${
                  hasPrimary ? 'text-emerald-300' : 'text-rose-300'
                }`}
              >
                {hasPrimary ? '1차 출처 있음' : '1차 출처 필요'}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-[11px] text-text-tertiary">
            {finding.creator || '창작자 미입력'}
            {finding.contentId ? ` · ${finding.contentId}` : ''}
          </p>
          {finding.evidenceSummary ? (
            <p className="mt-2 text-xs leading-5 text-text-secondary">
              {finding.evidenceSummary}
            </p>
          ) : null}
          {finding.rejectionReason ? (
            <p className="mt-1 text-xs leading-5 text-rose-200">
              기각: {finding.rejectionReason}
            </p>
          ) : null}
        </div>
        <span className="shrink-0 font-mono text-[10px] text-text-tertiary">
          src {finding.sources.length}
        </span>
      </div>

      {editable ? (
        <details className="border-t border-border">
          <summary className="cursor-pointer list-none px-3 py-2 text-[11px] text-text-secondary hover:bg-white/[0.035] hover:text-accent">
            판정 수정
          </summary>
          <form action={(formData) => onSave(finding, formData)} className="space-y-3 p-3">
            <FindingFields finding={finding} />
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={pending}
                className="inline-flex items-center gap-1 rounded border border-border px-2.5 py-1.5 text-xs text-text-secondary hover:border-accent hover:text-accent disabled:opacity-50"
              >
                <Save className="h-3.5 w-3.5" />
                수정 저장
              </button>
              <button
                type="button"
                onClick={() => onDelete(finding)}
                disabled={pending}
                className="inline-flex items-center gap-1 rounded border border-rose-500/30 px-2.5 py-1.5 text-xs text-rose-300 hover:bg-rose-500/10 hover:text-rose-100 disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                후보 삭제
              </button>
            </div>
          </form>
        </details>
      ) : null}
    </article>
  )
}

export default function FindingSection({
  scope,
  editable,
  pending,
  onSave,
  onDelete,
}: {
  scope: ContentResearchScope
  editable: boolean
  pending: boolean
  onSave: (formData: FormData, finding?: ContentResearchFinding) => void
  onDelete: (finding: ContentResearchFinding) => void
}) {
  return (
    <div className="space-y-3 p-4">
      <div className="flex items-center gap-1.5">
        <FileQuestion className="h-3.5 w-3.5 text-text-tertiary" />
        <h4 className="text-xs font-semibold text-text-secondary">
          작품 후보 {scope.findings.length}
        </h4>
      </div>

      <div className="space-y-2">
        {scope.findings.map((finding) => (
          <FindingCard
            key={finding.id}
            finding={finding}
            editable={editable}
            pending={pending}
            onSave={(target, formData) => onSave(formData, target)}
            onDelete={onDelete}
          />
        ))}
        {scope.findings.length === 0 ? (
          <p className="rounded border border-dashed border-border px-3 py-4 text-center text-[11px] text-text-tertiary">
            기록된 작품 후보가 없습니다.
          </p>
        ) : null}
      </div>

      {editable ? (
        <details className="rounded border border-dashed border-border">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 px-3 py-2 text-xs text-text-secondary hover:bg-white/[0.035] hover:text-accent">
            <Plus className="h-3.5 w-3.5" />
            작품 후보 추가
          </summary>
          <form action={(formData) => onSave(formData)} className="space-y-3 border-t border-border p-3">
            <FindingFields />
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center gap-1 rounded bg-accent px-2.5 py-1.5 text-xs font-semibold text-black hover:bg-accent-hover disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" />
              후보 저장
            </button>
          </form>
        </details>
      ) : null}
    </div>
  )
}
