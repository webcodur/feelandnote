'use client'

import { Fragment } from 'react'
import { ScenarioRow, AddFieldButton } from '../../../../ScenarioRow'
import { SaveButton } from '../../../../SaveButton'
import { SegmentSfxEditor } from '../../../../SegmentSfxEditor'
import { RowSpeakerSelect } from '../../../../RowSpeakerSelect'
import { GainDbInput } from '../../../../GainDbInput'
import { PlaybackRateInput } from '../../../../PlaybackRateInput'
import type { Speaker } from '../../../../SpeakerPanel'
import { InlineImageRow } from '../../../../ImageThumb'
import { bookKey } from '../../../../utils'
import type { SfxItem } from '../../../../../EpisodeEditor'
import type { CinematicImage, ImageField } from '../../../../types'

/**
 * 단일 인용 페어 렌더 — 직접 인용 + (있으면) 후속 맥락.
 * BookSection 의 quotePairs.map 본문을 그대로 분리한 것. 로직 무변경.
 */
export function QuotePairRow({
  pair, pi, i, picking,
  pairQuoteImgs, pairAfterImgs,
  vi, vUrl, updateQuotePair, handlePick, onTogglePlay, onToggleExpand,
  dropImage, addAnchor, saveField, removeQuotePair,
  activeEngine, playingKey, accentStyle, imgRowProps,
  speakers, sfxFiles, sfxBase,
}: {
  pair: any
  pi: number
  i: number
  picking: boolean
  pairQuoteImgs: CinematicImage[]
  pairAfterImgs: CinematicImage[]
  vi: (key: string, dur?: number) => any
  vUrl: (key: string) => string
  updateQuotePair: (bookIdx: number, pairIdx: number, field: string, value: any, prev?: string) => void
  handlePick: (selected: string, field?: ImageField) => void
  onTogglePlay: (key: string, gainDb?: number | null, mediaRate?: number | null) => void
  onToggleExpand: (key: string) => void
  dropImage: (i: number, fn: string, field?: ImageField) => void
  addAnchor: (i: number, t: string, field?: ImageField) => void
  saveField: (path: Array<string | number>, value: unknown) => Promise<void>
  removeQuotePair: (bookIdx: number, pairIdx: number) => void
  activeEngine: (key: string) => string
  playingKey: string | null
  accentStyle: (id?: string) => React.CSSProperties | undefined
  imgRowProps: any
  speakers: Speaker[]
  sfxFiles: { name: string; duration: number | null }[]
  sfxBase: string
}) {
  const quoteKey = bookKey(i, `d${pi * 2 + 1}-quote`)
  const afterKey = bookKey(i, `d${pi * 2 + 2}-after`)
  return (
    <Fragment>
      {/* 직접 인용 */}
      <div className="relative group/del" style={accentStyle(pair.quoteSpeaker)}>
        <ScenarioRow label={`직접 인용${pi > 0 ? ` ${pi + 1}` : ''}`} role="celeb" value={pair.quote}
          voiceInfo={vi(quoteKey, pair.quoteDuration)} onCommit={(v, prev) => updateQuotePair(i, pi, 'quote', v, prev)}
          pickMode={picking} onPick={(t) => handlePick(t, 'quote')}
          highlights={pairQuoteImgs.map((img: CinematicImage) => img.text).filter((t: string | undefined): t is string => !!t)}
          sectionKey={quoteKey} audioUrl={vUrl(quoteKey)}
          playbackRate={typeof pair.quotePlaybackRate === 'number' ? pair.quotePlaybackRate : undefined}
          activeEngine={activeEngine(quoteKey)} isPlaying={playingKey === quoteKey} onTogglePlay={() => onTogglePlay(quoteKey, pair.quoteGainDb, pair.quotePlaybackRate)}
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
              <PlaybackRateInput value={typeof pair.quotePlaybackRate === 'number' ? pair.quotePlaybackRate : undefined}
                onChange={next => updateQuotePair(i, pi, 'quotePlaybackRate', next)} sectionKey={quoteKey} />
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
            playbackRate={typeof pair.afterPlaybackRate === 'number' ? pair.afterPlaybackRate : undefined}
            activeEngine={activeEngine(afterKey)} isPlaying={playingKey === afterKey} onTogglePlay={() => onTogglePlay(afterKey, pair.afterGainDb, pair.afterPlaybackRate)}
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
                <PlaybackRateInput value={typeof pair.afterPlaybackRate === 'number' ? pair.afterPlaybackRate : undefined}
                  onChange={next => updateQuotePair(i, pi, 'afterPlaybackRate', next)} sectionKey={afterKey} />
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
}
