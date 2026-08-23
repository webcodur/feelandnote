'use client'

import { useState } from 'react'
import type { EditLang } from '@feelandnote/shared/bo/editor'
import { ChevronDown, ChevronUp, Trash2 } from '@feelandnote/shared/bo/icons'
import type { FactionPerson, FactionSceneBeat, FactionSequenceItem } from '@/lib/faction-types'
import { factionSceneBeats } from '@/lib/faction-types'
import {
  FACTION_SCENE_MAX_MINIMUM_SEC,
  FACTION_SCENE_MIN_SEC,
  factionSceneTiming,
} from '@feelandnote/shared/lib/faction-scene-timing'
import { CoverPickerButton } from './CoverPickerButton/CoverPickerButton'
import { FactionSceneBeatRow } from './FactionSceneBeatRow'
import { FactionSequenceCard, sequenceCardIconButtonClass } from './FactionSequenceCard'

/** 덩어리 배열 → 길이 계산 SSoT 입력. 화면과 렌더가 같은 값을 보도록 이 변환을 거친다. */
function timingInput(beats: FactionSceneBeat[], en: boolean, captionIdHoldSec?: number, durationSec?: number) {
  return {
    durationSec,
    captionIdHoldSec,
    beats: beats.map(b => ({
      speaker: en ? (b.speakerEn ?? b.speaker) : b.speaker,
      text: en ? (b.textEn ?? b.text) : b.text,
      voiceSec: b.voiceDuration && b.voiceDuration > 0
        ? b.voiceDuration / Math.min(2, Math.max(0.5, b.voicePlaybackRate ?? 1))
        : 0,
    })),
  }
}

type SceneItem = Extract<FactionSequenceItem, { kind: 'entry' }>

type Props = {
  item: SceneItem
  scene: FactionPerson
  sequenceIndex: number
  sequenceLength: number
  numberLabel: string
  onChange: (item: SceneItem, next: FactionPerson) => void
  onMove: (item: SceneItem, direction: -1 | 1) => void
  onDelete: (item: SceneItem) => void
  series: string
  episodeName: string
  editLang: EditLang
  idPrefix: string
  captionIdHoldSec?: number
}

export function FactionNarrativeEntryEditor({
  item,
  scene,
  sequenceIndex,
  sequenceLength,
  numberLabel,
  onChange,
  onMove,
  onDelete,
  series,
  episodeName,
  editLang,
  idPrefix,
  captionIdHoldSec,
}: Props) {
  const [expanded, setExpanded] = useState(true)
  const itemKey = `${item.clusterIndex}-${item.entryIndex}`
  const setScene = (patch: Partial<FactionPerson>) => onChange(item, { ...scene, ...patch })

  // 구 데이터(caption 한 벌)는 해설 덩어리 하나로 승격해 보여준다. 덩어리를 한 번이라도 고치면
  // 덩어리가 단일원천이 되도록 구 필드를 걷어낸다.
  const beats = factionSceneBeats(scene)
  const setBeats = (next: FactionSceneBeat[]) => setScene({
    beats: next,
    caption: undefined,
    captionEn: undefined,
    voiceDuration: undefined,
    voiceGainDb: undefined,
    voicePlaybackRate: undefined,
    voiceSpeaker: undefined,
    voiceStyle: undefined,
  })
  const changeBeat = (index: number, next: FactionSceneBeat) =>
    setBeats(beats.map((b, i) => (i === index ? next : b)))
  const moveBeat = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= beats.length) return
    const next = [...beats]
    ;[next[index], next[target]] = [next[target], next[index]]
    setBeats(next)
  }
  const deleteBeat = (index: number) => setBeats(beats.filter((_, i) => i !== index))
  const addBeat = (speaker?: string) => setBeats([...beats, { speaker, text: '' }])

  const expectedKoSec = factionSceneTiming(timingInput(beats, false, captionIdHoldSec, scene.durationSec)).durationSec
  const expectedEnSec = factionSceneTiming(timingInput(beats, true, captionIdHoldSec, scene.durationSec)).durationSec
  const expectedLabel = editLang === 'both'
    ? `KO ${expectedKoSec.toFixed(1)}초 · EN ${expectedEnSec.toFixed(1)}초`
    : `${(editLang === 'en' ? expectedEnSec : expectedKoSec).toFixed(1)}초 예상`
  const lineCount = beats.filter(b => b.speaker?.trim()).length
  const beatLabel = beats.length === 0
    ? '덩어리 없음'
    : `덩어리 ${beats.length}개${lineCount ? ` · 대사 ${lineCount}` : ''}`
  const title = editLang === 'en'
    ? scene.nameEn?.trim() || scene.name.trim() || '제목 없음'
    : scene.name.trim() || '제목 없음'

  return (
    <FactionSequenceCard
      id={`${idPrefix}-${itemKey}`}
      numberLabel={numberLabel}
      type="scene"
      title={title}
      meta={`${expectedLabel} · ${beatLabel}`}
      expanded={expanded}
      actions={(
        <>
          <button type="button" disabled={sequenceIndex === 0} onClick={() => onMove(item, -1)} className={sequenceCardIconButtonClass} title="이야기 순서에서 위로" aria-label={`${numberLabel} 장면 위로 이동`}><ChevronUp size={15} /></button>
          <button type="button" disabled={sequenceIndex === sequenceLength - 1} onClick={() => onMove(item, 1)} className={sequenceCardIconButtonClass} title="이야기 순서에서 아래로" aria-label={`${numberLabel} 장면 아래로 이동`}><ChevronDown size={15} /></button>
          <span className="mx-0.5 h-5 w-px bg-border" aria-hidden="true" />
          <button type="button" onClick={() => onDelete(item)} className="flex h-8 w-8 items-center justify-center rounded-md border border-danger/40 text-danger-text hover:border-danger/70 hover:bg-danger/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger" title="서사 항목 삭제" aria-label={`${numberLabel} 서사 항목 삭제`}><Trash2 size={15} /></button>
          <button type="button" onClick={() => setExpanded(current => !current)} aria-expanded={expanded} aria-controls={`${idPrefix}-${itemKey}-body`} className={sequenceCardIconButtonClass} title={expanded ? '장면 접기' : '장면 펼치기'}><ChevronDown size={16} className={`transition-transform duration-200 ${expanded ? '' : '-rotate-90'}`} /></button>
        </>
      )}
      contentClassName="p-3"
    >
      <div id={`${idPrefix}-${itemKey}-body`} className="grid items-stretch gap-3 lg:grid-cols-[12rem_minmax(0,1fr)]">
        <CoverPickerButton
          value={scene.image}
          onChange={image => setScene({ image })}
          crop={scene.imageCrop}
          onCropChange={imageCrop => setScene({ imageCrop })}
          label={scene.name || '제목 없음'}
          emptyText="텍스트 배경"
          series={series}
          episodeName={episodeName}
          className="h-40 w-full shrink-0 lg:h-full lg:min-h-40"
        />

        <div className="min-w-0 space-y-2">
          {editLang !== 'en' ? (
            <input value={scene.name} onChange={event => setScene({ name: event.target.value })} placeholder="서사 항목 제목" aria-label="서사 항목 제목" className="w-full rounded-md border border-border bg-bg-main px-2.5 py-1.5 text-sm font-bold text-text-primary focus:border-accent focus:outline-none" />
          ) : null}
          {editLang !== 'ko' ? (
            <input value={scene.nameEn ?? ''} onChange={event => setScene({ nameEn: event.target.value || undefined })} placeholder="English narrative title" aria-label="Narrative entry title" className="w-full rounded-md border border-border bg-bg-main px-2.5 py-1.5 text-sm font-bold text-text-secondary focus:border-accent focus:outline-none" />
          ) : null}

          <div className="space-y-1.5">
            {beats.map((beat, index) => (
              <FactionSceneBeatRow
                key={`${itemKey}-beat-${index}`}
                beat={beat}
                index={index}
                total={beats.length}
                onChange={changeBeat}
                onMove={moveBeat}
                onDelete={deleteBeat}
                editLang={editLang}
                series={series}
                episodeName={episodeName}
                idPrefix={`${idPrefix}-${itemKey}`}
              />
            ))}
            <div className="flex flex-wrap items-center gap-1.5">
              <button type="button" onClick={() => addBeat()} className="rounded-md border border-border bg-bg-main px-2.5 py-1 text-xs font-semibold text-text-secondary hover:border-accent hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
                + 해설
              </button>
              <button type="button" onClick={() => addBeat('화자')} className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-300 hover:border-amber-500/70 hover:bg-amber-500/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400">
                + 대사
              </button>
              <span className="text-[11px] text-text-tertiary">화자를 비우면 해설 · 빈 줄마다 다음 화면</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-2">
            <span className="rounded border border-teal-500/25 bg-teal-500/10 px-2 py-1 text-xs font-semibold text-teal-300">{expectedLabel}</span>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-text-secondary" title="자동 계산보다 오래 보여줄 때만 입력합니다.">
              최소
              <input type="number" min={FACTION_SCENE_MIN_SEC} max={FACTION_SCENE_MAX_MINIMUM_SEC} step={0.5} value={scene.durationSec ?? ''} placeholder="자동" onChange={event => {
                const raw = event.target.value
                setScene({
                  durationSec: raw === ''
                    ? undefined
                    : Math.min(FACTION_SCENE_MAX_MINIMUM_SEC, Math.max(FACTION_SCENE_MIN_SEC, Number(raw) || FACTION_SCENE_MIN_SEC)),
                })
              }} className="w-16 rounded-md border border-border bg-bg-main px-1.5 py-1 font-mono text-xs text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none" />
              초
            </label>
            <span className="text-[11px] text-text-tertiary">{beatLabel} · 길이 자동 계산</span>
            <input value={scene.sfx ?? ''} onChange={event => setScene({ sfx: event.target.value || undefined })} placeholder="효과음 파일 (선택)" aria-label="서사 항목 효과음 파일" className="min-w-56 flex-1 rounded-md border border-border bg-bg-main px-2.5 py-1.5 text-xs text-text-primary focus:border-accent focus:outline-none" />
          </div>
        </div>
      </div>
    </FactionSequenceCard>
  )
}
