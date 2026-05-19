'use client'

import { Fragment, useMemo, useState } from 'react'
import { useEpisode } from '@/lib/episode-context'
import type { VoiceSection } from '../../../voice-utils'
import type { EpisodeData } from '../../../EpisodeEditor'
import type { ImageEditorProps } from '../../types'
import { AddFieldButton } from '../../ScenarioRow'
import { ImagePool } from '../../ImagePool'
import { ShortsCopyButton } from '../CopyButton'
import { RevealBgSlot } from '../RevealBgSlot'
import { SegmentInsertBar } from './SegmentInsertBar'
import { SegmentRow } from './SegmentRow'
import { SegmentTimingPanel } from './SegmentTimingPanel'
import { useShortsState } from './useShortsState'
import { useSfxFiles } from '../../useSfxFiles'
import { AnchorConfirmBanner } from '../../AnchorConfirmBanner'
import { callRenameApi, segmentIdRename, segmentReorderRenames } from '../../voiceRename'

/* ── 쇼츠 ── */
export function ShortsView({ episode, shortsIndex, sectionMap, onUpdate, onToggleExpand, activeEngine, playingKey, onTogglePlay,
  anchorPick, setAnchorPick, imageBaseUrl, folderImages, usedFiles, fileBookMap, fileFieldMap, view, refreshFolderImages, getImages,
  removeImage, removeImageOnly, replaceImage, addAnchor, dropImage, handlePick, confirmAnchor, crossUsage,
  subFolders, fileFolders, duplicates, moveFileToFolder, createFolder, renameFolder, deleteFolder,
  assignedFiles }: {
  episode: EpisodeData; shortsIndex: number; sectionMap: Map<string, VoiceSection>
  onUpdate: (ep: EpisodeData) => void
  onToggleExpand: (key: string) => void
  activeEngine: (key: string) => string; playingKey: string | null; onTogglePlay: (key: string, gainDb?: number | null) => void
  assignedFiles: Set<string>
} & ImageEditorProps) {
  const { series, name } = useEpisode()
  const state = useShortsState(episode, shortsIndex, onUpdate, series, name)
  const { files: sfxFiles, basePath: sfxBase } = useSfxFiles(series, name)

  const { currentShorts, segments, speakers } = state
  // ── DND 상태 — fromIdx: 드래그 시작 위치 / overIdx: 현재 hover 위치
  const [dragFromIdx, setDragFromIdx] = useState<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)
  if (!currentShorts) return null

  const speakerById = useMemo(() => new Map(speakers.map(s => [s.id, s])), [speakers])
  const revealBg = currentShorts.revealBg ?? null
  const firstBookIdx = segments.findIndex((s: any) => s?.visual === 'book')
  const splitIdx = firstBookIdx >= 0 ? firstBookIdx : segments.length

  // 구간 식별자 변경 — JSON 갱신 + wav/타이밍/voice-select 일괄 rename
  const renameSegId = async (idx: number, oldId: string, newId: string) => {
    if (segments.some((s: any, j: number) => j !== idx && s?.id === newId)) {
      alert(`이미 같은 ID 의 구간이 있다: ${newId}`)
      return
    }
    state.updateSegField(idx, 'id', newId)
    const pair = segmentIdRename(shortsIndex, idx, oldId, newId)
    const { errors } = await callRenameApi(series, name, [pair])
    if (errors.length) console.warn('rename 일부 실패:', errors)
  }

  // 구간 순서 재배치 — moveSegment + 변경된 모든 prefix wav rename
  const reorderSegments = async (fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0) return
    // 새 순서 계산: fromIdx 를 toIdx 자리로 이동했을 때의 옛 idx 배열
    const newOrder = segments.map((_, i: number) => i)
    const [moved] = newOrder.splice(fromIdx, 1)
    newOrder.splice(toIdx, 0, moved)
    const renames = segmentReorderRenames(shortsIndex, newOrder, segments)
    state.moveSegment(fromIdx, toIdx)
    const { errors } = await callRenameApi(series, name, renames)
    if (errors.length) console.warn('reorder rename 일부 실패:', errors)
  }

  const dragPropsFor = (i: number) => ({
    draggable: true,
    onDragStart: (e: React.DragEvent) => {
      setDragFromIdx(i)
      e.dataTransfer.effectAllowed = 'move'
      e.dataTransfer.setData('text/plain', `seg:${i}`)
    },
    onDragOver: (e: React.DragEvent) => {
      if (dragFromIdx === null) return
      // 이미지 풀에서 끌어온 파일 드롭과 구분 — 우리 페이로드일 때만 accept
      const types = Array.from(e.dataTransfer.types)
      if (!types.includes('text/plain')) return
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      setDragOverIdx(i)
    },
    onDragLeave: () => {
      if (dragOverIdx === i) setDragOverIdx(null)
    },
    onDrop: (e: React.DragEvent) => {
      const data = e.dataTransfer.getData('text/plain')
      if (!data.startsWith('seg:')) return
      e.preventDefault()
      const from = parseInt(data.slice(4), 10)
      if (Number.isFinite(from) && from !== i) {
        void reorderSegments(from, i)
      }
      setDragFromIdx(null)
      setDragOverIdx(null)
    },
    onDragEnd: () => { setDragFromIdx(null); setDragOverIdx(null) },
    isDragging: dragFromIdx === i,
    isOver: dragOverIdx === i && dragFromIdx !== null && dragFromIdx !== i,
  })

  const totalChars = segments.reduce((sum: number, s: any) => sum + (typeof s?.text === 'string' ? s.text.length : 0), 0)
  const totalNoSpace = segments.reduce((sum: number, s: any) => sum + (typeof s?.text === 'string' ? s.text.replace(/\s/g, '').length : 0), 0)

  const celebName = episode.host?.nickname ?? ''
  const featuredIdx = (currentShorts as { featuredBookIndex?: number })?.featuredBookIndex ?? 0
  const bookTitle = episode.books?.[featuredIdx]?.title ?? ''
  const shortsName = bookTitle ? `${celebName}의 한 권, ${bookTitle}` : celebName

  const rowProps = {
    shortsIndex, series, name,
    sectionMap, speakers, speakerById,
    anchorPick, imageBaseUrl, crossUsage,
    getImages, replaceImage, removeImage, removeImageOnly, setAnchorPick,
    dropImage, addAnchor, handlePick,
    activeEngine, playingKey, onTogglePlay, onToggleExpand,
    updateSeg: state.updateSeg,
    updateSegField: state.updateSegField,
    updateSegFieldKeepFalse: state.updateSegFieldKeepFalse,
    removeSegment: state.removeSegment,
    saveSegment: state.saveSegment,
    sfxFiles, sfxBase,
    renameSegId,
  }

  return (
    <div className="flex gap-0">
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-text-secondary tabular-nums">
            글자 수 <span className="text-text-primary font-semibold">{totalChars.toLocaleString()}</span>
            <span className="opacity-60"> (공백 제외 {totalNoSpace.toLocaleString()})</span>
            <span className="opacity-60"> · 구간 {segments.length}</span>
          </span>
          <ShortsCopyButton segments={segments} shortsName={shortsName} />
        </div>

        <SegmentTimingPanel
          segments={segments}
          hasBgm={!!(currentShorts as { bgm?: unknown[] })?.bgm?.length}
          logoDurationSec={(currentShorts as { logoDurationSec?: number })?.logoDurationSec}
          onChangeLogoDurationSec={state.setLogoDurationSec}
        />

        {/* 앵커 확정 배너 — hook/intro/celeb-mid/book 모든 구간 공통 */}
        <AnchorConfirmBanner
          anchorPick={anchorPick}
          onConfirm={confirmAnchor}
          onCancel={() => setAnchorPick(null)}
        />

        {/* 인트로 구간 — splitIdx 이전 (hook, intro, 초반 celeb 등).
            우측 이미지 풀이 따로 있으므로 폭 제한을 두지 않는다. */}
        <div>
          {segments.map((seg: any, i: number) => {
            if (i >= splitIdx) return null
            return (
              <Fragment key={`intro-${i}`}>
                <SegmentInsertBar atIdx={i} onInsert={state.insertSegmentAt} />
                <SegmentRow seg={seg} idx={i} withImage={true} {...rowProps} dragHandleProps={dragPropsFor(i)} />
              </Fragment>
            )
          })}

          {/* revealBg — 인트로 구간 기본 배경 (구간별 이미지가 없을 때 표시) */}
          <RevealBgSlot
            fileName={revealBg}
            imageBaseUrl={imageBaseUrl}
            onDrop={fn => state.setRevealBg(fn, assignedFiles)}
            onRemove={state.removeRevealBg}
          />
        </div>

        <hr className="border-border my-4" />

        {/* 책 구간 — splitIdx 이후 (book + 책 구간 내 celeb) */}
        <div className="space-y-1">
          {segments.map((seg: any, i: number) => {
            if (i < splitIdx) return null
            const withImage = seg.visual === 'book' || seg.role === 'celeb'
            return (
              <Fragment key={`book-${i}`}>
                <SegmentInsertBar atIdx={i} onInsert={state.insertSegmentAt} />
                <SegmentRow seg={seg} idx={i} withImage={withImage} {...rowProps} dragHandleProps={dragPropsFor(i)} />
              </Fragment>
            )
          })}
          <div className="flex items-center gap-3 pt-2">
            <AddFieldButton label="+ 인용 추가" onClick={() => state.insertSegmentAt(segments.length, 'quote')} />
            <AddFieldButton label="+ 맥락 추가" onClick={() => state.insertSegmentAt(segments.length, 'context')} />
          </div>
        </div>
      </div>

      <ImagePool allImages={folderImages} usedFiles={usedFiles} fileBookMap={fileBookMap} fileFieldMap={fileFieldMap} view={view} imageBaseUrl={imageBaseUrl}
        bookTitles={(episode.books ?? []).map((b: any) => b?.title ?? '')}
        onDelete={async fn => {
          await fetch(`/api/${series}/images/${name}/${fn}`, { method: 'DELETE' })
          refreshFolderImages()
        }}
        onOpenFolder={() => fetch(`/api/${series}/images/${name}`, { method: 'POST' })}
        onOpenFolderPath={folder => fetch(`/api/${series}/images/${name}/${folder}`, { method: 'POST' })}
        onRefresh={refreshFolderImages}
        crossUsage={crossUsage}
        subFolders={subFolders} fileFolders={fileFolders} duplicates={duplicates}
        onMoveFile={moveFileToFolder} onCreateFolder={createFolder} onRenameFolder={renameFolder} onDeleteFolder={deleteFolder} />
    </div>
  )
}
