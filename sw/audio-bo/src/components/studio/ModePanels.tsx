import { ArrowRight, BookOpenCheck, Captions, Save, Sparkles } from 'lucide-react'
import type { ReactNode } from 'react'
import type { AudioJob, JobAction, VoiceDirection } from '@/lib/types'
import { AudioCompare } from '../AudioCompare'
import { StageRail } from '../StageRail'
import { CreationForm } from './CreationForm'
import { OutputLibrary } from './OutputLibrary'
import { MediaSegmentEditor } from './MediaSegmentEditor'
import type { WorkflowMode } from './WorkflowModes'

type Props = {
  job: AudioJob
  mode: WorkflowMode
  busy: boolean
  onModeChange: (mode: WorkflowMode) => void
  onRun: (action: JobAction) => void
  onSave: (values: Partial<Pick<AudioJob, 'transcript' | 'synthesisText' | 'voiceDirections' | 'segments' | 'trainingSpeaker'>>) => Promise<void>
}

export function ModePanel({ job, mode, busy, onModeChange, onRun, onSave }: Props) {
  if (mode === 'edit') return <Editing job={job} busy={busy} onModeChange={onModeChange} onRun={onRun} onSave={onSave} />
  if (mode === 'train') return <Training job={job} busy={busy} onModeChange={onModeChange} onRun={onRun} onSave={onSave} />
  if (mode === 'create') return <Creation job={job} busy={busy} onRun={onRun} onSave={onSave} />
  return null
}

function Editing({ job, busy, onModeChange, onRun, onSave }: Pick<Props, 'job' | 'busy' | 'onModeChange' | 'onRun' | 'onSave'>) {
  async function transcribe(values: { segments: NonNullable<AudioJob['segments']>; trainingSpeaker: 'A' | 'B' }) { await onSave(values); onRun('transcribe') }
  const ready = isTrainingReady(job)
  const hasLongSelection = job.segments?.some((item) => item.enabled && item.end - item.start > 10) ?? false
  return <ModeWorkspace icon={BookOpenCheck} title="영상 안에서 사용할 목소리 고르기" description="한 문장씩 골라도 되고, 같은 사람이 이어서 말하는 부분을 1분가량 넓게 골라도 됩니다. 긴 선택은 받아쓰기할 때 문장 단위로 자동 분리됩니다."><StageRail job={job} actions={['clean']} busy={busy} onRun={onRun} />{job.files.source && <MediaSegmentEditor job={job} busy={busy} onSave={onSave} onTranscribe={transcribe} />}<NextStep ready={ready} readyText="학습할 목소리가 준비됐습니다." waitingText={preparationHint(job)} label="다음: 목소리 학습" onClick={() => onModeChange('train')} waitingAction={hasLongSelection ? { label: '자동 분리·받아쓰기 실행', onClick: () => onRun('transcribe') } : undefined} busy={busy} /></ModeWorkspace>
}

function Training({ job, busy, onModeChange, onRun, onSave }: Pick<Props, 'job' | 'busy' | 'onModeChange' | 'onRun' | 'onSave'>) {
  async function save(formData: FormData) { await onSave({ transcript: String(formData.get('transcript') ?? '') }) }
  async function transcribe(values: { segments: NonNullable<AudioJob['segments']>; trainingSpeaker: 'A' | 'B' }) { await onSave(values); onRun('transcribe') }
  const count = validTrainingCount(job)
  return <ModeWorkspace icon={BookOpenCheck} title="준비한 목소리로 학습하기" description="아래 시작 버튼을 눌러야 실제 학습이 시작됩니다. 보통 몇 분이 걸리며, 화면을 닫아도 작업은 계속됩니다."><TrainingState job={job} count={count} /><StageRail job={job} actions={['train']} busy={busy} onRun={onRun} />{job.segments?.length ? <details className="border border-line bg-ink"><summary className="cursor-pointer p-4 font-display text-base">학습 자료 {job.segments.length}개 확인·수정</summary><div className="border-t border-line p-3"><MediaSegmentEditor job={job} busy={busy} onSave={onSave} onTranscribe={transcribe} /></div></details> : <TextForm action={save} name="transcript" value={job.transcript} label="기존 학습용 대본" placeholder="2번 구간 편집에서 받아쓰기를 먼저 실행하세요." button="학습 대본 저장" />}<NextStep ready={Boolean(job.model) && !busy} readyText="목소리 학습이 완료됐습니다." waitingText={busy ? '학습이 끝나면 새 음성 만들기 버튼이 활성화됩니다.' : '위의 목소리 학습 시작을 누르세요.'} label="다음: 새 음성 만들기" onClick={() => onModeChange('create')} /></ModeWorkspace>
}

function Creation({ job, busy, onRun, onSave }: Pick<Props, 'job' | 'busy' | 'onRun' | 'onSave'>) {
  async function generate(synthesisText: string, voiceDirections: VoiceDirection[]) { await onSave({ synthesisText, voiceDirections }); onRun('synthesize') }
  return <div className="space-y-4"><ModeWorkspace icon={Sparkles} title="새 문장으로 음성 만들기" description="문장을 입력하고 말하는 느낌을 고르세요. 여러 느낌을 함께 선택하면 속도·쉼·강약이 겹쳐 적용됩니다."><CreationForm job={job} busy={busy} onGenerate={generate} /></ModeWorkspace><AudioCompare job={job} /><OutputLibrary job={job} /></div>
}

function ModeWorkspace({ icon: Icon, title, description, children }: { icon: typeof Sparkles; title: string; description: string; children: ReactNode }) {
  return <section className="border border-line bg-panel"><header className="flex items-start gap-3 border-b border-line bg-panel-raised p-4"><Icon className="mt-0.5 shrink-0 text-signal" size={19} /><div><p className="text-sm font-semibold text-signal">이 모드 안내</p><h2 className="mt-1 font-display text-lg">{title}</h2><p className="mt-2 text-sm leading-6 text-muted">{description}</p></div></header><div className="space-y-4 p-4">{children}</div></section>
}

function TextForm({ action, name, value, label, placeholder, button, disabled = false }: { action: (data: FormData) => void; name: string; value: string; label: string; placeholder: string; button: string; disabled?: boolean }) {
  return <form action={action} className="border border-line bg-panel"><header className="flex items-center justify-between gap-4 border-b border-line p-4"><h3 className="font-display text-lg">{label}</h3><button type="submit" disabled={disabled} className="flex items-center gap-2 bg-signal px-4 py-2 text-sm font-semibold text-ink disabled:opacity-50"><Save size={15} />{button}</button></header><textarea required aria-label={label} name={name} key={value} defaultValue={value} placeholder={placeholder} className="min-h-56 w-full resize-y bg-ink p-4 text-base leading-8 outline-none focus:ring-2 focus:ring-signal" /></form>
}

type WaitingAction = { label: string; onClick: () => void }

function NextStep({ ready, readyText, waitingText, label, onClick, waitingAction, busy = false }: { ready: boolean; readyText: string; waitingText: string; label: string; onClick: () => void; waitingAction?: WaitingAction; busy?: boolean }) {
  return <footer className={`flex flex-wrap items-center justify-between gap-3 border p-4 ${ready ? 'border-live bg-panel-raised' : waitingAction ? 'border-signal bg-panel-raised' : 'border-line bg-ink'}`}><p className={`text-sm ${ready ? 'text-live' : waitingAction ? 'text-signal' : 'text-muted'}`}>{ready ? readyText : waitingText}</p>{!ready && waitingAction ? <button disabled={busy} onClick={waitingAction.onClick} className="flex items-center gap-2 bg-signal px-4 py-2 text-sm font-semibold text-ink disabled:opacity-50"><Captions size={16} />{busy ? '받아쓰는 중' : waitingAction.label}</button> : <button disabled={!ready} onClick={onClick} className="flex items-center gap-2 bg-signal px-4 py-2 text-sm font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-50">{label}<ArrowRight size={16} /></button>}</footer>
}

function isTrainingReady(job: AudioJob) {
  if (!job.segments?.length) return Boolean(job.transcript)
  const speaker = job.trainingSpeaker ?? 'A'
  return job.segments.filter((item) => item.enabled && item.speaker === speaker && item.text.trim() && item.end - item.start >= 3 && item.end - item.start <= 10).length >= 3
}

function preparationHint(job: AudioJob) {
  const hasLongSelection = job.segments?.some((item) => item.enabled && item.end - item.start > 10)
  return hasLongSelection ? '위의 긴 선택 자동 분리·받아쓰기를 먼저 실행하세요.' : '같은 사람의 받아쓴 발언이 3개 이상 필요합니다.'
}

function validTrainingCount(job: AudioJob) {
  const speaker = job.trainingSpeaker ?? 'A'
  return job.segments?.filter((item) => item.enabled && item.speaker === speaker && item.text.trim() && item.end - item.start >= 3 && item.end - item.start <= 10).length ?? 0
}

function TrainingState({ job, count }: { job: AudioJob; count: number }) {
  const training = job.stage === 'training'
  const complete = Boolean(job.model)
  return <div aria-live="polite" className={`border p-4 ${training ? 'border-signal bg-panel-raised' : complete ? 'border-live bg-panel-raised' : 'border-line bg-ink'}`}><p className={`font-display text-lg ${training ? 'text-signal' : complete ? 'text-live' : 'text-cream'}`}>{training ? '목소리를 학습하고 있습니다' : complete ? '목소리 학습 완료' : `학습 가능한 발언 ${count}개 준비됨`}</p><p className="mt-2 text-sm leading-6 text-muted">{training ? job.message : complete ? '이미 만든 모델을 다시 학습하거나 다음 단계에서 새 음성을 만들 수 있습니다.' : '대본을 확인했다면 아래 목소리 학습 시작을 누르세요.'}</p></div>
}
