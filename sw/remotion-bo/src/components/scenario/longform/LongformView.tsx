'use client'

import React, { useState, useEffect } from 'react'
import { useEpisode } from '@/lib/episode-context'
import type { VoiceSection } from '../../voice-utils'
import type { EpisodeData } from '../../EpisodeEditor'
import type { CinematicImage, ImageEditorProps } from '../types'
import { bookKey, lookupVoice, matchImagesToField, unmatchedImages, distributeContextImages, locateImageSectionKey } from '../utils'
import { ScenarioRow, AddFieldButton } from '../ScenarioRow'
import { InlineImageRow } from '../ImageThumb'
import { ImagePool } from '../ImagePool'
import { BgmSelect } from './BgmSelect'
import { LongformCopyAllButton, BookCopyButton } from './CopyButton'
import { SaveButton } from '../SaveButton'

export function LongformView({ episode, sectionMap, onUpdate, expandedKey, onToggleExpand, renderExpanded, activeEngine, playingKey, onTogglePlay,
  anchorPick, setAnchorPick, imageBaseUrl, folderImages, usedFiles, fileBookMap, fileFieldMap, view, refreshFolderImages, getImages,
  removeImage, removeImageOnly, replaceImage, addAnchor, dropImage, handlePick, confirmAnchor, crossUsage,
  subFolders, fileFolders, duplicates, moveFileToFolder, createFolder, renameFolder, deleteFolder }: {
  episode: EpisodeData; sectionMap: Map<string, VoiceSection>
  onUpdate: (ep: EpisodeData) => void
  expandedKey: string | null; onToggleExpand: (key: string) => void; renderExpanded: (key: string) => React.ReactNode
  activeEngine: (key: string) => string; playingKey: string | null; onTogglePlay: (key: string) => void
} & ImageEditorProps) {
  const { series, name } = useEpisode()
  const narrator = episode.narrator!
  const host = episode.host!
  const books = episode.books ?? []

  const uN = (field: string, value: string) => onUpdate({ ...episode, narrator: { ...narrator, [field]: value } })
  const uH = (field: string, value: string) => onUpdate({ ...episode, host: { ...host, [field]: value } })
  const uB = (i: number, field: string, value: string) => {
    const newBooks = [...books]; newBooks[i] = { ...newBooks[i], [field]: value }; onUpdate({ ...episode, books: newBooks })
  }
  const updateQuotePair = (bookIdx: number, pairIdx: number, field: string, value: any) => {
    const newBooks = [...books]
    const book = { ...newBooks[bookIdx] }
    const pairs = [...((book as any).quotePairs ?? [])]
    if (value === undefined) {
      const { [field]: _, ...rest } = pairs[pairIdx] as any
      pairs[pairIdx] = rest
    } else {
      pairs[pairIdx] = { ...pairs[pairIdx], [field]: value }
    }
    ;(book as any).quotePairs = pairs
    newBooks[bookIdx] = book
    onUpdate({ ...episode, books: newBooks })
  }

  const addQuotePair = (bookIdx: number) => {
    const newBooks = [...books]
    const book = { ...newBooks[bookIdx] }
    ;(book as any).quotePairs = [...((book as any).quotePairs ?? []), { quote: '(인용문 입력)' }]
    newBooks[bookIdx] = book
    onUpdate({ ...episode, books: newBooks })
  }

  const removeQuotePair = (bookIdx: number, pairIdx: number) => {
    if (!confirm('직접 인용을 삭제합니다.')) return
    const newBooks = [...books]
    const book = { ...newBooks[bookIdx] }
    const pairs = [...((book as any).quotePairs ?? [])]
    pairs.splice(pairIdx, 1)
    ;(book as any).quotePairs = pairs.length ? pairs : undefined
    newBooks[bookIdx] = book
    onUpdate({ ...episode, books: newBooks })
  }

  const vi = (key: string, dur?: number) => lookupVoice(sectionMap, key, dur)
  const vUrl = (key: string) => `/api/${series}/voice/play/${name}/${key}.wav`

  /** 필드 단위 부분 저장 — 디스크 최신 상태에 해당 path만 교체 후 저장. 다른 탭 변경 보존. */
  const saveField = async (path: Array<string | number>, value: unknown) => {
    const res = await fetch(`/api/${series}/episodes/${name}/field`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, value }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error ?? res.statusText)
    }
  }

  const isPicking = (idx: number) => anchorPick?.itemIdx === idx

  // 음악 파일 목록 (BGM 드롭다운용)
  type MusicFile = { name: string; duration: number | null }
  const [musicFiles, setMusicFiles] = useState<MusicFile[]>([])
  const [musicBasePath, setMusicBasePath] = useState('')
  useEffect(() => {
    fetch(`/api/${series}/music/${name}`)
      .then(r => r.json())
      .then(d => { setMusicFiles(d.files ?? []); setMusicBasePath(d.basePath ?? '') })
      .catch(() => {})
  }, [series, name])

  /** 풀 이미지 → 배정된 섹션으로 스크롤. 책 아코디언도 열어준다. */
  const locateImage = (fileName: string) => {
    const bookIdx = fileBookMap.get(fileName)
    if (bookIdx === undefined) return
    const bookEl = document.getElementById(`book-${bookIdx}`) as HTMLDetailsElement | null
    if (bookEl && !bookEl.open) bookEl.open = true
    const sectionKey = locateImageSectionKey(fileName, books as any)
    // 아코디언 열리는 시간 잠깐 대기 후 스크롤
    requestAnimationFrame(() => {
      const target = sectionKey ? document.getElementById(`row-${sectionKey}`) : bookEl
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  const setBookBgm = (bookIdx: number, section: 'summary' | 'context', fileName: string | null) => {
    const newBooks = [...books] as any[]
    const book = { ...newBooks[bookIdx] }
    const bgm = { ...(book.bgm ?? {}) }
    if (fileName) {
      const meta = musicFiles.find(f => f.name === fileName)
      const trackDuration = meta?.duration != null ? Math.round(meta.duration * 100) / 100 : undefined
      bgm[section] = {
        file: `${musicBasePath}/${fileName}`,
        volume: 0.3,
        loop: true,
        ...(trackDuration != null ? { trackDuration } : {}),
      }
    } else {
      delete bgm[section]
    }
    book.bgm = Object.keys(bgm).length ? bgm : undefined
    newBooks[bookIdx] = book
    onUpdate({ ...episode, books: newBooks })
  }

  return (
    <div className="space-y-1">
      <div className="flex justify-end">
        <LongformCopyAllButton narrator={narrator} host={host} books={books} />
      </div>

      {/* 인트로 */}
      <div className="max-w-3xl">
        <ScenarioRow label="서비스 인사" role="narrator" value={narrator.serviceGreeting ?? ''} voiceInfo={vi('A1-service-greeting', narrator.serviceGreetingDuration)} onCommit={v => uN('serviceGreeting', v)} sectionKey="A1-service-greeting" audioUrl={vUrl('A1-service-greeting')} activeEngine={activeEngine('A1-service-greeting')} isPlaying={playingKey === 'A1-service-greeting'} onTogglePlay={() => onTogglePlay('A1-service-greeting')} expanded={expandedKey === 'A1-service-greeting'} onToggleExpand={() => onToggleExpand('A1-service-greeting')} renderExpanded={() => renderExpanded('A1-service-greeting')}
          actions={<SaveButton onSave={() => saveField(['narrator', 'serviceGreeting'], narrator.serviceGreeting ?? '')} />} />
        {narrator.serviceIntro && <ScenarioRow label="오늘의 인물" role="narrator" value={narrator.serviceIntro} voiceInfo={vi('A2-service-intro', narrator.serviceIntroDuration)} onCommit={v => uN('serviceIntro', v)} sectionKey="A2-service-intro" audioUrl={vUrl('A2-service-intro')} activeEngine={activeEngine('A2-service-intro')} isPlaying={playingKey === 'A2-service-intro'} onTogglePlay={() => onTogglePlay('A2-service-intro')} expanded={expandedKey === 'A2-service-intro'} onToggleExpand={() => onToggleExpand('A2-service-intro')} renderExpanded={() => renderExpanded('A2-service-intro')}
          actions={<SaveButton onSave={() => saveField(['narrator', 'serviceIntro'], narrator.serviceIntro)} />} />}
        {host.featuredQuote && <ScenarioRow label="대표 명언" role="celeb" value={host.featuredQuote} voiceInfo={vi('A3-featured-quote', host.featuredQuoteDuration)} onCommit={v => uH('featuredQuote', v)} sectionKey="A3-featured-quote" audioUrl={vUrl('A3-featured-quote')} activeEngine={activeEngine('A3-featured-quote')} isPlaying={playingKey === 'A3-featured-quote'} onTogglePlay={() => onTogglePlay('A3-featured-quote')} expanded={expandedKey === 'A3-featured-quote'} onToggleExpand={() => onToggleExpand('A3-featured-quote')} renderExpanded={() => renderExpanded('A3-featured-quote')}
          actions={<SaveButton onSave={() => saveField(['host', 'featuredQuote'], host.featuredQuote)} />} />}
        <ScenarioRow label="인물 소개" role="narrator" value={narrator.celebIntro ?? ''} voiceInfo={vi('B1-celeb-intro', narrator.celebIntroDuration)} onCommit={v => uN('celebIntro', v)} sectionKey="B1-celeb-intro" audioUrl={vUrl('B1-celeb-intro')} activeEngine={activeEngine('B1-celeb-intro')} isPlaying={playingKey === 'B1-celeb-intro'} onTogglePlay={() => onTogglePlay('B1-celeb-intro')} expanded={expandedKey === 'B1-celeb-intro'} onToggleExpand={() => onToggleExpand('B1-celeb-intro')} renderExpanded={() => renderExpanded('B1-celeb-intro')}
          actions={<SaveButton onSave={() => saveField(['narrator', 'celebIntro'], narrator.celebIntro ?? '')} />} />
        <ScenarioRow label="감상철학" role="celeb" value={host.philosophy ?? ''} voiceInfo={vi('B2-philosophy', host.voiceDuration)} onCommit={v => uH('philosophy', v)} sectionKey="B2-philosophy" audioUrl={vUrl('B2-philosophy')} activeEngine={activeEngine('B2-philosophy')} isPlaying={playingKey === 'B2-philosophy'} onTogglePlay={() => onTogglePlay('B2-philosophy')} expanded={expandedKey === 'B2-philosophy'} onToggleExpand={() => onToggleExpand('B2-philosophy')} renderExpanded={() => renderExpanded('B2-philosophy')}
          actions={<SaveButton onSave={() => saveField(['host', 'philosophy'], host.philosophy ?? '')} />} />
        {narrator.bridge && <ScenarioRow label="브릿지" role="narrator" value={narrator.bridge} voiceInfo={vi('B3-bridge', narrator.bridgeDuration)} onCommit={v => uN('bridge', v)} sectionKey="B3-bridge" audioUrl={vUrl('B3-bridge')} activeEngine={activeEngine('B3-bridge')} isPlaying={playingKey === 'B3-bridge'} onTogglePlay={() => onTogglePlay('B3-bridge')} expanded={expandedKey === 'B3-bridge'} onToggleExpand={() => onToggleExpand('B3-bridge')} renderExpanded={() => renderExpanded('B3-bridge')}
          actions={<SaveButton onSave={() => saveField(['narrator', 'bridge'], narrator.bridge)} />} />}
      </div>

      {/* HR + 책 섹션 + 미배정 풀 사이드바 */}
      <hr className="border-border my-4" />

      <div className="flex gap-0">
        {/* ── 좌: 책 목록 ── */}
        <div className="flex-1 min-w-0">
      {books.map((book: any, i: number) => {
        const picking = isPicking(i)
        const allImgs: CinematicImage[] = getImages(i)
        const imgsBase = matchImagesToField(allImgs, 'summary', book.summary ?? '', true)
        // context 이미지를 서브섹션별로 분배 (text 앵커가 속한 텍스트로 판별)
        const ctxBuckets = distributeContextImages(allImgs, book)
        const imgsCtxMain = ctxBuckets.main
        const allCtxTexts = [book.contextMain ?? '', ...((book.quotePairs ?? []) as any[]).flatMap((p: any) => [p.quote ?? '', p.after ?? ''])].join(' ')
        const fieldTexts = [book.summary ?? '', allCtxTexts]
        const imgsSummary = [...imgsBase, ...unmatchedImages(allImgs, fieldTexts)]

        const imgRowProps = { allImages: allImgs, imageBaseUrl, itemIdx: i, picking, anchorPick, onReplace: replaceImage, onRemove: removeImage, onRemoveFileOnly: removeImageOnly, onStartPick: (gi: number) => setAnchorPick({ itemIdx: i, imgIdx: gi, draft: null }), onCancelPick: () => setAnchorPick(null), crossUsage }

        return (
          <details
            key={i}
            id={`book-${i}`}
            open={picking || undefined}
            onToggle={picking ? (e: React.ToggleEvent<HTMLDetailsElement>) => { e.currentTarget.open = true } : undefined}
            className={`border rounded-lg overflow-hidden group my-3 ${picking ? 'border-amber-500/50' : 'border-border'}`}
          >
            <summary className={`bg-bg-card px-4 py-3 select-none hover:bg-bg-hover transition-colors list-none ${picking ? 'pointer-events-none' : 'cursor-pointer'}`}>
              <div className="flex items-baseline gap-2">
                <span className="text-accent font-mono text-xs">{i + 1}/{books.length}</span>
                <span className="font-semibold">{book.title}</span>
                <span className="text-text-secondary text-sm">— {book.creator}</span>
                {book.stats?.publishYear && <span className="text-text-secondary text-xs">{book.stats.publishYear}</span>}
                {allImgs.length > 0 && <span className="text-text-secondary text-[10px] ml-1">{allImgs.length}장</span>}
                <span className="ml-auto flex items-center gap-2">
                  <BookCopyButton book={book} index={i} total={books.length} />
                  <span className="text-text-secondary text-xs group-open:rotate-90 transition-transform">&#9654;</span>
                </span>
              </div>
            </summary>

            <div className="border-t border-border">
              <div className="p-4 space-y-0">
                {/* 앵커 확정 배너 */}
                {picking && anchorPick!.draft && (
                  <div className="flex items-center gap-2 mb-3 px-2 py-1.5 rounded bg-amber-500/10 border border-amber-500/30 text-[11px]">
                    <span className="text-amber-400 font-semibold">#{anchorPick!.imgIdx + 1}</span>
                    <span className="text-text-primary truncate flex-1">&ldquo;{anchorPick!.draft}&rdquo;</span>
                    <button onClick={confirmAnchor} className="px-2 py-0.5 rounded bg-amber-500 text-black text-[10px] font-semibold hover:bg-amber-400 shrink-0">확정</button>
                    <span className="text-text-secondary text-[10px]">또는 다시 드래그</span>
                    <button onClick={() => setAnchorPick(null)} className="text-text-secondary hover:text-red-400 text-[10px]">취소</button>
                  </div>
                )}

                <ScenarioRow label="제목 읽기" role="narrator" value={`${book.title}, ${book.creator}`}
                  voiceInfo={vi(bookKey(i, 'a-title'), book.titleDuration)} onCommit={() => {}}
                  sectionKey={bookKey(i, 'a-title')} audioUrl={vUrl(bookKey(i, 'a-title'))}
                  activeEngine={activeEngine(bookKey(i, 'a-title'))} isPlaying={playingKey === bookKey(i, 'a-title')} onTogglePlay={() => onTogglePlay(bookKey(i, 'a-title'))}
                  expanded={expandedKey === bookKey(i, 'a-title')} onToggleExpand={() => onToggleExpand(bookKey(i, 'a-title'))} renderExpanded={() => renderExpanded(bookKey(i, 'a-title'))}
                />

                <ScenarioRow label="핵심 요약" role="summary" value={book.summary}
                  voiceInfo={vi(bookKey(i, 'b-summary'), book.summaryDuration)}
                  onCommit={v => uB(i, 'summary', v)}
                  pickMode={picking} onPick={(t) => handlePick(t, 'summary')}
                  highlights={imgsSummary.map((img: CinematicImage) => img.text).filter((t: string | undefined): t is string => !!t)}
                  sectionKey={bookKey(i, 'b-summary')} audioUrl={vUrl(bookKey(i, 'b-summary'))}
                  activeEngine={activeEngine(bookKey(i, 'b-summary'))} isPlaying={playingKey === bookKey(i, 'b-summary')} onTogglePlay={() => onTogglePlay(bookKey(i, 'b-summary'))}
                  expanded={expandedKey === bookKey(i, 'b-summary')} onToggleExpand={() => onToggleExpand(bookKey(i, 'b-summary'))} renderExpanded={() => renderExpanded(bookKey(i, 'b-summary'))}
                  onDrop={fn => dropImage(i, fn, 'summary')} onAddAnchor={t => addAnchor(i, t, 'summary')}
                  images={<InlineImageRow images={imgsSummary} {...imgRowProps} />}
                  actions={<SaveButton onSave={() => saveField(['books', i, 'summary'], book.summary)} />}
                />
                {musicFiles.length > 0 && (
                  <BgmSelect label="요약 BGM" current={book.bgm?.summary?.file} files={musicFiles}
                    onSelect={f => setBookBgm(i, 'summary', f)} onRemove={() => setBookBgm(i, 'summary', null)} />
                )}

                <ScenarioRow label="감상 배경" role="narrator" value={book.contextMain}
                  voiceInfo={vi(bookKey(i, 'c-context'), book.contextDuration)}
                  onCommit={v => uB(i, 'contextMain', v)}
                  pickMode={picking} onPick={(t) => handlePick(t, 'context')}
                  highlights={imgsCtxMain.map((img: CinematicImage) => img.text).filter((t: string | undefined): t is string => !!t)}
                  sectionKey={bookKey(i, 'c-context')} audioUrl={vUrl(bookKey(i, 'c-context'))}
                  activeEngine={activeEngine(bookKey(i, 'c-context'))} isPlaying={playingKey === bookKey(i, 'c-context')} onTogglePlay={() => onTogglePlay(bookKey(i, 'c-context'))}
                  expanded={expandedKey === bookKey(i, 'c-context')} onToggleExpand={() => onToggleExpand(bookKey(i, 'c-context'))} renderExpanded={() => renderExpanded(bookKey(i, 'c-context'))}
                  onDrop={fn => dropImage(i, fn, 'context')} onAddAnchor={t => addAnchor(i, t, 'context')}
                  images={<InlineImageRow images={imgsCtxMain} {...imgRowProps} />}
                  actions={<SaveButton onSave={() => saveField(['books', i, 'contextMain'], book.contextMain)} />}
                />
                {musicFiles.length > 0 && (
                  <BgmSelect label="배경 BGM" current={book.bgm?.context?.file} files={musicFiles}
                    onSelect={f => setBookBgm(i, 'context', f)} onRemove={() => setBookBgm(i, 'context', null)} />
                )}

                {((book.quotePairs ?? []) as any[]).map((pair: any, pi: number) => {
                  const quoteKey = bookKey(i, `d${pi * 2 + 1}-quote`)
                  const afterKey = bookKey(i, `d${pi * 2 + 2}-after`)
                  const pairQuoteImgs = ctxBuckets.pairs[pi]?.quote ?? []
                  const pairAfterImgs = ctxBuckets.pairs[pi]?.after ?? []
                  return (
                    <React.Fragment key={`qp-${pi}`}>
                      {/* 직접 인용 */}
                      <div className="relative group/del">
                        <ScenarioRow label={`직접 인용${pi > 0 ? ` ${pi + 1}` : ''}`} role="celeb" value={pair.quote}
                          voiceInfo={vi(quoteKey, pair.quoteDuration)} onCommit={v => updateQuotePair(i, pi, 'quote', v)}
                          pickMode={picking} onPick={(t) => handlePick(t, 'quote')}
                          highlights={pairQuoteImgs.map((img: CinematicImage) => img.text).filter((t: string | undefined): t is string => !!t)}
                          sectionKey={quoteKey} audioUrl={vUrl(quoteKey)}
                          activeEngine={activeEngine(quoteKey)} isPlaying={playingKey === quoteKey} onTogglePlay={() => onTogglePlay(quoteKey)}
                          expanded={expandedKey === quoteKey} onToggleExpand={() => onToggleExpand(quoteKey)} renderExpanded={() => renderExpanded(quoteKey)}
                          onDrop={fn => dropImage(i, fn, 'quote')} onAddAnchor={t => addAnchor(i, t, 'quote')}
                          images={<InlineImageRow images={pairQuoteImgs} {...imgRowProps} />}
                          actions={<SaveButton onSave={() => saveField(['books', i, 'quotePairs', pi, 'quote'], pair.quote)} />}
                        />
                        {pair.quoteSource && (
                          <div className="ml-[72px] -mt-1 mb-1 flex items-center gap-1">
                            <span className="text-[10px] text-text-secondary/60">출처:</span>
                            <input className="text-[10px] text-[#c8a46e]/70 bg-transparent border-b border-border/30 focus:border-accent/50 outline-none px-0.5 flex-1 max-w-[400px]"
                              value={pair.quoteSource} onChange={e => updateQuotePair(i, pi, 'quoteSource', e.target.value)} />
                          </div>
                        )}
                        <button onClick={() => removeQuotePair(i, pi)} className="absolute top-1 right-6 text-[10px] text-red-400 hover:text-red-300 opacity-0 group-hover/del:opacity-100 transition-opacity">삭제</button>
                      </div>

                      {/* 후속 맥락 */}
                      {pair.after ? (
                        <div className="relative group/del">
                          <ScenarioRow label={`후속 맥락${pi > 0 ? ` ${pi + 1}` : ''}`} role="narrator" value={pair.after}
                            voiceInfo={vi(afterKey, pair.afterDuration)}
                            onCommit={v => updateQuotePair(i, pi, 'after', v)}
                            pickMode={picking} onPick={(t) => handlePick(t, 'quote')}
                            highlights={pairAfterImgs.map((img: CinematicImage) => img.text).filter((t: string | undefined): t is string => !!t)}
                            sectionKey={afterKey} audioUrl={vUrl(afterKey)}
                            activeEngine={activeEngine(afterKey)} isPlaying={playingKey === afterKey} onTogglePlay={() => onTogglePlay(afterKey)}
                            expanded={expandedKey === afterKey} onToggleExpand={() => onToggleExpand(afterKey)} renderExpanded={() => renderExpanded(afterKey)}
                            onDrop={fn => dropImage(i, fn, 'quote')} onAddAnchor={t => addAnchor(i, t, 'quote')}
                            images={<InlineImageRow images={pairAfterImgs} {...imgRowProps} />}
                            actions={<SaveButton onSave={() => saveField(['books', i, 'quotePairs', pi, 'after'], pair.after)} />}
                          />
                          <button onClick={() => updateQuotePair(i, pi, 'after', undefined)} className="absolute top-1 right-6 text-[10px] text-red-400 hover:text-red-300 opacity-0 group-hover/del:opacity-100 transition-opacity">삭제</button>
                        </div>
                      ) : (
                        <AddFieldButton label="+ 후속 맥락" onClick={() => updateQuotePair(i, pi, 'after', '(후속 맥락 입력)')} />
                      )}
                    </React.Fragment>
                  )
                })}

                <AddFieldButton label="+ 인용 추가" onClick={() => addQuotePair(i)} />

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => {
                      const el = document.getElementById(`book-${i}`) as HTMLDetailsElement | null
                      if (!el) return
                      el.open = false
                      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    }}
                    className="px-2 py-0.5 text-[10px] text-text-secondary border border-border/40 rounded hover:border-accent/40 hover:text-accent transition-colors"
                    title="이 책 섹션 접기"
                  >▲ 접기</button>
                </div>
              </div>
            </div>
          </details>
        )
      })}
        </div>

        {/* ── 우측: 이미지 풀 (전체 + 검색/필터/뷰모드/아코디언) ── */}
        <ImagePool
          allImages={folderImages}
          usedFiles={usedFiles}
          fileBookMap={fileBookMap}
          fileFieldMap={fileFieldMap}
          view={view}
          imageBaseUrl={imageBaseUrl}
          bookTitles={books.map((b: any) => b?.title ?? '')}
          onLocate={locateImage}
          onDrop={fn => dropImage(0, fn)}
          onDelete={async fn => {
            await fetch(`/api/${series}/images/${name}/${fn}`, { method: 'DELETE' })
            refreshFolderImages()
          }}
          onOpenFolder={() => fetch(`/api/${series}/images/${name}`, { method: 'POST' })}
          crossUsage={crossUsage}
          subFolders={subFolders}
          fileFolders={fileFolders}
          duplicates={duplicates}
          onMoveFile={moveFileToFolder}
          onCreateFolder={createFolder}
          onRenameFolder={renameFolder}
          onDeleteFolder={deleteFolder}
        />
      </div>
    </div>
  )
}
