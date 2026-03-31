'use client'

import { useEffect } from 'react'
import { useEpisode } from '@/lib/episode-context'
import { TaskPanel } from '@/components/TaskPanel'
import { CopyLabel } from '@/components/CopyLabel'

const BTN = 'px-3 py-1 rounded text-sm font-semibold'
const BTN_PRIMARY = `bg-accent text-bg-main ${BTN} hover:bg-accent-hover`
const BTN_SECONDARY = `bg-bg-card border border-border ${BTN} hover:bg-bg-hover`
const SECTION_CLS = 'bg-bg-secondary border border-border rounded-lg overflow-hidden'
const HEADER_CLS = 'flex items-center justify-between px-4 py-2.5 cursor-pointer select-none hover:bg-bg-hover transition-colors'

export default function RenderPage() {
  const { series, name, episode, post } = useEpisode()

  useEffect(() => {
    document.title = `${episode?.host?.nickname ?? name} 렌더 — Remotion BO`
  }, [episode, name])

  return (
    <div className="space-y-4">
      {/* Render */}
      <section className={SECTION_CLS}>
        <div className="px-4 py-3">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-bold text-accent tracking-widest">RENDER</span>
            <CopyLabel text="RENDER" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <button onClick={() => post(`/api/${series}/render`, { episode: name })}
                className={BTN_PRIMARY}>전체 렌더</button>
              <span className="text-[11px] text-text-dim">롱폼 + 쇼츠 모두 렌더링</span>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => post(`/api/${series}/render`, { episode: name, only: 'longform' })}
                className={BTN_SECONDARY}>롱폼만</button>
              <span className="text-[11px] text-text-dim">16:9 롱폼 영상만 렌더링</span>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => post(`/api/${series}/render`, { episode: name, only: 'shorts' })}
                className={BTN_SECONDARY}>쇼츠만</button>
              <span className="text-[11px] text-text-dim">9:16 쇼츠 영상만 렌더링</span>
            </div>
          </div>
          <p className="text-[11px] text-text-dim leading-relaxed mt-3">
            음성 파일이 모두 준비된 후 실행하세요. 렌더링은 약 5-10분 소요됩니다.
          </p>
        </div>
      </section>

      {/* Tasks */}
      <section className={SECTION_CLS}>
        <div className="px-4 py-3">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-bold text-accent tracking-widest">TASKS</span>
            <CopyLabel text="TASKS" />
          </div>
          <TaskPanel />
        </div>
      </section>
    </div>
  )
}
