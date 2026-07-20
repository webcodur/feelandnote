'use client'

import { Activity, ArrowLeft, Clock3, Folder, Radio } from 'lucide-react'
import type { AudioJob, JobAction } from '@/lib/types'
import { getCompletedStep, getCompletedStepLabel, isJobComplete, WORKFLOW_STEPS } from '@/lib/job-progress'
import { ModePanel } from './ModePanels'
import type { WorkflowMode } from './WorkflowModes'

const BUSY = new Set(['extracting', 'cleaning', 'transcribing', 'training', 'synthesizing'])
const STAGE_LABEL = {
  idle: '대기 중', extracting: '음원 가져오는 중', cleaning: '잡음 줄이는 중',
  transcribing: '받아쓰는 중', training: '목소리 학습 중',
  synthesizing: '음성 만드는 중', complete: '완료', failed: '확인 필요',
}

type Props = { job?: AudioJob; mode: WorkflowMode; onModeChange: (mode: WorkflowMode) => void; onRun: (action: JobAction) => void; onSaved: () => Promise<void> }

export function JobWorkspace({ job, mode, onModeChange, onRun, onSaved }: Props) {
  if (!job) return <Empty onSelect={() => onModeChange('select')} />
  const currentJob = job

  async function save(values: Partial<Pick<AudioJob, 'transcript' | 'synthesisText' | 'voiceDirections' | 'segments' | 'trainingSpeaker'>>) {
    const response = await fetch(`/api/jobs/${currentJob.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })
    if (!response.ok) throw new Error('저장하지 못했습니다.')
    await onSaved()
  }

  return (
    <section className="min-w-0 space-y-5">
      <JobStatusBar job={job} onChange={() => onModeChange('select')} />
      {job.files.source ? <ModePanel job={job} mode={mode} busy={BUSY.has(job.stage)} onModeChange={onModeChange} onRun={onRun} onSave={save} /> : <MissingSource onSelect={() => onModeChange('select')} />}
    </section>
  )
}

function JobStatusBar({ job, onChange }: { job: AudioJob; onChange: () => void }) {
  const completedStep = getCompletedStep(job)
  const status = isJobComplete(job) ? '완료' : STAGE_LABEL[job.stage]
  const mediaLength = job.durationSeconds ? formatDuration(job.durationSeconds) : job.endSeconds > job.startSeconds ? `${job.startSeconds}초–${job.endSeconds}초` : '영상 가져오기 전'
  async function openFolder() { await fetch(`/api/jobs/${job.id}/folder`, { method: 'POST' }) }
  return <header className="border border-line bg-panel"><div className="grid gap-4 p-4 lg:grid-cols-[auto_minmax(220px,1fr)_auto_auto_auto] lg:items-center"><button onClick={onChange} className="flex items-center gap-2 border border-line px-3 py-2 text-sm text-muted hover:border-signal hover:text-signal"><ArrowLeft size={16} />영상 변경</button><div className="min-w-0"><p className="truncate font-display text-lg">{job.name}</p><p className="mt-1 truncate text-sm text-muted">저장 이름 {job.speaker} · {job.message}</p></div><p className="flex items-center gap-2 font-mono text-sm text-muted"><Clock3 size={15} />{mediaLength}</p><p className="flex items-center gap-2 text-sm"><Radio size={15} className={job.stage === 'failed' ? 'text-danger' : 'text-live'} />{status}</p><button onClick={openFolder} className="flex items-center gap-2 px-3 py-2 text-sm text-muted hover:text-signal"><Folder size={15} />폴더</button></div><div className="border-t border-line bg-ink/70 px-4 py-3"><div className="mb-2 flex items-center justify-between gap-3 text-xs"><span className="text-muted">완료한 단계</span><b className="text-signal">{completedStep}/4 · {getCompletedStepLabel(job)}</b></div><ol className="grid grid-cols-4 gap-1" aria-label="전체 작업 단계">{WORKFLOW_STEPS.map((label, index) => { const done = index < completedStep; return <li key={label} className={`border px-2 py-1.5 text-center text-xs ${done ? 'border-signal/60 bg-signal/10 text-signal' : 'border-line text-muted'}`}>{index + 1}. {label}</li> })}</ol></div></header>
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  return `${minutes}분 ${Math.floor(seconds % 60)}초`
}

function MissingSource({ onSelect }: { onSelect: () => void }) {
  return <div className="grid min-h-80 place-items-center border border-dashed border-line bg-panel/50 p-6 text-center"><div><Activity className="mx-auto text-signal" size={32} /><h1 className="mt-4 font-display text-2xl">먼저 영상을 가져오세요</h1><p className="mt-2 text-sm text-muted">1번 영상 선택에서 사용할 영상을 D드라이브에 준비해야 합니다.</p><button onClick={onSelect} className="mt-5 bg-signal px-5 py-3 text-sm font-semibold text-ink">영상 선택으로 이동</button></div></div>
}

function Empty({ onSelect }: { onSelect: () => void }) {
  return <div className="grid min-h-[60vh] place-items-center border border-dashed border-line bg-panel/40"><div className="text-center"><Activity className="mx-auto mb-4 text-signal" size={36} /><h1 className="font-display text-2xl">편집할 영상이 선택되지 않았습니다</h1><p className="mt-2 text-sm text-muted">1번 영상 선택에서 새 작업을 만들거나 저장된 작업을 불러오세요.</p><button onClick={onSelect} className="mt-5 bg-signal px-5 py-3 text-sm font-semibold text-ink">영상 선택으로 이동</button></div></div>
}
