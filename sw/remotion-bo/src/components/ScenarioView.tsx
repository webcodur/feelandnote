'use client'

import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEpisode } from '@/lib/episode-context'
import { groupBySection, type VoiceSection } from './voice-utils'
import type { EpisodeData } from './EpisodeEditor'
import { VoiceToolbar, ExpandedVoicePanel, useVoiceSelect, detectMode, DEFAULT_ELE_SETTINGS, DEFAULT_ELE_SEND_OPTS, type EleSettings, type EleSendOpts } from './scenario-voice'
import { VoicePipelineStatus } from './VoicePipelineStatus'
import {
  parseViewParam, viewToParam, VIEW_LONGFORM,
  useImageEditor, useSaveSync,
  LongformView, ShortsView,
} from './scenario'

/* ── BGM 패널 (쇼츠 전용 — shorts[].bgm에 저장) ── */
function BgmPanel({ episode, onUpdate, series, name, shortsIndex }: {
  episode: EpisodeData; onUpdate: (ep: EpisodeData) => void; series: string; name: string; shortsIndex: number
}) {
  const shortsArr: any[] = Array.isArray(episode.shorts) ? episode.shorts : (episode.shorts ? [episode.shorts] : [])
  const currentShorts = shortsArr[shortsIndex - 1]
  const bgm: any[] = currentShorts?.bgm ?? []
  const setBgm = (next: any[]) => {
    const arr = [...shortsArr]
    arr[shortsIndex - 1] = { ...currentShorts, bgm: next.length ? next : undefined }
    onUpdate({ ...episode, shorts: arr } as any)
  }
  type MusicFile = { name: string; duration: number | null }
  const [musicFiles, setMusicFiles] = useState<MusicFile[]>([])
  const [basePath, setBasePath] = useState('')

  useEffect(() => {
    fetch(`/api/${series}/music/${name}`)
      .then(r => r.json())
      .then(d => { setMusicFiles(d.files ?? []); setBasePath(d.basePath ?? '') })
      .catch(() => {})
  }, [series, name])

  const addTrack = (fileName: string) => {
    const file = basePath ? `${basePath}/${fileName}` : fileName
    const meta = musicFiles.find(f => f.name === fileName)
    const trackDuration = meta?.duration != null ? Math.round(meta.duration * 100) / 100 : undefined
    setBgm([...bgm, { file, volume: 0.15, loop: true, ...(trackDuration != null ? { trackDuration } : {}) }])
  }
  const removeTrack = (i: number) => setBgm(bgm.filter((_, j) => j !== i))
  const updateTrack = (i: number, field: string, value: any) => {
    const next = [...bgm]; next[i] = { ...next[i], [field]: value }; setBgm(next)
  }

  const usedFiles = new Set(bgm.map((t: any) => t.file?.split('/').pop()))
  const available = musicFiles.filter(f => !usedFiles.has(f.name))

  return (
    <details className="border border-border/40 rounded-lg">
      <summary className="px-4 py-2 text-xs font-semibold text-text-secondary cursor-pointer select-none hover:text-text-primary">
        BGM {bgm.length > 0 && <span className="text-accent ml-1">{bgm.length}트랙</span>}
        {musicFiles.length === 0 && bgm.length === 0 && <span className="text-text-secondary/50 ml-2 font-normal">music/ 폴더에 파일 배치 필요</span>}
      </summary>
      <div className="px-4 pb-3 space-y-2">
        {bgm.map((t: any, i: number) => (
          <div key={i} className="flex items-center gap-2 text-[11px]">
            <span className="text-text-primary truncate max-w-[200px]" title={t.file}>{t.file?.split('/').pop() ?? '(없음)'}</span>
            <label className="flex items-center gap-1 text-text-secondary shrink-0">
              Vol
              <input type="number" step="0.05" min="0" max="1" className="w-12 bg-bg-card border border-border/40 rounded px-1 text-center"
                value={t.volume ?? 0.15} onChange={e => updateTrack(i, 'volume', parseFloat(e.target.value) || 0.15)} />
            </label>
            <label className="flex items-center gap-1 text-text-secondary shrink-0">
              FadeIn
              <input type="number" step="0.5" min="0" className="w-10 bg-bg-card border border-border/40 rounded px-1 text-center"
                value={t.fadeIn ?? 2} onChange={e => updateTrack(i, 'fadeIn', parseFloat(e.target.value) || 2)} />s
            </label>
            <label className="flex items-center gap-1 text-text-secondary shrink-0">
              FadeOut
              <input type="number" step="0.5" min="0" className="w-10 bg-bg-card border border-border/40 rounded px-1 text-center"
                value={t.fadeOut ?? 3} onChange={e => updateTrack(i, 'fadeOut', parseFloat(e.target.value) || 3)} />s
            </label>
            <button onClick={() => removeTrack(i)} className="text-red-400 hover:text-red-300 text-sm">&times;</button>
          </div>
        ))}
        {available.length > 0 ? (
          <div className="flex items-center gap-2">
            <select className="text-[11px] bg-bg-card border border-border/40 rounded px-2 py-1 text-text-primary"
              defaultValue="" onChange={e => { if (e.target.value) { addTrack(e.target.value); e.target.value = '' } }}>
              <option value="" disabled>+ 트랙 선택</option>
              {available.map(f => (
                <option key={f.name} value={f.name}>
                  {f.name}{f.duration != null ? ` (${Math.round(f.duration)}s)` : ''}
                </option>
              ))}
            </select>
          </div>
        ) : musicFiles.length > 0 && bgm.length > 0 ? (
          <span className="text-[10px] text-text-secondary/50">모든 음악 파일 사용 중</span>
        ) : null}
      </div>
    </details>
  )
}

/* ── 메인 ── */
export function ScenarioView({ episode }: { episode: EpisodeData }) {
  const { updateEpisode, save, dirty, saving, voiceFiles, voiceSummary, series, name, isEn, post, refreshFiles } = useEpisode()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // view: 'longform' | 'shorts-1' | 'shorts-2' | … (URL ?view=long|short-1|... 와 동기화)
  const view = parseViewParam(searchParams.get('view'))
  const setView = useCallback((next: string) => {
    const sp = new URLSearchParams(searchParams.toString())
    sp.set('view', viewToParam(next))
    router.replace(`${pathname}?${sp.toString()}`, { scroll: false })
  }, [router, pathname, searchParams])

  // 옵션 2: shorts는 배열(외부 파일 로드 결과). view는 1-based — 'shorts-1', 'shorts-2' …
  const shortsArr: any[] = useMemo(
    () => Array.isArray(episode.shorts) ? episode.shorts : (episode.shorts ? [episode.shorts] : []),
    [episode.shorts],
  )
  const isShortsView = view.startsWith('shorts-')
  const currentShortsIndex = isShortsView ? parseInt(view.split('-')[1], 10) : -1  // 1-based
  const currentShorts = currentShortsIndex >= 1 ? shortsArr[currentShortsIndex - 1] : undefined

  const { vs, saveVs } = useVoiceSelect(series, name)
  const hasELVoiceId = !!episode.host?.elevenlabsVoiceId
  const mode = detectMode(vs, hasELVoiceId)
  const [eleSettings, setEleSettings] = useState<EleSettings>(() => ({ ...DEFAULT_ELE_SETTINGS }))
  const [eleSendOpts, setEleSendOpts] = useState<EleSendOpts>(() => ({ ...DEFAULT_ELE_SEND_OPTS }))
  const [expandedKey, setExpandedKey] = useState<string | null>(null)
  const [playingKey, setPlayingKey] = useState<string | null>(null)
  const [pipelineReloadSignal, setPipelineReloadSignal] = useState(0)
  // 모달 닫힐 때 파이프라인 패널 자동 갱신 — 사용자가 처리한 항목이 즉시 사라지게
  useEffect(() => {
    if (expandedKey === null) setPipelineReloadSignal(s => s + 1)
  }, [expandedKey])

  const togglePlay = useCallback((key: string) => {
    setPlayingKey(prev => prev === key ? null : key)
  }, [])

  // playingKey 변경 시 실제 오디오 재생/정지. 단일 Audio 인스턴스를 ref로 관리한다.
  const audioRef = useRef<HTMLAudioElement | null>(null)
  useEffect(() => {
    // 이전 재생 정리 — 핸들러부터 제거해야 src 변경/pause로 인한 잔여 error 이벤트가
    // 새 재생을 setPlayingKey(null) 로 끊지 않는다 (StrictMode 더블 마운트 대응).
    if (audioRef.current) {
      const prev = audioRef.current
      prev.onended = null
      prev.onerror = null
      prev.pause()
      audioRef.current = null
    }
    if (!playingKey) return
    const url = `/api/${series}/voice/play/${name}/${playingKey}.wav`
    const audio = new Audio(url)
    audioRef.current = audio
    audio.onended = () => { if (audioRef.current === audio) setPlayingKey(null) }
    audio.onerror = () => {
      if (audioRef.current !== audio) return
      console.error('[ScenarioView] audio load failed:', url)
      setPlayingKey(null)
    }
    audio.play().catch(err => {
      if (audioRef.current !== audio) return
      console.error('[ScenarioView] audio play rejected:', err)
      setPlayingKey(null)
    })
    return () => {
      audio.onended = null
      audio.onerror = null
      audio.pause()
    }
  }, [playingKey, series, name])

  const activeEngine = useCallback((sectionKey: string): string => {
    if (!vs) return ''
    return vs.slots?.[`${sectionKey}.wav`] ?? vs.default ?? ''
  }, [vs])

  const toggleSlot = useCallback(async (sectionKey: string, engine: string) => {
    if (!vs) return
    const fileName = `${sectionKey}.wav`
    const newSlots = { ...(vs.slots ?? {}) }
    if (newSlots[fileName] === engine) delete newSlots[fileName]
    else newSlots[fileName] = engine
    await saveVs({ ...vs, slots: newSlots })
    refreshFiles()
  }, [vs, saveVs, refreshFiles])

  const toggleExpand = useCallback((key: string) => {
    setExpandedKey(prev => prev === key ? null : key)
  }, [])

  const sectionMap = useMemo(() => {
    const sections = groupBySection(voiceFiles, episode as any)
    const map = new Map<string, VoiceSection>()
    for (const s of sections) map.set(s.key, s)
    return map
  }, [voiceFiles, episode])

  const renderExpanded = useCallback((key: string) => {
    const section = sectionMap.get(key)
    if (!section) return null
    return (
      <ExpandedVoicePanel
        sectionKey={key}
        section={section}
        episode={episode}
        series={series}
        name={name}
        voiceId={episode.host?.elevenlabsVoiceId}
        eleSettings={eleSettings}
        eleSendOpts={eleSendOpts}
        onEleSendOptsChange={setEleSendOpts}
        activeEngine={activeEngine(key)}
        onToggleSlot={toggleSlot}
        onEpisodeChange={updateEpisode}
        onSave={save}
        onRefresh={refreshFiles}
      />
    )
  }, [sectionMap, episode, series, name, eleSettings, eleSendOpts, activeEngine, toggleSlot, updateEpisode, save, refreshFiles])

  /* ── 이미지 편집기 (공통) ── */
  const books = episode.books ?? []
  const { anchorPick, setAnchorPick, assignedFiles, crossUsage, imgProps } = useImageEditor({
    episode, updateEpisode, series, name, view,
    books, shortsArr, currentShortsIndex, currentShorts,
  })

  /* ── 저장 & 동기화 ── */
  const { handleSave, syncImages } = useSaveSync({
    episode, updateEpisode, save, series, name, isEn,
  })

  return (
    <div className="space-y-4">
      <VoiceToolbar
        episode={episode} series={series} name={name}
        voiceSummary={voiceSummary} mode={mode} hasELVoiceId={hasELVoiceId}
        vs={vs} onSaveVs={saveVs}
        eleSettings={eleSettings} onEleSettingsChange={setEleSettings}
        eleSendOpts={eleSendOpts} onEleSendOptsChange={setEleSendOpts}
        onRefresh={refreshFiles} post={post}
      />

      <VoicePipelineStatus
        series={series}
        name={name}
        onJumpToSegment={(key) => setExpandedKey(key)}
        reloadSignal={pipelineReloadSignal}
      />

      <div className="flex items-center gap-4 border-b border-border">
        <div className="flex gap-1">
          <button onClick={() => { setView('longform'); setAnchorPick(null) }} className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${view === 'longform' ? 'border-accent text-accent' : 'border-transparent text-text-secondary hover:text-text-primary'}`}>롱폼</button>
          {shortsArr.map((_, i) => {
            const idx = i + 1  // 1-based
            const v = `shorts-${idx}`
            const bookIdx = shortsArr[i]?.featuredBookIndex ?? i
            const rawTitle = books[bookIdx]?.title ?? ''
            const shortTitle = rawTitle.length > 14 ? rawTitle.slice(0, 14) + '…' : rawTitle
            const label = shortTitle ? `${idx}. ${shortTitle}` : (shortsArr.length === 1 && idx === 1 ? '쇼츠' : `쇼츠 ${idx}`)
            return (
              <button
                key={v}
                onClick={() => { setView(v); setAnchorPick(null) }}
                className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${view === v ? 'border-accent text-accent' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
              >
                {label}
              </button>
            )
          })}
          {shortsArr.length === 0 && (
            <button disabled className="px-4 py-2 text-sm font-semibold border-b-2 border-transparent text-text-secondary opacity-40">쇼츠 (없음)</button>
          )}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={syncImages} className="px-2 py-1 text-[10px] text-text-secondary hover:text-accent border border-border/40 rounded hover:border-accent/40 transition-colors" title={isEn ? 'ko에서 이미지 가져오기' : 'en으로 이미지 동기화'}>
            {isEn ? 'ko→en 이미지' : '→en 이미지 동기화'}
          </button>
          <span className="text-[10px] text-text-secondary">{sectionMap.size}개 섹션 / {voiceFiles.length}개 음성</span>
          {dirty && (
            <button onClick={handleSave} disabled={saving} className="px-3 py-1 text-xs font-semibold bg-accent text-bg-primary rounded hover:opacity-90 disabled:opacity-50">{saving ? '저장 중...' : '저장'}</button>
          )}
        </div>
      </div>

      {/* 쇼츠 BGM */}
      {isShortsView && currentShortsIndex >= 1 && (
        <BgmPanel episode={episode} onUpdate={updateEpisode} series={series} name={name} shortsIndex={currentShortsIndex} />
      )}

      {view === 'longform' ? (
        <LongformView episode={episode} sectionMap={sectionMap} onUpdate={updateEpisode}
          expandedKey={expandedKey} onToggleExpand={toggleExpand} renderExpanded={renderExpanded}
          activeEngine={activeEngine} playingKey={playingKey} onTogglePlay={togglePlay} {...imgProps} />
      ) : isShortsView && currentShortsIndex >= 1 ? (
        <ShortsView episode={episode} shortsIndex={currentShortsIndex} sectionMap={sectionMap} onUpdate={updateEpisode}
          expandedKey={expandedKey} onToggleExpand={toggleExpand} renderExpanded={renderExpanded}
          activeEngine={activeEngine} playingKey={playingKey} onTogglePlay={togglePlay} {...imgProps}
          assignedFiles={assignedFiles} />
      ) : null}

      {dirty && (
        <button
          onClick={handleSave}
          disabled={saving}
          className="fixed bottom-6 right-6 z-50 px-5 py-2.5 rounded-full bg-accent text-bg-primary text-sm font-bold shadow-lg shadow-accent/30 hover:opacity-90 disabled:opacity-50 transition-all"
        >
          {saving ? '저장 중...' : '저장'}
        </button>
      )}

      {/* 음성 편집 전역 모달 — 아코디언 대체 */}
      <VoiceEditorModal openKey={expandedKey} onClose={() => setExpandedKey(null)} renderExpanded={renderExpanded} />
    </div>
  )
}

// ── 전역 모달 ──
function VoiceEditorModal({ openKey, onClose, renderExpanded }: {
  openKey: string | null
  onClose: () => void
  renderExpanded: (key: string) => React.ReactNode
}) {
  useEffect(() => {
    if (!openKey) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey) }
  }, [openKey, onClose])
  if (!openKey) return null
  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-bg-card border border-border rounded-lg flex flex-col"
        style={{ width: 'min(96vw, 1800px)', height: 'min(94vh, 1100px)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-3 border-b border-border">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold">VoiceTimingEditor</span>
            <span className="text-[11px] text-text-secondary">{openKey}</span>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded text-xs bg-bg-main border border-border hover:bg-bg-hover text-text-secondary"
          >
            닫기 (ESC)
          </button>
        </div>
        <div className="flex-1 overflow-auto p-6">
          {renderExpanded(openKey)}
        </div>
      </div>
    </div>
  )
}
