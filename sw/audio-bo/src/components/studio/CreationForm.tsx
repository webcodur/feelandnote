import { Layers3, Save, SlidersHorizontal } from 'lucide-react'
import type { AudioJob, VoiceDirection } from '@/lib/types'
import { VOICE_DIRECTIONS } from '@/lib/voice-directions'

type Props = {
  job: AudioJob
  busy: boolean
  onGenerate: (text: string, directions: VoiceDirection[]) => Promise<void>
}

export function CreationForm({ job, busy, onGenerate }: Props) {
  async function submit(formData: FormData) {
    const directions = formData.getAll('voiceDirections') as VoiceDirection[]
    await onGenerate(String(formData.get('synthesisText') ?? ''), directions)
  }

  return <form key={`${job.id}:${job.voiceDirections?.join(',') ?? ''}`} action={submit} className="border border-line bg-ink">
    <section className="border-b border-line">
      <header className="flex items-center gap-3 p-4"><span className="grid size-8 place-items-center border border-line font-mono text-sm text-signal">01</span><div><h3 className="font-display text-lg">새로 읽힐 문장</h3><p className="mt-1 text-sm text-muted">학습용 대본은 바뀌지 않습니다.</p></div></header>
      <textarea required aria-label="새로 읽힐 문장" name="synthesisText" key={job.synthesisText} defaultValue={job.synthesisText ?? ''} placeholder="예: 불가능이란 없다. 우린 우리 자신을 믿어야 합니다." className="min-h-44 w-full resize-y border-t border-line bg-ink p-4 text-base leading-8 outline-none focus:ring-2 focus:ring-signal" />
    </section>
    <fieldset className="p-4">
      <legend className="sr-only">말하는 느낌 선택</legend>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3"><div className="flex items-center gap-3"><span className="grid size-8 place-items-center border border-line font-mono text-sm text-signal">02</span><div><h3 className="font-display text-lg">말하는 느낌</h3><p className="mt-1 text-sm text-muted">원하는 느낌을 여러 개 골라 겹쳐 적용할 수 있습니다.</p></div></div><span className="flex items-center gap-2 border border-signal/50 bg-signal/10 px-3 py-1.5 text-xs text-signal"><Layers3 size={14} />복수 선택</span></div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">{VOICE_DIRECTIONS.map(({ id, label, detail }, index) => <label key={id} className="cursor-pointer"><input type="checkbox" name="voiceDirections" value={id} defaultChecked={job.voiceDirections?.includes(id)} className="peer sr-only" /><span className="block min-h-28 border border-line bg-panel p-3 transition-colors hover:border-signal/60 peer-focus-visible:ring-2 peer-focus-visible:ring-signal peer-checked:border-signal peer-checked:bg-signal/10"><span className="flex items-center justify-between"><b className="font-display text-base peer-checked:text-signal">{label}</b><span className="font-mono text-xs text-muted">{String(index + 1).padStart(2, '0')}</span></span><span className="mt-2 block text-sm leading-5 text-muted">{detail}</span></span></label>)}</div>
      <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-muted"><SlidersHorizontal className="mt-0.5 shrink-0 text-signal" size={14} />선택하지 않으면 원래 말투를 유지합니다. 빠르게와 느리게처럼 반대되는 선택은 서로 일부 상쇄됩니다.</p>
    </fieldset>
    <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-panel-raised p-4"><p className="text-sm text-muted">선택한 느낌은 이 작업에 저장되어 다음 생성에도 유지됩니다.</p><button type="submit" disabled={busy || !job.model} className="flex items-center gap-2 bg-signal px-5 py-3 text-sm font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-50"><Save size={16} />{busy ? '음성 만드는 중' : '저장하고 음성 만들기'}</button></footer>
  </form>
}
