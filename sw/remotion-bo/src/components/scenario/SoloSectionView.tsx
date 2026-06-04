'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useFolderImages } from './useImageEditor/useFolderImages'
import { useSoloImageOps } from './useImageEditor/useSoloImageOps'
import { FieldAudioControls } from './FieldAudioControls'
import { VoiceEditorModal } from './VoiceEditorModal'
import { EditableText } from './EditableText'
import { InlineImageRow } from './ImageThumb'
import { ImagePool } from './ImagePool'
import { usePlaybackRate } from './usePlaybackRate'
import { lookupVoice, imageKeyFromPath } from './utils'
import { ENGINE_COLORS, ENGINE_LABELS, type AnchorPick, type CinematicImage, type ImageField } from './types'
import { ExpandedVoicePanel, type EleSettings, type EleSendOpts } from '../scenario-voice'
import type { VoiceSection } from '../voice-utils'
import type { EpisodeData } from '../EpisodeEditor'

// 솔로는 책 단위 그룹·field 분류가 없어 이미지 풀 그룹핑 맵을 비운다 (참조 안정성 위해 모듈 상수).
const EMPTY_FILE_BOOK_MAP = new Map<string, number>()
const EMPTY_FILE_FIELD_MAP = new Map<string, ImageField>()

/** 마디 안 이미지 전환 한 칸 — Remotion solo-build.ts의 SoloImageChange 와 동일 형태. */
export interface SoloImageChange {
  /** 이미지 파일 — 'episodes/...' 풀 경로(쇼츠와 동일). 비면 '' (자리표시) */
  image: string
  /** 전환 시작 문장/절 — 본문 내 위치(글자수 비율)로 전환 시각 산정 */
  text?: string
  /** 전환 시각(초, 마디 시작 기준) — 음성 정렬 시 우선 사용 (선택) */
  t?: number
}

/** 1권 모드(SOLO) 자유섹션 — Remotion solo-build.ts의 SoloFreeSection 과 동일 형태. */
export interface SoloFreeSection {
  id: string
  text: string
  image?: string
  /** 마디 안에서 문장별로 이미지를 갈아끼우는 전환 배열 (있으면 image보다 우선) */
  imageChangeAt?: SoloImageChange[]
  voice?: 'tts' | 'actor'
  kind?: 'narration' | 'quote'
  quoteSource?: string
  /** 캐릭터 보이스 — Gemini 보이스명. 음성 편집 창에서 선택, TTS 화자일 때 적용 (기본 Kore) */
  geminiVoice?: string
}

/** 기존 id와 겹치지 않는 다음 섹션 id (`s{n}`). 삭제 후 재추가해도 충돌 없게 max+1. */
function nextId(sections: SoloFreeSection[]): string {
  let max = 0
  for (const s of sections) {
    const m = /^s(\d+)$/.exec(s.id)
    if (m) max = Math.max(max, parseInt(m[1], 10))
  }
  return `s${max + 1}`
}

/**
 * 솔로 자유섹션 편집기.
 *
 * episode 전체 저장 흐름과 분리된 독립 컴포넌트다. 책 폴더의 solo.{locale}.json 을
 * 자체 GET/PUT 한다. 책은 인덱스(bookIndex)로 식별하고, 서버가 폴더 순서로 매칭한다.
 *
 * 이미지: 쇼츠·롱폼과 동일한 공용 인프라(segToImages·mediaPath·InlineImageRow·앵커 픽업)를 그대로 쓴다.
 * 저장 경로는 쇼츠와 동일한 풀 경로(episodes/...)라 BO 썸네일·영상 렌더 양쪽이 모두 찾는다.
 *
 * 음성: 쇼츠·롱폼과 동일한 음성 제어판(재생·엔진 표시·편집기 열기)을 각 섹션에 붙인다.
 */
export function SoloSectionView({
  series, name, bookIndex,
  episode, sectionMap, activeEngine, playingKey, onTogglePlay,
  eleSettings, eleSendOpts, onEleSendOptsChange,
  onEpisodeChange, onSave, onRefreshFiles,
}: {
  series: string
  name: string
  bookIndex: number
  episode: EpisodeData
  sectionMap: Map<string, VoiceSection>
  activeEngine: (key: string) => string
  playingKey: string | null
  onTogglePlay: (key: string) => void
  eleSettings: EleSettings
  eleSendOpts: EleSendOpts
  onEleSendOptsChange: (o: EleSendOpts) => void
  onEpisodeChange: (ep: EpisodeData) => void
  onSave: (data: EpisodeData) => Promise<unknown>
  onRefreshFiles: () => void
}) {
  const [sections, setSectionsState] = useState<SoloFreeSection[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [speakingId, setSpeakingId] = useState<string | null>(null)
  const [expandedKey, setExpandedKey] = useState<string | null>(null)
  // 이미지 풀에서 「추가」 버튼을 눌렀을 때 이미지를 받을 대상 섹션. 카드 클릭 시 갱신.
  const [activeIdx, setActiveIdx] = useState(0)
  const [copied, setCopied] = useState(false)
  // 앵커 픽업 상태 — 쇼츠와 동일. 본문에서 구절을 선택하면 그 슬롯의 text 앵커로 등록한다.
  const [anchorPick, setAnchorPick] = useState<AnchorPick>(null)
  const {
    folderImages, imageBaseUrl, subFolders, fileFolders, duplicates, refreshFolderImages,
    moveFileToFolder, createFolder, renameFolder, deleteFolder, mediaPath,
  } = useFolderImages(series, name)
  // 다른 책과 이름이 겹치는 파일 집합 — 겹치는 파일만 폴더 포함 식별자로 다뤄 풀 키와 맞춘다.
  const dupNames = useMemo(() => new Set(duplicates.map(d => d.name)), [duplicates])

  // dirty 표시를 묶기 위해 setSections 래퍼 — 함수형 업데이트만 받는다(공용 ops 호환).
  const setSections = useCallback((updater: (prev: SoloFreeSection[]) => SoloFreeSection[]) => {
    setSectionsState(updater)
    setDirty(true)
  }, [])

  // 쇼츠 segment 와 동일한 공용 이미지 조작 — 저장 경로도 쇼츠와 같은 episodes/... 풀 경로.
  const ops = useSoloImageOps<SoloFreeSection>({ sections, setSections, mediaPath, dupNames })

  const apiUrl = `/api/${series}/episodes/${name}/solo/${bookIndex}`
  const ttsLang = name.endsWith('-en') ? 'en-US' : 'ko-KR'
  const [rate] = usePlaybackRate() // 상단 도구막대의 전역 배속 — 듣기 미리듣기에도 동일 적용

  // 각 자유섹션 → 솔로 음성 키. 정형부(인사·소개·표지) 다음 순번부터 매긴다.
  const sectionKeys = useMemo<(string | null)[]>(() => {
    const greetingOffset = (episode.narrator as { serviceGreeting?: string } | undefined)?.serviceGreeting ? 1 : 0
    const base = greetingOffset + 2 // intro + title
    const bookNN = String(bookIndex + 1).padStart(2, '0')
    let live = 0
    return sections.map(s => {
      if (!s.text?.trim()) return null
      const nn = String(base + live + 1).padStart(2, '0')
      live++
      return `solo-B${bookNN}/S${nn}-${s.id}`
    })
  }, [sections, episode.narrator, bookIndex])

  // 편집기 모달이 연 키 → 해당 섹션 본문(합성 원문으로 주입)
  const expandedText = useMemo(() => {
    if (!expandedKey) return ''
    const i = sectionKeys.indexOf(expandedKey)
    return i >= 0 ? sections[i]?.text ?? '' : ''
  }, [expandedKey, sectionKeys, sections])

  // 브라우저 내장 음성으로 미리듣기 — 분량·리듬 확인용(실제 영상 음성과 무관).
  const speak = useCallback((id: string, text: string) => {
    const synth = window.speechSynthesis
    if (!synth) return
    synth.cancel()
    if (speakingId === id || !text.trim()) { setSpeakingId(null); return }
    const u = new SpeechSynthesisUtterance(text)
    u.lang = ttsLang
    u.rate = Math.max(0.1, Math.min(10, rate)) // SpeechSynthesis 허용 범위로 clamp
    u.onend = () => setSpeakingId(null)
    u.onerror = () => setSpeakingId(null)
    synth.speak(u)
    setSpeakingId(id)
  }, [speakingId, ttsLang, rate])

  // 화면을 벗어나면 재생 중지
  useEffect(() => () => { window.speechSynthesis?.cancel() }, [])

  useEffect(() => {
    let alive = true
    setLoading(true)
    fetch(apiUrl)
      .then(r => r.json())
      .then(d => {
        if (!alive) return
        setSectionsState(Array.isArray(d?.sections) ? d.sections : [])
        setDirty(false)
      })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [apiUrl])

  const patch = useCallback((i: number, p: Partial<SoloFreeSection>) => {
    setSections(prev => prev.map((s, j) => (j === i ? { ...s, ...p } : s)))
  }, [setSections])

  // 섹션이 쓰는 이미지 집합 — 풀의 used 뱃지·사용중 필터 기준. 풀 경로를 풀 키(basename)로 환원해 맞춘다.
  const usedFiles = useMemo(() => {
    const set = new Set<string>()
    for (const s of sections) {
      if (s.image) set.add(imageKeyFromPath(s.image, dupNames))
      for (const c of s.imageChangeAt ?? []) if (c.image) set.add(imageKeyFromPath(c.image, dupNames))
    }
    return set
  }, [sections, dupNames])

  // 앵커 픽업 확정 — 선택 구절을 해당 슬롯 text 로 등록(쇼츠 confirmAnchor 와 동일 모델).
  const confirmAnchor = useCallback((idx: number, selected: string) => {
    const imgs = [...ops.getImages(idx)]
    if (anchorPick && anchorPick.itemIdx === idx) {
      imgs[anchorPick.imgIdx] = { ...imgs[anchorPick.imgIdx], text: selected } as CinematicImage
      ops.setImages(idx, imgs)
      setAnchorPick(null)
      return
    }
    // 픽업 슬롯 미지정 — 새 빈 슬롯에 앵커만 등록(이미지는 이후 드롭으로 채움)
    ops.addAnchor(idx, selected)
  }, [ops, anchorPick])

  // 편집 창에서 고른 캐릭터 보이스를 해당 솔로 섹션(solo.json)에 저장 — episode 밖이라 콜백으로 주입.
  const voiceOverride = useMemo(() => {
    if (!expandedKey) return null
    const i = sectionKeys.indexOf(expandedKey)
    if (i < 0) return null
    return {
      value: sections[i]?.geminiVoice ?? 'Kore',
      onChange: (v: string) => patch(i, { geminiVoice: v || undefined }),
    }
  }, [expandedKey, sectionKeys, sections, patch])

  const add = useCallback(() => {
    setSections(prev => [...prev, { id: nextId(prev), text: '', voice: 'tts', kind: 'narration' }])
  }, [setSections])
  const remove = useCallback((i: number) => {
    setSections(prev => prev.filter((_, j) => j !== i))
  }, [setSections])
  const move = useCallback((i: number, dir: -1 | 1) => {
    setSections(prev => {
      const j = i + dir
      if (j < 0 || j >= prev.length) return prev
      const next = [...prev]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }, [setSections])

  const save = useCallback(async () => {
    setSaving(true)
    try {
      const res = await fetch(apiUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sections }),
      })
      if (res.ok) setDirty(false)
      else console.warn('솔로 자유섹션 저장 실패', await res.text())
    } finally {
      setSaving(false)
    }
  }, [apiUrl, sections])

  // 내용 복사 — 각 칸을 「종류 · 본문(인용은 출처 포함)」으로 모아 클립보드에 담는다.
  const copyAll = useCallback(() => {
    const body = sections
      .filter(s => s.text?.trim())
      .map(s => {
        const label = s.kind === 'quote' ? '인용' : '서술'
        const src = s.kind === 'quote' && s.quoteSource?.trim() ? `\n출처: ${s.quoteSource.trim()}` : ''
        return `# ${label} (${s.id})\n${s.text.trim()}${src}`
      })
      .join('\n\n')
    navigator.clipboard.writeText(body).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }, [sections])

  if (loading) {
    return <div className="p-4 text-sm text-text-secondary">자유섹션 불러오는 중…</div>
  }

  return (
    <div className="space-y-3">
      {/* 헤더 — 안내 + 내용 복사 (저장은 우하단 플로팅 버튼) */}
      <div className="rounded border border-border/70 bg-bg-card px-3 py-2 flex items-center justify-between gap-2">
        <div className="text-[12px] text-text-secondary">
          1권 모드 자유 구성 · <span className="text-text-primary font-bold">{sections.length}개 섹션</span>
          <span className="ml-2 opacity-70">인사·책 표지·마무리는 자동으로 붙습니다.</span>
        </div>
        <button
          onClick={copyAll}
          className="shrink-0 px-2.5 py-1 text-sm font-bold text-text-secondary hover:text-accent border border-border/40 rounded hover:border-accent/40"
        >
          {copied ? '복사됨' : '내용 복사'}
        </button>
      </div>

      <div className="flex gap-0">
        <div className="flex-1 min-w-0 space-y-3">
      {/* 섹션 목록 */}
      {sections.map((s, i) => {
        const isQuote = s.kind === 'quote'
        const segKey = sectionKeys[i]
        const vi = segKey ? lookupVoice(sectionMap, segKey) : null
        const eng = segKey ? activeEngine(segKey) : ''
        // 발화 속도 — 본문 글자수(공백·줄바꿈 제외) ÷ 오디오 길이(초). 파일이 있을 때만.
        const charCount = s.text.replace(/\s/g, '').length
        const cps = vi?.exists && vi.duration ? charCount / vi.duration : null
        const imgs = ops.getImages(i)
        const picking = anchorPick?.itemIdx === i
        return (
          <div key={s.id}
            onClick={() => setActiveIdx(i)}
            onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy' }}
            onDrop={e => {
              e.preventDefault()
              const fn = e.dataTransfer.getData('text/plain')
              if (fn && !fn.startsWith('seg:') && !fn.startsWith('book:')) { ops.dropImage(i, fn); setActiveIdx(i) }
            }}
            className={`rounded border bg-bg-main/30 p-3 space-y-2 ${
              activeIdx === i ? 'border-accent/60 ring-1 ring-accent/30' : 'border-border/70'
            }`}>
            {/* 상단 조작 줄 */}
            <div className="flex items-center gap-2 text-[11px] text-text-secondary">
              <span className="font-mono font-bold text-text-primary">#{i + 1}</span>
              <button onClick={() => move(i, -1)} disabled={i === 0}
                className="px-1.5 py-0.5 border border-border/60 rounded disabled:opacity-30 hover:border-accent/40" title="위로">↑</button>
              <button onClick={() => move(i, 1)} disabled={i === sections.length - 1}
                className="px-1.5 py-0.5 border border-border/60 rounded disabled:opacity-30 hover:border-accent/40" title="아래로">↓</button>

              {/* 화자 토글 */}
              <div className="ml-2 inline-flex rounded overflow-hidden border border-border/60">
                <button onClick={() => patch(i, { voice: 'tts' })}
                  className={`px-2 py-0.5 ${(s.voice ?? 'tts') === 'tts' ? 'bg-accent/15 text-accent font-bold' : 'hover:bg-bg-hover'}`}>일반 음성</button>
                <button onClick={() => patch(i, { voice: 'actor' })}
                  className={`px-2 py-0.5 border-l border-border/60 ${s.voice === 'actor' ? 'bg-accent/15 text-accent font-bold' : 'hover:bg-bg-hover'}`}>성우</button>
              </div>

              {/* 종류 토글 */}
              <div className="inline-flex rounded overflow-hidden border border-border/60">
                <button onClick={() => patch(i, { kind: 'narration' })}
                  className={`px-2 py-0.5 ${!isQuote ? 'bg-accent/15 text-accent font-bold' : 'hover:bg-bg-hover'}`}>서술</button>
                <button onClick={() => patch(i, { kind: 'quote' })}
                  className={`px-2 py-0.5 border-l border-border/60 ${isQuote ? 'bg-accent/15 text-accent font-bold' : 'hover:bg-bg-hover'}`}>인용</button>
              </div>

              <button onClick={() => speak(s.id, s.text)}
                className={`ml-auto px-2 py-0.5 border rounded ${
                  speakingId === s.id
                    ? 'border-accent text-accent bg-accent/10 font-bold'
                    : 'border-border/60 hover:border-accent/40 hover:text-accent'
                }`}
                title="브라우저 음성으로 미리듣기 (분량·리듬 확인용)"
              >{speakingId === s.id ? '■ 정지' : '▶ 듣기'}</button>
              <button onClick={() => remove(i)}
                className="px-1.5 py-0.5 border border-red-400/40 text-red-500 rounded hover:bg-red-500/10" title="섹션 삭제">삭제</button>
            </div>

            {/* 본문 텍스트 — 쇼츠·롱폼과 동일한 EditableText. 구절 선택으로 이미지 앵커를 잡는다(픽업·하이라이트 공용). */}
            <EditableText
              value={s.text}
              onCommit={(v, prev) => ops.commitTextWithAnchors(i, v, prev)}
              pickMode={picking}
              onPick={sel => confirmAnchor(i, sel)}
              onAddAnchor={sel => confirmAnchor(i, sel)}
              highlights={imgs.map(img => img.text).filter((t): t is string => !!t)}
            />

            {/* 인용 출처 */}
            {isQuote && (
              <input
                value={s.quoteSource ?? ''}
                onChange={e => patch(i, { quoteSource: e.target.value })}
                placeholder="인용 출처 (예: 손자병법 모공편)"
                className="w-full rounded border border-border/60 bg-bg-card px-2 py-1 text-[12px] focus:border-accent/50 outline-none"
              />
            )}

            {/* 이미지 — 쇼츠·롱폼과 동일한 InlineImageRow(드롭·앵커 픽업·썸네일·교체). 끌어다 놓으면 빈 슬롯부터 채운다. */}
            <div className="rounded border border-border/50 bg-bg-card/60 p-2 space-y-1">
              <div className="text-[11px] font-bold text-text-secondary">
                이미지 <span className="opacity-60 font-normal">· 본문이 흐르며 이미지가 바뀝니다. 끌어다 놓고, 본문 구절을 선택해 전환 시점을 잡으세요</span>
              </div>
              {imgs.length > 0 ? (
                <InlineImageRow
                  images={imgs}
                  allImages={imgs}
                  imageBaseUrl={imageBaseUrl}
                  itemIdx={i}
                  picking={picking}
                  anchorPick={anchorPick}
                  onReplace={ops.replaceImage}
                  onRemove={ops.removeImage}
                  onRemoveFileOnly={ops.removeImageOnly}
                  onStartPick={gi => setAnchorPick({ itemIdx: i, imgIdx: gi, draft: null })}
                  onCancelPick={() => setAnchorPick(null)}
                />
              ) : (
                <div className="flex items-center justify-center h-14 rounded border border-dashed border-border/60 text-[10px] text-text-secondary">
                  오른쪽 갤러리에서 끌어다 놓기
                </div>
              )}
            </div>

            {/* 음성 제어판 — 쇼츠·롱폼과 동일(재생·엔진 표시·편집기 열기). 본문이 있어야 음성을 만든다. */}
            {segKey && vi ? (
              <div className="flex items-center gap-2 rounded border border-border/60 bg-bg-card px-2 py-1.5">
                <FieldAudioControls
                  sectionKey={segKey}
                  fallbackDuration={vi.duration ?? 0}
                  isPlaying={playingKey === segKey}
                  onTogglePlay={() => onTogglePlay(segKey)}
                />
                <span className="ml-1 text-[11px] font-mono text-text-secondary whitespace-nowrap">{segKey.split('/').pop()}</span>
                {eng && vi.exists && (
                  <span className={`text-[10px] font-mono font-bold whitespace-nowrap px-1.5 py-0.5 rounded border border-slate-400 bg-bg-secondary ${ENGINE_COLORS[eng] ?? 'text-text-secondary'}`}>
                    {ENGINE_LABELS[eng] ?? ''}
                  </span>
                )}
                {!vi.exists && (
                  <span className="text-[10px] font-bold text-red-700 whitespace-nowrap px-1.5 py-0.5 bg-red-100 border border-red-400 rounded">미생성</span>
                )}
                {cps != null && (
                  <span
                    className="text-[10px] font-mono font-bold whitespace-nowrap px-1.5 py-0.5 rounded border border-border/60 bg-bg-secondary text-text-secondary"
                    title={`본문 ${charCount}자 ÷ ${vi.duration?.toFixed(1)}초`}
                  >
                    {cps.toFixed(1)}자/초
                  </span>
                )}
                <button
                  onClick={() => setExpandedKey(segKey)}
                  className="px-2.5 py-1 rounded bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-black whitespace-nowrap"
                  title="음성 생성·편집기 열기"
                >편집기 열기</button>
              </div>
            ) : (
              <div className="text-[11px] text-text-secondary italic px-1">본문을 입력하면 음성을 만들 수 있습니다.</div>
            )}
          </div>
        )
      })}

      {/* 섹션 추가 */}
      <button
        onClick={add}
        className="w-full py-2 text-[12px] font-bold rounded border border-dashed border-border/70 text-text-secondary hover:border-accent/50 hover:text-accent"
      >+ 섹션 추가</button>
        </div>

        {/* 우측: 이미지 풀 — 쇼츠·롱폼과 동일. 끌어다 놓으면 섹션에 배치된다. */}
        <ImagePool
          allImages={folderImages}
          usedFiles={usedFiles}
          fileBookMap={EMPTY_FILE_BOOK_MAP}
          fileFieldMap={EMPTY_FILE_FIELD_MAP}
          view="solo"
          imageBaseUrl={imageBaseUrl}
          onDrop={fn => { if (sections.length) ops.dropImage(Math.min(activeIdx, sections.length - 1), fn) }}
          onDelete={async fn => {
            await fetch(`${imageBaseUrl}/${fn}`, { method: 'DELETE' })
            // 삭제된 파일을 가리키던 섹션 참조를 비운다 — 풀 키(basename)로 매칭.
            const base = (p: string) => (p.split('/').pop() ?? p)
            const tgt = base(fn)
            setSections(prev => prev.map(s => ({
              ...s,
              image: s.image && base(s.image) === tgt ? undefined : s.image,
              imageChangeAt: s.imageChangeAt?.map(c => (c.image && base(c.image) === tgt ? { ...c, image: '' } : c)),
            })))
            refreshFolderImages()
          }}
          onOpenFolder={() => fetch(`/api/${series}/images/${name}`, { method: 'POST' })}
          onOpenFolderPath={folder => fetch(`/api/${series}/images/${name}/${folder}`, { method: 'POST' })}
          onRefresh={refreshFolderImages}
          subFolders={subFolders}
          fileFolders={fileFolders}
          duplicates={duplicates}
          onMoveFile={moveFileToFolder}
          onCreateFolder={createFolder}
          onRenameFolder={renameFolder}
          onDeleteFolder={deleteFolder}
        />
      </div>

      {/* 음성 편집 모달 — 쇼츠와 동일한 ExpandedVoicePanel 재사용. 솔로 본문을 합성 원문으로 주입한다. */}
      <VoiceEditorModal
        openKey={expandedKey}
        onClose={() => setExpandedKey(null)}
        renderExpanded={(key, mode) => (
          <ExpandedVoicePanel
            sectionKey={key}
            section={sectionMap.get(key) ?? { key, description: '' }}
            episode={episode}
            series={series}
            name={name}
            voiceId={(episode.host as { elevenlabsVoiceId?: string } | undefined)?.elevenlabsVoiceId}
            eleSettings={eleSettings}
            eleSendOpts={eleSendOpts}
            onEleSendOptsChange={onEleSendOptsChange}
            activeEngine={activeEngine(key)}
            onEpisodeChange={onEpisodeChange}
            onSave={onSave}
            onRefresh={onRefreshFiles}
            expandMode={mode}
            overrideText={expandedText}
            voiceOverride={voiceOverride}
          />
        )}
      />

      {/* 전역 플로팅 저장 — 스크롤 위치와 무관하게 항시 노출. 저장할 변경이 없으면 회색 「저장됨」. */}
      <button
        onClick={save}
        disabled={saving || !dirty}
        className="fixed bottom-6 right-6 z-50 px-5 py-2.5 rounded-full text-white text-sm font-bold shadow-lg transition-all bg-emerald-500 hover:bg-emerald-400 shadow-emerald-500/30 disabled:bg-slate-400 disabled:shadow-none disabled:cursor-default"
      >
        {saving ? '저장 중…' : dirty ? '솔로 저장' : '저장됨'}
      </button>
    </div>
  )
}
