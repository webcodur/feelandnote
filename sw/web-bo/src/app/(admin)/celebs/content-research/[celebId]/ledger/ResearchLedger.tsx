import { CircleDashed } from 'lucide-react'
import type { ContentResearchDetail } from '@/actions/admin/content-research-types'
import ActiveRun from './sections/ActiveRun'
import RunArchive from './sections/RunArchive'
import StartRunForm from './sections/StartRunForm'

export default function ResearchLedger({ detail }: { detail: ContentResearchDetail }) {
  const activeRun = detail.runs.find((run) => run.status === 'in_progress') ?? null
  const archivedRuns = detail.runs.filter((run) => run.status !== 'in_progress')

  return (
    <div className="space-y-5">
      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-bg-card p-4">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-text-tertiary">
            <CircleDashed className="h-4 w-4" />
            현재 표시
          </div>
          <p className="mt-2 font-mono text-2xl font-bold text-text-primary">
            {detail.profile.actualContentCount > 0
              ? detail.profile.actualContentCount
              : detail.profile.researchStatus === 'confirmed_empty'
                ? -1
                : 0}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-text-tertiary">조사 실행</p>
          <p className="mt-2 font-mono text-2xl font-bold text-text-primary">
            {detail.runs.length}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-text-tertiary">완료 실행</p>
          <p className="mt-2 font-mono text-2xl font-bold text-emerald-300">
            {detail.runs.filter((run) => run.status === 'completed').length}
          </p>
        </div>
      </section>

      {activeRun ? <ActiveRun run={activeRun} /> : <StartRunForm detail={detail} />}
      <RunArchive runs={archivedRuns} />
    </div>
  )
}
