'use client'

import { useEffect, useState } from 'react'
import { ScenarioRow } from '../../ScenarioRow'
import { SaveButton } from '../../SaveButton'
import { InlineImageRow } from '../../ImageThumb'
import { SegmentToolbox } from './SegmentToolbox'
import { shortsKey, lookupVoice } from '../../utils'
import type { VoiceSection } from '@feelandnote/shared/bo/voice-utils'
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
      className="bg-transparent border-b border-transparent hover:border-border focus:border-accent text-sm font-bold font-mono px-1 py-0 w-32 outline-none"
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
  sfxFiles, sfxBase, renameSegId, dragHandleProps, totalSegments,
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
  onTogglePlay: (key: string, gainDb?: number | null, mediaRate?: number | null) => void
  onToggleExpand: (key: string) => void
  updateSeg: (i: number, text: string, prev?: string) => void
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
  /** 전체 세그먼트 수 — 번호 표기 n/m 의 m. */
  totalSegments?: number
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

  const isDisabled = seg.disabled === true

  // 타이틀바 좌측에 들어가는 라벨 — n/m 번호 + 식별자(편집기) + 제외 배지
  const labelNode = (
    <span className="flex items-center gap-1.5 leading-none">
      <span className="text-sm font-bold text-text-secondary tabular-nums">{idx + 1}/{totalSegments ?? '?'}</span>
      {renameSegId ? (
        <SegIdEditor value={seg.id} onCommit={next => renameSegId(idx, seg.id, next)} />
      ) : (
        <span className="text-sm font-bold font-mono text-text-primary">{seg.id}</span>
      )}
      {isDisabled && (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-500/30 text-slate-300 text-[10px] font-black leading-none border border-slate-400/40">
          영상 제외
        </span>
      )}
    </span>
  )

  // 타이틀바 우측 액션 — 영상 포함/제외 토글 + 저장(emerald) + 삭제(red)
  const actionsNode = (
    <>
      <button
        type="button"
        onClick={() => updateSegField(idx, 'disabled', isDisabled ? undefined : true)}
        title={isDisabled
          ? '지금은 영상에서 빠져 있다. 눌러서 다시 영상에 포함한다.'
          : '이 구간을 영상에서 잠시 뺀다. 음성·내용은 그대로 보존되어 언제든 되살릴 수 있다.'}
        className={`inline-flex items-center px-2 py-0.5 rounded border text-sm font-bold leading-none cursor-pointer ${
          isDisabled
            ? 'border-emerald-600/50 text-emerald-400/90 bg-transparent hover:bg-emerald-500/10 hover:border-emerald-400 hover:text-emerald-200'
            : 'border-slate-500/50 text-slate-400 bg-transparent hover:bg-slate-500/10 hover:border-slate-300 hover:text-slate-200'
        }`}
      >{isDisabled ? '영상에 넣기' : '영상에서 빼기'}</button>
      <SaveButton onSave={() => saveSegment(idx)} title="이 구간만 저장 (디스크 최신 상태와 머지)" />
      <button
        type="button"
        onClick={() => removeSegment(idx)}
        title="이 구간 삭제"
        className="inline-flex items-center px-2 py-0.5 rounded border border-red-600/50 text-red-400/90 bg-transparent hover:bg-red-500/10 hover:border-red-400 hover:text-red-200 text-sm font-bold font-medium leading-none cursor-pointer"
      >삭제</button>
    </>
  )

  // 본문 아래 footer — 세그먼트 도구모음(옵션바·출처·SFX·음량)
  const footerNode = (
    <SegmentToolbox
      seg={seg}
      idx={idx}
      shortsIndex={shortsIndex}
      speakers={speakers}
      updateSegField={updateSegField}
      updateSegFieldKeepFalse={updateSegFieldKeepFalse}
      sfxFiles={sfxFiles}
      sfxBase={sfxBase}
      sectionKey={key}
    />
  )

  const row = (
    <ScenarioRow
      label={labelNode} role={seg.role} value={seg.text} live={withImage}
      voiceInfo={voiceInfo} onCommit={(v, prev) => updateSeg(idx, v, prev)}
      pickMode={picking} onPick={handlePick}
      highlights={allImgs.map((img: any) => img.text).filter((t: string | undefined): t is string => !!t)}
      sectionKey={key} audioUrl={audioUrl}
      activeEngine={activeEngine(key)} isPlaying={playingKey === key} onTogglePlay={() => onTogglePlay(key, seg.gainDb, seg.playbackRate)}
      onToggleExpand={() => onToggleExpand(key)}
      onDrop={withImage ? (fn => dropImage(idx, fn)) : undefined}
      onAddAnchor={withImage ? (t => addAnchor(idx, t)) : undefined}
      images={imgNode}
      actions={actionsNode}
      dragHandle={dragHandleProps}
      leadStyle={accentColor ? { borderLeft: `3px solid ${accentColor}` } : undefined}
      footer={footerNode}
      playbackRate={typeof seg.playbackRate === 'number' ? seg.playbackRate : undefined}
    />
  )

  // 영상 제외 구간은 흐리게 — 편집은 그대로 가능하되 영상에 안 들어감을 한눈에 보이게.
  return isDisabled ? <div className="opacity-45 saturate-50">{row}</div> : row
}
