import type { AudioJob } from '@/lib/types'
import { voiceDirectionLabels } from '@/lib/voice-directions'

const TRACKS = [
  ['baseVoice', '기본 모델', '학습 전 비교용 음성'],
  ['trainedVoice', '학습 모델', '화자의 음색과 말투 반영'],
  ['polishedVoice', '듣기 보정', '학습 음성의 속도·음량 정리'],
] as const

export function AudioCompare({ job }: { job: AudioJob }) {
  const directions = voiceDirectionLabels(job.voiceDirections)
  return <section className="border border-line bg-panel"><header className="flex flex-wrap items-end justify-between gap-3 border-b border-line p-5"><div><p className="text-sm text-signal">정상적인 말소리가 확인된 결과만 재생됩니다</p><h2 className="mt-1 font-display text-2xl">결과 비교</h2><p className="mt-2 text-sm text-muted">말하는 느낌: {directions.length ? directions.join(' + ') : '원본 유지'}</p></div><span className="hidden text-sm text-muted md:inline">파일은 D드라이브에 보관됩니다</span></header><div className="grid gap-px bg-line lg:grid-cols-3">{TRACKS.map(([key, title, detail], index) => { const file = job.files[key]; const verified = job.verification?.[key]?.trim(); return <article key={key} className="bg-panel p-5"><div className="mb-8 flex items-center justify-between"><span className="font-mono text-sm text-muted">결과 {index + 1}</span><span className={`size-2 rounded-full ${file && verified ? 'bg-live shadow-[0_0_12px_#6dc89b]' : 'bg-line'}`} /></div><h3 className="font-display text-lg">{title}</h3><p className="mb-5 mt-1 text-sm text-muted">{detail}</p>{file && verified ? <><audio controls preload="metadata" className="w-full" src={`/api/jobs/${job.id}/audio/${key}`} /><p className="mt-4 border-s-2 border-signal ps-3 text-sm leading-6 text-muted"><b className="mb-1 block text-sm text-signal">자동으로 확인한 발음</b>{verified}</p></> : <div className="grid min-h-16 place-items-center border border-dashed border-line px-3 text-center text-sm text-muted">{file ? '정상적인 말소리가 확인되지 않아 결과에서 제외했습니다.' : '아직 생성되지 않았습니다.'}</div>}</article> })}</div></section>
}
