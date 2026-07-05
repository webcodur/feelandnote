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
import { bookKey, bookFieldParts, afterPhase, imagesForPart } from '../../../../utils'
import type { SfxItem } from '../../../../../EpisodeEditor'
import type { CinematicImage, ImageField } from '../../../../types'

/**
 * 단일 인용 페어 렌더 — 직접 인용 + (있으면) 후속 맥락.
 * BookSection 의 quotePairs.map 본문을 그대로 분리한 것. 로직 무변경.
 */
export function QuotePairRow({
  pair, pi, i, picking,
  pairQuoteImgs, pairAfterImgs,
  vi, vUrl, updateQuotePair, updateAfterSplit, updateAfterPartSetting, handlePick, onTogglePlay, onToggleExpand,
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
  updateAfterSplit: (bookIdx: number, pairIdx: number, parts: string[]) => void
  updateAfterPartSetting: (
    bookIdx: number,
    pairIdx: number,
    partIdx: number,
    which: 'Speaker' | 'GainDb' | 'PlaybackRate' | 'Sfx',
    value: unknown,
    partCount: number,
  ) => void
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
  return (
    <Fragment>
      {/* 직접 인용 */}
      <div className="relative group/del" style={accentStyle(pair.quoteSpeaker)}>
        <ScenarioRow label={`직접 인용${pi > 0 ? ` ${pi + 1}` : ''}`} role="celeb" value={pair.quote} live
          barColor="rgba(244,63,94,0.8)" headerColor="rgba(244,63,94,0.22)" panelTint="244,63,94"
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

      {/* 후속 맥락 — 토막별 행 (핵심 요약·감상 배경과 동일 패턴). 분할 없으면 1행. 화자·SFX·음량·배속은 전 토막 공유(첫 행에서만 편집). */}
      {pair.after ? (() => {
        const parts = bookFieldParts(pair.after, pair.afterParts)
        const n = parts.length
        const pairLabel = pi > 0 ? ` ${pi + 1}` : ''
        return parts.map((partText: string, ap: number) => {
          const key = bookKey(i, afterPhase(pi, ap))
          const partImgs = imagesForPart(pairAfterImgs, parts, ap)
          const first = ap === 0
          // 토막별 유효 설정 — 배열값 우선, 없으면 단일값 폴백(토막 1개면 단일값 그대로).
          const spk = (pair.afterPartSpeakers?.[ap] ?? pair.afterSpeaker) as string | undefined
          const sfx = (pair.afterPartSfxs?.[ap] ?? pair.afterSfx) as SfxItem[] | undefined
          const gain = typeof pair.afterPartGainDbs?.[ap] === 'number' ? pair.afterPartGainDbs[ap] : pair.afterGainDb
          const rate = typeof pair.afterPartPlaybackRates?.[ap] === 'number' ? pair.afterPartPlaybackRates[ap] : pair.afterPlaybackRate
          return (
            <div key={key} className="relative group/del" style={accentStyle(spk)}>
              <ScenarioRow label={n > 1 ? `후속 맥락${pairLabel} ${ap + 1}/${n}` : `후속 맥락${pairLabel}`}
                role="narrator" value={partText} live
                barColor="rgba(139,92,246,0.8)"
                headerColor={`rgba(139,92,246,${(0.22 + 0.07 * ap).toFixed(3)})`}
                panelTint="139,92,246"
                voiceInfo={vi(key, n > 1 ? pair.afterPartDurations?.[ap] : pair.afterDuration)}
                onCommit={(v) => { const next = [...parts]; next[ap] = v; updateAfterSplit(i, pi, next) }}
                onSplitAt={(offset, text) => {
                  const next = [...parts]
                  next.splice(ap, 1, text.slice(0, offset), text.slice(offset))
                  updateAfterSplit(i, pi, next)
                }}
                pickMode={picking} onPick={(t) => handlePick(t, 'quote')}
                highlights={partImgs.map((img: CinematicImage) => img.text).filter((t: string | undefined): t is string => !!t)}
                sectionKey={key} audioUrl={vUrl(key)}
                playbackRate={typeof rate === 'number' ? rate : undefined}
                activeEngine={activeEngine(key)} isPlaying={playingKey === key} onTogglePlay={() => onTogglePlay(key, gain, rate)}
                onToggleExpand={() => onToggleExpand(key)}
                onDrop={fn => dropImage(i, fn, 'quote')} onAddAnchor={t => addAnchor(i, t, 'quote')}
                images={<InlineImageRow images={partImgs} {...imgRowProps} />}
                actions={
                  <>
                    {ap > 0 && (
                      <button
                        onClick={() => {
                          const next = [...parts]
                          next.splice(ap - 1, 2, `${parts[ap - 1]}\n\n${parts[ap]}`)
                          updateAfterSplit(i, pi, next)
                        }}
                        className="px-2 py-0.5 text-xs font-bold text-text-secondary border border-border/40 rounded hover:border-accent/40 hover:text-accent transition-colors"
                        title="이 토막을 앞 토막과 합친다"
                      >⇧ 합치기</button>
                    )}
                    <SaveButton onSave={async () => {
                      await saveField(['books', i, 'quotePairs', pi, 'afterParts'], n > 1 ? parts : undefined)
                      await saveField(['books', i, 'quotePairs', pi, 'after'], parts.join('\n\n'))
                      await saveField(['books', i, 'quotePairs', pi, 'afterPartSpeakers'], n > 1 ? pair.afterPartSpeakers : undefined)
                      await saveField(['books', i, 'quotePairs', pi, 'afterPartGainDbs'], n > 1 ? pair.afterPartGainDbs : undefined)
                      await saveField(['books', i, 'quotePairs', pi, 'afterPartPlaybackRates'], n > 1 ? pair.afterPartPlaybackRates : undefined)
                      await saveField(['books', i, 'quotePairs', pi, 'afterPartSfxs'], n > 1 ? pair.afterPartSfxs : undefined)
                    }} />
                  </>
                }
                footer={
                  <>
                    <RowSpeakerSelect value={spk} speakers={speakers}
                      name={`spk-b${i}-after${pi}-${ap}`}
                      onChange={next => updateAfterPartSetting(i, pi, ap, 'Speaker', next, n)} />
                    <SegmentSfxEditor sfx={sfx} files={sfxFiles} basePath={sfxBase}
                      onChange={next => updateAfterPartSetting(i, pi, ap, 'Sfx', next, n)} />
                    <GainDbInput value={typeof gain === 'number' ? gain : undefined}
                      onChange={next => updateAfterPartSetting(i, pi, ap, 'GainDb', next, n)} sectionKey={key} />
                    <PlaybackRateInput value={typeof rate === 'number' ? rate : undefined}
                      onChange={next => updateAfterPartSetting(i, pi, ap, 'PlaybackRate', next, n)} sectionKey={key} />
                  </>
                }
              />
              {first && (
                <button onClick={() => updateAfterSplit(i, pi, [])} className="absolute top-1 right-6 text-sm font-bold text-red-400 hover:text-red-300 opacity-0 group-hover/del:opacity-100 transition-opacity">삭제</button>
              )}
            </div>
          )
        })
      })() : (
        <AddFieldButton label="+ 후속 맥락" onClick={() => updateQuotePair(i, pi, 'after', '(후속 맥락 입력)')} />
      )}
    </Fragment>
  )
}
