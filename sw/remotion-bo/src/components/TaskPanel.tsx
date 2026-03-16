'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

type Task = {
  id: string; type: string; series: string; episode: string
  status: 'running' | 'done' | 'error'
  log: string[]
}

export function TaskPanel() {
  const [tasks, setTasks] = useState<Task[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const poll = useCallback(() => {
    fetch('/api/tasks').then(r => r.json()).then(setTasks)
  }, [])

  useEffect(() => {
    poll()
    timerRef.current = setInterval(poll, 2000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [poll])

  const running = tasks.filter(t => t.status === 'running')
  const recent = tasks.filter(t => t.status !== 'running').slice(0, 5)
  const visible = [...running, ...recent]

  if (visible.length === 0) return null

  return (
    <section className="bg-bg-secondary border border-border rounded-lg p-4">
      <h3 className="text-xs font-bold text-accent tracking-widest mb-3">TASKS</h3>
      <div className="space-y-3">
        {visible.map(task => (
          <div key={task.id}>
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                task.status === 'running' ? 'bg-info text-info-text' :
                task.status === 'done' ? 'bg-success text-success-text' :
                'bg-danger text-danger-text'
              }`}>{task.status}</span>
              <span className="text-xs text-text-secondary">{task.type} — {task.episode}</span>
            </div>
            <pre className="bg-bg-main border border-border rounded p-2 text-[11px] font-mono text-text-secondary max-h-40 overflow-y-auto whitespace-pre-wrap">
              {task.log.join('\n') || '(waiting...)'}
            </pre>
          </div>
        ))}
      </div>
    </section>
  )
}
