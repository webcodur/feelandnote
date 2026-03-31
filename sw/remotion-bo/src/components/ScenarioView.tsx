'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useEpisode } from '@/lib/episode-context'
import { groupBySection, type VoiceSection } from './voice-utils'
import type { EpisodeData } from './EpisodeEditor'
import { VoiceToolbar, ExpandedVoicePanel, useVoiceSelect, detectMode, DEFAULT_ELE_SETTINGS, type EleSettings } from './ScenarioVoice'
import {
  type CinematicImage, type ImageField, type AnchorPick, type VoiceInfo,
  bookKey, shortsKey, lookupVoice, matchImagesToField, unmatchedImages,
  ScenarioRow, AddFieldButton, ImagePool, InlineImageRow, InlineThumb,
} from './scenario'

/* ── 롱폼 ── */
function LongformView({ episode, sectionMap, onUpdate, expandedKey, onToggleExpand, renderExpanded, activeEngine, playingKey, onTogglePlay }: {
  episode: EpisodeData; sectionMap: Map<string, VoiceSection>
  onUpdate: (ep: EpisodeData) => void
  expandedKey: string | null; onToggleExpand: (key: string) => void; renderExpanded: (key: string) => React.ReactNode
  activeEngine: (key: string) => string; playingKey: string | null; onTogglePlay: (key: string) => void
}) {
  const { series, name } = useEpisode()
  const narrator = episode.narrator!
  const host = episode.host!
  const books = episode.books ?? []
  const imageBaseUrl = `/api/${series}/images/${name}`

  const [anchorPick, setAnchorPick] = useState<AnchorPick>(null)
  const [folderImages, setFolderImages] = useState<string[]>([])

  const refreshFolderImages = useCallback(() => {
    fetch(`/api/${series}/images/${name}`)
      .then(r => r.json())
      .then(d => setFolderImages(d.files ?? []))
      .catch(() => {})
  }, [series, name])

  useEffect(() => { refreshFolderImages() }, [refreshFolderImages])

  const uN = (field: string, value: string) => onUpdate({ ...episode, narrator: { ...narrator, [field]: value } })
  const uH = (field: string, value: string) => onUpdate({ ...episode, host: { ...host, [field]: value } })
  const uB = (i: number, field: string, value: string) => {
    const newBooks = [...books]; newBooks[i] = { ...newBooks[i], [field]: value }; onUpdate({ ...episode, books: newBooks })
  }
  const deleteBookField = (i: number, field: string, durField: string) => {
    const newBooks = [...books]
    const copy = { ...newBooks[i] }
    delete (copy as Record<string, unknown>)[field]
    delete (copy as Record<string, unknown>)[durField]
    newBooks[i] = copy
    onUpdate({ ...episode, books: newBooks })
  }
  const uBImages = (i: number, imgs: CinematicImage[] | undefined) => {
    const newBooks = [...books]; newBooks[i] = { ...newBooks[i], images: imgs }; onUpdate({ ...episode, books: newBooks })
  }
  const removeImage = (bookIdx: number, imgIdx: number) => {
    const imgs = (books[bookIdx].images ?? []).filter((_: any, j: number) => j !== imgIdx)
    uBImages(bookIdx, imgs.length ? imgs : undefined)
  }
  const dropImage = (bookIdx: number, fileName: string, field?: ImageField) => {
    const list: CinematicImage[] = books[bookIdx].images ?? []
    const existingIdx = list.findIndex(img => img.file === fileName)
    if (existingIdx >= 0) {
      const imgs = [...list]
      imgs[existingIdx] = { ...imgs[existingIdx], field: field ?? imgs[existingIdx].field }
      uBImages(bookIdx, imgs)
      return
    }
    uBImages(bookIdx, [...list, { file: fileName, field }])
  }
  const addAnchor = (bookIdx: number, anchorText: string, field?: ImageField) => {
    const list: CinematicImage[] = books[bookIdx].images ?? []
    if (list.some(img => img.text === anchorText)) return
    uBImages(bookIdx, [...list, { file: '', text: anchorText, field }])
  }
  const replaceImage = (bookIdx: number, imgIdx: number, fileName: string) => {
    const imgs = [...(books[bookIdx].images ?? [])]
    imgs[imgIdx] = { ...imgs[imgIdx], file: fileName }
    uBImages(bookIdx, imgs)
  }

  const handlePick = useCallback((selected: string, field?: ImageField) => {
    setAnchorPick(prev => prev ? { ...prev, draft: selected, field } : null)
  }, [])

  const confirmAnchor = useCallback(() => {
    if (!anchorPick?.draft) return
    const { bookIdx, imgIdx, draft, field } = anchorPick
    const imgs = [...(books[bookIdx].images ?? [])]
    imgs[imgIdx] = { ...imgs[imgIdx], text: draft, field: field ?? imgs[imgIdx].field }
    uBImages(bookIdx, imgs)
    setAnchorPick(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchorPick, books])

  const vi = (key: string, dur?: number) => lookupVoice(sectionMap, key, dur)
  const vUrl = (key: string) => `/api/${series}/voice/play/${name}/${key}.wav`

  const isBookPicking = (idx: number) => anchorPick?.bookIdx === idx

  const globalAssigned = useMemo(() => {
    const set = new Set<string>()
    for (const b of books) for (const img of (b.images ?? [])) set.add(img.file)
    return set
  }, [books])

  const globalUnassigned = useMemo(() =>
    folderImages.filter(f => !f.startsWith('shorts') && !globalAssigned.has(f))
  , [folderImages, globalAssigned])

  return (
    <div className="space-y-1">
      {/* 인트로 */}
      <div className="max-w-3xl">
        <ScenarioRow label="서비스 인사" role="narrator" value={narrator.serviceGreeting ?? ''} voiceInfo={vi('A1-service-greeting', narrator.serviceGreetingDuration)} onCommit={v => uN('serviceGreeting', v)} sectionKey="A1-service-greeting" audioUrl={vUrl('A1-service-greeting')} activeEngine={activeEngine('A1-service-greeting')} isPlaying={playingKey === 'A1-service-greeting'} onTogglePlay={() => onTogglePlay('A1-service-greeting')} expanded={expandedKey === 'A1-service-greeting'} onToggleExpand={() => onToggleExpand('A1-service-greeting')} renderExpanded={() => renderExpanded('A1-service-greeting')} />
        {narrator.serviceIntro && <ScenarioRow label="오늘의 인물" role="narrator" value={narrator.serviceIntro} voiceInfo={vi('A2-service-intro', narrator.serviceIntroDuration)} onCommit={v => uN('serviceIntro', v)} sectionKey="A2-service-intro" audioUrl={vUrl('A2-service-intro')} activeEngine={activeEngine('A2-service-intro')} isPlaying={playingKey === 'A2-service-intro'} onTogglePlay={() => onTogglePlay('A2-service-intro')} expanded={expandedKey === 'A2-service-intro'} onToggleExpand={() => onToggleExpand('A2-service-intro')} renderExpanded={() => renderExpanded('A2-service-intro')} />}
        {host.featuredQuote && <ScenarioRow label="대표 명언" role="celeb" value={host.featuredQuote} voiceInfo={vi('A3-featured-quote', host.featuredQuoteDuration)} onCommit={v => uH('featuredQuote', v)} sectionKey="A3-featured-quote" audioUrl={vUrl('A3-featured-quote')} activeEngine={activeEngine('A3-featured-quote')} isPlaying={playingKey === 'A3-featured-quote'} onTogglePlay={() => onTogglePlay('A3-featured-quote')} expanded={expandedKey === 'A3-featured-quote'} onToggleExpand={() => onToggleExpand('A3-featured-quote')} renderExpanded={() => renderExpanded('A3-featured-quote')} />}
        <ScenarioRow label="인물 소개" role="narrator" value={narrator.celebIntro ?? ''} voiceInfo={vi('B1-celeb-intro', narrator.celebIntroDuration)} onCommit={v => uN('celebIntro', v)} sectionKey="B1-celeb-intro" audioUrl={vUrl('B1-celeb-intro')} activeEngine={activeEngine('B1-celeb-intro')} isPlaying={playingKey === 'B1-celeb-intro'} onTogglePlay={() => onTogglePlay('B1-celeb-intro')} expanded={expandedKey === 'B1-celeb-intro'} onToggleExpand={() => onToggleExpand('B1-celeb-intro')} renderExpanded={() => renderExpanded('B1-celeb-intro')} />
        <ScenarioRow label="감상철학" role="celeb" value={host.philosophy ?? ''} voiceInfo={vi('B2-philosophy', host.voiceDuration)} onCommit={v => uH('philosophy', v)} sectionKey="B2-philosophy" audioUrl={vUrl('B2-philosophy')} activeEngine={activeEngine('B2-philosophy')} isPlaying={playingKey === 'B2-philosophy'} onTogglePlay={() => onTogglePlay('B2-philosophy')} expanded={expandedKey === 'B2-philosophy'} onToggleExpand={() => onToggleExpand('B2-philosophy')} renderExpanded={() => renderExpanded('B2-philosophy')} />
        {narrator.bridge && <ScenarioRow label="브릿지" role="narrator" value={narrator.bridge} voiceInfo={vi('B3-bridge', narrator.bridgeDuration)} onCommit={v => uN('bridge', v)} sectionKey="B3-bridge" audioUrl={vUrl('B3-bridge')} activeEngine={activeEngine('B3-bridge')} isPlaying={playingKey === 'B3-bridge'} onTogglePlay={() => onTogglePlay('B3-bridge')} expanded={expandedKey === 'B3-bridge'} onToggleExpand={() => onToggleExpand('B3-bridge')} renderExpanded={() => renderExpanded('B3-bridge')} />}
      </div>

      {/* HR + 책 섹션 + 미배정 풀 사이드바 */}
      <hr className="border-border my-4" />

      <div className="flex gap-0">
        {/* ── 좌: 책 목록 ── */}
        <div className="flex-1 min-w-0">
      {books.map((book: any, i: number) => {
        const picking = isBookPicking(i)
        const allImgs: CinematicImage[] = book.images ?? []
        const imgsBase = matchImagesToField(allImgs, 'summary', book.summary ?? '', true)
        const imgsContext = matchImagesToField(allImgs, 'context', book.context ?? '', false)
        const imgsAfter = matchImagesToField(allImgs, 'contextAfter', book.contextAfter ?? '', false)
        const fieldTexts = [book.summary ?? '', book.context ?? '', book.contextAfter ?? '']
        const imgsSummary = [...imgsBase, ...unmatchedImages(allImgs, fieldTexts)]

        const imgRowProps = { allImages: allImgs, imageBaseUrl, bookIdx: i, picking, anchorPick, onReplace: replaceImage, onRemove: removeImage, onStartPick: (gi: number) => setAnchorPick({ bookIdx: i, imgIdx: gi, draft: null }), onCancelPick: () => setAnchorPick(null) }

        return (
          <details
            key={i}
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
                <span className="text-text-secondary text-xs ml-auto group-open:rotate-90 transition-transform">&#9654;</span>
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
                />

                <ScenarioRow label="추천 경위" role="narrator" value={book.context}
                  voiceInfo={vi(bookKey(i, 'c-context'), book.contextDuration)}
                  onCommit={v => uB(i, 'context', v)}
                  pickMode={picking} onPick={(t) => handlePick(t, 'context')}
                  highlights={imgsContext.map((img: CinematicImage) => img.text).filter((t: string | undefined): t is string => !!t)}
                  sectionKey={bookKey(i, 'c-context')} audioUrl={vUrl(bookKey(i, 'c-context'))}
                  activeEngine={activeEngine(bookKey(i, 'c-context'))} isPlaying={playingKey === bookKey(i, 'c-context')} onTogglePlay={() => onTogglePlay(bookKey(i, 'c-context'))}
                  expanded={expandedKey === bookKey(i, 'c-context')} onToggleExpand={() => onToggleExpand(bookKey(i, 'c-context'))} renderExpanded={() => renderExpanded(bookKey(i, 'c-context'))}
                  onDrop={fn => dropImage(i, fn, 'context')} onAddAnchor={t => addAnchor(i, t, 'context')}
                  images={<InlineImageRow images={imgsContext} {...imgRowProps} />}
                />

                {book.directQuote ? (
                  <div className="relative group/del">
                    <ScenarioRow label="직접 인용" role="celeb" value={book.directQuote}
                      voiceInfo={vi(bookKey(i, 'd-quote'), book.quoteDuration)} onCommit={v => uB(i, 'directQuote', v)}
                      sectionKey={bookKey(i, 'd-quote')} audioUrl={vUrl(bookKey(i, 'd-quote'))}
                      activeEngine={activeEngine(bookKey(i, 'd-quote'))} isPlaying={playingKey === bookKey(i, 'd-quote')} onTogglePlay={() => onTogglePlay(bookKey(i, 'd-quote'))}
                      expanded={expandedKey === bookKey(i, 'd-quote')} onToggleExpand={() => onToggleExpand(bookKey(i, 'd-quote'))} renderExpanded={() => renderExpanded(bookKey(i, 'd-quote'))}
                    />
                    <button onClick={() => { if (confirm('직접 인용을 삭제합니다.')) deleteBookField(i, 'directQuote', 'quoteDuration') }} className="absolute top-1 right-6 text-[10px] text-red-400 hover:text-red-300 opacity-0 group-hover/del:opacity-100 transition-opacity">삭제</button>
                  </div>
                ) : (
                  <AddFieldButton label="+ 직접 인용" onClick={() => uB(i, 'directQuote', '(인용문 입력)')} />
                )}

                {book.contextAfter ? (
                  <div className="relative group/del">
                    <ScenarioRow label="후속 맥락" role="narrator" value={book.contextAfter}
                      voiceInfo={vi(bookKey(i, 'e-context-after'), book.contextAfterDuration)}
                      onCommit={v => uB(i, 'contextAfter', v)}
                      pickMode={picking} onPick={(t) => handlePick(t, 'contextAfter')}
                      highlights={imgsAfter.map((img: CinematicImage) => img.text).filter((t: string | undefined): t is string => !!t)}
                      sectionKey={bookKey(i, 'e-context-after')} audioUrl={vUrl(bookKey(i, 'e-context-after'))}
                      activeEngine={activeEngine(bookKey(i, 'e-context-after'))} isPlaying={playingKey === bookKey(i, 'e-context-after')} onTogglePlay={() => onTogglePlay(bookKey(i, 'e-context-after'))}
                      expanded={expandedKey === bookKey(i, 'e-context-after')} onToggleExpand={() => onToggleExpand(bookKey(i, 'e-context-after'))} renderExpanded={() => renderExpanded(bookKey(i, 'e-context-after'))}
                      onDrop={fn => dropImage(i, fn, 'contextAfter')} onAddAnchor={t => addAnchor(i, t, 'contextAfter')}
                      images={<InlineImageRow images={imgsAfter} {...imgRowProps} />}
                    />
                    <button onClick={() => { if (confirm('후속 맥락을 삭제합니다.')) deleteBookField(i, 'contextAfter', 'contextAfterDuration') }} className="absolute top-1 right-6 text-[10px] text-red-400 hover:text-red-300 opacity-0 group-hover/del:opacity-100 transition-opacity">삭제</button>
                  </div>
                ) : (
                  <AddFieldButton label="+ 후속 맥락" onClick={() => uB(i, 'contextAfter', '(후속 맥락 입력)')} />
                )}

              </div>
            </div>
          </details>
        )
      })}
        </div>

        {/* ── 우측: 미배정 이미지 풀 ── */}
        <ImagePool
          images={globalUnassigned}
          imageBaseUrl={imageBaseUrl}
          onDrop={fn => dropImage(0, fn)}
          onDelete={async fn => {
            await fetch(`/api/${series}/images/${name}/${fn}`, { method: 'DELETE' })
            refreshFolderImages()
          }}
          onOpenFolder={() => fetch(`/api/${series}/images/${name}`, { method: 'POST' })}
        />
      </div>
    </div>
  )
}

/* ── 쇼츠 ── */
function ShortsView({ episode, sectionMap, onUpdate, expandedKey, onToggleExpand, renderExpanded, activeEngine, playingKey, onTogglePlay }: {
  episode: EpisodeData; sectionMap: Map<string, VoiceSection>
  onUpdate: (ep: EpisodeData) => void
  expandedKey: string | null; onToggleExpand: (key: string) => void; renderExpanded: (key: string) => React.ReactNode
  activeEngine: (key: string) => string; playingKey: string | null; onTogglePlay: (key: string) => void
}) {
  const { series, name } = useEpisode()
  const [folderImages, setFolderImages] = useState<string[]>([])
  const [epStatus, setEpStatus] = useState<string>('live')

  useEffect(() => {
    fetch(`/api/${series}/images/${name}`)
      .then(r => r.json())
      .then(d => { setFolderImages(d.files ?? []); if (d.status) setEpStatus(d.status) })
      .catch(() => {})
  }, [series, name])

  if (!episode.shorts) return null
  const { segments } = episode.shorts
  const imageBaseUrl = `/api/${series}/images/${name}`
  const episodeDir = `episodes/${epStatus}/${name}/images`

  const updateSeg = (i: number, text: string) => {
    const newSegs = [...segments]; newSegs[i] = { ...newSegs[i], text }
    onUpdate({ ...episode, shorts: { ...episode.shorts!, segments: newSegs } })
  }

  /** seg.image + seg.imageChangeAt → CinematicImage[] 변환 */
  const segToImages = (seg: any): CinematicImage[] => {
    const imgs: CinematicImage[] = []
    if (seg.image) imgs.push({ file: seg.image.split('/').pop() })
    const changes = seg.imageChangeAt ? (Array.isArray(seg.imageChangeAt) ? seg.imageChangeAt : [seg.imageChangeAt]) : []
    for (const c of changes) {
      imgs.push({ file: c.image.split('/').pop(), text: c.text })
    }
    return imgs
  }

  /** CinematicImage[] → seg.image + seg.imageChangeAt 역변환하여 저장 */
  const updateSegImages = (i: number, imgs: CinematicImage[]) => {
    const newSegs = [...segments]
    const seg = { ...newSegs[i] }
    if (imgs.length === 0) {
      delete seg.image
      delete seg.imageChangeAt
    } else {
      seg.image = `${episodeDir}/${imgs[0].file}`
      if (imgs.length > 1) {
        seg.imageChangeAt = imgs.slice(1).map(img => ({
          t: 0,
          image: `${episodeDir}/${img.file}`,
          ...(img.text ? { text: img.text } : {}),
        }))
      } else {
        delete seg.imageChangeAt
      }
    }
    newSegs[i] = seg
    onUpdate({ ...episode, shorts: { ...episode.shorts!, segments: newSegs } })
  }

  const dropImage = (segIdx: number, fileName: string) => {
    // 이미 어느 세그먼트에든 배정된 이미지는 차단 (롱폼과 동일: 한 이미지 = 한 곳)
    if (assignedFiles.has(fileName)) return
    const imgs = segToImages(segments[segIdx])
    updateSegImages(segIdx, [...imgs, { file: fileName }])
  }

  const removeImage = (segIdx: number, imgIdx: number) => {
    const imgs = segToImages(segments[segIdx]).filter((_, j) => j !== imgIdx)
    updateSegImages(segIdx, imgs)
  }

  const replaceImage = (segIdx: number, imgIdx: number, fileName: string) => {
    const imgs = [...segToImages(segments[segIdx])]
    imgs[imgIdx] = { ...imgs[imgIdx], file: fileName }
    updateSegImages(segIdx, imgs)
  }

  const addAnchor = (segIdx: number, anchorText: string) => {
    const imgs = segToImages(segments[segIdx])
    if (imgs.some(img => img.text === anchorText)) return
    updateSegImages(segIdx, [...imgs, { file: '', text: anchorText }])
  }

  const assignedFiles = useMemo(() => {
    const set = new Set<string>()
    for (const seg of segments) {
      if (seg.image) set.add(seg.image.split('/').pop()!)
      const changes = seg.imageChangeAt ? (Array.isArray(seg.imageChangeAt) ? seg.imageChangeAt : [seg.imageChangeAt]) : []
      for (const c of changes) set.add(c.image.split('/').pop()!)
    }
    return set
  }, [segments])
  const unassigned = folderImages.filter(f => !assignedFiles.has(f))

  const [anchorPick, setAnchorPick] = useState<AnchorPick>(null)

  const handlePick = useCallback((selected: string) => {
    setAnchorPick(prev => prev ? { ...prev, draft: selected } : null)
  }, [])

  const confirmAnchor = useCallback(() => {
    if (!anchorPick?.draft) return
    const { bookIdx: segIdx, imgIdx, draft } = anchorPick
    const imgs = [...segToImages(segments[segIdx])]
    imgs[imgIdx] = { ...imgs[imgIdx], text: draft }
    updateSegImages(segIdx, imgs)
    setAnchorPick(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchorPick, segments])

  const renderSeg = (seg: any, i: number, withImage: boolean) => {
    const key = shortsKey(i, seg.id)
    const voiceInfo = lookupVoice(sectionMap, key, seg.duration)
    const isExpanded = expandedKey === key
    const audioUrl = `/api/${series}/voice/play/${name}/${key}.wav`
    const allImgs = withImage ? segToImages(seg) : []
    const picking = anchorPick?.bookIdx === i

    const imgRowProps = {
      allImages: allImgs, imageBaseUrl, bookIdx: i, picking, anchorPick,
      onReplace: replaceImage, onRemove: removeImage,
      onStartPick: (gi: number) => setAnchorPick({ bookIdx: i, imgIdx: gi, draft: null }),
      onCancelPick: () => setAnchorPick(null),
    }

    const imgNode = withImage && allImgs.length > 0
      ? <InlineImageRow images={allImgs} {...imgRowProps} />
      : null

    return (
      <ScenarioRow
        key={seg.id}
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
    )
  }

  return (
    <div className="space-y-1">
      {/* 인트로 구간 — hook, intro, celeb-mid */}
      <div className="max-w-3xl">
        {segments.map((seg: any, i: number) => {
          if (seg.visual === 'book' || seg.visual === 'cta') return null
          return renderSeg(seg, i, false)
        })}
      </div>

      {/* HR + 책 구간 + 이미지 풀 사이드바 */}
      <hr className="border-border my-4" />

      <div className="flex gap-0">
        <div className="flex-1 min-w-0 space-y-1">
          {/* 앵커 확정 배너 */}
          {anchorPick?.draft && (
            <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-amber-500/10 border border-amber-500/30 text-[11px]">
              <span className="text-amber-400 font-semibold">#{anchorPick.imgIdx + 1}</span>
              <span className="text-text-primary truncate flex-1">&ldquo;{anchorPick.draft}&rdquo;</span>
              <button onClick={confirmAnchor} className="px-2 py-0.5 rounded bg-amber-500 text-black text-[10px] font-semibold hover:bg-amber-400 shrink-0">확정</button>
              <button onClick={() => setAnchorPick(null)} className="text-text-secondary hover:text-red-400 text-[10px]">취소</button>
            </div>
          )}
          {segments.map((seg: any, i: number) => {
            if (seg.visual !== 'book' && seg.visual !== 'cta') return null
            return renderSeg(seg, i, seg.visual === 'book')
          })}
        </div>

        <ImagePool images={unassigned} imageBaseUrl={imageBaseUrl} />
      </div>
    </div>
  )
}

/* ── 메인 ── */
export function ScenarioView({ episode }: { episode: EpisodeData }) {
  const { updateEpisode, save, dirty, saving, voiceFiles, voiceSummary, series, name, isEn, post, refreshFiles } = useEpisode()
  const [view, setView] = useState<'longform' | 'shorts'>('longform')

  const { vs, saveVs } = useVoiceSelect(series, name)
  const hasELVoiceId = !!episode.host?.elevenlabsVoiceId
  const mode = detectMode(vs, hasELVoiceId)
  const [eleSettings, setEleSettings] = useState<EleSettings>({ ...DEFAULT_ELE_SETTINGS })
  const [expandedKey, setExpandedKey] = useState<string | null>(null)
  const [playingKey, setPlayingKey] = useState<string | null>(null)

  const togglePlay = useCallback((key: string) => {
    setPlayingKey(prev => prev === key ? null : key)
  }, [])

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
        activeEngine={activeEngine(key)}
        onToggleSlot={toggleSlot}
        onEpisodeChange={updateEpisode}
        onSave={save}
        onRefresh={refreshFiles}
      />
    )
  }, [sectionMap, episode, series, name, eleSettings, activeEngine, toggleSlot, updateEpisode, save, refreshFiles])

  const handleUpdate = useCallback((ep: EpisodeData) => { updateEpisode(ep) }, [updateEpisode])

  const handleSave = useCallback(() => {
    const books = (episode.books ?? []) as any[]
    const errors: string[] = []
    let cleaned = false
    books.forEach((b: any, i: number) => {
      if (!b.directQuote && b.contextAfter) {
        errors.push(`책 ${i + 1} "${b.title}": 직접 인용 없이 후속 맥락이 존재합니다. 직접 인용을 추가하거나 후속 맥락을 삭제하세요.`)
      }
      if (b.images?.length) {
        const fieldMap: [ImageField, string][] = [
          ['summary', b.summary ?? ''],
          ['context', b.context ?? ''],
          ['contextAfter', b.contextAfter ?? ''],
        ]
        const allTexts = fieldMap.map(([, t]) => t).join(' ')
        b.images.forEach((img: any, j: number) => {
          if (!img.field && img.text) {
            for (const [f, t] of fieldMap) {
              if (t.includes(img.text)) { img.field = f; cleaned = true; break }
            }
          }
          if (j === 0 && !img.field) { img.field = 'summary'; cleaned = true }
          if (j > 0 && img.text && !allTexts.includes(img.text)) {
            console.log(`유령 앵커 정리: 책${i + 1} #${j + 1} "${img.text}"`)
            delete img.text
            cleaned = true
          }
        })
      }
    })
    if (errors.length) {
      alert('저장 불가:\n\n' + errors.join('\n'))
      return
    }

    // 쇼츠 중복 이미지 정리: 앞 세그먼트와 동일한 seg.image 제거
    let shortsSegs: any[] | undefined
    const shorts = episode.shorts
    if (shorts?.segments) {
      const segs = [...shorts.segments] as any[]
      let lastImage: string | undefined
      for (let si = 0; si < segs.length; si++) {
        const seg = segs[si]
        if (!seg.image) { lastImage = undefined; continue }
        const fn = seg.image.split('/').pop()
        if (fn === lastImage) {
          const copy = { ...seg }
          delete copy.image
          delete copy.imageChangeAt
          segs[si] = copy
          console.log(`쇼츠 중복 이미지 정리: #${si + 1} ${seg.id} "${fn}"`)
          cleaned = true
        } else {
          const changes = seg.imageChangeAt ? (Array.isArray(seg.imageChangeAt) ? seg.imageChangeAt : [seg.imageChangeAt]) : []
          lastImage = changes.length > 0 ? changes[changes.length - 1].image?.split('/').pop() : fn
        }
      }
      if (cleaned) shortsSegs = segs
    }

    if (cleaned) {
      const updated = { ...episode, books }
      if (shortsSegs && shorts) updated.shorts = { ...shorts, segments: shortsSegs }
      updateEpisode(updated as EpisodeData)
    }
    save()
  }, [episode, save, updateEpisode])

  const syncImages = useCallback(async () => {
    const koName = isEn ? name.replace(/-en$/, '') : name
    const enName = isEn ? name : `${name}-en`
    try {
      const [resKo, resEn] = await Promise.all([
        fetch(`/api/${series}/episodes/${koName}`),
        fetch(`/api/${series}/episodes/${enName}`),
      ])
      if (!resKo.ok) throw new Error('ko 에피소드 로드 실패')
      if (!resEn.ok) throw new Error('en 에피소드 로드 실패')
      const ko = await resKo.json()
      const en = await resEn.json()

      const koBooks = ko.books ?? []
      const enBooks = [...(en.books ?? [])]
      let synced = 0
      koBooks.forEach((kb: any, i: number) => {
        if (i >= enBooks.length || !kb.images?.length) return
        enBooks[i] = {
          ...enBooks[i],
          images: kb.images.map((img: any) => ({ file: img.file, field: img.field, keyword: img.keyword, prompt: img.prompt })),
        }
        synced += kb.images.length
      })

      const koShorts = ko.shorts?.segments ?? []
      const enShorts = [...(en.shorts?.segments ?? [])]
      koShorts.forEach((ks: any, i: number) => {
        if (i >= enShorts.length) return
        if (ks.image) { enShorts[i] = { ...enShorts[i], image: ks.image }; synced++ }
      })

      const updated = {
        ...en,
        books: enBooks,
        ...(en.shorts ? { shorts: { ...en.shorts, segments: enShorts } } : {}),
      }

      const saveRes = await fetch(`/api/${series}/episodes/${enName}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated),
      })
      if (!saveRes.ok) throw new Error('en 에피소드 저장 실패')
      alert(`${synced}장 동기화 완료 (${koName} → ${enName})`)
      if (isEn) window.location.reload()
    } catch (e: unknown) {
      alert('동기화 실패: ' + (e instanceof Error ? e.message : String(e)))
    }
  }, [series, name, isEn])

  return (
    <div className="space-y-4">
      <VoiceToolbar
        episode={episode} series={series} name={name}
        voiceSummary={voiceSummary} mode={mode} hasELVoiceId={hasELVoiceId}
        vs={vs} onSaveVs={saveVs}
        eleSettings={eleSettings} onEleSettingsChange={setEleSettings}
        onRefresh={refreshFiles} post={post}
      />

      <div className="flex items-center gap-4 border-b border-border">
        <div className="flex gap-1">
          <button onClick={() => setView('longform')} className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${view === 'longform' ? 'border-accent text-accent' : 'border-transparent text-text-secondary hover:text-text-primary'}`}>롱폼</button>
          <button onClick={() => setView('shorts')} className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${view === 'shorts' ? 'border-accent text-accent' : 'border-transparent text-text-secondary hover:text-text-primary'}`} disabled={!episode.shorts}>쇼츠{!episode.shorts && ' (없음)'}</button>
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

      {view === 'longform' ? (
        <LongformView episode={episode} sectionMap={sectionMap} onUpdate={handleUpdate}
          expandedKey={expandedKey} onToggleExpand={toggleExpand} renderExpanded={renderExpanded}
          activeEngine={activeEngine} playingKey={playingKey} onTogglePlay={togglePlay} />
      ) : (
        <ShortsView episode={episode} sectionMap={sectionMap} onUpdate={handleUpdate}
          expandedKey={expandedKey} onToggleExpand={toggleExpand} renderExpanded={renderExpanded}
          activeEngine={activeEngine} playingKey={playingKey} onTogglePlay={togglePlay} />
      )}

      {dirty && (
        <button
          onClick={handleSave}
          disabled={saving}
          className="fixed bottom-6 right-6 z-50 px-5 py-2.5 rounded-full bg-accent text-bg-primary text-sm font-bold shadow-lg shadow-accent/30 hover:opacity-90 disabled:opacity-50 transition-all"
        >
          {saving ? '저장 중...' : '저장'}
        </button>
      )}
    </div>
  )
}
