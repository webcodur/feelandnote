'use client'

import { Download, FolderOpen, History, LoaderCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { AudioJob, OutputAudio, OutputRun } from '@/lib/types'
import { voiceDirectionLabels } from '@/lib/voice-directions'

export function OutputLibrary({ job }: { job: AudioJob }) {
  const [runs, setRuns] = useState<OutputRun[] | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    fetch(`/api/jobs/${job.id}/outputs`, { signal: controller.signal })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data: { runs: OutputRun[] }) => setRuns(data.runs))
      .catch(() => { if (!controller.signal.aborted) setRuns([]) })
    return () => controller.abort()
  }, [job.id, job.updatedAt])

  async function openFolder() {
    await fetch(`/api/jobs/${job.id}/folder?target=output`, { method: 'POST' })
  }

  const fileCount = runs?.reduce((sum, run) => sum + run.files.length, 0) ?? 0
  return <section className="border border-line bg-panel">
    <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line p-5"><div className="flex items-start gap-3"><span className="grid size-10 place-items-center bg-ink text-signal"><History size={19} /></span><div><p className="text-sm text-signal">생성할 때마다 여기에 쌓입니다</p><h2 className="mt-1 font-display text-2xl">이 작업의 결과 파일</h2><p className="mt-2 font-mono text-xs text-muted">D:\audios\interview-cleaner\projects\{job.id}\output</p></div></div><button onClick={openFolder} className="flex items-center gap-2 border border-line px-4 py-2.5 text-sm text-muted hover:border-signal hover:text-signal"><FolderOpen size={16} />결과 폴더 열기</button></header>
    {runs === null ? <div className="flex items-center justify-center gap-2 p-8 text-sm text-muted"><LoaderCircle className="animate-spin" size={17} />결과 파일을 확인하는 중</div> : runs.length === 0 ? <p className="p-8 text-center text-sm text-muted">아직 만들어진 음성이 없습니다.</p> : <div className="divide-y divide-line">{runs.map((run) => <RunCard key={run.id} job={job} run={run} />)}</div>}
    {runs && runs.length > 0 && <footer className="border-t border-line bg-ink px-5 py-3 text-xs text-muted">생성 기록 {runs.length}회 · 음성 파일 {fileCount}개</footer>}
  </section>
}

function RunCard({ job, run }: { job: AudioJob; run: OutputRun }) {
  const directions = voiceDirectionLabels(run.voiceDirections)
  const directionText = run.id === 'legacy' ? '기록 없음' : directions.length ? directions.join(' + ') : '원본 유지'
  const experimentTitle = run.id.includes('cosyvoice-cleaned')
    ? 'Fun · 잔향 줄인 참고 음성'
    : run.id.includes('cosyvoice-original')
      ? 'Fun · 원본 참고 음성'
      : undefined
  const title = run.current ? '현재 결과' : run.id === 'legacy' ? '이전 방식으로 만든 결과' : experimentTitle ?? formatDate(run.generatedAt)
  const text = run.text ?? (run.current ? job.synthesisText : undefined)
  return <article className={run.current ? 'bg-signal/[0.035]' : 'bg-panel'}><header className="grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-start"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-display text-lg">{title}</h3>{run.current && <span className="bg-live px-2 py-1 text-xs font-semibold text-ink">지금 선택됨</span>}<span className="text-xs text-muted">{formatDate(run.generatedAt)}</span></div>{text && <p className="mt-2 truncate text-sm text-cream">“{text}”</p>}</div><p className="text-sm text-muted">말하는 느낌: <span className="text-signal">{directionText}</span></p></header><div className="grid gap-px bg-line lg:grid-cols-3">{run.files.map((file) => <OutputFile key={file.relativePath} jobId={job.id} file={file} />)}</div></article>
}

function OutputFile({ jobId, file }: { jobId: string; file: OutputAudio }) {
  const url = `/api/jobs/${jobId}/outputs/file?path=${encodeURIComponent(file.relativePath)}`
  return <section className="bg-panel p-4"><div className="mb-3 flex items-center justify-between gap-2"><div><p className="font-display text-base">{kindLabel(file.kind)}</p><p className="mt-1 font-mono text-xs text-muted">{file.name}</p></div>{file.current && <span className="size-2 rounded-full bg-live shadow-[0_0_10px_#6dc89b]" />}</div><audio controls preload="metadata" className="w-full" src={url} />{file.verification && <p className="mt-3 border-s-2 border-signal ps-3 text-sm leading-6 text-muted"><b className="block text-xs text-signal">자동 발음 확인{typeof file.textMatchPercent === 'number' ? ` · 원문 일치 ${file.textMatchPercent}%` : ''}</b>{file.verification}</p>}<div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted"><span>{formatDuration(file.durationSeconds)} · {formatSize(file.sizeBytes)}</span><a href={url} download={file.name} className="flex items-center gap-1.5 text-signal hover:underline"><Download size={14} />파일 저장</a></div></section>
}

function kindLabel(kind: string) {
  return ({
    base: '기본 모델', trained: '학습 모델', polished: '듣기 보정',
    'cosyvoice-basic': 'Fun · 기본',
    'cosyvoice-firm': 'Fun · 단호하게',
    'cosyvoice-hopeful': 'Fun · 희망적으로',
  } as Record<string, string>)[kind] ?? kind
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ko-KR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
}

function formatDuration(seconds: number) { return seconds ? `${seconds.toFixed(1)}초` : '길이 확인 불가' }
function formatSize(bytes: number) { return `${Math.max(bytes / 1024, 0.1).toFixed(1)}KB` }
