import { ClipboardList } from 'lucide-react'
import type { ContentResearchRun } from '@/actions/admin/content-research-types'
import { formatDateTime } from '../shared'
import ScopeLedger from './ScopeLedger'

export default function RunArchive({ runs }: { runs: ContentResearchRun[] }) {
  if (runs.length === 0) return null

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-bg-card">
      <div className="flex items-center gap-2 border-b border-border px-5 py-4">
        <ClipboardList className="h-4 w-4 text-text-secondary" />
        <h2 className="font-semibold text-text-primary">이전 조사 실행</h2>
      </div>
      <div className="divide-y divide-border">
        {runs.map((run) => {
          const findingCount = run.scopes.reduce(
            (total, scope) => total + scope.findings.length,
            0
          )
          const sourceCount = run.scopes.reduce(
            (total, scope) => total + scope.sources.length,
            0
          )
          return (
            <details key={run.id} className="group">
              <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 px-5 py-4 hover:bg-white/[0.025]">
                <div>
                  <p className="font-mono text-sm text-text-primary">{run.batchKey}</p>
                  <p className="mt-1 text-xs text-text-tertiary">
                    {run.status} · {run.researcherLabel} · {formatDateTime(run.completedAt)}
                  </p>
                </div>
                <p className="text-xs text-text-secondary">
                  후보 {findingCount} · 출처 {sourceCount}
                </p>
              </summary>
              <div className="grid gap-4 border-t border-border bg-bg-secondary/40 p-4 xl:grid-cols-2">
                {run.scopes.map((scope) => (
                  <ScopeLedger key={scope.contentType} scope={scope} editable={false} />
                ))}
              </div>
            </details>
          )
        })}
      </div>
    </section>
  )
}
