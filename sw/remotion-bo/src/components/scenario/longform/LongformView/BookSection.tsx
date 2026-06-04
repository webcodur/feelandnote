'use client'

import { Fragment } from 'react'
import { ScenarioRow, AddFieldButton } from '../../ScenarioRow'
import { SaveButton } from '../../SaveButton'
import { SegmentSfxEditor } from '../../SegmentSfxEditor'
import { RowSpeakerSelect } from '../../RowSpeakerSelect'
import { AnchorConfirmBanner } from '../../AnchorConfirmBanner'
import { GainDbInput } from '../../GainDbInput'
import type { Speaker } from '../../SpeakerPanel'
import { InlineImageRow } from '../../ImageThumb'
import { BgmSelect } from '../BgmSelect'
import { BookCopyButton } from '../CopyButton'
import { bookKey, lookupVoice, matchImagesToField, unmatchedImages, distributeContextImages } from '../../utils'
import type { VoiceSection } from '../../../voice-utils'
import type { SfxItem } from '../../../EpisodeEditor'
import type { CinematicImage, AnchorPick, ImageField } from '../../types'
import type { MusicFile } from './useLongformState'

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
}: {
  book: any
  displayI: number
  realIdx: number
  totalBooks: number
  isFocused: boolean
  sectionMap: Map<string, VoiceSection>
  series: string
  name: string
  allImgs: CinematicImage[]
  anchorPick: AnchorPick
  setAnchorPick: (v: AnchorPick) => void
  confirmAnchor: () => void
  imageBaseUrl: string
  replaceImage: any
  removeImage: any
  removeImageOnly: any
  crossUsage: Map<string, string[]> | undefined
  uB: (i: number, field: string, value: unknown, prev?: string) => void
  dropImage: (i: number, fn: string, field?: ImageField) => void
  addAnchor: (i: number, t: string, field?: ImageField) => void
  handlePick: (selected: string, field?: ImageField) => void
  updateQuotePair: (bookIdx: number, pairIdx: number, field: string, value: any, prev?: string) => void
  addQuotePair: (bookIdx: number) => void
  removeQuotePair: (bookIdx: number, pairIdx: number) => void
  saveField: (path: Array<string | number>, value: unknown) => Promise<void>
  activeEngine: (key: string) => string
  playingKey: string | null
  onTogglePlay: (key: string, gainDb?: number | null) => void
  onToggleExpand: (key: string) => void
  musicFiles: MusicFile[]
  setBookBgm: (bookIdx: number, section: 'summary' | 'context', fileName: string | null) => void
  sfxFiles: { name: string; duration: number | null }[]
  sfxBase: string
  speakers: Speaker[]
}) {
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
              activeEngine={activeEngine(bookKey(i, 'a-title'))} isPlaying={playingKey === bookKey(i, 'a-title')} onTogglePlay={() => onTogglePlay(bookKey(i, 'a-title'), book.titleGainDb)}
              onToggleExpand={() => onToggleExpand(bookKey(i, 'a-title'))}
              footer={
                <>
                  <RowSpeakerSelect value={book.titleSpeaker} speakers={speakers} name={`spk-b${i}-title`}
                    onChange={next => uB(i, 'titleSpeaker', next)} />
                  <SegmentSfxEditor sfx={book.titleSfx} files={sfxFiles} basePath={sfxBase}
                    onChange={next => uB(i, 'titleSfx', next)} />
                  <GainDbInput value={typeof book.titleGainDb === 'number' ? book.titleGainDb : undefined}
                    onChange={next => uB(i, 'titleGainDb', next)} sectionKey={bookKey(i, 'a-title')} />
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
              activeEngine={activeEngine(bookKey(i, 'b-summary'))} isPlaying={playingKey === bookKey(i, 'b-summary')} onTogglePlay={() => onTogglePlay(bookKey(i, 'b-summary'), book.summaryGainDb)}
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
              activeEngine={activeEngine(bookKey(i, 'c-context'))} isPlaying={playingKey === bookKey(i, 'c-context')} onTogglePlay={() => onTogglePlay(bookKey(i, 'c-context'), book.contextMainGainDb)}
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
                </>
              }
            />
          </div>
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
              <Fragment key={`qp-${pi}`}>
                {/* 직접 인용 */}
                <div className="relative group/del" style={accentStyle(pair.quoteSpeaker)}>
                  <ScenarioRow label={`직접 인용${pi > 0 ? ` ${pi + 1}` : ''}`} role="celeb" value={pair.quote}
                    voiceInfo={vi(quoteKey, pair.quoteDuration)} onCommit={(v, prev) => updateQuotePair(i, pi, 'quote', v, prev)}
                    pickMode={picking} onPick={(t) => handlePick(t, 'quote')}
                    highlights={pairQuoteImgs.map((img: CinematicImage) => img.text).filter((t: string | undefined): t is string => !!t)}
                    sectionKey={quoteKey} audioUrl={vUrl(quoteKey)}
                    activeEngine={activeEngine(quoteKey)} isPlaying={playingKey === quoteKey} onTogglePlay={() => onTogglePlay(quoteKey, pair.quoteGainDb)}
                    onToggleExpand={() => onToggleExpand(quoteKey)}
                    onDrop={fn => dropImage(i, fn, 'quote')} onAddAnchor={t => addAnchor(i, t, 'quote')}
                    images={<InlineImageRow images={pairQuoteImgs} {...imgRowProps} />}
                    actions={<SaveButton onSave={() => saveField(['books', i, 'quotePairs', pi, 'quote'], pair.quote)} />}
                    footer={
                      <>
                        <RowSpeakerSelect value={pair.quoteSpeaker as string | undefined} speakers={speakers}
                          name={`spk-b${i}-quote${pi}`}
                          onChange={next => updateQuotePair(i, pi, 'quoteSpeaker', next)} />
                        <SegmentSfxEditor sfx={pair.quoteSfx as SfxItem[] | undefined} files={sfxFiles} basePath={sfxBase}
                          onChange={next => updateQuotePair(i, pi, 'quoteSfx', next)} />
                        <GainDbInput value={typeof pair.quoteGainDb === 'number' ? pair.quoteGainDb : undefined}
                          onChange={next => updateQuotePair(i, pi, 'quoteGainDb', next)} sectionKey={quoteKey} />
                        <div className="ml-[72px] mt-1 mb-1 flex items-center gap-1">
                          <span className="text-sm font-bold text-text-secondary/60">출처:</span>
                          <input
                            className="text-sm font-bold text-[#c8a46e]/90 bg-bg-card/60 border border-border/40 rounded px-1 py-0.5 focus:border-accent/60 focus:outline-none flex-1 max-w-[400px]"
                            value={pair.quoteSource ?? ''}
                            onChange={e => updateQuotePair(i, pi, 'quoteSource', e.target.value || undefined)}
                            placeholder="(예: 인터뷰 제목·매체·연도)"
                            title="이 인용 출처 — 인터뷰·기사·서신 등"
                          />
                        </div>
                      </>
                    }
                  />
                  <button onClick={() => removeQuotePair(i, pi)} className="absolute top-1 right-6 text-sm font-bold text-red-400 hover:text-red-300 opacity-0 group-hover/del:opacity-100 transition-opacity">삭제</button>
                </div>

                {/* 후속 맥락 */}
                {pair.after ? (
                  <div className="relative group/del" style={accentStyle(pair.afterSpeaker)}>
                    <ScenarioRow label={`후속 맥락${pi > 0 ? ` ${pi + 1}` : ''}`} role="narrator" value={pair.after}
                      voiceInfo={vi(afterKey, pair.afterDuration)}
                      onCommit={(v, prev) => updateQuotePair(i, pi, 'after', v, prev)}
                      pickMode={picking} onPick={(t) => handlePick(t, 'quote')}
                      highlights={pairAfterImgs.map((img: CinematicImage) => img.text).filter((t: string | undefined): t is string => !!t)}
                      sectionKey={afterKey} audioUrl={vUrl(afterKey)}
                      activeEngine={activeEngine(afterKey)} isPlaying={playingKey === afterKey} onTogglePlay={() => onTogglePlay(afterKey, pair.afterGainDb)}
                      onToggleExpand={() => onToggleExpand(afterKey)}
                      onDrop={fn => dropImage(i, fn, 'quote')} onAddAnchor={t => addAnchor(i, t, 'quote')}
                      images={<InlineImageRow images={pairAfterImgs} {...imgRowProps} />}
                      actions={<SaveButton onSave={() => saveField(['books', i, 'quotePairs', pi, 'after'], pair.after)} />}
                      footer={
                        <>
                          <RowSpeakerSelect value={pair.afterSpeaker as string | undefined} speakers={speakers}
                            name={`spk-b${i}-after${pi}`}
                            onChange={next => updateQuotePair(i, pi, 'afterSpeaker', next)} />
                          <SegmentSfxEditor sfx={pair.afterSfx as SfxItem[] | undefined} files={sfxFiles} basePath={sfxBase}
                            onChange={next => updateQuotePair(i, pi, 'afterSfx', next)} />
                          <GainDbInput value={typeof pair.afterGainDb === 'number' ? pair.afterGainDb : undefined}
                            onChange={next => updateQuotePair(i, pi, 'afterGainDb', next)} sectionKey={afterKey} />
                        </>
                      }
                    />
                    <button onClick={() => updateQuotePair(i, pi, 'after', undefined)} className="absolute top-1 right-6 text-sm font-bold text-red-400 hover:text-red-300 opacity-0 group-hover/del:opacity-100 transition-opacity">삭제</button>
                  </div>
                ) : (
                  <AddFieldButton label="+ 후속 맥락" onClick={() => updateQuotePair(i, pi, 'after', '(후속 맥락 입력)')} />
                )}
              </Fragment>
            )
          })}

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
