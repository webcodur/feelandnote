'use client'

import { CircleAlert, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import type { AudioJob, JobAction } from '@/lib/types'
import { StudioHeader } from './studio/StudioHeader'
import { JobWorkspace } from './studio/JobWorkspace'
import { SourceSelection } from './studio/SourceSelection'
import { TrainingConfirmDialog } from './studio/TrainingConfirmDialog'
import { WorkflowModes, type WorkflowMode } from './studio/WorkflowModes'

export function Studio() {
  const [jobs, setJobs] = useState<AudioJob[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [mode, setMode] = useState<WorkflowMode>('select')
  const [notice, setNotice] = useState('')
  const [confirmTraining, setConfirmTraining] = useState(false)
  const selected = jobs.find((job) => job.id === selectedId)

  const refresh = useCallback(async () => {
    const response = await fetch('/api/jobs', { cache: 'no-store' })
    if (!response.ok) return
    const next = await response.json() as AudioJob[]
    const params = new URLSearchParams(window.location.search)
    const requestedJob = params.get('job')
    const requestedMode = params.get('mode') as WorkflowMode | null
    setJobs(next)
    setSelectedId((current) => current || next.find((job) => job.id === requestedJob)?.id || next[0]?.id || '')
    if (requestedMode && ['select', 'edit', 'train', 'create'].includes(requestedMode)) setMode(requestedMode)
  }, [])

  useEffect(() => {
    void refresh()
    const timer = window.setInterval(refresh, 2000)
    return () => window.clearInterval(timer)
  }, [refresh])

  async function execute(action: JobAction) {
    if (!selected) return
    setNotice('')
    const response = await fetch(`/api/jobs/${selected.id}/actions`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }),
    })
    if (!response.ok) {
      const body = await response.json() as { message?: string }
      setNotice(body.message ?? '작업을 시작하지 못했습니다.')
    }
    await refresh()
  }

  function run(action: JobAction) {
    if (action === 'train') { setConfirmTraining(true); return }
    void execute(action)
  }

  function created(job: AudioJob) {
    setJobs((current) => [job, ...current])
    setSelectedId(job.id)
    setMode('select')
  }

  return (
    <main className="studio-grid min-h-screen">
      <StudioHeader jobCount={jobs.length} />
      <div className="border-b border-line bg-ink/95">
        <div className="mx-auto max-w-[1600px] px-4 py-5 md:px-7">
          <div className="mb-4"><p className="text-sm text-signal">처음이라면 1번부터 시작하세요</p><h1 className="mt-1 font-display text-2xl">무엇을 하시겠어요?</h1></div>
          <WorkflowModes job={selected} value={mode} onChange={setMode} />
          {notice && <div role="alert" className="mt-3 flex items-center justify-between gap-3 border border-danger bg-panel px-4 py-3 text-sm text-danger"><span className="flex items-center gap-2"><CircleAlert size={17} />{notice}</span><button aria-label="안내 닫기" onClick={() => setNotice('')}><X size={17} /></button></div>}
        </div>
      </div>
      <div className="mx-auto max-w-[1600px] p-4 md:p-7">
        {mode === 'select'
          ? <SourceSelection jobs={jobs} selected={selected} selectedId={selectedId} onCreated={created} onSelect={setSelectedId} onRun={run} onContinue={() => setMode('edit')} />
          : <JobWorkspace job={selected} mode={mode} onModeChange={setMode} onRun={run} onSaved={refresh} />}
      </div>
      {confirmTraining && selected && <TrainingConfirmDialog job={selected} onCancel={() => setConfirmTraining(false)} onConfirm={() => { setConfirmTraining(false); void execute('train') }} />}
    </main>
  )
}
