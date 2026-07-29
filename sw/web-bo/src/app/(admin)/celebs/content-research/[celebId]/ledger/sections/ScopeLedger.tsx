'use client'

import { Loader2, Save } from 'lucide-react'
import {
  deleteContentResearchFinding,
  deleteContentResearchSource,
  saveContentResearchFinding,
  saveContentResearchSource,
  updateContentResearchScope,
} from '@/actions/admin/content-research'
import type {
  ContentResearchFinding,
  ContentResearchFindingDecision,
  ContentResearchScope,
  ContentResearchScopeStatus,
  ContentResearchSource,
  ContentResearchSourceKind,
} from '@/actions/admin/content-research-types'
import { TYPE_META } from '../meta'
import { Feedback, useLedgerAction } from '../shared'
import FindingSection from './FindingSection'
import SourceSection from './SourceSection'

function ScopeStatusBadge({ status }: { status: ContentResearchScopeStatus }) {
  const className =
    status === 'completed'
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
      : status === 'in_progress'
        ? 'border-blue-500/30 bg-blue-500/10 text-blue-200'
        : 'border-slate-500/30 bg-slate-500/10 text-slate-300'
  return (
    <span className={`rounded border px-2 py-0.5 text-[10px] font-medium ${className}`}>
      {status}
    </span>
  )
}

export default function ScopeLedger({
  scope,
  editable,
}: {
  scope: ContentResearchScope
  editable: boolean
}) {
  const { pending, message, error, setError, runAction } =
    useLedgerAction('저장에 실패했습니다.')
  const meta = TYPE_META[scope.contentType]
  const Icon = meta.icon

  function handleScope(formData: FormData) {
    const status = String(formData.get('status')) as ContentResearchScopeStatus
    if (status === 'completed' && scope.sources.length === 0) {
      setError('완료하려면 이 유형에서 확인한 출처 URL을 하나 이상 기록하세요.')
      return
    }
    runAction(
      () =>
        updateContentResearchScope({
          runId: scope.runId,
          contentType: scope.contentType,
          status,
          searchNotes: String(formData.get('searchNotes') ?? ''),
        }),
      `${meta.label} 조사 상태를 저장했습니다.`
    )
  }

  function saveFinding(formData: FormData, finding?: ContentResearchFinding) {
    runAction(
      () =>
        saveContentResearchFinding({
          id: finding?.id,
          runId: scope.runId,
          contentType: scope.contentType,
          decision: String(formData.get('decision')) as ContentResearchFindingDecision,
          title: String(formData.get('title') ?? ''),
          creator: String(formData.get('creator') ?? ''),
          contentId: String(formData.get('contentId') ?? ''),
          evidenceSummary: String(formData.get('evidenceSummary') ?? ''),
          rejectionReason: String(formData.get('rejectionReason') ?? ''),
        }),
      finding ? '후보 판정을 수정했습니다.' : '작품 후보를 추가했습니다.'
    )
  }

  function handleDeleteFinding(finding: ContentResearchFinding) {
    if (!window.confirm(`「${finding.title}」 후보와 연결된 출처를 함께 삭제할까요?`)) {
      return
    }
    runAction(
      () => deleteContentResearchFinding(scope.runId, finding.id),
      '작품 후보를 삭제했습니다.'
    )
  }

  function handleSource(formData: FormData) {
    runAction(
      () =>
        saveContentResearchSource({
          runId: scope.runId,
          contentType: scope.contentType,
          findingId: String(formData.get('findingId') ?? '') || null,
          url: String(formData.get('url') ?? ''),
          sourceTier: String(formData.get('sourceTier')) as 'primary' | 'secondary',
          sourceKind: String(formData.get('sourceKind')) as ContentResearchSourceKind,
          accessStatus: String(formData.get('accessStatus')) as
            | 'accessible'
            | 'bot_blocked'
            | 'archived'
            | 'unavailable',
          title: String(formData.get('sourceTitle') ?? ''),
          notes: String(formData.get('sourceNotes') ?? ''),
        }),
      '출처를 추가했습니다.'
    )
  }

  function handleDeleteSource(source: ContentResearchSource) {
    if (!window.confirm('이 출처 기록을 삭제할까요?')) return
    runAction(
      () => deleteContentResearchSource(scope.runId, source.id),
      '출처를 삭제했습니다.'
    )
  }

  return (
    <section
      className={`overflow-hidden rounded border border-border border-l-2 bg-bg-primary ${meta.border}`}
    >
      <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${meta.text}`} />
          <h3 className="font-semibold text-text-primary">{meta.label}</h3>
        </div>
        <ScopeStatusBadge status={scope.status} />
      </header>

      {editable ? (
        <form action={handleScope} className="space-y-3 border-b border-border p-4">
          <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
            <label className="space-y-1">
              <span className="text-[11px] text-text-secondary">유형 상태</span>
              <select
                name="status"
                defaultValue={scope.status}
                className="w-full rounded border border-border bg-bg-secondary px-2.5 py-2 text-xs text-text-primary outline-none focus:border-accent"
              >
                <option value="pending">대기</option>
                <option value="in_progress">조사 중</option>
                <option value="completed">완료</option>
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-[11px] text-text-secondary">검색 범위·무후보 메모</span>
              <textarea
                name="searchNotes"
                rows={3}
                defaultValue={scope.searchNotes ?? ''}
                placeholder="검색어, 확인한 채널, 작품이 없었던 이유"
                className="w-full rounded border border-border bg-bg-secondary px-2.5 py-2 text-xs leading-5 text-text-primary outline-none focus:border-accent"
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-1 rounded border border-border px-2.5 py-1.5 text-xs text-text-secondary hover:border-accent hover:text-accent disabled:cursor-wait disabled:opacity-50"
          >
            {pending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            유형 저장
          </button>
        </form>
      ) : scope.searchNotes ? (
        <p className="border-b border-border px-4 py-3 text-xs leading-5 text-text-secondary">
          {scope.searchNotes}
        </p>
      ) : null}

      <FindingSection
        scope={scope}
        editable={editable}
        pending={pending}
        onSave={saveFinding}
        onDelete={handleDeleteFinding}
      />
      <SourceSection
        scope={scope}
        editable={editable}
        pending={pending}
        onSave={handleSource}
        onDelete={handleDeleteSource}
      />
      <div className="px-4 pb-4">
        <Feedback message={message} error={error} compact />
      </div>
    </section>
  )
}
