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

/* ── 쇼츠 ── */
export function ShortsView({ episode, shortsIndex, sectionMap, onUpdate, expandedKey, onToggleExpand, renderExpanded, activeEngine, playingKey, onTogglePlay,
  anchorPick, setAnchorPick, imageBaseUrl, unassigned, refreshFolderImages, getImages,
  removeImage, replaceImage, addAnchor, dropImage, handlePick, confirmAnchor, crossUsage,
  assignedFiles }: {
  episode: EpisodeData; shortsIndex: number; sectionMap: Map<string, VoiceSection>
  onUpdate: (ep: EpisodeData) => void
  expandedKey: string | null; onToggleExpand: (key: string) => void; renderExpanded: (key: string) => React.ReactNode
  activeEngine: (key: string) => string; playingKey: string | null; onTogglePlay: (key: string) => void
  assignedFiles: Set<string>
} & ImageEditorProps) {
  const { series, name } = useEpisode()

  // shorts 배열 정규화. shortsIndex는 1-based.
  const shortsArr: any[] = Array.isArray(episode.shorts) ? episode.shorts : (episode.shorts ? [episode.shorts] : [])
  const currentShorts = shortsArr[shortsIndex - 1]
  if (!currentShorts) return null
  const { segments } = currentShorts as { segments: any[] }

  const writeShorts = (next: any) => {
    const arr = [...shortsArr]
    arr[shortsIndex - 1] = next  // 1-based → 배열 인덱스
    onUpdate({ ...episode, shorts: arr } as any)
  }

  const updateSeg = (i: number, text: string) => {
    const newSegs = [...segments]; newSegs[i] = { ...newSegs[i], text }
    writeShorts({ ...currentShorts, segments: newSegs })
  }

  // 세그먼트 단일 삭제 — hook/intro/cta 같은 골격도 포함해서 일괄 허용 (실수 시 JSON에서 복구 가능)
  const removeSegment = (i: number) => {
    const seg = segments[i]
    if (!confirm(`#${i + 1} ${seg?.id ?? ''} 세그먼트 삭제?`)) return
    writeShorts({ ...currentShorts, segments: segments.filter((_, j) => j !== i) })
  }

  // cta 직전(없으면 끝)에 신규 세그먼트 삽입
  const insertBeforeCta = (newSeg: any) => {
    const ctaIdx = segments.findIndex((s: any) => s?.visual === 'cta')
    const next = [...segments]
    if (ctaIdx >= 0) next.splice(ctaIdx, 0, newSeg)
    else next.push(newSeg)
    writeShorts({ ...currentShorts, segments: next })
  }

  // 인용(celeb) 빠른 추가 — id는 'celeb-' 접두사 필수(ElevenLabs 라우팅 판별용)
  const addQuoteSegment = () => {
    const celebCount = segments.filter((s: any) => s?.role === 'celeb').length
    const id = celebCount === 0 ? 'celeb-mid' : `celeb-${celebCount + 1}`
    // 첫 인용은 intro 단계, 이후는 책 구간 안 인용으로 들어가는 관례
    const visual = celebCount === 0 ? 'intro' : 'book'
    insertBeforeCta({ id, role: 'celeb', text: '', visual })
  }
  // 맥락(book-context) 빠른 추가 — 기존 id 패턴 보존, 자동 리네임 없음
  const addContextSegment = () => {
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
    insertBeforeCta({ id, role: 'narrator', text: '', visual: 'book' })
  }

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
      onReplace: replaceImage, onRemove: removeImage,
      onStartPick: (gi: number) => setAnchorPick({ itemIdx: i, imgIdx: gi, draft: null }),
      onCancelPick: () => setAnchorPick(null),
    }

    const imgNode = withImage && allImgs.length > 0
      ? <InlineImageRow images={allImgs} {...imgRowProps} />
      : null

    return (
      <div key={seg.id} className="relative group/del">
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
        />
        <button
          onClick={() => removeSegment(i)}
          className="absolute top-1 right-2 text-[10px] text-red-400 hover:text-red-300 opacity-0 group-hover/del:opacity-100 transition-opacity"
          title="이 세그먼트 삭제"
        >삭제</button>
      </div>
    )
  }

  return (
    <div className="flex gap-0">
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex justify-end">
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

        {/* 인트로 구간 — hook, intro, celeb-mid (이미지 편집 가능) */}
        <div className="max-w-3xl">
          {segments.map((seg: any, i: number) => {
            if (seg.visual === 'book' || seg.visual === 'cta') return null
            return renderSeg(seg, i, true)
          })}

          {/* revealBg — 인트로 구간 기본 배경 이미지 (세그먼트별 이미지가 없을 때 표시) */}
          <RevealBgSlot
            fileName={revealBg}
            imageBaseUrl={imageBaseUrl}
            onDrop={setRevealBg}
            onRemove={removeRevealBg}
          />
        </div>

        {/* HR + 책 구간 */}
        <hr className="border-border my-4" />

        <div className="space-y-1">
          {segments.map((seg: any, i: number) => {
            if (seg.visual !== 'book' && seg.visual !== 'cta') return null
            // cta 직전 위치에 + 인용 / + 맥락 추가 버튼 노출
            if (seg.visual === 'cta') {
              return (
                <React.Fragment key={`cta-wrap-${i}`}>
                  <div className="flex items-center gap-3">
                    <AddFieldButton label="+ 인용 추가" onClick={addQuoteSegment} />
                    <AddFieldButton label="+ 맥락 추가" onClick={addContextSegment} />
                  </div>
                  {renderSeg(seg, i, false)}
                </React.Fragment>
              )
            }
            return renderSeg(seg, i, seg.visual === 'book')
          })}
          {/* cta가 없을 경우에도 추가 가능 */}
          {!segments.some((s: any) => s?.visual === 'cta') && (
            <div className="flex items-center gap-3">
              <AddFieldButton label="+ 인용 추가" onClick={addQuoteSegment} />
              <AddFieldButton label="+ 맥락 추가" onClick={addContextSegment} />
            </div>
          )}
        </div>
      </div>

      <ImagePool images={unassigned} imageBaseUrl={imageBaseUrl}
        onDelete={async fn => {
          await fetch(`/api/${series}/images/${name}/${fn}`, { method: 'DELETE' })
          refreshFolderImages()
        }}
        onOpenFolder={() => fetch(`/api/${series}/images/${name}`, { method: 'POST' })}
        crossUsage={crossUsage} />
    </div>
  )
}
