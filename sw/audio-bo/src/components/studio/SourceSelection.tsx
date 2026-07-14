'use client'

import { ArrowRight, Check, Clock3, Folder, Film, HardDrive } from 'lucide-react'
import type { AudioJob, JobAction } from '@/lib/types'
import { getCompletedStep, getCompletedStepLabel } from '@/lib/job-progress'
import { NewJobForm } from '../NewJobForm'
import { StageRail } from '../StageRail'
import { JobList } from './JobList'

const BUSY = new Set(['extracting', 'cleaning', 'transcribing', 'training', 'synthesizing'])
type Props = {
  jobs: AudioJob[]
  selected?: AudioJob
  selectedId: string
  onCreated: (job: AudioJob) => void
  onSelect: (id: string) => void
  onRun: (action: JobAction) => void
  onContinue: () => void
}

export function SourceSelection({ jobs, selected, selectedId, onCreated, onSelect, onRun, onContinue }: Props) {
  return <section className="space-y-5"><SelectedVideo job={selected} onRun={onRun} onContinue={onContinue} /><div className="grid items-start gap-5 xl:grid-cols-[minmax(340px,0.8fr)_minmax(0,1.2fr)]"><NewJobForm onCreated={onCreated} /><JobList jobs={jobs} selectedId={selectedId} onSelect={onSelect} /></div></section>
}

function SelectedVideo({ job, onRun, onContinue }: { job?: AudioJob; onRun: (action: JobAction) => void; onContinue: () => void }) {
  if (!job) return <div className="grid min-h-52 place-items-center border border-dashed border-line bg-panel/50 p-6 text-center"><div><Film className="mx-auto text-signal" size={30} /><h2 className="mt-4 font-display text-xl">편집할 영상을 선택하세요</h2><p className="mt-2 text-sm text-muted">새 영상을 등록하거나 저장된 작업을 불러오면 여기에 표시됩니다.</p></div></div>
  const ready = Boolean(job.files.source)
  const jobId = job.id
  const duration = job.durationSeconds ? `${Math.floor(job.durationSeconds / 60)}분 ${Math.floor(job.durationSeconds % 60)}초` : '아직 가져오지 않음'
  async function openFolder() { await fetch(`/api/jobs/${jobId}/folder`, { method: 'POST' }) }
  return <article className={`border bg-panel ${ready ? 'border-live' : 'border-signal'}`}><header className="grid gap-5 border-b border-line p-5 lg:grid-cols-[1fr_auto] lg:items-center"><div className="flex min-w-0 items-start gap-4"><span className={`grid size-12 shrink-0 place-items-center ${ready ? 'bg-live text-ink' : 'bg-signal text-ink'}`}>{ready ? <Check size={21} /> : <HardDrive size={21} />}</span><div className="min-w-0"><p className={`text-sm ${ready ? 'text-live' : 'text-signal'}`}>{ready ? '편집할 영상 준비 완료' : '이 영상을 D드라이브로 가져오세요'}</p><h2 className="mt-1 truncate font-display text-2xl">{job.name}</h2><p className="mt-2 truncate text-sm text-muted">{job.sourceUrl}</p></div></div><div className="flex flex-wrap gap-2"><button onClick={openFolder} className="flex items-center gap-2 border border-line px-4 py-3 text-sm text-muted hover:border-signal hover:text-signal"><Folder size={16} />폴더 열기</button>{ready && <button onClick={onContinue} className="flex items-center gap-2 bg-signal px-5 py-3 text-sm font-semibold text-ink">구간 편집 시작<ArrowRight size={17} /></button>}</div></header><div className="grid gap-4 p-5 md:grid-cols-[1fr_auto_auto] md:items-center"><div><p className="text-sm text-muted">현재 상태</p><p className="mt-1 font-display text-lg">{job.message}</p></div><p className="flex items-center gap-2 font-mono text-sm text-muted"><Clock3 size={16} />{duration}</p><p className="text-sm text-signal">{getCompletedStep(job)}/4단계 · {getCompletedStepLabel(job)}</p></div>{!ready && <div className="border-t border-line p-5"><StageRail job={job} actions={['extract']} busy={BUSY.has(job.stage)} onRun={onRun} /></div>}</article>
}
