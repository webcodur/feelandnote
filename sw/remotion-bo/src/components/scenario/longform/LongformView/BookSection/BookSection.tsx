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
import { bookKey, lookupVoice, matchImagesToField, unmatchedImages, distributeContextImages } from '../../../utils'
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
  uB, dropImage, addAnchor, handlePick,
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

          <div style={accentStyle(book.summarySpeaker)}>
            <ScenarioRow label="핵심 요약" role="summary" value={book.summary}
              voiceInfo={vi(bookKey(i, 'b-summary'), book.summaryDuration)}
              onCommit={(v, prev) => uB(i, 'summary', v, prev)}
              pickMode={picking} onPick={(t) => handlePick(t, 'summary')}
              highlights={imgsSummary.map((img: CinematicImage) => img.text).filter((t: string | undefined): t is string => !!t)}
              sectionKey={bookKey(i, 'b-summary')} audioUrl={vUrl(bookKey(i, 'b-summary'))}
              playbackRate={typeof book.summaryPlaybackRate === 'number' ? book.summaryPlaybackRate : undefined}
              activeEngine={activeEngine(bookKey(i, 'b-summary'))} isPlaying={playingKey === bookKey(i, 'b-summary')} onTogglePlay={() => onTogglePlay(bookKey(i, 'b-summary'), book.summaryGainDb, book.summaryPlaybackRate)}
              onToggleExpand={() => onToggleExpand(bookKey(i, 'b-summary'))}
              onDrop={fn => dropImage(i, fn, 'summary')} onAddAnchor={t => addAnchor(i, t, 'summary')}
              images={<InlineImageRow images={imgsSummary} {...imgRowProps} />}
              actions={<SaveButton onSave={() => saveField(['books', i, 'summary'], book.summary)} />}
              footer={
                <>
                  <RowSpeakerSelect value={book.summarySpeaker} speakers={speakers} name={`spk-b${i}-summary`}
                    onChange={next => uB(i, 'summarySpeaker', next)} />
                  <SegmentSfxEditor sfx={book.summarySfx} files={sfxFiles} basePath={sfxBase}
                    onChange={next => uB(i, 'summarySfx', next)} />
                  <GainDbInput value={typeof book.summaryGainDb === 'number' ? book.summaryGainDb : undefined}
                    onChange={next => uB(i, 'summaryGainDb', next)} sectionKey={bookKey(i, 'b-summary')} />
                  <PlaybackRateInput value={typeof book.summaryPlaybackRate === 'number' ? book.summaryPlaybackRate : undefined}
                    onChange={next => uB(i, 'summaryPlaybackRate', next)} sectionKey={bookKey(i, 'b-summary')} />
                </>
              }
            />
          </div>
          {musicFiles.length > 0 && (
            <BgmSelect label="요약 BGM" current={book.bgm?.summary?.file} files={musicFiles}
              onSelect={f => setBookBgm(i, 'summary', f)} onRemove={() => setBookBgm(i, 'summary', null)} />
          )}

          <div style={accentStyle(book.contextMainSpeaker)}>
            <ScenarioRow label="감상 배경" role="narrator" value={book.contextMain}
              voiceInfo={vi(bookKey(i, 'c-context'), book.contextDuration)}
              onCommit={(v, prev) => uB(i, 'contextMain', v, prev)}
              pickMode={picking} onPick={(t) => handlePick(t, 'context')}
              highlights={imgsCtxMain.map((img: CinematicImage) => img.text).filter((t: string | undefined): t is string => !!t)}
              sectionKey={bookKey(i, 'c-context')} audioUrl={vUrl(bookKey(i, 'c-context'))}
              playbackRate={typeof book.contextMainPlaybackRate === 'number' ? book.contextMainPlaybackRate : undefined}
              activeEngine={activeEngine(bookKey(i, 'c-context'))} isPlaying={playingKey === bookKey(i, 'c-context')} onTogglePlay={() => onTogglePlay(bookKey(i, 'c-context'), book.contextMainGainDb, book.contextMainPlaybackRate)}
              onToggleExpand={() => onToggleExpand(bookKey(i, 'c-context'))}
              onDrop={fn => dropImage(i, fn, 'context')} onAddAnchor={t => addAnchor(i, t, 'context')}
              images={<InlineImageRow images={imgsCtxMain} {...imgRowProps} />}
              actions={<SaveButton onSave={() => saveField(['books', i, 'contextMain'], book.contextMain)} />}
              footer={
                <>
                  <RowSpeakerSelect value={book.contextMainSpeaker} speakers={speakers} name={`spk-b${i}-context`}
                    onChange={next => uB(i, 'contextMainSpeaker', next)} />
                  <SegmentSfxEditor sfx={book.contextMainSfx} files={sfxFiles} basePath={sfxBase}
                    onChange={next => uB(i, 'contextMainSfx', next)} />
                  <GainDbInput value={typeof book.contextMainGainDb === 'number' ? book.contextMainGainDb : undefined}
                    onChange={next => uB(i, 'contextMainGainDb', next)} sectionKey={bookKey(i, 'c-context')} />
                  <PlaybackRateInput value={typeof book.contextMainPlaybackRate === 'number' ? book.contextMainPlaybackRate : undefined}
                    onChange={next => uB(i, 'contextMainPlaybackRate', next)} sectionKey={bookKey(i, 'c-context')} />
                </>
              }
            />
          </div>
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
