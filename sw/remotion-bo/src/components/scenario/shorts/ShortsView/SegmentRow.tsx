'use client'

import { useEffect, useState } from 'react'
import { ScenarioRow } from '../../ScenarioRow'
import { SaveButton } from '../../SaveButton'
import { InlineImageRow } from '../../ImageThumb'
import { SegmentSfxEditor } from '../../SegmentSfxEditor'
import { SegmentOptionsBar } from './SegmentOptionsBar'
import { GainDbInput } from '../../GainDbInput'
import { shortsKey, lookupVoice } from '../../utils'
import type { VoiceSection } from '../../../voice-utils'
import type { Speaker } from '../../SpeakerPanel'

/** 구간 식별자 인라인 편집기. blur 또는 Enter 시 onCommit 호출. */
function SegIdEditor({ value, onCommit }: { value: string; onCommit: (next: string) => void }) {
  const [draft, setDraft] = useState(value)
  useEffect(() => { setDraft(value) }, [value])
  const commit = () => {
    const next = draft.trim()
    if (!next || next === value) { setDraft(value); return }
    onCommit(next)
  }
  return (
    <input
      type="text"
      value={draft}
      onChange={e => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
      onClick={e => e.stopPropagation()}
      placeholder="id"
      title="구간 ID — 음성 파일명 기준 식별자. 변경하면 wav 파일과 자막 타이밍 데이터가 함께 새 이름으로 이동한다."
      className="bg-transparent border-b border-transparent hover:border-border focus:border-accent text-[11px] font-mono px-1 py-0 w-32 outline-none"
    />
  )
}

/**
 * 단일 세그먼트 행 — 텍스트 행(ScenarioRow) + 옵션바 + SFX 편집기 + 삭제 버튼.
 *
 * withImage=false 면 인라인 이미지 영역을 렌더하지 않는다 (예: 인트로 hook).
 * 화자가 지정된 세그먼트는 좌측에 화자 색상 보더를 그어 시각 구분한다.
 */
export function SegmentRow({
  seg, idx, withImage,
  shortsIndex, series, name,
  sectionMap, speakers, speakerById,
  anchorPick, imageBaseUrl, crossUsage,
  getImages, replaceImage, removeImage, removeImageOnly, setAnchorPick,
  dropImage, addAnchor, handlePick,
  activeEngine, playingKey, onTogglePlay, onToggleExpand,
  updateSeg, updateSegField, updateSegFieldKeepFalse, removeSegment, saveSegment,
  sfxFiles, sfxBase, renameSegId, dragHandleProps,
}: {
  seg: any
  idx: number
  withImage: boolean
  shortsIndex: number
  series: string
  name: string
  sectionMap: Map<string, VoiceSection>
  speakers: Speaker[]
  speakerById: Map<string, Speaker>
  anchorPick: any
  imageBaseUrl: string
  crossUsage: Map<string, string[]> | undefined
  getImages: (i: number) => any[]
  replaceImage: any
  removeImage: any
  removeImageOnly: any
  setAnchorPick: any
  dropImage: (i: number, fn: string) => void
  addAnchor: (i: number, t: string) => void
  handlePick: any
  activeEngine: (key: string) => string
  playingKey: string | null
  onTogglePlay: (key: string, gainDb?: number | null) => void
  onToggleExpand: (key: string) => void
  updateSeg: (i: number, text: string) => void
  updateSegField: (i: number, field: string, value: any) => void
  updateSegFieldKeepFalse: (i: number, field: string, value: any) => void
  removeSegment: (i: number) => void
  saveSegment: (i: number) => Promise<void>
  sfxFiles: { name: string; duration: number | null }[]
  sfxBase: string
  /** 구간 식별자 변경 — ShortsView 가 wav 파일까지 함께 rename 처리. */
  renameSegId?: (idx: number, oldId: string, newId: string) => void | Promise<void>
  /** 드래그 핸들 영역에 적용할 핸들러·상태. ShortsView 가 DnD 컨테이너 역할. */
  dragHandleProps?: {
    draggable: boolean
    onDragStart: (e: React.DragEvent) => void
    onDragOver: (e: React.DragEvent) => void
    onDragLeave: (e: React.DragEvent) => void
    onDrop: (e: React.DragEvent) => void
    onDragEnd: (e: React.DragEvent) => void
    isDragging: boolean
    isOver: boolean
  }
}) {
  const key = shortsKey(idx, seg.id, shortsIndex)
  const voiceInfo = lookupVoice(sectionMap, key, seg.duration)
  const audioUrl = `/api/${series}/voice/play/${name}/${key}.wav`
  const allImgs = withImage ? getImages(idx) : []
  const picking = anchorPick?.itemIdx === idx

  const imgRowProps = {
    allImages: allImgs, imageBaseUrl, itemIdx: idx, picking, anchorPick,
    onReplace: replaceImage, onRemove: removeImage, onRemoveFileOnly: removeImageOnly,
    onStartPick: (gi: number) => setAnchorPick({ itemIdx: idx, imgIdx: gi, draft: null }),
    onCancelPick: () => setAnchorPick(null),
    crossUsage,
  }

  const imgNode = withImage && allImgs.length > 0
    ? <InlineImageRow images={allImgs} {...imgRowProps} />
    : null

  const speakerObj = seg.speaker ? speakerById.get(seg.speaker) : undefined
  const accentColor = speakerObj?.color

  const dragging = dragHandleProps?.isDragging
  const dropOver = dragHandleProps?.isOver
  const labelNode = (
    <span className="flex items-center gap-1 leading-tight">
      {dragHandleProps && (
        <span
          draggable={dragHandleProps.draggable}
          onDragStart={dragHandleProps.onDragStart}
          onDragEnd={dragHandleProps.onDragEnd}
          className="cursor-grab active:cursor-grabbing text-text-secondary/60 hover:text-accent select-none px-0.5"
          title="끌어서 구간 순서 바꾸기"
        >⋮⋮</span>
      )}
      <span className="text-[11px] text-text-secondary">#{idx + 1}</span>
      {renameSegId ? (
        <SegIdEditor value={seg.id} onCommit={next => renameSegId(idx, seg.id, next)} />
      ) : (
        <span className="text-[11px] font-mono">{seg.id}</span>
      )}
    </span>
  )

  return (
    <div
      key={seg.id}
      className={`relative group/del transition-opacity ${dragging ? 'opacity-50' : ''} ${dropOver ? 'ring-2 ring-accent/60 rounded' : ''}`}
      style={accentColor ? { borderLeft: `3px solid ${accentColor}`, paddingLeft: 6 } : undefined}
      onDragOver={dragHandleProps?.onDragOver}
      onDragLeave={dragHandleProps?.onDragLeave}
      onDrop={dragHandleProps?.onDrop}
    >
      <ScenarioRow
        label={labelNode} role={seg.role} value={seg.text}
        voiceInfo={voiceInfo} onCommit={v => updateSeg(idx, v)}
        pickMode={picking} onPick={handlePick}
        highlights={allImgs.map((img: any) => img.text).filter((t: string | undefined): t is string => !!t)}
        sectionKey={key} audioUrl={audioUrl}
        activeEngine={activeEngine(key)} isPlaying={playingKey === key} onTogglePlay={() => onTogglePlay(key, seg.gainDb)}
        onToggleExpand={() => onToggleExpand(key)}
        onDrop={withImage ? (fn => dropImage(idx, fn)) : undefined}
        onAddAnchor={withImage ? (t => addAnchor(idx, t)) : undefined}
        images={imgNode}
        actions={<SaveButton onSave={() => saveSegment(idx)} title="이 구간만 저장 (디스크 최신 상태와 머지)" />}
      />
      <SegmentOptionsBar
        seg={seg} idx={idx} shortsIndex={shortsIndex}
        speakers={speakers}
        updateSegField={updateSegField} updateSegFieldKeepFalse={updateSegFieldKeepFalse}
      />
      {seg.role === 'celeb' && (
        <div className="grid grid-cols-[100px_1fr] gap-2 pb-1">
          <div />
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-text-secondary/60">출처:</span>
            <input
              className="text-[11px] text-[#c8a46e]/90 bg-bg-card/60 border border-border/40 rounded px-1 py-0.5 focus:border-accent/60 focus:outline-none flex-1 max-w-[400px]"
              value={seg.quoteSource ?? ''}
              onChange={e => updateSegField(idx, 'quoteSource', e.target.value || undefined)}
              placeholder="(예: 인터뷰 제목·매체·연도)"
              title="셀럽 발화 출처 — 인터뷰·기사·서신 등"
            />
          </div>
        </div>
      )}
      <SegmentSfxEditor
        sfx={seg.sfx}
        files={sfxFiles}
        basePath={sfxBase}
        onChange={next => updateSegField(idx, 'sfx', next)}
      />
      <GainDbInput
        value={typeof seg.gainDb === 'number' ? seg.gainDb : undefined}
        onChange={next => updateSegField(idx, 'gainDb', next)}
        sectionKey={key}
      />
      <button
        onClick={() => removeSegment(idx)}
        className="absolute top-1 right-2 text-[11px] text-red-400 hover:text-red-300 opacity-0 group-hover/del:opacity-100 transition-opacity"
        title="이 구간 삭제"
      >삭제</button>
    </div>
  )
}
