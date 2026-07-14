import type { AudioJob } from '@/lib/types'

const TRACKS = [
  ['baseVoice', '기본 모델', '기준 음색만 반영'],
  ['trainedVoice', '학습 모델', '화자의 음색과 말투 반영'],
  ['polishedVoice', '성우형 보정', '속도·강약·음량 정리'],
] as const

export function AudioCompare({ job }: { job: AudioJob }) {
  return <section className="border border-line bg-panel"><header className="flex items-end justify-between border-b border-line p-5"><div><p className="text-sm text-signal">하나씩 재생해서 차이를 들어 보세요</p><h2 className="mt-1 font-display text-2xl">결과 비교</h2></div><span className="hidden text-sm text-muted md:inline">파일은 D드라이브에 보관됩니다</span></header><div className="grid gap-px bg-line lg:grid-cols-3">{TRACKS.map(([key, title, detail], index) => <article key={key} className="bg-panel p-5"><div className="mb-8 flex items-center justify-between"><span className="font-mono text-sm text-muted">결과 {index + 1}</span><span className={`size-2 rounded-full ${job.files[key] ? 'bg-live shadow-[0_0_12px_#6dc89b]' : 'bg-line'}`} /></div><h3 className="font-display text-lg">{title}</h3><p className="mb-5 mt-1 text-sm text-muted">{detail}</p>{job.files[key] ? <><audio controls preload="metadata" className="w-full" src={`/api/jobs/${job.id}/audio/${key}`} />{job.verification?.[key] && <p className="mt-4 border-s-2 border-signal ps-3 text-sm leading-6 text-muted"><b className="mb-1 block text-sm text-signal">자동으로 다시 받아쓴 내용</b>{job.verification[key]}</p>}</> : <div className="grid h-12 place-items-center border border-dashed border-line text-sm text-muted">아직 생성되지 않았습니다</div>}</article>)}</div></section>
}
