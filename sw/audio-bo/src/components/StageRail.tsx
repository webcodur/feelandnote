import { AudioLines, Captions, Check, Download, GraduationCap, LoaderCircle, LockKeyhole, Sparkles } from 'lucide-react'
import type { AudioJob, JobAction } from '@/lib/types'

const STEPS: { action: JobAction; label: string; detail: string; icon: typeof Download }[] = [
  { action: 'extract', label: '영상 가져오기', detail: '영상을 D드라이브에 저장합니다', icon: Download },
  { action: 'clean', label: '잡음 줄이기 · 선택', detail: '소음이 심할 때만 실행하세요', icon: AudioLines },
  { action: 'transcribe', label: '구간 받아쓰기', detail: '선택한 구간을 글로 옮깁니다', icon: Captions },
  { action: 'train', label: '목소리 학습 시작', detail: '교정한 대본으로 선택한 사람의 목소리를 익힙니다', icon: GraduationCap },
  { action: 'synthesize', label: '새 음성 만들기', detail: '세 가지 결과를 만들어 비교합니다', icon: Sparkles },
]

function getStepState(job: AudioJob, action: JobAction) {
  const selectedSpeaker = job.trainingSpeaker ?? 'A'
  const validSegments = job.segments?.filter((item) => item.enabled && item.speaker === selectedSpeaker && item.text.trim() && item.end - item.start >= 3 && item.end - item.start <= 10).length ?? 0
  const available = {
    extract: true,
    clean: Boolean(job.files.source),
    transcribe: Boolean(job.files.source),
    train: job.segments?.length ? validSegments >= 3 : Boolean(job.transcript),
    synthesize: Boolean(job.model && job.synthesisText),
  }
  const complete = {
    extract: Boolean(job.files.source),
    clean: Boolean(job.files.cleaned),
    transcribe: Boolean(job.transcript),
    train: Boolean(job.model),
    synthesize: Boolean(job.files.polishedVoice),
  }
  return { available: available[action], complete: complete[action] }
}

export function StageRail({ job, actions, busy, onRun }: { job: AudioJob; actions: JobAction[]; busy: boolean; onRun: (action: JobAction) => void }) {
  const visibleSteps = STEPS.filter((step) => actions.includes(step.action))
  const gridClass = { 1: 'md:grid-cols-1', 2: 'md:grid-cols-2', 3: 'md:grid-cols-3' }[visibleSteps.length] ?? 'md:grid-cols-1'
  return (
    <section aria-label="현재 모드의 작업 순서" className={`grid gap-3 ${gridClass}`}>
      {visibleSteps.map(({ action, label, detail, icon: Icon }) => {
        const state = getStepState(job, action)
        const running = isRunning(job, action)
        const disabled = busy || (!state.available && !state.complete)
        const status = running ? '진행 중' : state.complete ? '완료' : state.available ? '실행' : '대기'
        const completedLabel = action === 'train' ? '목소리 다시 학습하기' : label
        const completedDetail = action === 'train' ? '대본이나 선택한 발언을 바꿨을 때만 다시 실행하세요.' : detail
        return <button key={action} aria-live={running ? 'polite' : undefined} disabled={disabled} onClick={() => onRun(action)} className={`step-card group relative min-h-36 overflow-hidden border bg-panel p-4 text-start hover:border-signal disabled:cursor-not-allowed ${running ? 'border-signal opacity-100' : 'border-line disabled:opacity-50'}`}><div className="mb-5 flex items-center justify-between"><span className="grid size-9 place-items-center rounded-full bg-ink text-signal">{running ? <LoaderCircle className="animate-spin" size={18} /> : <Icon size={18} />}</span><span className={`flex items-center gap-2 font-mono text-sm ${running ? 'text-signal' : 'text-muted'}`}>{state.complete && !running && <Check size={15} className="text-live" />}{!state.available && !state.complete && !running && <LockKeyhole size={14} />}{status}</span></div><p className="font-display text-base">{running ? runningLabel(action) : state.complete ? completedLabel : label}</p><p className="mt-2 text-sm leading-6 text-muted">{running ? '화면을 닫아도 작업은 계속됩니다. 완료되면 다음 단계가 열립니다.' : state.complete ? completedDetail : detail}</p>{state.complete && !running && <span className="mt-3 block font-mono text-sm text-live">완료됨</span>}{running && <span className="meter absolute inset-x-0 bottom-0 h-1 animate-pulse" />}</button>
      })}
    </section>
  )
}

function isRunning(job: AudioJob, action: JobAction) {
  return job.stage === { extract: 'extracting', clean: 'cleaning', transcribe: 'transcribing', train: 'training', synthesize: 'synthesizing' }[action]
}

function runningLabel(action: JobAction) {
  return { extract: '영상 가져오는 중', clean: '잡음 줄이는 중', transcribe: '받아쓰는 중', train: '목소리 학습 진행 중', synthesize: '새 음성 만드는 중' }[action]
}
