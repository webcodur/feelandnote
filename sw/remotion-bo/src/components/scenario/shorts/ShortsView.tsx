'use client'

import React from 'react'
import { useEpisode } from '@/lib/episode-context'
import type { VoiceSection } from '../../voice-utils'
import type { EpisodeData } from '../../EpisodeEditor'
import type { ImageEditorProps } from '../types'
import { shortsKey, lookupVoice } from '../utils'
import { ScenarioRow, AddFieldButton } from '../ScenarioRow'
import { InlineImageRow } from '../ImageThumb'
import { ImagePool } from '../ImagePool'
import { ShortsCopyButton } from './CopyButton'
import { RevealBgSlot } from './RevealBgSlot'
import { SaveButton } from '../SaveButton'
import { GEMINI_VOICES_MALE, GEMINI_VOICES_FEMALE } from '../../scenario-voice/types'
import { SpeakerPanel, type Speaker } from './SpeakerPanel'
import { SegmentSfxEditor } from './SegmentSfxEditor'

/* ── 쇼츠 ── */
export function ShortsView({ episode, shortsIndex, sectionMap, onUpdate, expandedKey, onToggleExpand, renderExpanded, activeEngine, playingKey, onTogglePlay,
  anchorPick, setAnchorPick, imageBaseUrl, folderImages, usedFiles, fileBookMap, fileFieldMap, view, refreshFolderImages, getImages,
  removeImage, removeImageOnly, replaceImage, addAnchor, dropImage, handlePick, confirmAnchor, crossUsage,
  subFolders, fileFolders, duplicates, moveFileToFolder, createFolder, renameFolder, deleteFolder,
  assignedFiles }: {
  episode: EpisodeData; shortsIndex: number; sectionMap: Map<string, VoiceSection>
  onUpdate: (ep: EpisodeData) => void
  expandedKey: string | null; onToggleExpand: (key: string) => void; renderExpanded: (key: string) => React.ReactNode
  activeEngine: (key: string) => string; playingKey: string | null; onTogglePlay: (key: string) => void
  assignedFiles: Set<string>
} & ImageEditorProps) {
  const { series, name } = useEpisode()

  // soundeffect 폴더 파일 목록 — 모든 segment SFX 입력에 공유
  const [sfxFiles, setSfxFiles] = React.useState<{ name: string; duration: number | null }[]>([])
  const [sfxBase, setSfxBase] = React.useState<string>('')
  React.useEffect(() => {
    let cancelled = false
    fetch(`/api/${series}/soundeffect/${name}`)
      .then(r => r.json())
      .then(data => {
        if (cancelled) return
        if (data.error) return
        setSfxFiles(data.files ?? [])
        setSfxBase(data.basePath ?? '')
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [series, name])

  // shorts 배열 정규화. shortsIndex는 1-based.
  const shortsArr: any[] = Array.isArray(episode.shorts) ? episode.shorts : (episode.shorts ? [episode.shorts] : [])
  const currentShorts = shortsArr[shortsIndex - 1]
  if (!currentShorts) return null
  const { segments } = currentShorts as { segments: any[] }
  // 화자 카드 — 다중 화자 voiceId/색상 관리
  const speakers: Speaker[] = Array.isArray((currentShorts as { speakers?: Speaker[] }).speakers)
    ? (currentShorts as { speakers: Speaker[] }).speakers
    : []
  const speakerById = new Map(speakers.map(s => [s.id, s]))

  const writeShorts = (next: any) => {
    const arr = [...shortsArr]
    arr[shortsIndex - 1] = next  // 1-based → 배열 인덱스
    onUpdate({ ...episode, shorts: arr } as any)
  }

  const setSpeakers = (next: Speaker[]) => {
    if (next.length === 0) {
      const { speakers: _, ...rest } = currentShorts as { speakers?: Speaker[] } & Record<string, unknown>
      writeShorts({ ...rest, segments })
    } else {
      writeShorts({ ...currentShorts, speakers: next })
    }
  }

  const updateSeg = (i: number, text: string) => {
    const newSegs = [...segments]; newSegs[i] = { ...newSegs[i], text }
    writeShorts({ ...currentShorts, segments: newSegs })
  }

  // 구간 임의 필드 갱신 — undefined·false 전달 시 필드 제거 (JSON 깔끔하게 유지)
  const updateSegField = (i: number, field: string, value: any) => {
    const newSegs = [...segments]
    const { [field]: _, ...rest } = newSegs[i] ?? {}
    newSegs[i] = value === undefined || value === false ? rest : { ...newSegs[i], [field]: value }
    writeShorts({ ...currentShorts, segments: newSegs })
  }
  // false도 의미 있는 값으로 보존 (예: zoomIn=false → 강제 줌 OFF)
  const updateSegFieldKeepFalse = (i: number, field: string, value: any) => {
    const newSegs = [...segments]
    const { [field]: _, ...rest } = newSegs[i] ?? {}
    newSegs[i] = value === undefined ? rest : { ...newSegs[i], [field]: value }
    writeShorts({ ...currentShorts, segments: newSegs })
  }

  // 구간 단일 삭제 — hook/intro 같은 골격도 포함해서 일괄 허용 (실수 시 JSON에서 복구 가능)
  const removeSegment = (i: number) => {
    const seg = segments[i]
    if (!confirm(`#${i + 1} ${seg?.id ?? ''} 구간 삭제?`)) return
    writeShorts({ ...currentShorts, segments: segments.filter((_, j) => j !== i) })
  }

  // 구간 단일 저장 — 디스크의 최신 상태를 읽어 해당 id만 교체한다.
  // 다른 탭이 수정한 다른 구간·필드는 보존된다. overwrite 사고 방지용.
  const saveSegment = async (i: number) => {
    const seg = segments[i]
    if (!seg?.id) throw new Error('구간 id가 없어 저장할 수 없습니다')
    const res = await fetch(`/api/${series}/episodes/${name}/segment`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shortsIndex, segmentId: seg.id, segment: seg }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error ?? res.statusText)
    }
  }

  // 신규 구간를 atIdx 위치에 삽입. atIdx === segments.length 면 끝에 append.
  // visual은 삽입 위치 주변 맥락(인트로 구간인지 책 구간인지)을 보고 결정.
  const insertSegmentAt = (atIdx: number, kind: 'quote' | 'context') => {
    const firstBookIdx = segments.findIndex((s: any) => s?.visual === 'book')
    const inIntro = firstBookIdx < 0 ? true : atIdx <= firstBookIdx

    let newSeg: any
    if (kind === 'quote') {
      // id는 'celeb-' 접두사 필수 (ElevenLabs 라우팅 판별용). 기존 id와 충돌 방지.
      const celebCount = segments.filter((s: any) => s?.role === 'celeb').length
      const id = celebCount === 0 ? 'celeb-mid' : `celeb-${celebCount + 1}`
      newSeg = { id, role: 'celeb', text: '', visual: inIntro ? 'intro' : 'book' }
    } else {
      const ctxSegs = segments.filter((s: any) => typeof s?.id === 'string' && (s.id === 'book-context' || s.id.startsWith('book-context-')))
      let id: string
      if (ctxSegs.length === 0) {
        id = 'book-context'
      } else {
        const nums = ctxSegs.map((s: any) => {
          const m = s.id.match(/-(\d+)$/)
          return m ? parseInt(m[1], 10) : 1
        })
        id = `book-context-${Math.max(...nums) + 1}`
      }
      newSeg = { id, role: 'narrator', text: '', visual: inIntro ? 'intro' : 'book' }
    }

    const next = [...segments]
    next.splice(atIdx, 0, newSeg)
    writeShorts({ ...currentShorts, segments: next })
  }

  // 끝에 삽입 — 기존 하단 버튼 전용
  const appendSegment = (kind: 'quote' | 'context') => insertSegmentAt(segments.length, kind)
  const addQuoteSegment = () => appendSegment('quote')
  const addContextSegment = () => appendSegment('context')

  // 구간 사이 삽입 바 — 가로 전체 블록. 연한 배경 + 중앙 버튼. 호버 시 강조. 구분선(hr) 없음.
  const SegmentInsertBar = ({ atIdx }: { atIdx: number }) => (
    <div className="group/ins flex items-center justify-center gap-2 py-1 px-2 my-1 rounded bg-bg-card/30 hover:bg-accent/5 transition-colors">
      <span className="text-[10px] text-text-secondary/40 group-hover/ins:text-text-secondary/70 transition-colors select-none">여기에 추가</span>
      <button
        type="button" onClick={() => insertSegmentAt(atIdx, 'quote')}
        title="이 위치에 인용 구간 삽입"
        className="px-2 py-0.5 text-[10px] text-accent/80 border border-accent/40 rounded hover:bg-accent/10 hover:border-accent hover:text-accent cursor-pointer transition-colors"
      >+ 인용</button>
      <button
        type="button" onClick={() => insertSegmentAt(atIdx, 'context')}
        title="이 위치에 맥락 구간 삽입"
        className="px-2 py-0.5 text-[10px] text-accent/80 border border-accent/40 rounded hover:bg-accent/10 hover:border-accent hover:text-accent cursor-pointer transition-colors"
      >+ 맥락</button>
    </div>
  )

  const revealBg = currentShorts.revealBg ?? null
  const setRevealBg = (fileName: string) => {
    if (assignedFiles.has(fileName)) return
    writeShorts({ ...currentShorts, revealBg: fileName })
  }
  const removeRevealBg = () => {
    const { revealBg: _, ...rest } = currentShorts
    writeShorts({ ...rest, segments })
  }

  const renderSeg = (seg: any, i: number, withImage: boolean) => {
    const key = shortsKey(i, seg.id, shortsIndex)
    const voiceInfo = lookupVoice(sectionMap, key, seg.duration)
    const isExpanded = expandedKey === key
    const audioUrl = `/api/${series}/voice/play/${name}/${key}.wav`
    const allImgs = withImage ? getImages(i) : []
    const picking = anchorPick?.itemIdx === i

    const imgRowProps = {
      allImages: allImgs, imageBaseUrl, itemIdx: i, picking, anchorPick,
      onReplace: replaceImage, onRemove: removeImage, onRemoveFileOnly: removeImageOnly,
      onStartPick: (gi: number) => setAnchorPick({ itemIdx: i, imgIdx: gi, draft: null }),
      onCancelPick: () => setAnchorPick(null),
      crossUsage,
    }

    const imgNode = withImage && allImgs.length > 0
      ? <InlineImageRow images={allImgs} {...imgRowProps} />
      : null

    // 모든 옵션은 모든 세그먼트에서 동일하게 노출 (역할/유형 무관)
    const showOptions = true
    // 우상단 라디오: 'avatar' | 'book' | 'none'. undefined면 자동 처리 폴백.
    const topRight = seg.topRight as 'avatar' | 'book' | 'none' | undefined
    // 어둡게 강도: undefined(없음) | 'light'(살짝) | true(어둡게)
    const darken: 'none' | 'light' | 'heavy' = seg.darken === true ? 'heavy' : seg.darken === 'light' ? 'light' : 'none'
    // 줌인: false면 강제 OFF. 그 외(true/undefined)는 ON.
    const zoomOn = seg.zoomIn !== false
    // 텍스트 덮기 모드: undefined(자막) | true(중앙 풀스크린) | 'bottom'(하단 좌측정렬, 살짝 작게)
    const overlayMode: 'none' | 'full' | 'bottom' =
      seg.textOverlay === true ? 'full'
      : seg.textOverlay === 'bottom' ? 'bottom'
      : 'none'

    const speakerObj = seg.speaker ? speakerById.get(seg.speaker) : undefined
    const accentColor = speakerObj?.color

    return (
      <div
        key={seg.id}
        className="relative group/del"
        style={accentColor ? { borderLeft: `3px solid ${accentColor}`, paddingLeft: 6 } : undefined}
      >
        <ScenarioRow
          label={`#${i + 1} ${seg.id}`} role={seg.role} value={seg.text}
          voiceInfo={voiceInfo} onCommit={v => updateSeg(i, v)}
          pickMode={picking} onPick={handlePick}
          highlights={allImgs.map(img => img.text).filter((t): t is string => !!t)}
          sectionKey={key} audioUrl={audioUrl}
          activeEngine={activeEngine(key)} isPlaying={playingKey === key} onTogglePlay={() => onTogglePlay(key)}
          expanded={isExpanded} onToggleExpand={() => onToggleExpand(key)} renderExpanded={() => renderExpanded(key)}
          onDrop={withImage ? (fn => dropImage(i, fn)) : undefined}
          onAddAnchor={withImage ? (t => addAnchor(i, t)) : undefined}
          images={imgNode}
          actions={<SaveButton onSave={() => saveSegment(i)} title="이 구간만 저장 (디스크 최신 상태와 머지)" />}
        />
        {/* 옵션바 — ScenarioRow의 우측 1fr 영역(label 100px 컬럼 비움)에 가로로 펼친다. */}
        {showOptions && (
          <div className="grid grid-cols-[100px_1fr] gap-2 pb-1.5">
            <div />
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] px-2 py-1 rounded bg-bg-card/40 border border-border/30">
              {/* 우상단 라디오 */}
              <div className="flex items-center gap-1.5">
                <span className="text-text-secondary">우상단</span>
                {(['avatar', 'book', 'none'] as const).map(v => (
                  <label key={v} className="flex items-center gap-0.5 cursor-pointer">
                    <input
                      type="radio"
                      name={`tr-${shortsIndex}-${i}`}
                      checked={topRight === v}
                      onChange={() => updateSegField(i, 'topRight', v)}
                      className="cursor-pointer"
                    />
                    <span>{v === 'avatar' ? '얼굴' : v === 'book' ? '책' : '없음'}</span>
                  </label>
                ))}
                {topRight !== undefined && (
                  <button
                    type="button"
                    onClick={() => updateSegField(i, 'topRight', undefined)}
                    title="자동(미설정)으로 되돌리기"
                    className="text-text-secondary hover:text-red-400 px-0.5"
                  >×</button>
                )}
              </div>
              <div className="w-px h-4 bg-border/50" />
              {/* 어둡게 라디오: 없음 / 살짝 / 어둡게 */}
              <div className="flex items-center gap-1.5">
                <span className="text-text-secondary">어둡게</span>
                {([
                  { v: 'none' as const, label: '없음', stored: undefined },
                  { v: 'light' as const, label: '살짝', stored: 'light' },
                  { v: 'heavy' as const, label: '진하게', stored: true },
                ]).map(({ v, label, stored }) => (
                  <label key={v} className="flex items-center gap-0.5 cursor-pointer">
                    <input
                      type="radio"
                      name={`dk-${shortsIndex}-${i}`}
                      checked={darken === v}
                      onChange={() => updateSegField(i, 'darken', stored)}
                      className="cursor-pointer"
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
              <label
                title="배경 이미지에 켄번즈 줌(1.00→1.08) 적용. 체크 해제 시 고정 배경."
                className="flex items-center gap-1 cursor-pointer select-none"
              >
                <input
                  type="checkbox"
                  checked={zoomOn}
                  onChange={e => updateSegFieldKeepFalse(i, 'zoomIn', e.target.checked ? undefined : false)}
                  className="cursor-pointer"
                />
                <span>줌인</span>
              </label>
              {/* 텍스트 표시 모드 — 자막(기본) / 중앙 풀스크린 덮기 / 하단 좌측정렬(살짝 작게) */}
              <div className="flex items-center gap-1.5">
                <span className="text-text-secondary">텍스트</span>
                {([
                  { v: 'none' as const, label: '자막', stored: undefined },
                  { v: 'full' as const, label: '덮기', stored: true },
                  { v: 'bottom' as const, label: '하단', stored: 'bottom' },
                ]).map(({ v, label, stored }) => (
                  <label key={v} className="flex items-center gap-0.5 cursor-pointer">
                    <input
                      type="radio"
                      name={`tov-${shortsIndex}-${i}`}
                      checked={overlayMode === v}
                      onChange={() => updateSegField(i, 'textOverlay', stored)}
                      className="cursor-pointer"
                    />
                    <span title={
                      v === 'none' ? '하단 가운데 페이지 자막'
                      : v === 'full' ? '화면 중앙에 좌측정렬 큰 글씨로 본문을 덮어 표시'
                      : '화면 하단에 좌측정렬 큰 글씨(풀스크린보다 살짝 작게)로 본문 표시. 일반 자막은 숨김'
                    }>{label}</span>
                  </label>
                ))}
              </div>
              <div className="w-px h-4 bg-border/50" />
              {/* 다음 구간 전 추가 멈춤(초) — 자동 전환 갭에 더해진다. 마지막 이미지가 그 시간 동안 유지. */}
              <label
                className="flex items-center gap-1"
                title="이 구간이 끝나고 다음 구간으로 넘어가기 전 멈춤(초). 마지막 이미지가 그 시간 동안 유지되고, 다음 구간이 그만큼 늦게 시작된다."
              >
                <span className="text-text-secondary">멈춤</span>
                <input
                  type="number" step={0.1} min={0}
                  value={Number.isFinite(seg.gapAfter) ? String(seg.gapAfter) : ''}
                  onChange={e => {
                    const n = parseFloat(e.target.value)
                    updateSegField(i, 'gapAfter', Number.isFinite(n) && n > 0 ? n : undefined)
                  }}
                  placeholder="0"
                  className="bg-bg-card border border-border/40 rounded px-1 py-0.5 w-12 text-center"
                />
                <span className="text-text-dim">초</span>
              </label>
              <div className="w-px h-4 bg-border/50" />
              {/* 화자 선택 — speakers 배열에서 고름. 색상 칩 + 라벨 표시 */}
              <div className="flex items-center gap-1">
                {speakerObj && (
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-sm"
                    style={{ backgroundColor: speakerObj.color }}
                    title={speakerObj.label}
                  />
                )}
                <select
                  value={seg.speaker ?? ''}
                  onChange={e => updateSegField(i, 'speaker', e.target.value || undefined)}
                  title="화자 — 상단 화자 카드와 매칭되어 voiceId·색상 적용"
                  className="bg-bg-card border border-border/40 rounded px-1 py-0.5 cursor-pointer"
                >
                  <option value="">화자: 미지정</option>
                  {speakers.map(s => (
                    <option key={s.id} value={s.id}>{s.label} ({s.id})</option>
                  ))}
                </select>
              </div>
              {/* Gemini 캐릭터 보이스 + 스타일 prefix */}
              <select
                value={seg.geminiVoice ?? ''}
                onChange={e => updateSegField(i, 'geminiVoice', e.target.value || undefined)}
                title="Gemini 보이스 명시 — 지정 시 캐릭터 보이스로 강제 분기 (ElevenLabs 셀럽 차단 우회). 비우면 기본."
                className="bg-bg-card border border-border/40 rounded px-1 py-0.5 cursor-pointer"
              >
                <option value="">보이스: 기본</option>
                <optgroup label="남성">
                  {GEMINI_VOICES_MALE.map(v => <option key={v} value={v}>{v}</option>)}
                </optgroup>
                <optgroup label="여성">
                  {GEMINI_VOICES_FEMALE.map(v => <option key={v} value={v}>{v}</option>)}
                </optgroup>
              </select>
              <input
                type="text"
                value={seg.style ?? ''}
                onChange={e => updateSegField(i, 'style', e.target.value || undefined)}
                placeholder="스타일 prefix"
                title="발화 스타일 — Gemini TTS 앞에 붙어 어조 지시 (예: '낮고 간절하게 속삭이듯')"
                className="bg-bg-card border border-border/40 rounded px-1 py-0.5 w-[180px]"
              />
              <div className="w-px h-4 bg-border/50" />
              <label
                title="음성 보존 — TTS가 이 구간을 무조건 건드리지 않는다. 텍스트가 바뀌어도, 전체 재생성을 돌려도 보존됨. 마음에 든 결과를 잠궈두는 용도."
                className={`flex items-center gap-1 cursor-pointer select-none px-1.5 py-0.5 rounded ${seg.voiceLock ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={seg.voiceLock === true}
                  onChange={e => updateSegField(i, 'voiceLock', e.target.checked ? true : undefined)}
                  className="cursor-pointer"
                />
                <span>{seg.voiceLock ? '🔒 잠금' : '잠금'}</span>
              </label>
            </div>
          </div>
        )}
        <SegmentSfxEditor
          sfx={seg.sfx}
          files={sfxFiles}
          basePath={sfxBase}
          onChange={next => updateSegField(i, 'sfx', next)}
        />
        <button
          onClick={() => removeSegment(i)}
          className="absolute top-1 right-2 text-[10px] text-red-400 hover:text-red-300 opacity-0 group-hover/del:opacity-100 transition-opacity"
          title="이 구간 삭제"
        >삭제</button>
      </div>
    )
  }

  return (
    <div className="flex gap-0">
      <div className="flex-1 min-w-0 space-y-1">
        <SpeakerPanel speakers={speakers} onChange={setSpeakers} />
        <div className="flex items-center justify-between">
          {(() => {
            const totalChars = segments.reduce((sum: number, s: any) => sum + (typeof s?.text === 'string' ? s.text.length : 0), 0)
            const totalNoSpace = segments.reduce((sum: number, s: any) => sum + (typeof s?.text === 'string' ? s.text.replace(/\s/g, '').length : 0), 0)
            return (
              <span className="text-[11px] text-text-secondary tabular-nums">
                글자 수 <span className="text-text-primary font-semibold">{totalChars.toLocaleString()}</span>
                <span className="opacity-60"> (공백 제외 {totalNoSpace.toLocaleString()})</span>
                <span className="opacity-60"> · 구간 {segments.length}</span>
              </span>
            )
          })()}
          <ShortsCopyButton segments={segments} />
        </div>

        {/* 앵커 확정 배너 — hook/intro/celeb-mid/book 모든 구간 공통 */}
        {anchorPick?.draft && (
          <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-amber-500/10 border border-amber-500/30 text-[11px]">
            <span className="text-amber-400 font-semibold">#{anchorPick.imgIdx + 1}</span>
            <span className="text-text-primary truncate flex-1">&ldquo;{anchorPick.draft}&rdquo;</span>
            <button onClick={confirmAnchor} className="px-2 py-0.5 rounded bg-amber-500 text-black text-[10px] font-semibold hover:bg-amber-400 shrink-0">확정</button>
            <button onClick={() => setAnchorPick(null)} className="text-text-secondary hover:text-red-400 text-[10px]">취소</button>
          </div>
        )}

        {/*
          인트로/책 split은 첫 visual==='book' 인덱스 기준.
          celeb가 book 사이에 섞여도(예: narrator-celeb 알터네이션) 원래 순서대로 하단에 함께 렌더된다.
        */}
        {(() => {
          const firstBookIdx = segments.findIndex((s: any) => s?.visual === 'book')
          const splitIdx = firstBookIdx >= 0 ? firstBookIdx : segments.length

          return (
            <>
              {/* 인트로 구간 — splitIdx 이전 구간 (hook, intro, 초반 celeb 등) */}
              <div className="max-w-3xl">
                {segments.map((seg: any, i: number) => {
                  if (i >= splitIdx) return null
                  return (
                    <React.Fragment key={`intro-${i}`}>
                      <SegmentInsertBar atIdx={i} />
                      {renderSeg(seg, i, true)}
                    </React.Fragment>
                  )
                })}

                {/* revealBg — 인트로 구간 기본 배경 이미지 (구간별 이미지가 없을 때 표시) */}
                <RevealBgSlot
                  fileName={revealBg}
                  imageBaseUrl={imageBaseUrl}
                  onDrop={setRevealBg}
                  onRemove={removeRevealBg}
                />
              </div>

              {/* HR + 책 구간 — splitIdx 이후 구간 (book + 책 구간 내 celeb) */}
              <hr className="border-border my-4" />

              <div className="space-y-1">
                {segments.map((seg: any, i: number) => {
                  if (i < splitIdx) return null
                  return (
                    <React.Fragment key={`book-${i}`}>
                      <SegmentInsertBar atIdx={i} />
                      {renderSeg(seg, i, seg.visual === 'book' || seg.role === 'celeb')}
                    </React.Fragment>
                  )
                })}
                {/* 끝에 + 인용 / + 맥락 추가 */}
                <div className="flex items-center gap-3 pt-2">
                  <AddFieldButton label="+ 인용 추가" onClick={addQuoteSegment} />
                  <AddFieldButton label="+ 맥락 추가" onClick={addContextSegment} />
                </div>
              </div>
            </>
          )
        })()}
      </div>

      <ImagePool allImages={folderImages} usedFiles={usedFiles} fileBookMap={fileBookMap} fileFieldMap={fileFieldMap} view={view} imageBaseUrl={imageBaseUrl}
        bookTitles={(episode.books ?? []).map((b: any) => b?.title ?? '')}
        onDelete={async fn => {
          await fetch(`/api/${series}/images/${name}/${fn}`, { method: 'DELETE' })
          refreshFolderImages()
        }}
        onOpenFolder={() => fetch(`/api/${series}/images/${name}`, { method: 'POST' })}
        crossUsage={crossUsage}
        subFolders={subFolders} fileFolders={fileFolders} duplicates={duplicates}
        onMoveFile={moveFileToFolder} onCreateFolder={createFolder} onRenameFolder={renameFolder} onDeleteFolder={deleteFolder} />
    </div>
  )
}
