'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEpisode } from '@/lib/episode-context'
import { groupBySection, type VoiceSection } from './voice-utils'
import type { EpisodeData } from './EpisodeEditor'
import { VoiceToolbar, ExpandedVoicePanel, useVoiceSelect, detectMode, DEFAULT_ELE_SETTINGS, DEFAULT_ELE_SEND_OPTS, type EleSettings, type EleSendOpts } from './scenario-voice'
import { VoicePipelineStatus } from './VoicePipelineStatus'
import {
  parseViewParam, viewToParam, viewToBookIndex, VIEW_META,
  useImageEditor, useSaveSync,
  LongformView, ShortsView,
  BgmPanel, VoiceEditorModal, MaterialModal, TtsReplaceModal,
} from './scenario'
import { useAudioPreview } from './scenario/useAudioPreview'
import { AudioPreviewProvider } from './scenario/AudioPreviewContext'
import { BookTabsBar } from './scenario/BookTabsBar'
import { SpeakerPanel, type Speaker } from './scenario/SpeakerPanel'
import { PlaybackRateControl } from './scenario/PlaybackRatePanel'
import { RowCollapseProvider, useRowCollapse } from './scenario/RowCollapseContext'
import { bookReorderRenames, callRenameApi } from './scenario/voiceRename'

/** 페이지 상단 — 모든 행 펼치기/접기 일괄 토글. */
function CollapseAllBar() {
  const ctx = useRowCollapse()
  const total = ctx.totalCount
  const open = total - ctx.collapsedCount
  return (
    <div className="flex items-center gap-2 text-[11px] text-text-secondary">
      <button
        onClick={ctx.expandAll}
        className="px-2 py-0.5 text-[11px] border border-border/40 rounded hover:border-accent/40 hover:text-accent transition-colors"
        title="모든 행을 펼친다"
      >▼ 전부 펼치기</button>
      <button
        onClick={ctx.collapseAll}
        className="px-2 py-0.5 text-[11px] border border-border/40 rounded hover:border-accent/40 hover:text-accent transition-colors"
        title="모든 행을 접는다"
      >▶ 전부 접기</button>
    </div>
  )
}

/* ── 메인 ── */
export function ScenarioView({ episode }: { episode: EpisodeData }) {
  const { updateEpisode, save, dirty, saving, voiceFiles, voiceSummary, series, name, isEn, post, refreshFiles } = useEpisode()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // view: 'meta' | 'book-1' | 'book-2' | …
  // sub: 'long' | 'short' — 책 탭 내부 2단 탭 (메타 탭에선 무시)
  const view = parseViewParam(searchParams.get('view'))
  const subRaw = searchParams.get('sub')
  const subTab: 'long' | 'short' = subRaw === 'short' ? 'short' : 'long'

  // view·sub 동시 변경 — 같은 turn 안에서 두 번 router.replace 호출하면 두 번째가
  // 첫 번째 변경 전 searchParams 기반이라 view 변경이 유실된다. 한 번에 처리.
  const setViewSub = useCallback((nextView: string, nextSub: 'long' | 'short') => {
    const sp = new URLSearchParams(searchParams.toString())
    sp.set('view', viewToParam(nextView))
    if (nextSub === 'long') sp.delete('sub')
    else sp.set('sub', nextSub)
    router.replace(`${pathname}?${sp.toString()}`, { scroll: false })
  }, [router, pathname, searchParams])

  // shorts 배열 (외부 파일 로드 결과). featuredBookIndex 로 책과 매핑.
  const shortsArr: any[] = useMemo(
    () => Array.isArray(episode.shorts) ? episode.shorts : (episode.shorts ? [episode.shorts] : []),
    [episode.shorts],
  )

  // 화자 풀 머지 — episode.speakers(SSoT) + 옛 shorts[i].speakers 폴백(id 충돌은 episode 우선)
  const mergedSpeakers: Speaker[] = useMemo(() => {
    const ep = Array.isArray(episode.speakers) ? episode.speakers : []
    const ids = new Set(ep.map(s => s.id))
    const seen = new Set<string>()
    const legacy: Speaker[] = []
    for (const s of shortsArr) {
      if (!s || !Array.isArray(s.speakers)) continue
      for (const sp of s.speakers as Speaker[]) {
        if (!sp?.id || ids.has(sp.id) || seen.has(sp.id)) continue
        seen.add(sp.id)
        legacy.push(sp)
      }
    }
    return [...ep, ...legacy]
  }, [episode.speakers, shortsArr])

  // LongformView · ShortsView 가 episode.speakers 를 직접 참조하므로 머지된 풀을 주입한 view 객체.
  const mergedEpisode: EpisodeData = useMemo(
    () => ({ ...episode, speakers: mergedSpeakers }),
    [episode, mergedSpeakers],
  )

  // 책 인덱스 → shortsArr 인덱스(1-based)
  const bookToShortsIndex = useMemo(() => {
    const m = new Map<number, number>()
    shortsArr.forEach((s, i) => {
      const fi = s?.featuredBookIndex
      if (typeof fi === 'number') m.set(fi, i + 1)
    })
    return m
  }, [shortsArr])

  // 현재 보고 있는 책 (1-based) — null 이면 메타 탭
  const currentBookIndex1 = viewToBookIndex(view)         // 1-based or null
  const currentBookIndex0 = currentBookIndex1 != null ? currentBookIndex1 - 1 : null  // 0-based or null
  const isBookView = currentBookIndex0 != null
  const currentShortsIndex = isBookView ? (bookToShortsIndex.get(currentBookIndex0!) ?? -1) : -1
  const currentShorts = currentShortsIndex >= 1 ? shortsArr[currentShortsIndex - 1] : undefined

  const { vs, saveVs } = useVoiceSelect(series, name)
  const hasELVoiceId = !!episode.host?.elevenlabsVoiceId
  const mode = detectMode(vs, hasELVoiceId)
  const [eleSettings, setEleSettings] = useState<EleSettings>(() => ({ ...DEFAULT_ELE_SETTINGS }))
  const [eleSendOpts, setEleSendOpts] = useState<EleSendOpts>(() => ({ ...DEFAULT_ELE_SEND_OPTS }))
  const [expandedKey, setExpandedKey] = useState<string | null>(null)
  const [pipelineReloadSignal, setPipelineReloadSignal] = useState(0)
  const [materialOpen, setMaterialOpen] = useState(false)
  const [ttsReplaceOpen, setTtsReplaceOpen] = useState(false)

  // 편집 모달 닫힐 때 파이프라인 패널 자동 갱신 — 사용자가 처리한 항목이 즉시 사라지게
  useEffect(() => {
    if (expandedKey === null) setPipelineReloadSignal(s => s + 1)
  }, [expandedKey])

  const audioCtl = useAudioPreview(series, name)
  const { playingKey, togglePlay } = audioCtl

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

  const renderExpanded = useCallback((key: string, mode: 'trim' | 'sync') => {
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
        onEpisodeChange={updateEpisode}
        onSave={save}
        onRefresh={refreshFiles}
        expandMode={mode}
      />
    )
  }, [sectionMap, episode, series, name, eleSettings, eleSendOpts, activeEngine, updateEpisode, save, refreshFiles])

  // 모달 헤더용 엔진 상태 — openKey 의 활성/기본/override 와 wav 존재 여부.
  const modalEngineState = useMemo(() => {
    if (!expandedKey) return null
    const section = sectionMap.get(expandedKey)
    if (!section) return null
    const defaultEng = vs?.default ?? ''
    const active = activeEngine(expandedKey)
    const slotEngine = vs?.slots?.[`${expandedKey}.wav`]
    return {
      active,
      default: defaultEng,
      hasOverride: !!slotEngine && slotEngine !== defaultEng,
      hasFile: { gemini: !!section.gemini, elevenlabs: !!section.elevenlabs },
      onToggle: (eng: 'gemini' | 'elevenlabs') => toggleSlot(expandedKey, eng),
    }
  }, [expandedKey, sectionMap, vs, activeEngine, toggleSlot])

  /* ── 이미지 편집기 ──
   *  책 탭에서는 롱폼 책 영역(book.images)과 쇼츠 segment 이미지가 같이 보이므로
   *  편집 컨텍스트를 분리해 두 인스턴스로 운영한다. anchorPick · folderImages 가 각 영역별로 독립.
   */
  const books = episode.books ?? []
  const longformImg = useImageEditor({
    episode, updateEpisode, series, name,
    view: VIEW_META,  // longform 분기 (book · meta 모두 동일)
    books, shortsArr, currentShortsIndex: -1, currentShorts: undefined,
  })
  const shortsImg = useImageEditor({
    episode, updateEpisode, series, name,
    view: currentShortsIndex >= 1 ? `shorts-${currentShortsIndex}` : 'shorts-1',
    books, shortsArr,
    currentShortsIndex: Math.max(currentShortsIndex, 1),
    currentShorts: currentShorts ?? shortsArr[0],
  })
  // 탭 전환 시 두 영역 모두 해제
  const setAnchorPick = (v: any) => { longformImg.setAnchorPick(v); shortsImg.setAnchorPick(v) }

  /* ── 저장 & 동기화 ── */
  const { handleSave, syncImages } = useSaveSync({
    episode, updateEpisode, save, series, name, isEn,
  })

  // Alt+S — 전체 저장: 행별 SaveButton 일괄 클릭 + episode 전체 저장(우하단 fixed 버튼과 동일)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!e.altKey || (e.key !== 's' && e.key !== 'S')) return
      e.preventDefault()
      const buttons = document.querySelectorAll<HTMLButtonElement>(
        'button[data-save-button="true"]:not(:disabled)',
      )
      buttons.forEach(b => b.click())
      if (dirty && !saving) void handleSave()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [dirty, saving, handleSave])

  return (
    <AudioPreviewProvider value={audioCtl}>
    <RowCollapseProvider>
    <div className="space-y-3 p-4">
      <VoiceToolbar
        episode={episode} series={series} name={name}
        voiceSummary={voiceSummary} mode={mode} hasELVoiceId={hasELVoiceId}
        vs={vs} onSaveVs={saveVs}
        eleSettings={eleSettings} onEleSettingsChange={setEleSettings}
        eleSendOpts={eleSendOpts} onEleSendOptsChange={setEleSendOpts}
        onRefresh={refreshFiles} post={post}
        speakerPanelNode={
          <SpeakerPanel
            speakers={mergedSpeakers}
            onChange={(next: Speaker[]) => {
              // 사용자가 화자를 편집·저장하는 순간 옛 shorts[i].speakers 는 청소된다(자동 마이그레이션).
              const cleanedShorts = Array.isArray(episode.shorts)
                ? episode.shorts.map((s: any) => {
                    if (!s || !Array.isArray(s.speakers)) return s
                    const { speakers: _, ...rest } = s
                    return rest
                  })
                : episode.shorts
              if (next.length === 0) {
                const { speakers: _, ...rest } = episode
                updateEpisode({ ...rest, shorts: cleanedShorts } as EpisodeData)
              } else {
                updateEpisode({ ...episode, speakers: next, shorts: cleanedShorts } as EpisodeData)
              }
            }}
            onRenameId={(oldId, newId) => {
              // 화자 id 변경 — 책 · 인트로 · 쇼츠의 참조도 같이 새 id 로 갈아끼운다.
              const renameStr = (v: unknown) => v === oldId ? newId : v
              const ep: any = { ...episode }
              if (ep.narrator) {
                ep.narrator = { ...ep.narrator }
                for (const k of Object.keys(ep.narrator)) {
                  if (k.endsWith('Speaker')) ep.narrator[k] = renameStr(ep.narrator[k])
                }
              }
              if (ep.host) {
                ep.host = { ...ep.host }
                for (const k of Object.keys(ep.host)) {
                  if (k.endsWith('Speaker')) ep.host[k] = renameStr(ep.host[k])
                }
              }
              if (Array.isArray(ep.books)) {
                ep.books = ep.books.map((b: any) => {
                  if (!b) return b
                  const nb: any = { ...b }
                  for (const k of Object.keys(nb)) {
                    if (k.endsWith('Speaker')) nb[k] = renameStr(nb[k])
                  }
                  if (Array.isArray(nb.quotePairs)) {
                    nb.quotePairs = nb.quotePairs.map((p: any) => {
                      if (!p) return p
                      const np: any = { ...p }
                      for (const k of Object.keys(np)) {
                        if (k.endsWith('Speaker')) np[k] = renameStr(np[k])
                      }
                      return np
                    })
                  }
                  return nb
                })
              }
              if (Array.isArray(ep.shorts)) {
                ep.shorts = ep.shorts.map((s: any) => {
                  if (!s || !Array.isArray(s.segments)) return s
                  return {
                    ...s,
                    segments: s.segments.map((seg: any) => seg?.speaker === oldId ? { ...seg, speaker: newId } : seg),
                  }
                })
              }
              updateEpisode(ep as EpisodeData)
            }}
          />
        }
      />

      <VoicePipelineStatus
        series={series}
        name={name}
        onJumpToSegment={(key) => setExpandedKey(key)}
        reloadSignal={pipelineReloadSignal}
      />

      {/* 도구 영역 — 접기 · 배속 · 섹션 카운트 · 이미지 동기화 한 줄에 통합 */}
      <div className="mb-2 rounded border border-border/40 bg-bg-card/30 flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-1.5 text-[11px] text-text-secondary">
        <CollapseAllBar />
        <PlaybackRateControl />
        <div className="ml-auto flex items-center gap-2">
          <span>{sectionMap.size}개 섹션 · {voiceFiles.length}개 음성</span>
          <button
            onClick={() => setMaterialOpen(true)}
            className="px-2 py-0.5 text-[11px] border border-border/40 rounded hover:border-accent/40 hover:text-accent transition-colors"
            title="책 폴더의 「재료.txt」 (작가가 정리한 원자료) 보기"
          >
            재료 메모
          </button>
          <button
            onClick={() => setTtsReplaceOpen(true)}
            className="px-2 py-0.5 text-[11px] border border-border/40 rounded hover:border-accent/40 hover:text-accent transition-colors"
            title="본문 → TTS 송신 시 적용되는 치환 사전 편집 (episode.tts.replace)"
          >
            TTS 치환
          </button>
          <button
            onClick={syncImages}
            className="px-2 py-0.5 text-[11px] border border-border/40 rounded hover:border-accent/40 hover:text-accent transition-colors"
            title={isEn ? 'ko에서 이미지 가져오기' : 'en으로 이미지 동기화'}
          >
            {isEn ? 'ko→en 이미지' : '→en 이미지 동기화'}
          </button>
        </div>
      </div>


      <BookTabsBar
        view={view}
        subTab={subTab}
        books={books}
        bookToShortsIndex={bookToShortsIndex}
        onSelect={(nextView, nextSub) => { setViewSub(nextView, nextSub); setAnchorPick(null) }}
        onReorder={async (fromIdx, toIdx) => {
          if (fromIdx === toIdx) return
          const allBooks = Array.isArray(episode.books) ? episode.books : []
          if (fromIdx < 0 || fromIdx >= allBooks.length) return
          // 새 순서 계산
          const newOrder = allBooks.map((_, i: number) => i)
          const [moved] = newOrder.splice(fromIdx, 1)
          newOrder.splice(toIdx, 0, moved)
          const renames = bookReorderRenames(newOrder, allBooks)
          // books 배열 재정렬 + shorts.featuredBookIndex 도 새 인덱스로 갱신
          const remap = new Map<number, number>()
          newOrder.forEach((oldI: number, newI: number) => remap.set(oldI, newI))
          const newBooks = newOrder.map((oldI: number) => allBooks[oldI])
          const newShorts = Array.isArray(episode.shorts)
            ? episode.shorts.map((s: any) => {
                if (!s || typeof s.featuredBookIndex !== 'number') return s
                const nb = remap.get(s.featuredBookIndex)
                return nb === undefined ? s : { ...s, featuredBookIndex: nb }
              })
            : episode.shorts
          updateEpisode({ ...episode, books: newBooks, shorts: newShorts } as EpisodeData)
          // 현재 보고 있던 책 탭도 새 위치로 따라가도록 URL 보정
          if (currentBookIndex0 != null) {
            const newCur = remap.get(currentBookIndex0)
            if (newCur !== undefined && newCur !== currentBookIndex0) {
              setViewSub(`book-${newCur + 1}`, subTab)
            }
          }
          const { errors } = await callRenameApi(series, name, renames)
          if (errors.length) console.warn('책 reorder rename 일부 실패:', errors)
        }}
      />

      {/* 본문 — 탭별 렌더링 */}
      {!isBookView ? (
        // 기본/기타 탭: LongformView 인트로 영역만 (이미지 풀 미노출)
        <LongformView episode={mergedEpisode} sectionMap={sectionMap} onUpdate={updateEpisode}
          onToggleExpand={toggleExpand}
          activeEngine={activeEngine} playingKey={playingKey} onTogglePlay={togglePlay}
          {...longformImg.imgProps}
          focus="meta" />
      ) : (() => {
        // 책 탭: 상단 탭에서 sub(long|short) 가 이미 결정됨. 쇼츠 없는 책은 자동 long.
        const hasShorts = currentShortsIndex >= 1 && !!currentShorts
        const effectiveSub: 'long' | 'short' = subTab === 'short' && hasShorts ? 'short' : 'long'
        return effectiveSub === 'long' ? (
          <LongformView episode={mergedEpisode} sectionMap={sectionMap} onUpdate={updateEpisode}
            onToggleExpand={toggleExpand}
            activeEngine={activeEngine} playingKey={playingKey} onTogglePlay={togglePlay}
            {...longformImg.imgProps}
            focus={{ kind: 'book', index: currentBookIndex0! }} />
        ) : (
          <div className="space-y-4">
            <BgmPanel episode={episode} onUpdate={updateEpisode} series={series} name={name} shortsIndex={currentShortsIndex} />
            <ShortsView episode={episode} shortsIndex={currentShortsIndex} sectionMap={sectionMap} onUpdate={updateEpisode}
              onToggleExpand={toggleExpand}
              activeEngine={activeEngine} playingKey={playingKey} onTogglePlay={togglePlay}
              {...shortsImg.imgProps}
              assignedFiles={shortsImg.assignedFiles} />
          </div>
        )
      })()}

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
      <VoiceEditorModal
        openKey={expandedKey}
        onClose={() => setExpandedKey(null)}
        renderExpanded={renderExpanded}
        engineState={modalEngineState}
      />

      {/* 재료.txt 뷰어 — 책 폴더의 원자료 메모 */}
      <MaterialModal
        series={series}
        name={name}
        open={materialOpen}
        onClose={() => setMaterialOpen(false)}
      />

      {/* TTS 치환 사전 편집기 — episode.tts.replace */}
      <TtsReplaceModal
        open={ttsReplaceOpen}
        onClose={() => setTtsReplaceOpen(false)}
      />
    </div>
    </RowCollapseProvider>
    </AudioPreviewProvider>
  )
}
