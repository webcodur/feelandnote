import { Check, Film, GraduationCap, Scissors, Sparkles } from 'lucide-react'
import type { AudioJob } from '@/lib/types'

export type WorkflowMode = 'select' | 'edit' | 'train' | 'create'

const MODES = [
  { id: 'select', number: '1', title: '영상 선택', detail: '새 영상 등록 · 작업 불러오기', icon: Film },
  { id: 'edit', number: '2', title: '구간 편집', detail: '사용할 부분 선택 · 받아쓰기', icon: Scissors },
  { id: 'train', number: '3', title: '목소리 학습', detail: '대본 확인 · 화자 학습', icon: GraduationCap },
  { id: 'create', number: '4', title: '새 음성 만들기', detail: '새 문장 입력 · 결과 비교', icon: Sparkles },
] as const

function isComplete(job: AudioJob | undefined, mode: WorkflowMode) {
  if (!job) return false
  if (mode === 'select') return Boolean(job.files.source)
  if (mode === 'edit') {
    if (!job.segments?.length) return Boolean(job.transcript)
    const speaker = job.trainingSpeaker ?? 'A'
    return job.segments.filter((item) => item.enabled && item.speaker === speaker && item.text.trim() && item.end - item.start >= 3 && item.end - item.start <= 10).length >= 3
  }
  if (mode === 'train') return Boolean(job.model)
  return Boolean(job.files.polishedVoice)
}

export function WorkflowModes({ job, value, onChange }: { job?: AudioJob; value: WorkflowMode; onChange: (mode: WorkflowMode) => void }) {
  return <nav aria-label="전체 작업 흐름" className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">{MODES.map(({ id, number, title, detail, icon: Icon }) => {
    const active = id === value
    const complete = isComplete(job, id)
    return <button key={id} aria-current={active ? 'step' : undefined} onClick={() => onChange(id)} className={`mode-tab flex items-center gap-4 border p-4 text-start ${active ? 'border-signal bg-panel-raised' : 'border-line bg-panel hover:border-muted'}`}><span className={`grid size-11 shrink-0 place-items-center rounded-full ${active ? 'bg-signal text-ink' : 'bg-ink text-signal'}`}><Icon size={19} /></span><span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2"><b className="font-display text-base">{number}. {title}</b>{complete && <Check size={16} className="text-live" />}</span><span className="mt-1 block text-sm leading-5 text-muted">{detail}</span></span></button>
  })}</nav>
}
