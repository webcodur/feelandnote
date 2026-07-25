'use client'

import { useState, useEffect, useRef, useCallback, type MouseEvent } from 'react'

type Task = {
  id: string; type: string; series: string; episode: string
  status: 'queued' | 'running' | 'done' | 'error' | 'cancelled'
  log: string[]
}

function TaskRow({ task, onCancel }: { task: Task; onCancel: (id: string) => void }) {
  const [open, setOpen] = useState(task.status === 'running')
  const [cancelling, setCancelling] = useState(false)
  const isRunning = task.status === 'running' || task.status === 'queued'
  // running은 마지막 10줄만, 완료는 접혀 있다가 펼치면 마지막 20줄
  const tailLines = isRunning ? 10 : 20
  const logTail = task.log.slice(-tailLines).join('\n') || '(waiting...)'

  const handleCancel = (e: MouseEvent) => {
    e.stopPropagation()
    if (cancelling) return
    setCancelling(true)
    onCancel(task.id)
  }

  return (
    <div>
      <div className="flex items-center gap-2 cursor-pointer select-none" onClick={() => setOpen(!open)}>
        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
          task.status === 'queued' ? 'bg-amber-900/40 text-amber-400' :
          task.status === 'running' ? 'bg-info text-info-text' :
          task.status === 'done' ? 'bg-success text-success-text' :
          task.status === 'cancelled' ? 'bg-amber-900/40 text-amber-400' :
          'bg-danger text-danger-text'
        }`}>{task.status}</span>
        <span className="text-xs text-text-secondary flex-1">{task.type} — {task.episode}</span>
        {isRunning && (
          <button
            type="button"
            onClick={handleCancel}
            disabled={cancelling}
            className="text-[11px] font-semibold px-2 py-0.5 rounded bg-danger text-danger-text hover:opacity-80 disabled:opacity-50"
          >{cancelling ? '중지 중…' : '중지'}</button>
        )}
        <span className="text-text-dim text-xs">{open ? '▼' : '▶'}</span>
      </div>
      {(open || isRunning) && (
        <pre className="bg-bg-main border border-border rounded p-2 mt-1 text-[11px] font-mono text-text-secondary max-h-32 overflow-y-auto whitespace-pre-wrap">
          {logTail}
        </pre>
      )}
    </div>
  )
}

export function TaskPanel() {
  const [tasks, setTasks] = useState<Task[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const poll = useCallback(() => {
    fetch('/api/faction/task').then(r => r.json()).then(setTasks).catch(() => {})
  }, [])

  const cancel = useCallback((id: string) => {
    fetch(`/api/faction/task/${id}`, { method: 'DELETE' }).then(() => poll()).catch(() => {})
  }, [poll])

  useEffect(() => {
    poll()
    timerRef.current = setInterval(poll, 2000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [poll])

  // running 태스크 없으면 폴링 중단
  const hasRunning = tasks.some(t => t.status === 'running')
  useEffect(() => {
    if (hasRunning && !timerRef.current) {
      timerRef.current = setInterval(poll, 2000)
    } else if (!hasRunning && timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [hasRunning, poll])

  const running = tasks.filter(t => t.status === 'running')
  const recent = tasks.filter(t => t.status !== 'running').slice(0, 5)
  const visible = [...running, ...recent]

  if (visible.length === 0) return <div className="text-[11px] text-text-dim">진행 중인 작업 없음</div>

  return (
    <div className="relative space-y-2">
      {visible.map(task => (
        <TaskRow key={task.id} task={task} onCancel={cancel} />
      ))}
    </div>
  )
}
