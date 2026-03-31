'use client'

import { useEffect } from 'react'
import { useEpisode } from '@/lib/episode-context'
import { EpisodeEditor } from '@/components/EpisodeEditor'
import { StatusOverview } from '@/components/StatusOverview'
import { TaskPanel } from '@/components/TaskPanel'
import { CopyLabel } from '@/components/CopyLabel'

const BTN = 'px-3 py-1 rounded text-sm font-semibold'
const BTN_PRIMARY = `bg-accent text-bg-main ${BTN} hover:bg-accent-hover`
const BTN_SECONDARY = `bg-bg-card border border-border ${BTN} hover:bg-bg-hover`
const SECTION_CLS = 'bg-bg-secondary border border-border rounded-lg overflow-hidden'
const HEADER_CLS = 'flex items-center justify-between px-4 py-2.5 cursor-pointer select-none hover:bg-bg-hover transition-colors'

export default function EditorPage() {
  const { episode, updateEpisode, voiceFiles, series, name, jsonText, setJsonText, setDirty, saveFromJson, playVoice, save, post } = useEpisode()

  useEffect(() => {
    document.title = `${episode?.host?.nickname ?? name} 편집 — Remotion BO`
  }, [episode, name])

  if (!episode) return <div className="text-text-dim">로딩...</div>

  return (
    <div className="space-y-4">
      {/* Status Overview */}
      <section className={SECTION_CLS}>
        <details>
          <summary className={HEADER_CLS}>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-accent tracking-widest">STATUS</span>
              <CopyLabel text="STATUS" />
            </div>
            <span className="text-text-dim text-xs">▶</span>
          </summary>
          <div className="px-4 pb-3">
            <StatusOverview episode={episode} fileNames={voiceFiles.map(f => f.name)} series={series} name={name} />
          </div>
        </details>
      </section>

      {/* Structured Editor */}
      <section className={SECTION_CLS}>
        <details>
          <summary className={HEADER_CLS}>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-accent tracking-widest">EDITOR</span>
              <CopyLabel text="EDITOR" />
            </div>
            <span className="text-text-dim text-xs">▶</span>
          </summary>
          <div className="px-4 pb-4">
            <EpisodeEditor episode={episode} onChange={updateEpisode} />
          </div>
        </details>
      </section>

      {/* Render */}
      <section className={SECTION_CLS}>
        <details>
          <summary className={HEADER_CLS}>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-accent tracking-widest">RENDER</span>
              <CopyLabel text="RENDER" />
            </div>
            <span className="text-text-dim text-xs">▶</span>
          </summary>
          <div className="px-4 pb-3 space-y-3">
            <div className="flex items-center gap-3">
              <button onClick={() => post(`/api/${series}/render`, { episode: name })}
                className={BTN_PRIMARY}>전체 렌더</button>
              <button onClick={() => post(`/api/${series}/render`, { episode: name, only: 'longform' })}
                className={BTN_SECONDARY}>롱폼만</button>
              <button onClick={() => post(`/api/${series}/render`, { episode: name, only: 'shorts' })}
                className={BTN_SECONDARY}>쇼츠만</button>
            </div>
            <TaskPanel />
          </div>
        </details>
      </section>

      {/* Raw JSON */}
      <section className={SECTION_CLS}>
        <details>
          <summary className={HEADER_CLS}>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-accent tracking-widest">RAW JSON</span>
              <CopyLabel text="RAW JSON" />
            </div>
            <span className="text-text-dim text-xs">▶</span>
          </summary>
          <div className="px-4 pb-4">
            <textarea value={jsonText} onChange={e => { setJsonText(e.target.value); setDirty(true) }}
              className="w-full min-h-[300px] bg-bg-main border border-border rounded-md p-3 font-mono text-xs resize-y focus:outline-none focus:border-accent" />
            <div className="flex gap-2 mt-2">
              <button onClick={saveFromJson} className={BTN_PRIMARY}>JSON 저장</button>
              <button onClick={() => { setJsonText(JSON.stringify(episode, null, 2)); setDirty(false) }} className={BTN_SECONDARY}>되돌리기</button>
            </div>
          </div>
        </details>
      </section>
    </div>
  )
}
