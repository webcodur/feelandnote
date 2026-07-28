'use client'

/**
 * 발언 한 줄 — 왼쪽에 대사, 오른쪽에 그 발언의 사진.
 *
 * 격자의 한 행을 이루는 **두 칸**을 내놓는다. 둘이 같은 행에 놓이므로 깊은 쪽이 행 높이를 정하고
 * 얕은 쪽은 그만큼 빈 자리로 남는다 — 높이를 재서 맞추는 것이 아니라 배치가 스스로 맞물린다.
 * 그래서 대사와 그 대사에 걸린 사진이 화면에서 언제나 마주 본다(팩션 인물 행과 같은 짜임새).
 *
 * 대사 입력칸·사진 카드 모두 팩션과 같은 공용 부품이다(`QuoteEditor`·`ImageCard`).
 */

import { useState } from 'react'
import type { Speaker, Turn, DiscourseImageCrop } from '@/lib/discourse-types'
import { ChevronDown, ChevronUp, Eye, EyeOff, Trash2 } from '@feelandnote/shared/bo/icons'
import { ImageCard, ImagePicker, DISCOURSE_IMAGE_DND } from '@feelandnote/shared/bo/media'
import { QuoteEditor, adjustImageChanges } from '@feelandnote/shared/bo/quote-editor'
import type { EditLang } from '@feelandnote/shared/bo/editor'
import { imageSrc, turnChunks } from '../../shared/timing'
import { turnAnchorMap } from '../../shared/anchorMap'
import { castColorOf } from './CastColorBar'
import { TurnDetailPanel } from './TurnDetailPanel'
import type { DiscourseVoiceMeta } from '../voice-meta'

type ImageChange = { chunk: number; image: string; crop?: DiscourseImageCrop }

type Props = {
  turn: Turn
  index: number
  cast: Speaker[]
  series: string
  episodeName: string
  editLang: EditLang
  onChange: (next: Turn) => void
  onDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  voiceFile: string
  voiceMeta?: DiscourseVoiceMeta
  selected: boolean
  onSelect: () => void
  /** 내용이 바뀌어 음성을 다시 만들어야 할 때 알린다 */
  onStale: () => void
}

export function TurnRow({
  turn, index, cast, series, episodeName, editLang, onChange, onDelete, onMoveUp, onMoveDown,
  voiceFile, voiceMeta, selected, onSelect, onStale,
}: Props) {
  /** 사진 고르는 창 — 시작 사진이거나 넘김 자리 하나 */
  const [pick, setPick] = useState<{ kind: 'start' } | { kind: 'change'; idx: number } | null>(null)
  /** 나머지 설정 펼침 — 기본은 접힘(팩션 인물 행과 같다) */
  const [openDetail, setOpenDetail] = useState(false)

  const speaker = cast[turn.cast]
  const color = castColorOf(speaker, turn.cast)
  const chunks = turnChunks(turn)
  const changes = turn.imageChanges ?? []
  const anchors = turnAnchorMap(turn)
  const koValue = turn.chunks?.join('\n') ?? turn.text ?? ''

  const setChanges = (list: ImageChange[]) => onChange({ ...turn, imageChanges: list.length ? list : undefined })
  const setIc = (idx: number, patch: Partial<ImageChange>) =>
    setChanges(changes.map((c, i) => (i === idx ? { ...c, ...patch } : c)))

  /** 대사 고치기 — 줄이 늘고 줄면 사진 자리도 따라 옮긴다 */
  const setKo = (raw: string) => {
    const next = raw.split('\n')
    const moved = adjustImageChanges(koValue, raw, changes)
    onChange({
      ...turn,
      chunks: next,
      text: next.map(s => s.trim()).filter(Boolean).join(' '),
      imageChanges: moved.length ? moved : undefined,
    })
    if (turn.duration != null) onStale()
  }

  /** 자리 걸기 — 걸자마자 사진을 고르게 창을 띄운다 */
  const addAnchor = (chunk: number) => {
    const exist = changes.findIndex(c => c.chunk === chunk)
    if (exist >= 0) { setPick({ kind: 'change', idx: exist }); return }
    const list = [...changes, { chunk, image: '' }].sort((a, b) => a.chunk - b.chunk)
    setChanges(list)
    setPick({ kind: 'change', idx: list.findIndex(c => c.chunk === chunk) })
  }

  /** 새 넘김 자리 — 아직 안 쓴 줄 중 가장 이른 곳 */
  const addChange = () => {
    const taken = new Set(changes.map(c => c.chunk))
    let chunk = 1
    while (chunk < chunks.length && taken.has(chunk)) chunk++
    if (chunk >= chunks.length) chunk = Math.max(1, chunks.length - 1)
    addAnchor(chunk)
  }

  const pickChange = pick?.kind === 'change' ? changes[pick.idx] : undefined
  const orphan = changes.filter(c => c.chunk >= chunks.length)

  return (
    <>
      {/* 왼쪽 칸 — 말하는 사람과 대사 */}
      <div
        onClick={onSelect}
        className={`min-w-0 overflow-hidden rounded-lg border ${selected ? 'border-accent shadow-sm' : 'border-border'} ${turn.disabled ? 'opacity-50 saturate-50' : ''}`}
      >
        <div className="flex items-center gap-1.5 border-s-4 bg-bg-secondary px-2 py-1.5" style={{ borderInlineStartColor: color }}>
          <span className="shrink-0 text-[11px] font-black text-text-dim">{index + 1}</span>
          <select
            value={turn.cast}
            onChange={e => onChange({ ...turn, cast: Number(e.target.value) })}
            onClick={e => e.stopPropagation()}
            className="min-w-0 max-w-[9rem] rounded border border-border bg-bg-card px-1.5 py-0.5 text-[11px] font-bold focus:border-accent focus:outline-none"
            style={{ color }}
            title="말하는 사람"
          >
            {cast.map((s, ci) => <option key={ci} value={ci}>{s.name || `${ci + 1}번 인물`}</option>)}
            {!cast.length && <option value={turn.cast}>인물을 먼저 넣으세요</option>}
          </select>

          <button
            onClick={e => { e.stopPropagation(); setOpenDetail(v => !v) }}
            className="flex shrink-0 items-center gap-0.5 rounded border border-border bg-bg-card px-1.5 py-0.5 text-[10px] font-semibold text-text-secondary hover:border-accent hover:text-accent"
            title="이 발언의 종류·대상·쇼츠 편·효과·음성"
          >
            설정 {openDetail ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
          </button>

          <div className="ms-auto flex shrink-0 items-center gap-0.5">
            <button
              onClick={e => { e.stopPropagation(); onChange({ ...turn, disabled: turn.disabled ? undefined : true }) }}
              className="rounded p-1 text-text-secondary hover:bg-bg-hover hover:text-accent"
              title={turn.disabled ? '이 발언을 다시 영상에 넣습니다' : '이 발언을 영상에서 뺍니다 (데이터는 남습니다)'}
            >
              {turn.disabled ? <Eye size={13} /> : <EyeOff size={13} />}
            </button>
            <button onClick={e => { e.stopPropagation(); onMoveUp() }} className="rounded p-1 text-text-secondary hover:bg-bg-hover hover:text-accent" title="위로">
              <ChevronUp size={13} />
            </button>
            <button onClick={e => { e.stopPropagation(); onMoveDown() }} className="rounded p-1 text-text-secondary hover:bg-bg-hover hover:text-accent" title="아래로">
              <ChevronDown size={13} />
            </button>
            <button onClick={e => { e.stopPropagation(); onDelete() }} className="rounded p-1 text-danger-text hover:bg-danger/15" title="이 발언을 지웁니다">
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        <div className="flex gap-2 p-2">
          {editLang !== 'en' && (
            <div className="min-w-0 flex-1 rounded-md border border-border bg-bg-card p-1 shadow-inner">
              <QuoteEditor
                value={koValue}
                onChange={setKo}
                anchors={anchors}
                onAddAnchor={addAnchor}
                onRemoveAnchor={chunk => setChanges(changes.filter(c => c.chunk !== chunk))}
                onMoveAnchor={(from, to) => {
                  const list = changes.map(c => {
                    if (c.chunk === from) return { ...c, chunk: to }
                    if (c.chunk === to) return { ...c, chunk: from }
                    return c
                  }).sort((a, b) => a.chunk - b.chunk)
                  setChanges(list)
                }}
                onOpenAnchor={chunk => {
                  const idx = changes.findIndex(c => c.chunk === chunk)
                  if (idx >= 0) setPick({ kind: 'change', idx })
                }}
                placeholder="엔터를 치면 덩어리가 나뉩니다"
                labelText="사진 바뀜"
                emptyLabelText="사진 없음"
                className="min-h-[84px] text-text-primary placeholder:text-text-dim"
              />
            </div>
          )}
          {editLang !== 'ko' && (
            <div className="min-w-0 flex-1 rounded-md border border-border bg-bg-card/60 p-1 shadow-inner">
              <QuoteEditor
                value={turn.chunksEn?.join('\n') ?? turn.textEn ?? ''}
                onChange={raw => {
                  const next = raw.split('\n')
                  onChange({ ...turn, chunksEn: next, textEn: next.map(s => s.trim()).filter(Boolean).join(' ') })
                }}
                anchors={anchors}
                placeholder="EN 대사 (엔터로 나눔)"
                className="min-h-[84px] italic text-text-secondary placeholder:text-text-dim"
              />
            </div>
          )}
        </div>

        {openDetail && (
          <div className="border-t border-border p-2">
            <TurnDetailPanel
              turn={turn}
              index={index}
              cast={cast}
              series={series}
              episodeName={episodeName}
              voiceFile={voiceFile}
              voiceMeta={voiceMeta}
              onChange={onChange}
            />
          </div>
        )}
      </div>

      {/* 오른쪽 칸 — 이 발언에 걸리는 사진 */}
      <div className="flex flex-col gap-2">
        <ImageCard
          dnd={DISCOURSE_IMAGE_DND}
          src={imageSrc(series, episodeName, turn.image)}
          crop={turn.imageCrop}
          inheritedSrc={imageSrc(series, episodeName, speaker?.image)}
          inheritedCrop={speaker?.imageCrop}
          inheritedLabel="인물 사진"
          onDropImage={path => onChange({ ...turn, image: path })}
          onOpenPicker={() => { onSelect(); setPick({ kind: 'start' }) }}
          label="#1 시작"
          theme={anchors.get(0)?.hasImage ? anchors.get(0)?.theme : undefined}
          onRemove={turn.image ? () => onChange({ ...turn, image: undefined, imageCrop: undefined }) : undefined}
          caption={chunks[0] ?? ''}
        />

        {changes
          .map((ic, idx) => ({ ic, idx }))
          .sort((a, b) => a.ic.chunk - b.ic.chunk)
          .map(({ ic, idx }) => (
            <ImageCard
              key={idx}
              dnd={DISCOURSE_IMAGE_DND}
              src={imageSrc(series, episodeName, ic.image)}
              crop={ic.crop}
              onDropImage={path => setIc(idx, { image: path, crop: undefined })}
              onOpenPicker={() => { onSelect(); setPick({ kind: 'change', idx }) }}
              label={`#${ic.chunk + 1} 넘김`}
              theme={anchors.get(ic.chunk)?.hasImage ? anchors.get(ic.chunk)?.theme : undefined}
              onClearImage={() => setIc(idx, { image: '' })}
              onRemove={() => setChanges(changes.filter((_, i) => i !== idx))}
              caption={chunks[ic.chunk] ?? ''}
            >
              <div className="flex items-center rounded bg-bg-hover px-0.5 py-0.5">
                <select
                  value={ic.chunk}
                  onChange={e => setIc(idx, { chunk: Number(e.target.value) })}
                  onClick={e => e.stopPropagation()}
                  className="w-full rounded border border-border bg-bg-main px-1 py-0.5 text-[10px] focus:border-accent focus:outline-none"
                  title="이 줄부터 왼쪽 사진으로 넘어갑니다"
                >
                  {(chunks.length ? chunks : ['']).map((c, i) => (
                    <option key={i} value={i}>
                      [{i + 1}] {c.trim() ? (c.length > 8 ? `${c.slice(0, 8)}…` : c) : '(빈 줄)'}
                    </option>
                  ))}
                </select>
              </div>
            </ImageCard>
          ))}

        <button
          type="button"
          onClick={addChange}
          disabled={chunks.length < 2}
          title={chunks.length < 2 ? '대사가 한 줄뿐이라 넘길 자리가 없습니다 — 엔터로 줄을 나누세요' : '말하는 도중 사진이 넘어가는 자리를 하나 더 만듭니다'}
          className="flex h-10 w-[280px] shrink-0 items-center justify-center gap-2 rounded-md border border-dashed border-border text-[10px] text-text-dim hover:border-text-secondary hover:bg-bg-hover hover:text-text-secondary disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-border disabled:hover:bg-transparent"
        >
          <span className="text-base leading-none">+</span> 사진 넘김 추가
        </button>

        {orphan.length > 0 && (
          <p className="text-[11px] font-semibold text-warning-text">
            지금은 없는 줄에 사진이 걸려 있습니다.
            <button
              onClick={() => setChanges(changes.filter(c => c.chunk < chunks.length))}
              className="ms-1.5 rounded border border-warning-text/50 px-1.5 py-0.5 hover:bg-warning/20"
            >
              지우기
            </button>
          </p>
        )}
      </div>

      {/* 사진 고르는 창 — 자르기·확대도 여기서 */}
      {pick?.kind === 'start' && (
        <ImagePicker
          value={turn.image}
          onChange={next => onChange({ ...turn, image: next })}
          crop={turn.imageCrop}
          onCropChange={c => onChange({ ...turn, imageCrop: c })}
          captionArea
          series={series}
          episodeName={episodeName}
          slug={speaker?.slug}
          title={`${index + 1}번 발언 시작 사진`}
          onClose={() => setPick(null)}
        />
      )}
      {pick?.kind === 'change' && pickChange && (
        <ImagePicker
          value={pickChange.image}
          onChange={next => setIc(pick.idx, { image: next ?? '' })}
          crop={pickChange.crop}
          onCropChange={crop => setIc(pick.idx, { crop })}
          captionArea
          series={series}
          episodeName={episodeName}
          slug={speaker?.slug}
          title={`${pickChange.chunk + 1}번째 줄부터 바뀔 사진`}
          onClose={() => setPick(null)}
        />
      )}
    </>
  )
}
