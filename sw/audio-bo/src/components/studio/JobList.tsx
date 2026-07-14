'use client'

import { Check, Folder, FolderOpen, Search } from 'lucide-react'
import { useState } from 'react'
import { getCompletedStep, getCompletedStepLabel } from '@/lib/job-progress'
import type { AudioJob } from '@/lib/types'

type Props = { jobs: AudioJob[]; selectedId: string; onSelect: (id: string) => void }

export function JobList({ jobs, selectedId, onSelect }: Props) {
  const [query, setQuery] = useState('')
  const normalized = query.trim().toLowerCase()
  const visible = normalized ? jobs.filter((job) => `${job.name} ${job.speaker} ${job.id}`.toLowerCase().includes(normalized)) : jobs

  async function openFolder(id: string) {
    await fetch(`/api/jobs/${id}/folder`, { method: 'POST' })
  }

  return (
    <section className="border border-line bg-panel">
      <header className="border-b border-line p-4">
        <div className="flex items-center gap-2"><FolderOpen className="text-signal" size={18} /><h2 className="font-display text-lg">저장된 작업</h2></div>
        <p className="mt-2 text-sm leading-6 text-muted">D드라이브에 보관된 작업입니다. 하나를 눌러 불러오세요.</p>
        <label className="mt-3 flex items-center gap-2 border border-line bg-ink px-3"><Search className="text-muted" size={16} /><span className="sr-only">저장된 작업 검색</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="작업 이름 또는 저장 이름 검색" className="min-w-0 flex-1 bg-transparent py-2.5 text-sm outline-none" /></label>
      </header>
      {visible.length > 0 && <div className="max-h-[440px] overflow-y-auto">{visible.map((job) => {
        const selected = job.id === selectedId
        return <article key={job.id} className={`border-b border-line last:border-0 ${selected ? 'bg-panel-raised' : ''}`}><button aria-pressed={selected} onClick={() => onSelect(job.id)} className="w-full p-4 text-start hover:bg-panel-raised"><div className="flex items-start justify-between gap-3"><span><strong className="text-base">{job.name}</strong><span className="mt-1 block text-sm text-muted">저장 이름 {job.speaker} · {getCompletedStepLabel(job)}</span></span><span className="flex items-center gap-2 text-sm text-signal">{selected && <Check size={16} />}{getCompletedStep(job)}/4단계</span></div><span className="mt-3 block font-mono text-sm text-muted">{job.id}</span></button><div className="flex items-center justify-between border-t border-line px-4 py-2"><span className="text-sm text-muted">수정 {job.updatedAt.slice(0, 10)}</span><button onClick={() => openFolder(job.id)} className="flex items-center gap-2 px-2 py-1 text-sm text-muted hover:text-signal"><Folder size={15} />폴더 열기</button></div></article>
      })}</div>}
      {jobs.length === 0 && <p className="p-5 text-sm text-muted">저장된 작업이 없습니다. 왼쪽에서 새 영상을 등록하세요.</p>}
      {jobs.length > 0 && visible.length === 0 && <p className="p-5 text-sm text-muted">검색 결과가 없습니다.</p>}
    </section>
  )
}
