'use client'

import { useState } from 'react'
import type { EditLang } from '@feelandnote/shared/bo/editor'
import { ChevronDown, ChevronUp, Trash2 } from '@feelandnote/shared/bo/icons'
import type { FactionIndividualScene, FactionSequenceItem } from '@/lib/faction-types'
import {
  FACTION_SCENE_MAX_MINIMUM_SEC,
  FACTION_SCENE_MIN_SEC,
  factionSceneCaptionPages,
  factionSceneTiming,
} from '@feelandnote/shared/lib/faction-scene-timing'
import { CoverPickerButton } from './CoverPickerButton/CoverPickerButton'
import { FactionSequenceCard, sequenceCardIconButtonClass } from './FactionSequenceCard'

type SceneItem = Extract<FactionSequenceItem, { kind: 'scene' }>

type Props = {
  item: SceneItem
  sequenceIndex: number
  sequenceLength: number
  numberLabel: string
  onChange: (id: string, next: FactionIndividualScene) => void
  onMove: (id: string, direction: -1 | 1) => void
  onDelete: (id: string) => void
  series: string
  episodeName: string
  editLang: EditLang
  idPrefix: string
  captionIdHoldSec?: number
}

export function FactionIndividualSceneEditor({
  item,
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
  const scene = item.scene
  const setScene = (patch: Partial<FactionIndividualScene>) => onChange(item.id, { ...scene, ...patch })
  const koParagraphCount = factionSceneCaptionPages(scene.caption).length
  const enParagraphCount = factionSceneCaptionPages(scene.captionEn ?? scene.caption).length
  const expectedKoSec = factionSceneTiming({ ...scene, caption: scene.caption, captionIdHoldSec }).durationSec
  const expectedEnSec = factionSceneTiming({ ...scene, caption: scene.captionEn ?? scene.caption, captionIdHoldSec }).durationSec
  const expectedLabel = editLang === 'both'
    ? `KO ${expectedKoSec.toFixed(1)}초 · EN ${expectedEnSec.toFixed(1)}초`
    : `${(editLang === 'en' ? expectedEnSec : expectedKoSec).toFixed(1)}초 예상`
  const paragraphLabel = editLang === 'both'
    ? `KO ${koParagraphCount || 0}문단 · EN ${enParagraphCount || 0}문단`
    : `${(editLang === 'en' ? enParagraphCount : koParagraphCount) || 0}문단`
  const title = editLang === 'en'
    ? scene.titleEn?.trim() || scene.title.trim() || '제목 없음'
    : scene.title.trim() || '제목 없음'

  return (
    <FactionSequenceCard
      id={`${idPrefix}-${item.id}`}
      numberLabel={numberLabel}
      type="scene"
      title={title}
      meta={`${expectedLabel} · ${paragraphLabel}`}
      expanded={expanded}
      actions={(
        <>
          <button type="button" disabled={sequenceIndex === 0} onClick={() => onMove(item.id, -1)} className={sequenceCardIconButtonClass} title="이야기 순서에서 위로" aria-label={`${numberLabel} 장면 위로 이동`}><ChevronUp size={15} /></button>
          <button type="button" disabled={sequenceIndex === sequenceLength - 1} onClick={() => onMove(item.id, 1)} className={sequenceCardIconButtonClass} title="이야기 순서에서 아래로" aria-label={`${numberLabel} 장면 아래로 이동`}><ChevronDown size={15} /></button>
          <span className="mx-0.5 h-5 w-px bg-border" aria-hidden="true" />
          <button type="button" onClick={() => onDelete(item.id)} className="flex h-8 w-8 items-center justify-center rounded-md border border-danger/40 text-danger-text hover:border-danger/70 hover:bg-danger/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger" title="개별 장면 삭제" aria-label={`${numberLabel} 장면 삭제`}><Trash2 size={15} /></button>
          <button type="button" onClick={() => setExpanded(current => !current)} aria-expanded={expanded} aria-controls={`${idPrefix}-${item.id}-body`} className={sequenceCardIconButtonClass} title={expanded ? '장면 접기' : '장면 펼치기'}><ChevronDown size={16} className={`transition-transform duration-200 ${expanded ? '' : '-rotate-90'}`} /></button>
        </>
      )}
      contentClassName="p-3"
    >
      <div id={`${idPrefix}-${item.id}-body`} className="grid items-stretch gap-3 lg:grid-cols-[12rem_minmax(0,1fr)]">
        <CoverPickerButton
          value={scene.media}
          onChange={media => setScene({ media })}
          crop={scene.mediaCrop}
          onCropChange={mediaCrop => setScene({ mediaCrop })}
          label={scene.title || '제목 없음'}
          emptyText="텍스트 배경"
          series={series}
          episodeName={episodeName}
          className="h-40 w-full shrink-0 lg:h-full lg:min-h-40"
        />

        <div className="min-w-0 space-y-2">
          {editLang !== 'en' ? (
            <>
              <input value={scene.title} onChange={event => setScene({ title: event.target.value })} placeholder="장면 제목" aria-label="개별 장면 제목" className="w-full rounded-md border border-border bg-bg-main px-2.5 py-1.5 text-sm font-bold text-text-primary focus:border-accent focus:outline-none" />
              <textarea value={scene.caption ?? ''} onChange={event => setScene({ caption: event.target.value || undefined })} rows={5} placeholder={'장면 해설 · Enter는 같은 화면 줄바꿈 · Enter 두 번은 다음 문단 화면'} aria-label="개별 장면 해설" className="w-full resize-y rounded-md border border-border bg-bg-main px-2.5 py-1.5 text-sm leading-snug text-text-primary focus:border-accent focus:outline-none" />
            </>
          ) : null}
          {editLang !== 'ko' ? (
            <>
              <input value={scene.titleEn ?? ''} onChange={event => setScene({ titleEn: event.target.value || undefined })} placeholder="English scene title" aria-label="Individual scene title" className="w-full rounded-md border border-border bg-bg-main px-2.5 py-1.5 text-sm font-bold text-text-secondary focus:border-accent focus:outline-none" />
              <textarea value={scene.captionEn ?? ''} onChange={event => setScene({ captionEn: event.target.value || undefined })} rows={5} placeholder={'Scene caption · Enter breaks a line · Blank line starts the next screen'} aria-label="Individual scene narration" className="w-full resize-y rounded-md border border-border bg-bg-main px-2.5 py-1.5 text-sm leading-snug text-text-secondary focus:border-accent focus:outline-none" />
            </>
          ) : null}

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
            <span className="text-[11px] text-text-tertiary">빈 줄마다 다음 화면 · {paragraphLabel} · 길이 자동 계산</span>
            <input value={scene.sfx ?? ''} onChange={event => setScene({ sfx: event.target.value || undefined })} placeholder="효과음 파일 (선택)" aria-label="개별 장면 효과음 파일" className="min-w-56 flex-1 rounded-md border border-border bg-bg-main px-2.5 py-1.5 text-xs text-text-primary focus:border-accent focus:outline-none" />
          </div>
        </div>
      </div>
    </FactionSequenceCard>
  )
}
