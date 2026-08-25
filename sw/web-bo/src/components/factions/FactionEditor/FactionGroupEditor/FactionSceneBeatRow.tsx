'use client'

import { useState } from 'react'
import type { EditLang } from '@feelandnote/shared/bo/editor'
import { ChevronDown, ChevronUp, Trash2 } from '@feelandnote/shared/bo/icons'
import { ANCHOR_THEMES, FACTION_IMAGE_DND, ImageCard, ImagePicker } from '@feelandnote/shared/bo/media'
import { adjustImageChanges } from '@feelandnote/shared/bo/quote-editor'
import { isFactionSceneNarrationBeat } from '@feelandnote/shared/lib/faction-scene-speaker'
import { FACTION_SCENE_MAX_MINIMUM_SEC, FACTION_SCENE_MIN_SEC } from '@feelandnote/shared/lib/faction-scene-timing'
import type { FactionPerson, FactionSceneBeat } from '@/lib/faction-types'
import { applyFactionSteps, epithetIsNarrated, factionStepsOf, imageSrc, linesTypingOf } from '../../shared/timing'
import { sequenceCardIconButtonClass } from './FactionSequenceCard'
import { FactionSceneBeatTextEditor } from './FactionSceneBeatTextEditor'
import { FactionSceneBeatSfx } from './FactionSceneBeatSfx'
import { FactionSceneBeatVoice } from './FactionSceneBeatVoice'
import { FactionAssignedPersonSettings } from './FactionAssignedPersonSettings'

const smallInputClass = 'rounded-md border border-border bg-bg-main px-2 py-1 text-xs text-text-primary focus:border-accent focus:outline-none'

type Props = {
  beat: FactionSceneBeat
  index: number
  total: number
  onChange: (index: number, next: FactionSceneBeat) => void
  onMove: (index: number, direction: -1 | 1) => void
  onSplit?: (index: number) => void
  onDelete: (index: number) => void
  editLang: EditLang
  sfxList?: string[]
  series: string
  episodeName: string
  groupIndex: number
  clusterIndex: number
  localPeople: FactionPerson[]
  speakerPeople: FactionPerson[]
  speakerVoiceFiles?: Record<string, { quote: string; epithet: string }>
  /** 이 beat에 할당된 인물의 기존 표시·처리 설정을 같은 항목 안에서 고친다. */
  onAssignedPersonChange?: (next: FactionPerson) => void
  /** 이 beat를 할당 인물의 기본·웹팩션 대표 대사로 고른다. */
  onSetPrimaryQuote?: () => void
}

/**
 * 장면 안의 컷 한 줄.
 *
 * 에피소드 인물을 할당하면 그 인물의 현재 이름과 기본 음성을 상속하고, 비우면 나레이터 해설이 된다.
 * 구 자유 문자열 화자는 미할당 상태로 보존해 사람이 인물에 다시 연결할 수 있게 한다.
 */
export function FactionSceneBeatRow({
  beat, index, total, onChange, onMove, onSplit, onDelete, editLang, series, episodeName,
  groupIndex, clusterIndex, localPeople, speakerPeople, speakerVoiceFiles = {}, onAssignedPersonChange, onSetPrimaryQuote, sfxList = [],
}: Props) {
  const [baseMediaPickerOpen, setBaseMediaPickerOpen] = useState(false)
  const [mediaChangePickerIndex, setMediaChangePickerIndex] = useState<number | null>(null)
  const [customSpeakerMode, setCustomSpeakerMode] = useState(false)
  const set = (patch: Partial<FactionSceneBeat>, invalidatesVoice = false) => onChange(index, {
    ...beat,
    ...patch,
    ...(invalidatesVoice ? { legacyPersonVoice: false, voiceFile: undefined, voiceDuration: undefined } : {}),
  })
  const assignedPerson = beat.speakerCelebId
    ? speakerPeople.find(person => person.celebId === beat.speakerCelebId)
      ?? localPeople.find(person => person.celebId === beat.speakerCelebId)
    : undefined
  const assignedVoiceFiles = beat.speakerCelebId ? speakerVoiceFiles[beat.speakerCelebId] : undefined
  const setAssignedPerson = (next: FactionPerson) => onAssignedPersonChange?.(next)
  const stepsShorts = assignedPerson ? factionStepsOf(assignedPerson, true) : undefined
  const stepsLongform = assignedPerson ? factionStepsOf(assignedPerson, false) : undefined
  const toggleStep = (portrait: boolean, key: 'credit' | 'epithet' | 'voice') => {
    if (!assignedPerson) return
    const current = portrait ? stepsShorts! : stepsLongform!
    setAssignedPerson(applyFactionSteps(assignedPerson, { ...current, [key]: !current[key] }, portrait))
  }
  const mediaChanges = beat.mediaChanges ?? []
  const mediaAnchors = new Map<number, { hasImage: boolean; theme?: (typeof ANCHOR_THEMES)[number] }>()
  let themeIndex = 0
  if (beat.media) {
    mediaAnchors.set(0, { hasImage: true, theme: ANCHOR_THEMES[themeIndex++ % ANCHOR_THEMES.length] })
  }
  for (const change of [...mediaChanges].sort((a, b) => a.chunk - b.chunk)) {
    mediaAnchors.set(change.chunk, change.media
      ? { hasImage: true, theme: ANCHOR_THEMES[themeIndex++ % ANCHOR_THEMES.length] }
      : { hasImage: false })
  }
  const setMediaChange = (changeIndex: number, patch: Partial<(typeof mediaChanges)[number]>) => {
    const next = [...mediaChanges]
    next[changeIndex] = { ...next[changeIndex], ...patch }
    set({ mediaChanges: next })
  }
  const openMediaAnchor = (chunkIndex: number) => {
    const existingIndex = mediaChanges.findIndex(change => change.chunk === chunkIndex)
    if (existingIndex >= 0) {
      setMediaChangePickerIndex(existingIndex)
      return
    }
    const next = [...mediaChanges, { chunk: chunkIndex, media: '' }]
    set({ mediaChanges: next })
    setMediaChangePickerIndex(next.length - 1)
  }
  const removeMediaAnchor = (chunkIndex: number) => {
    const next = mediaChanges.filter(change => change.chunk !== chunkIndex)
    set({ mediaChanges: next.length ? next : undefined })
    setMediaChangePickerIndex(null)
  }
  const moveMediaAnchor = (fromIndex: number, toIndex: number) => {
    const next = mediaChanges.map(change => ({ ...change }))
    const target = next.find(change => change.chunk === fromIndex)
    if (!target) return
    const destination = next.find(change => change.chunk === toIndex)
    if (destination) destination.chunk = fromIndex
    target.chunk = toIndex
    set({ mediaChanges: next })
  }
  const editingMediaChange = mediaChangePickerIndex == null ? undefined : mediaChanges[mediaChangePickerIndex]
  const chunks = beat.text.split(/\r?\n/)
  const maxChunk = Math.max(0, chunks.length - 1)
  const baseMediaSrc = imageSrc(series, episodeName, beat.media)
  const inheritedMediaSrc = imageSrc(series, episodeName, assignedPerson?.image)
  const hasText = !!beat.text.trim() || !!beat.textEn?.trim()
  const isLine = !!assignedPerson || !!beat.speaker?.trim() || !!beat.speakerEn?.trim()
  const isVisualOnly = !assignedPerson && !beat.speaker?.trim() && !beat.speakerEn?.trim() && !hasText
  const isNarration = !isVisualOnly && isFactionSceneNarrationBeat(beat)
  const speakerValue = customSpeakerMode
    ? '__custom__'
    : isVisualOnly
      ? '__visual__'
      : assignedPerson?.celebId
        ?? beat.speakerCelebId
        ?? (isNarration ? '__narrator__' : '__custom__')
  const assignSpeaker = (celebId: string) => {
    if (celebId === '__narrator__') {
      setCustomSpeakerMode(false)
      set({
        speakerCelebId: undefined,
        speaker: undefined,
        speakerEn: undefined,
        hideIdentity: undefined,
        primaryQuote: undefined,
      }, true)
      return
    }
    if (celebId === '__custom__') {
      setCustomSpeakerMode(true)
      set({
        speakerCelebId: undefined,
        speaker: undefined,
        speakerEn: undefined,
        hideIdentity: undefined,
        primaryQuote: undefined,
      }, true)
      return
    }
    const person = speakerPeople.find(candidate => candidate.celebId === celebId)
    if (!person) return
    setCustomSpeakerMode(false)
    set({
      speakerCelebId: celebId,
      speaker: person.name,
      speakerEn: person.nameEn,
      hideIdentity: undefined,
      primaryQuote: undefined,
    }, true)
  }
  const hasCutLabel = beat.label != null || beat.labelEn != null
  const addCutLabel = () => set(editLang === 'en'
    ? { labelEn: beat.labelEn ?? '' }
    : editLang === 'ko'
      ? { label: beat.label ?? '' }
      : { label: beat.label ?? '', labelEn: beat.labelEn ?? '' })
  const removeCutLabel = () => set({ label: undefined, labelEn: undefined })

  return (
    <div data-faction-scene-beat="true" className="rounded-lg border border-border/80 bg-bg-card/70 p-2 shadow-sm">
      <div className="-mx-2 -mt-2 mb-2 flex min-h-12 flex-wrap items-center gap-2 rounded-t-lg border-b border-border/70 bg-bg-main/70 px-3 py-2">
        <div className="flex shrink-0 items-center gap-1.5 border-r border-border/70 pr-3">
          <span className="flex h-7 min-w-12 items-center justify-center rounded-md border border-border bg-bg-secondary px-2 font-mono text-[10px] font-black tabular-nums text-text-primary shadow-sm">
            컷 {index + 1}
          </span>
          <span className="text-[10px] font-bold text-text-tertiary">
            {assignedPerson
              ? '인물 대사'
              : isVisualOnly
                ? '화면 컷'
                : isNarration && !customSpeakerMode
                  ? '나레이터 해설'
                  : '미할당 화자'}
          </span>
        </div>

        <label className="flex items-center gap-1.5 text-[11px] font-semibold text-text-secondary">
          화자 할당
          <select
            value={speakerValue}
            onChange={event => assignSpeaker(event.target.value)}
            aria-label={`${index + 1}번 발화 인물 할당`}
            className={`${smallInputClass} w-48`}
          >
            {isVisualOnly ? <option value="__visual__">화자 없음 · 화면 컷</option> : null}
            <option value="__narrator__">나레이터 · 공용 화자</option>
            <option value="__custom__">
              {beat.speaker?.trim() ? `미할당 화자 · ${beat.speaker}` : '미할당 화자 · 직접 입력'}
            </option>
            {beat.speakerCelebId && !assignedPerson ? (
              <option value={beat.speakerCelebId} disabled>연결 끊김 · {beat.speaker || beat.speakerCelebId}</option>
            ) : null}
            {speakerPeople.map(person => (
              <option key={person.celebId} value={person.celebId}>
                {editLang === 'en' ? person.nameEn ?? person.name : person.name}
              </option>
            ))}
          </select>
        </label>

        {!assignedPerson && !isVisualOnly ? (
          <>
            {isNarration && !customSpeakerMode ? (
              <span className="rounded-md border border-border bg-bg-secondary px-2 py-1 text-[10px] font-semibold text-text-tertiary">
                출연진 제외 · 공용 목소리 상속
              </span>
            ) : (
              <label className="flex items-center gap-1 text-[11px] font-semibold text-text-secondary">
                표시 이름
                <input
                  value={editLang === 'en' ? beat.speakerEn ?? '' : beat.speaker ?? ''}
                  onChange={event => set(editLang === 'en'
                    ? { speakerEn: event.target.value || undefined }
                    : { speaker: event.target.value || undefined }, true)}
                  onBlur={event => {
                    if (!event.target.value.trim() && !beat.speaker?.trim() && !beat.speakerEn?.trim()) {
                      setCustomSpeakerMode(false)
                    }
                  }}
                  placeholder={editLang === 'en' ? 'Unassigned speaker' : '미할당 화자 이름'}
                  aria-label={`${index + 1}번 미할당 화자 이름`}
                  className={`${smallInputClass} w-40`}
                  autoFocus={customSpeakerMode}
                />
              </label>
            )}
            <label className="flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-border bg-bg-main px-2 text-[11px] font-semibold text-text-secondary hover:border-accent hover:bg-bg-hover hover:text-text-primary">
              <input
                type="checkbox"
                checked={beat.hideIdentity !== true}
                onChange={event => set({ hideIdentity: event.target.checked ? undefined : true })}
                className="accent-accent"
              />
              {isNarration && !customSpeakerMode ? '장면명 화면 중앙 표시' : '화자 이름 화면 중앙 표시'}
            </label>
          </>
        ) : null}

        {assignedPerson ? (
          <>
            <label className="flex items-center gap-1 text-[11px] font-semibold text-text-secondary">
              이름 표시
              <select
                value={beat.hideIdentity === true ? 'hide' : beat.hideIdentity === false ? 'show' : 'auto'}
                onChange={event => set({
                  hideIdentity: event.target.value === 'hide'
                    ? true
                    : event.target.value === 'show'
                      ? false
                      : undefined,
                })}
                aria-label={`${index + 1}번 인물 이름 표시`}
                className={smallInputClass}
                title="자동은 이 영상에서 해당 인물이 처음 말할 때만 이름과 직함을 표시합니다"
              >
                <option value="auto">자동 · 첫 대사만</option>
                <option value="show">강제 표시</option>
                <option value="hide">숨김</option>
              </select>
            </label>
            <button
              type="button"
              aria-pressed={beat.primaryQuote === true}
              onClick={onSetPrimaryQuote}
              className={`h-8 rounded-md border px-2.5 text-[11px] font-bold ${beat.primaryQuote
                ? 'border-accent bg-accent/15 text-accent'
                : 'border-border bg-bg-main text-text-secondary hover:border-accent hover:bg-bg-hover hover:text-text-primary'}`}
              title="이름 표시 설정과 별개입니다. 이 대사를 인물 기본 대사와 웹팩션 대표 대사로 사용합니다"
            >
              {beat.primaryQuote ? '✓ 웹팩션 대표 대사' : '웹팩션 대표 대사'}
            </button>
          </>
        ) : null}

        <label className="flex items-center gap-1 text-[11px] font-semibold text-text-secondary" title="자동으로 계산된 길이보다 이 컷을 더 오래 유지할 때만 지정합니다">
          최소 재생
          <input
            type="number"
            min={FACTION_SCENE_MIN_SEC}
            max={FACTION_SCENE_MAX_MINIMUM_SEC}
            step="0.5"
            placeholder={isVisualOnly ? String(FACTION_SCENE_MIN_SEC) : '자동'}
            value={beat.minimumSec ?? (isVisualOnly ? FACTION_SCENE_MIN_SEC : '')}
            onChange={event => {
              if (event.target.value === '') {
                set({ minimumSec: isVisualOnly ? FACTION_SCENE_MIN_SEC : undefined })
                return
              }
              const value = Number(event.target.value)
              if (!Number.isFinite(value)) return
              set({ minimumSec: Math.min(Math.max(value, FACTION_SCENE_MIN_SEC), FACTION_SCENE_MAX_MINIMUM_SEC) })
            }}
            aria-label={`${index + 1}번 컷 최소 재생 시간`}
            className={`${smallInputClass} w-16`}
          />
          초
        </label>

        <div className="ml-auto flex items-center gap-1 border-l border-border/70 pl-2">
          {!hasCutLabel ? (
            <button
              type="button"
              onClick={addCutLabel}
              className="mr-1 h-8 rounded-md border border-border bg-bg-main px-2.5 text-[11px] font-bold text-text-secondary hover:border-accent hover:bg-accent/10 hover:text-accent active:bg-accent/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              aria-label={`${index + 1}번 컷 라벨 추가`}
              title="이 컷에 선택적인 설명·화면 이름을 추가합니다"
            >
              + 컷 라벨
            </button>
          ) : null}
          <button
            type="button"
            disabled={index === 0 || !onSplit}
            onClick={() => onSplit?.(index)}
            className="mr-1 h-8 rounded-md border border-border bg-bg-main px-2.5 text-[11px] font-bold text-text-secondary hover:border-accent hover:bg-accent/10 hover:text-accent active:bg-accent/20 disabled:cursor-not-allowed disabled:border-border disabled:bg-transparent disabled:text-text-dim disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            title={index === 0 ? '첫 컷 앞에는 남길 내용이 없어 분리할 수 없습니다' : '이 컷과 아래 컷을 바로 다음 새 장면으로 옮깁니다'}
          >
            이 컷부터 장면 분리
          </button>
          <button type="button" disabled={index === 0} onClick={() => onMove(index, -1)} className={sequenceCardIconButtonClass} title="위로" aria-label={`${index + 1}번 컷 위로`}><ChevronUp size={14} /></button>
          <button type="button" disabled={index === total - 1} onClick={() => onMove(index, 1)} className={sequenceCardIconButtonClass} title="아래로" aria-label={`${index + 1}번 컷 아래로`}><ChevronDown size={14} /></button>
          <button type="button" onClick={() => onDelete(index)} className="flex h-8 w-8 items-center justify-center rounded-md border border-danger/40 text-danger-text hover:border-danger/70 hover:bg-danger/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger" title="컷 삭제" aria-label={`${index + 1}번 컷 삭제`}><Trash2 size={14} /></button>
        </div>
      </div>

      <div className="space-y-2">
        {hasCutLabel ? (
          <div data-faction-scene-cut-label="true" className="rounded-md border border-border/70 bg-bg-main/45 p-2.5">
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <div>
                <div className="text-[11px] font-bold text-text-secondary">컷 라벨</div>
                <div className="text-[10px] text-text-dim">미할당 컷의 화면 이름이며, 장면 분리 시 새 장면명으로 이어집니다.</div>
              </div>
              <button
                type="button"
                onClick={removeCutLabel}
                className="flex h-7 items-center gap-1 rounded-md border border-danger/40 px-2 text-[10px] font-bold text-danger-text hover:border-danger/70 hover:bg-danger/15 active:bg-danger/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger"
                aria-label={`${index + 1}번 컷 라벨 삭제`}
                title="이 컷의 한국어·영문 라벨을 모두 삭제합니다"
              >
                <Trash2 size={12} />
                라벨 삭제
              </button>
            </div>
            <div className="grid gap-1.5 lg:grid-cols-2">
              {editLang !== 'en' ? (
                <input
                  value={beat.label ?? ''}
                  onChange={event => set({ label: event.target.value })}
                  onBlur={event => {
                    if (!event.target.value.trim()) set({ label: undefined })
                  }}
                  placeholder="한국어 컷 라벨"
                  aria-label={`${index + 1}번 컷 라벨 한국어`}
                  className={`${smallInputClass} w-full font-semibold text-text-secondary`}
                />
              ) : null}
              {editLang !== 'ko' ? (
                <input
                  value={beat.labelEn ?? ''}
                  onChange={event => set({ labelEn: event.target.value })}
                  onBlur={event => {
                    if (!event.target.value.trim()) set({ labelEn: undefined })
                  }}
                  placeholder="English cut label"
                  aria-label={`${index + 1}번 컷 라벨 영문`}
                  className={`${smallInputClass} w-full text-text-secondary`}
                />
              ) : null}
            </div>
          </div>
        ) : null}

        <section className="rounded-md border border-border/70 bg-bg-main/20" aria-label={`${index + 1}번 컷 본문과 화면`}>
          <div className="flex items-center justify-between gap-2 border-b border-border/60 px-3 py-1.5">
            <span className="text-[10px] font-black text-text-secondary">본문 · 화면</span>
            <span className="text-[10px] text-text-dim">본문 줄 사이의 전환점과 오른쪽 화면 카드가 같은 순서입니다.</span>
          </div>
          <div className="flex items-start gap-4 p-3">
            <FactionSceneBeatTextEditor
            index={index}
            editLang={editLang}
            isLine={isLine}
            text={beat.text}
            textEn={beat.textEn}
            onTextChange={text => {
              const adjusted = adjustImageChanges(beat.text, text, mediaChanges)
              set({ text, mediaChanges: adjusted.length ? adjusted : undefined }, true)
            }}
            onTextEnChange={textEn => set({ textEn }, true)}
            anchors={mediaAnchors}
            onAddAnchor={openMediaAnchor}
            onRemoveAnchor={removeMediaAnchor}
            onMoveAnchor={moveMediaAnchor}
            onOpenAnchor={openMediaAnchor}
            />

            <div data-faction-scene-image-rail="true" className="flex w-[296px] shrink-0 flex-col gap-3 border-l border-border/50 pl-4">
            <ImageCard
              dnd={FACTION_IMAGE_DND}
              src={baseMediaSrc}
              crop={beat.mediaCrop}
              inheritedSrc={inheritedMediaSrc}
              inheritedCrop={assignedPerson?.imageCrop}
              inheritedLabel={assignedPerson ? '인물 기본 화보' : '앞 장면 유지'}
              onDropImage={media => set({ media, mediaCrop: undefined })}
              onOpenPicker={() => setBaseMediaPickerOpen(true)}
              label="#1 컷 시작"
              theme={beat.media ? mediaAnchors.get(0)?.theme : undefined}
              filter={beat.mediaFilter}
              onFilterChange={mediaFilter => set({ mediaFilter })}
              onRemove={beat.media ? () => set({ media: undefined, mediaAt: undefined, mediaCrop: undefined, mediaFilter: undefined, mediaZoomFocus: undefined }) : undefined}
              caption={chunks[0] ?? ''}
              captionEmpty="컷 시작"
            >
              <select
                value={beat.mediaAt ?? 'beat'}
                onChange={event => set({ mediaAt: event.target.value === 'text' ? 'text' : undefined })}
                onClick={event => event.stopPropagation()}
                className="w-full rounded border border-border bg-bg-main px-1 py-0.5 text-[10px] focus:border-accent focus:outline-none"
                aria-label={`${index + 1}번 컷 사진 전환 시점`}
              >
                <option value="beat">컷 시작</option>
                <option value="text">본문·음성 시작</option>
              </select>
            </ImageCard>

            {[...mediaChanges]
              .map((change, originalIndex) => ({ change, originalIndex }))
              .sort((a, b) => a.change.chunk - b.change.chunk)
              .map(({ change, originalIndex }) => (
                <ImageCard
                  key={originalIndex}
                  dnd={FACTION_IMAGE_DND}
                  src={imageSrc(series, episodeName, change.media)}
                  crop={change.crop}
                  onDropImage={media => setMediaChange(originalIndex, { media, crop: undefined })}
                  onOpenPicker={() => setMediaChangePickerIndex(originalIndex)}
                  label={`#${change.chunk + 1} 전환`}
                  theme={mediaAnchors.get(change.chunk)?.theme}
                  filter={change.filter}
                  onFilterChange={filter => setMediaChange(originalIndex, { filter })}
                  onClearImage={() => setMediaChange(originalIndex, { media: '' })}
                  onRemove={() => {
                    const next = mediaChanges.filter((_, changeIndex) => changeIndex !== originalIndex)
                    set({ mediaChanges: next.length ? next : undefined })
                  }}
                  caption={chunks[change.chunk] ?? ''}
                  captionEmpty="빈 청크"
                >
                  <select
                    value={change.chunk}
                    onChange={event => setMediaChange(originalIndex, { chunk: Number(event.target.value) })}
                    onClick={event => event.stopPropagation()}
                    className="w-full rounded border border-border bg-bg-main px-1 py-0.5 text-[10px] focus:border-accent focus:outline-none"
                    title="이 대사 구절부터 사진 전환"
                  >
                    {chunks.map((chunk, chunkIndex) => (
                      <option key={chunkIndex} value={chunkIndex}>
                        [{chunkIndex + 1}] {chunk.trim() ? (chunk.length > 8 ? `${chunk.slice(0, 8)}…` : chunk) : '(빈 줄)'}
                      </option>
                    ))}
                  </select>
                </ImageCard>
              ))}

            <button
              type="button"
              onClick={() => {
                const next = [...mediaChanges, { chunk: maxChunk, media: '' }]
                set({ mediaChanges: next })
                setMediaChangePickerIndex(next.length - 1)
              }}
              className="mt-2 flex h-[84px] w-[280px] shrink-0 flex-row items-center justify-center gap-2 rounded-md border border-dashed border-border text-xs text-text-dim hover:border-text-secondary hover:bg-bg-hover hover:text-text-secondary"
            >
              <span className="text-lg leading-none">+</span>
              <span className="mt-0.5 text-[10px]">컷 안 화면 전환 추가</span>
            </button>
            </div>
          </div>
        </section>
      </div>

      <FactionSceneBeatSfx
        value={beat.sfx}
        files={sfxList}
        series={series}
        index={index}
        onChange={sfx => set({ sfx })}
      />

      {assignedPerson && onAssignedPersonChange ? (
        <div className="mt-2">
          <FactionAssignedPersonSettings
            person={assignedPerson}
            editLang={editLang}
            series={series}
            episodeName={episodeName}
            epithetVoiceFile={assignedVoiceFiles?.epithet}
            onChange={setAssignedPerson}
          />
        </div>
      ) : null}

      {assignedPerson ? (
        <section className="mt-2 rounded-md border border-border/70 bg-bg-main/25" aria-label={`${assignedPerson.name} 대사 표시와 처리`}>
          <div className="border-b border-border/60 px-3 py-2">
            <div className="text-[11px] font-black text-text-secondary">인물 대사 처리</div>
            <div className="mt-0.5 text-[10px] text-text-dim">이 인물의 컷들이 공통으로 상속하는 표시 순서입니다.</div>
          </div>
          <div className="space-y-3 p-3">
            <div className="grid gap-2 lg:grid-cols-[7rem_minmax(0,44rem)] lg:items-center">
              <span className="text-[11px] font-bold text-text-tertiary">대사 표시</span>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={assignedPerson.quoteDisplay ?? ''}
                  onChange={event => {
                    const value = event.target.value
                    setAssignedPerson({
                      ...assignedPerson,
                      quoteDisplay: value === 'box' || value === 'caption' ? value : undefined,
                      ...(value !== 'caption' ? { quoteCaptionPos: undefined, quoteCaptionSize: undefined, quoteCaptionFont: undefined } : {}),
                    })
                  }}
                  className={smallInputClass}
                  title="비우면 에피소드 기본값을 사용합니다"
                >
                  <option value="">에피소드 기본</option>
                  <option value="box">박스 (기존)</option>
                  <option value="caption">작은 자막</option>
                </select>
                {assignedPerson.quoteDisplay === 'caption' ? (
                  <>
                    <select value={assignedPerson.quoteCaptionPos ?? 'bottom'} onChange={event => setAssignedPerson({ ...assignedPerson, quoteCaptionPos: event.target.value === 'center' ? 'center' : 'bottom' })} className={smallInputClass}>
                      <option value="bottom">하단</option>
                      <option value="center">중하단</option>
                    </select>
                    <select value={assignedPerson.quoteCaptionSize ?? 'default'} onChange={event => setAssignedPerson({ ...assignedPerson, quoteCaptionSize: event.target.value === 'large' ? 'large' : 'default' })} className={smallInputClass}>
                      <option value="default">기본 크기</option>
                      <option value="large">크게</option>
                    </select>
                    <select value={assignedPerson.quoteCaptionFont ?? 'default'} onChange={event => setAssignedPerson({ ...assignedPerson, quoteCaptionFont: event.target.value === 'serif' ? 'serif' : 'default' })} className={smallInputClass}>
                      <option value="default">고딕 (기본)</option>
                      <option value="serif">명조 (세리프)</option>
                    </select>
                  </>
                ) : null}
              </div>
            </div>

            {([
            { portrait: true, label: '쇼츠(S) 처리', steps: stepsShorts! },
            { portrait: false, label: '롱폼(L) 처리', steps: stepsLongform! },
          ] as const).map(row => (
            <div key={row.label} className="grid gap-2 lg:grid-cols-[7rem_minmax(0,44rem)] lg:items-start">
              <span className="mt-1 text-[11px] font-bold text-text-tertiary">{row.label}</span>
              <div className="grid min-w-0 grid-cols-3 gap-1.5">
                {([
                  { key: 'credit', label: '직함' },
                  { key: 'epithet', label: '수식어' },
                  { key: 'voice', label: '음성' },
                ] as const).map(option => (
                  <div key={option.key} className="flex min-w-0 flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => toggleStep(row.portrait, option.key)}
                      className={`rounded-md border px-2 py-1.5 text-xs font-semibold ${row.steps[option.key] ? 'border-accent bg-accent/10 text-accent' : 'border-border bg-bg-main/60 text-text-secondary hover:border-text-tertiary hover:bg-bg-hover hover:text-text-primary'}`}
                    >
                      {row.steps[option.key] ? '☑ ' : '☐ '}{option.label}
                    </button>
                    {option.key === 'epithet' && row.steps.epithet && assignedPerson.epithet ? (
                      <div className="flex gap-1">
                        {([['🔊 낭독', true], ['⌨ 타이핑', false]] as const).map(([label, value]) => (
                          <button
                            key={label}
                            type="button"
                            onClick={() => setAssignedPerson({ ...assignedPerson, [row.portrait ? 'epithetNarrateShorts' : 'epithetNarrateLongform']: value })}
                            className={`flex-1 whitespace-nowrap rounded-md border px-1 py-1 text-[10px] ${epithetIsNarrated(assignedPerson, row.portrait) === value ? 'border-accent bg-accent/10 text-accent' : 'border-border text-text-secondary hover:bg-bg-hover'}`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    ) : null}
                    {option.key === 'credit' && row.steps.credit && (assignedPerson.lines?.length ?? 0) > 0 ? (
                      <div className="flex gap-1">
                        {([['순차등장', false], ['⌨ 타이핑', true]] as const).map(([label, value]) => (
                          <button
                            key={label}
                            type="button"
                            onClick={() => setAssignedPerson({ ...assignedPerson, [row.portrait ? 'linesTypingShorts' : 'linesTypingLongform']: value })}
                            className={`flex-1 whitespace-nowrap rounded-md border px-1 py-1 text-[10px] ${linesTypingOf(assignedPerson, row.portrait) === value ? 'border-accent bg-accent/10 text-accent' : 'border-border text-text-secondary hover:bg-bg-hover'}`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
            ))}
          </div>
        </section>
      ) : null}

      {!isVisualOnly ? (
        <FactionSceneBeatVoice
          beat={beat}
          assignedPerson={assignedPerson}
          localPeople={localPeople}
          assignedVoiceFile={assignedVoiceFiles?.quote}
          groupIndex={groupIndex}
          clusterIndex={clusterIndex}
          series={series}
          episodeName={episodeName}
          editLang={editLang}
          onChange={next => onChange(index, next)}
          onAssignedPersonChange={onAssignedPersonChange}
        />
      ) : null}

      {baseMediaPickerOpen ? (
        <ImagePicker
          value={beat.media}
          onChange={media => set({ media, mediaAt: media ? beat.mediaAt : undefined, ...(!media ? { mediaCrop: undefined, mediaFilter: undefined, mediaZoomFocus: undefined } : {}) })}
          crop={beat.mediaCrop}
          onCropChange={mediaCrop => set({ mediaCrop })}
          focus={beat.mediaZoomFocus}
          onFocusChange={mediaZoomFocus => set({ mediaZoomFocus })}
          filter={beat.mediaFilter}
          onFilterChange={mediaFilter => set({ mediaFilter })}
          series={series}
          episodeName={episodeName}
          slug={assignedPerson?.slug}
          onClose={() => setBaseMediaPickerOpen(false)}
        />
      ) : null}

      {editingMediaChange ? (
        <ImagePicker
          value={editingMediaChange.media || undefined}
          onChange={media => setMediaChange(mediaChangePickerIndex!, { media: media ?? '', crop: undefined })}
          crop={editingMediaChange.crop}
          onCropChange={crop => setMediaChange(mediaChangePickerIndex!, { crop })}
          focus={editingMediaChange.zoomFocus}
          onFocusChange={zoomFocus => setMediaChange(mediaChangePickerIndex!, { zoomFocus })}
          filter={editingMediaChange.filter}
          onFilterChange={filter => setMediaChange(mediaChangePickerIndex!, { filter })}
          series={series}
          episodeName={episodeName}
          slug={assignedPerson?.slug}
          onClose={() => setMediaChangePickerIndex(null)}
        />
      ) : null}
    </div>
  )
}
