'use client'

import { Ban, CheckCircle2, Loader2, Save, ShieldCheck } from 'lucide-react'
import {
  cancelContentResearchRun,
  completeContentResearchRun,
  updateContentResearchRun,
} from '@/actions/admin/content-research'
import type { ContentResearchRun } from '@/actions/admin/content-research-types'
import { Feedback, formatDateTime, splitVariants, useLedgerAction } from '../shared'
import ScopeLedger from './ScopeLedger'

function RunHeader({ run }: { run: ContentResearchRun }) {
  const completedScopes = run.scopes.filter((scope) => scope.status === 'completed').length
  return (
    <div className="flex flex-col gap-3 border-b border-border bg-bg-secondary px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm font-semibold text-text-primary">
            {run.batchKey}
          </span>
          <span
            className={`rounded border px-2 py-0.5 text-[11px] font-medium ${
              run.status === 'completed'
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                : run.status === 'cancelled'
                  ? 'border-slate-500/30 bg-slate-500/10 text-slate-300'
                  : 'border-blue-500/30 bg-blue-500/10 text-blue-200'
            }`}
          >
            {run.status}
          </span>
        </div>
        <p className="mt-1 text-xs text-text-tertiary">
          {run.researcherLabel} · {formatDateTime(run.startedAt)}
        </p>
      </div>
      <div className="flex items-center gap-2 font-mono text-xs text-text-secondary">
        <span>{completedScopes}/4 scopes</span>
        <span className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-700">
          <span
            className="block h-full bg-accent"
            style={{ width: `${(completedScopes / 4) * 100}%` }}
          />
        </span>
      </div>
    </div>
  )
}

export default function ActiveRun({ run }: { run: ContentResearchRun }) {
  const { pending, message, error, runAction } =
    useLedgerAction('작업에 실패했습니다.')

  function handleMetadata(formData: FormData) {
    runAction(
      () =>
        updateContentResearchRun(run.id, {
          researcherLabel: String(formData.get('researcherLabel') ?? ''),
          nameVariants: splitVariants(formData.get('nameVariants')),
          homonymNotes: String(formData.get('homonymNotes') ?? ''),
          summary: String(formData.get('summary') ?? ''),
        }),
      '실행 메타데이터를 저장했습니다.'
    )
  }

  function handleComplete() {
    if (
      !window.confirm(
        '네 유형 완료, 후보 판정, 출처, 실제 콘텐츠 연결을 DB가 다시 검사합니다. 조사를 확정할까요?'
      )
    ) {
      return
    }
    runAction(() => completeContentResearchRun(run.id), '조사를 최종 확정했습니다.')
  }

  function handleCancel() {
    if (!window.confirm('이 조사 실행을 취소하고 프로필을 열린 0으로 돌릴까요?')) return
    runAction(() => cancelContentResearchRun(run.id), '조사 실행을 취소했습니다.')
  }

  return (
    <section className="overflow-hidden rounded-lg border border-blue-500/30 bg-bg-card">
      <RunHeader run={run} />

      <form action={handleMetadata} className="grid gap-4 border-b border-border p-5 lg:grid-cols-2">
        <label className="space-y-1.5">
          <span className="text-xs font-medium text-text-secondary">조사자</span>
          <input
            name="researcherLabel"
            required
            defaultValue={run.researcherLabel}
            className="w-full rounded border border-border bg-bg-secondary px-3 py-2 text-sm text-text-primary outline-none focus:border-accent"
          />
        </label>
        <label className="space-y-1.5">
          <span className="text-xs font-medium text-text-secondary">검색 표기 변형</span>
          <textarea
            name="nameVariants"
            required
            rows={4}
            defaultValue={run.nameVariants.join('\n')}
            className="w-full rounded border border-border bg-bg-secondary px-3 py-2 font-mono text-sm leading-6 text-text-primary outline-none focus:border-accent"
          />
        </label>
        <label className="space-y-1.5">
          <span className="text-xs font-medium text-text-secondary">동명이인 차단 메모</span>
          <textarea
            name="homonymNotes"
            rows={4}
            defaultValue={run.homonymNotes ?? ''}
            className="w-full rounded border border-border bg-bg-secondary px-3 py-2 text-sm leading-6 text-text-primary outline-none focus:border-accent"
          />
        </label>
        <label className="space-y-1.5">
          <span className="text-xs font-medium text-text-secondary">실행 요약</span>
          <textarea
            name="summary"
            rows={4}
            defaultValue={run.summary ?? ''}
            placeholder="이번 조사에서 확인한 범위와 남은 판단"
            className="w-full rounded border border-border bg-bg-secondary px-3 py-2 text-sm leading-6 text-text-primary outline-none focus:border-accent"
          />
        </label>
        <div className="lg:col-span-2">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-2 rounded border border-border px-3 py-2 text-sm text-text-secondary hover:border-accent hover:text-accent disabled:cursor-wait disabled:opacity-50"
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            실행 정보 저장
          </button>
        </div>
      </form>

      <div className="grid gap-4 p-4 xl:grid-cols-2">
        {run.scopes.map((scope) => (
          <ScopeLedger key={scope.contentType} scope={scope} editable />
        ))}
      </div>

      <div className="border-t border-border bg-bg-secondary px-5 py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 h-4 w-4 text-emerald-300" />
            <p className="max-w-2xl text-xs leading-5 text-text-secondary">
              최종 확정은 네 유형 완료, 유형별 출처, 모든 후보 판정, 채택 작품의 1차
              출처와 실제 celeb_contents 연결을 한 트랜잭션에서 검사합니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleCancel}
              disabled={pending}
              className="inline-flex items-center gap-1.5 rounded border border-rose-500/30 px-3 py-2 text-sm text-rose-300 hover:bg-rose-500/10 hover:text-rose-100 disabled:cursor-wait disabled:opacity-50"
            >
              <Ban className="h-4 w-4" />
              실행 취소
            </button>
            <button
              type="button"
              onClick={handleComplete}
              disabled={pending}
              className="inline-flex items-center gap-1.5 rounded bg-emerald-400 px-4 py-2 text-sm font-bold text-emerald-950 hover:bg-emerald-300 disabled:cursor-wait disabled:opacity-50"
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              조사 최종 확정
            </button>
          </div>
        </div>
        <Feedback message={message} error={error} />
      </div>
    </section>
  )
}
