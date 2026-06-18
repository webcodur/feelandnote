'use client'

import { ScenarioRow, AddFieldButton } from '../../../ScenarioRow'
import { SaveButton } from '../../../SaveButton'
import { SegmentSfxEditor } from '../../../SegmentSfxEditor'
import { RowSpeakerSelect } from '../../../RowSpeakerSelect'
import { AnchorConfirmBanner } from '../../../AnchorConfirmBanner'
import { GainDbInput } from '../../../GainDbInput'
import { PlaybackRateInput } from '../../../PlaybackRateInput'
import { InlineImageRow } from '../../../ImageThumb'
import { BgmSelect } from '../../BgmSelect'
import { BookCopyButton } from '../../CopyButton'
import { bookKey, bookFieldParts, partPhase, lookupVoice, matchImagesToField, unmatchedImages, distributeContextImages } from '../../../utils'
import type { CinematicImage } from '../../../types'
import { QuotePairRow } from './sections/QuotePairRow'
import type { BookSectionProps } from './types'

/**
 * 단일 책 섹션 — 제목/요약/감상 배경 + 인용 페어 목록.
 *
 * focus={kind:'book'} 일 때는 details/summary 아코디언을 쓰지 않고 div 로 펼쳐 보이고,
 * 전체 보기일 때는 details 로 접고 펼친다.
 */
export function BookSection({
  book, displayI, realIdx, totalBooks, isFocused,
  sectionMap, series, name,
  allImgs, anchorPick, setAnchorPick, confirmAnchor,
  imageBaseUrl, replaceImage, removeImage, removeImageOnly, crossUsage,
  uB, uBSplit, dropImage, addAnchor, handlePick,
  updateQuotePair, addQuotePair, removeQuotePair, saveField,
  activeEngine, playingKey, onTogglePlay, onToggleExpand,
  musicFiles, setBookBgm,
  sfxFiles, sfxBase, speakers,
}: BookSectionProps) {
  const i = realIdx
  const picking = anchorPick?.itemIdx === i

  const imgsBase = matchImagesToField(allImgs, 'summary', book.summary ?? '', true)
  const ctxBuckets = distributeContextImages(allImgs, book)
  const imgsCtxMain = ctxBuckets.main
  const allCtxTexts = [book.contextMain ?? '', ...((book.quotePairs ?? []) as any[]).flatMap((p: any) => [p.quote ?? '', p.after ?? ''])].join(' ')
  const fieldTexts = [book.summary ?? '', allCtxTexts]
  const imgsSummary = [...imgsBase, ...unmatchedImages(allImgs, fieldTexts)]

  /** 한 필드 이미지들을 토막별로 분배 — 앵커 텍스트가 든 토막에 붙인다. 앵커 없는 이미지는 첫 토막. */
  const imagesForPart = (imgs: CinematicImage[], parts: string[], p: number): CinematicImage[] => {
    if (parts.length <= 1) return imgs
    return imgs.filter(img => {
      if (!img.text) return p === 0
      const owner = parts.findIndex(pt => pt.includes(img.text!))
      return owner < 0 ? p === 0 : owner === p
    })
  }

  const imgRowProps = {
    allImages: allImgs, imageBaseUrl, itemIdx: i, picking, anchorPick,
    onReplace: replaceImage, onRemove: removeImage, onRemoveFileOnly: removeImageOnly,
    onStartPick: (gi: number) => setAnchorPick({ itemIdx: i, imgIdx: gi, draft: null }),
    onCancelPick: () => setAnchorPick(null),
    crossUsage,
  }

  const vi = (key: string, dur?: number) => lookupVoice(sectionMap, key, dur)
  const vUrl = (key: string) => `/api/${series}/voice/play/${name}/${key}.wav`

  // 화자 색상 좌측 색띠 — 쇼츠 SegmentRow 와 동일 패턴.
  const speakerColor = (id?: string) => id ? speakers.find(s => s.id === id)?.color : undefined
  const accentStyle = (id?: string): React.CSSProperties | undefined => {
    const c = speakerColor(id)
    return c ? { borderLeft: `3px solid ${c}`, paddingLeft: 6 } : undefined
  }

  const HeaderTag: any = isFocused ? 'div' : 'summary'
  const ContainerTag: any = isFocused ? 'div' : 'details'
  const containerProps: any = isFocused
    ? { className: `border rounded overflow-hidden my-3 ${picking ? 'border-amber-500/50' : 'border-border/40'}` }
    : {
        open: picking || undefined,
        onToggle: picking ? (e: React.ToggleEvent<HTMLDetailsElement>) => { e.currentTarget.open = true } : undefined,
        className: `border rounded overflow-hidden group my-3 ${picking ? 'border-amber-500/50' : 'border-border/40'}`,
      }
  const headerClass = isFocused
    ? 'bg-bg-card px-4 py-3 select-none'
    : `bg-bg-card px-4 py-3 select-none hover:bg-bg-hover transition-colors list-none ${picking ? 'pointer-events-none' : 'cursor-pointer'}`

  return (
    <ContainerTag key={i} id={`book-${i}`} {...containerProps}>
      <HeaderTag className={headerClass}>
        <div className="flex items-baseline gap-2">
          {!isFocused && <span className="text-text-secondary text-xs group-open:rotate-90 transition-transform">&#9654;</span>}
          <span className="text-accent font-mono text-xs">{i + 1}/{totalBooks}</span>
          <span className="font-semibold">{book.title}</span>
          <span className="text-text-secondary text-sm">— {book.creator}</span>
          {book.stats?.publishYear && <span className="text-text-secondary text-xs">{book.stats.publishYear}</span>}
          {allImgs.length > 0 && <span className="text-text-secondary text-sm font-bold ml-1">{allImgs.length}장</span>}
          <span className="ml-auto flex items-center gap-2">
            <BookCopyButton book={book} index={i} total={totalBooks} />
          </span>
        </div>
      </HeaderTag>

      <div className="border-t border-border/40">
        <div className="p-4 space-y-0">
          {/* 앵커 확정 배너 — 이 책이 활성 픽일 때만 노출 */}
          {picking && (
            <AnchorConfirmBanner
              anchorPick={anchorPick}
              onConfirm={confirmAnchor}
              onCancel={() => setAnchorPick(null)}
              hint="또는 다시 드래그"
              className="mb-3"
            />
          )}

          <div style={accentStyle(book.titleSpeaker)}>
            <ScenarioRow label="제목 읽기" role="narrator" value={`${book.title}, ${book.creator}`}
              voiceInfo={vi(bookKey(i, 'a-title'), book.titleDuration)} onCommit={() => {}}
              sectionKey={bookKey(i, 'a-title')} audioUrl={vUrl(bookKey(i, 'a-title'))}
              playbackRate={typeof book.titlePlaybackRate === 'number' ? book.titlePlaybackRate : undefined}
              activeEngine={activeEngine(bookKey(i, 'a-title'))} isPlaying={playingKey === bookKey(i, 'a-title')} onTogglePlay={() => onTogglePlay(bookKey(i, 'a-title'), book.titleGainDb, book.titlePlaybackRate)}
              onToggleExpand={() => onToggleExpand(bookKey(i, 'a-title'))}
              footer={
                <>
                  <RowSpeakerSelect value={book.titleSpeaker} speakers={speakers} name={`spk-b${i}-title`}
                    onChange={next => uB(i, 'titleSpeaker', next)} />
                  <SegmentSfxEditor sfx={book.titleSfx} files={sfxFiles} basePath={sfxBase}
                    onChange={next => uB(i, 'titleSfx', next)} />
                  <GainDbInput value={typeof book.titleGainDb === 'number' ? book.titleGainDb : undefined}
                    onChange={next => uB(i, 'titleGainDb', next)} sectionKey={bookKey(i, 'a-title')} />
                  <PlaybackRateInput value={typeof book.titlePlaybackRate === 'number' ? book.titlePlaybackRate : undefined}
                    onChange={next => uB(i, 'titlePlaybackRate', next)} sectionKey={bookKey(i, 'a-title')} />
                </>
              }
            />
          </div>

          {/* 핵심 요약 — 토막별 행. 분할 없으면 1행으로 기존과 동일. 화자·SFX·음량·배속은 전 토막 공유(첫 행에서만 편집). */}
          {(() => {
            const parts = bookFieldParts(book.summary, book.summaryParts)
            const n = parts.length
            return parts.map((partText: string, p: number) => {
              const key = bookKey(i, partPhase('b', 'summary', p))
              const partImgs = imagesForPart(imgsSummary, parts, p)
              return (
                <div key={key} style={accentStyle(book.summarySpeaker)}>
                  <ScenarioRow label={n > 1 ? `핵심 요약 ${p + 1}/${n}` : '핵심 요약'} role="summary" value={partText}
                    leadStyle={{ backgroundColor: `rgba(16,185,129,${(0.08 + 0.05 * p).toFixed(3)})` }}
                    barColor="rgba(16,185,129,0.75)"
                    headerColor={`rgba(16,185,129,${(0.20 + 0.07 * p).toFixed(3)})`}
                    panelTint="16,185,129"
                    voiceInfo={vi(key, n > 1 ? book.summaryPartDurations?.[p] : book.summaryDuration)}
                    live
                    onCommit={(v) => { const next = [...parts]; next[p] = v; uBSplit(i, 'summary', next) }}
                    onSplitAt={(offset, text) => {
                      const next = [...parts]
                      next.splice(p, 1, text.slice(0, offset), text.slice(offset))
                      uBSplit(i, 'summary', next)
                    }}
                    pickMode={picking} onPick={(t) => handlePick(t, 'summary')}
                    highlights={partImgs.map((img: CinematicImage) => img.text).filter((t: string | undefined): t is string => !!t)}
                    sectionKey={key} audioUrl={vUrl(key)}
                    playbackRate={typeof book.summaryPlaybackRate === 'number' ? book.summaryPlaybackRate : undefined}
                    activeEngine={activeEngine(key)} isPlaying={playingKey === key} onTogglePlay={() => onTogglePlay(key, book.summaryGainDb, book.summaryPlaybackRate)}
                    onToggleExpand={() => onToggleExpand(key)}
                    onDrop={fn => dropImage(i, fn, 'summary')} onAddAnchor={t => addAnchor(i, t, 'summary')}
                    images={<InlineImageRow images={partImgs} {...imgRowProps} />}
                    actions={
                      <>
                        {p > 0 && (
                          <button
                            onClick={() => {
                              const next = [...parts]
                              next.splice(p - 1, 2, `${parts[p - 1]}\n\n${parts[p]}`)
                              uBSplit(i, 'summary', next)
                            }}
                            className="px-2 py-0.5 text-xs font-bold text-text-secondary border border-border/40 rounded hover:border-accent/40 hover:text-accent transition-colors"
                            title="이 토막을 앞 토막과 합친다"
                          >⇧ 합치기</button>
                        )}
                        <SaveButton onSave={async () => {
                          await saveField(['books', i, 'summaryParts'], n > 1 ? parts : undefined)
                          await saveField(['books', i, 'summary'], parts.join('\n\n'))
                        }} />
                      </>
                    }
                    footer={p === 0 ? (
                      <>
                        <RowSpeakerSelect value={book.summarySpeaker} speakers={speakers} name={`spk-b${i}-summary`}
                          onChange={next => uB(i, 'summarySpeaker', next)} />
                        <SegmentSfxEditor sfx={book.summarySfx} files={sfxFiles} basePath={sfxBase}
                          onChange={next => uB(i, 'summarySfx', next)} />
                        <GainDbInput value={typeof book.summaryGainDb === 'number' ? book.summaryGainDb : undefined}
                          onChange={next => uB(i, 'summaryGainDb', next)} sectionKey={key} />
                        <PlaybackRateInput value={typeof book.summaryPlaybackRate === 'number' ? book.summaryPlaybackRate : undefined}
                          onChange={next => uB(i, 'summaryPlaybackRate', next)} sectionKey={key} />
                      </>
                    ) : undefined}
                  />
                </div>
              )
            })
          })()}
          {musicFiles.length > 0 && (
            <BgmSelect label="요약 BGM" current={book.bgm?.summary?.file} files={musicFiles}
              onSelect={f => setBookBgm(i, 'summary', f)} onRemove={() => setBookBgm(i, 'summary', null)} />
          )}

          {/* 감상 배경 — 토막별 행 (핵심 요약과 동일 패턴) */}
          {(() => {
            const parts = bookFieldParts(book.contextMain, book.contextMainParts)
            const n = parts.length
            return parts.map((partText: string, p: number) => {
              const key = bookKey(i, partPhase('c', 'context', p))
              const partImgs = imagesForPart(imgsCtxMain, parts, p)
              return (
                <div key={key} style={accentStyle(book.contextMainSpeaker)}>
                  <ScenarioRow label={n > 1 ? `감상 배경 ${p + 1}/${n}` : '감상 배경'} role="narrator" value={partText}
                    leadStyle={{ backgroundColor: `rgba(245,158,11,${(0.08 + 0.05 * p).toFixed(3)})` }}
                    barColor="rgba(245,158,11,0.85)"
                    headerColor={`rgba(245,158,11,${(0.20 + 0.07 * p).toFixed(3)})`}
                    panelTint="245,158,11"
                    voiceInfo={vi(key, n > 1 ? book.contextPartDurations?.[p] : book.contextDuration)}
                    live
                    onCommit={(v) => { const next = [...parts]; next[p] = v; uBSplit(i, 'contextMain', next) }}
                    onSplitAt={(offset, text) => {
                      const next = [...parts]
                      next.splice(p, 1, text.slice(0, offset), text.slice(offset))
                      uBSplit(i, 'contextMain', next)
                    }}
                    pickMode={picking} onPick={(t) => handlePick(t, 'context')}
                    highlights={partImgs.map((img: CinematicImage) => img.text).filter((t: string | undefined): t is string => !!t)}
                    sectionKey={key} audioUrl={vUrl(key)}
                    playbackRate={typeof book.contextMainPlaybackRate === 'number' ? book.contextMainPlaybackRate : undefined}
                    activeEngine={activeEngine(key)} isPlaying={playingKey === key} onTogglePlay={() => onTogglePlay(key, book.contextMainGainDb, book.contextMainPlaybackRate)}
                    onToggleExpand={() => onToggleExpand(key)}
                    onDrop={fn => dropImage(i, fn, 'context')} onAddAnchor={t => addAnchor(i, t, 'context')}
                    images={<InlineImageRow images={partImgs} {...imgRowProps} />}
                    actions={
                      <>
                        {p > 0 && (
                          <button
                            onClick={() => {
                              const next = [...parts]
                              next.splice(p - 1, 2, `${parts[p - 1]}\n\n${parts[p]}`)
                              uBSplit(i, 'contextMain', next)
                            }}
                            className="px-2 py-0.5 text-xs font-bold text-text-secondary border border-border/40 rounded hover:border-accent/40 hover:text-accent transition-colors"
                            title="이 토막을 앞 토막과 합친다"
                          >⇧ 합치기</button>
                        )}
                        <SaveButton onSave={async () => {
                          await saveField(['books', i, 'contextMainParts'], n > 1 ? parts : undefined)
                          await saveField(['books', i, 'contextMain'], parts.join('\n\n'))
                        }} />
                      </>
                    }
                    footer={p === 0 ? (
                      <>
                        <RowSpeakerSelect value={book.contextMainSpeaker} speakers={speakers} name={`spk-b${i}-context`}
                          onChange={next => uB(i, 'contextMainSpeaker', next)} />
                        <SegmentSfxEditor sfx={book.contextMainSfx} files={sfxFiles} basePath={sfxBase}
                          onChange={next => uB(i, 'contextMainSfx', next)} />
                        <GainDbInput value={typeof book.contextMainGainDb === 'number' ? book.contextMainGainDb : undefined}
                          onChange={next => uB(i, 'contextMainGainDb', next)} sectionKey={key} />
                        <PlaybackRateInput value={typeof book.contextMainPlaybackRate === 'number' ? book.contextMainPlaybackRate : undefined}
                          onChange={next => uB(i, 'contextMainPlaybackRate', next)} sectionKey={key} />
                      </>
                    ) : undefined}
                  />
                </div>
              )
            })
          })()}
          {musicFiles.length > 0 && (
            <BgmSelect label="배경 BGM" current={book.bgm?.context?.file} files={musicFiles}
              onSelect={f => setBookBgm(i, 'context', f)} onRemove={() => setBookBgm(i, 'context', null)} />
          )}

          {((book.quotePairs ?? []) as any[]).map((pair: any, pi: number) => (
            <QuotePairRow
              key={`qp-${pi}`}
              pair={pair}
              pi={pi}
              i={i}
              picking={picking}
              pairQuoteImgs={ctxBuckets.pairs[pi]?.quote ?? []}
              pairAfterImgs={ctxBuckets.pairs[pi]?.after ?? []}
              vi={vi}
              vUrl={vUrl}
              updateQuotePair={updateQuotePair}
              handlePick={handlePick}
              onTogglePlay={onTogglePlay}
              onToggleExpand={onToggleExpand}
              dropImage={dropImage}
              addAnchor={addAnchor}
              saveField={saveField}
              removeQuotePair={removeQuotePair}
              activeEngine={activeEngine}
              playingKey={playingKey}
              accentStyle={accentStyle}
              imgRowProps={imgRowProps}
              speakers={speakers}
              sfxFiles={sfxFiles}
              sfxBase={sfxBase}
            />
          ))}

          <AddFieldButton label="+ 인용 추가" onClick={() => addQuotePair(i)} />

          {!isFocused && (
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => {
                  const el = document.getElementById(`book-${i}`) as HTMLDetailsElement | null
                  if (!el) return
                  el.open = false
                  el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }}
                className="px-2 py-0.5 text-sm font-bold text-text-secondary border border-border/40 rounded hover:border-accent/40 hover:text-accent transition-colors"
                title="이 책 섹션 접기"
              >▲ 접기</button>
            </div>
          )}
        </div>
      </div>
    </ContainerTag>
  )
}
