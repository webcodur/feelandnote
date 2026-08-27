'use client'

import { memo, type Dispatch, type SetStateAction } from 'react'
import type { EditLang } from '@feelandnote/shared/bo/editor'
import { ChevronsDownUp, ChevronsUpDown } from '@feelandnote/shared/bo/icons'
import type { FactionScript } from '@/lib/faction-types'
import { totalPeople, totalSec } from '../../shared/timing'
import { FactionCommentPanel } from '../FactionCommentPanel'
import { FactionHeroPicker, type HeroCandidate } from '../FactionHeroPicker'
import { FactionShortsPartHeader } from './FactionShortsPartHeader'
import {
  contrastText,
  FactionComposeRow,
  MAX_SHORTS_PART_COUNT,
  partSectionsOf,
  shortsPartCountOf,
  shortsPartScriptOf,
  shortsPartSlicesOf,
  shortsSliceSummary,
  type PartAssignOption,
  usesInternalShortsCuts,
} from './factionShorts'

interface FactionShortsPanelProps {
  script: FactionScript
  series: string
  episodeName: string
  editLang: EditLang
  sfxList: string[]
  musicList: string[]
  musicLabel: (file: string) => string
  heroCandidates: HeroCandidate[]
  collapsedParts: Record<number, boolean>
  setCollapsedParts: Dispatch<SetStateAction<Record<number, boolean>>>
  onChange: (patch: Partial<FactionScript>) => void
  onChangePartCount: (count: number) => void
  onSetGroupPart: (groupIndex: number, part: number) => void
  onMoveGroupInPart: (groupIndex: number, direction: -1 | 1) => void
  onEditGroup: (groupIndex: number) => void
  onJumpToGroup: (part: number, groupIndex: number) => void
}

/** 쇼츠 편성만 담당한다. 대본·저장·음성 작업 상태는 부모 편집기가 소유한다. */
export const FactionShortsPanel = memo(function FactionShortsPanel({
  script,
  series,
  episodeName,
  editLang,
  sfxList,
  musicList,
  musicLabel,
  heroCandidates,
  collapsedParts,
  setCollapsedParts,
  onChange,
  onChangePartCount,
  onSetGroupPart,
  onMoveGroupInPart,
  onEditGroup,
  onJumpToGroup,
}: FactionShortsPanelProps) {
  const groups = script.groups ?? []
  const internalCuts = usesInternalShortsCuts(script)
  const partCount = shortsPartCountOf(script)
  const sections = partSectionsOf(partCount)
  const partAssignOptions: PartAssignOption[] = [
    { value: 0, label: '공통(모든 편)' },
    ...sections.slice(1).map(section => ({ value: section.key, label: section.label })),
    ...(partCount < MAX_SHORTS_PART_COUNT
      ? [{ value: partCount + 1, label: `+ ${partCount + 1}편 추가` }]
      : []),
    { value: -1, label: '영상 제외' },
  ]

  if (groups.length === 0) {
    return <p className="text-sm text-text-dim">세력이 없습니다. 「정비」 탭에서 먼저 세력을 추가하세요.</p>
  }

  const excludedGroups = groups.map((group, index) => ({ group, index })).filter(({ group }) => group.disabled)

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-bg-card/50 px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-text-primary">쇼츠 편수</div>
          <div className="text-[11px] text-text-dim">
            {internalCuts
              ? `이야기 사이 경계 ${partCount - 1}개가 실제 쇼츠 ${partCount}편을 나눕니다. 편 경계는 정비 탭의 이야기 순서에서 옮깁니다.`
              : '편수를 직접 정하거나 세력의 편 드롭다운에서 「+ 다음 편 추가」를 고르세요. 공통 세력은 모든 편에 반복 노출됩니다.'}
          </div>
        </div>
        <div className="flex shrink-0 items-center overflow-hidden rounded-md border border-border bg-bg-main">
          <button
            type="button"
            onClick={() => onChangePartCount(partCount - 1)}
            disabled={internalCuts || partCount <= 1}
            className="h-9 w-9 text-base font-bold text-text-secondary hover:bg-bg-hover hover:text-accent disabled:cursor-not-allowed disabled:opacity-30"
            title="쇼츠 편수 줄이기"
            aria-label="쇼츠 편수 줄이기"
          >
            −
          </button>
          <input
            type="number"
            min={1}
            max={MAX_SHORTS_PART_COUNT}
            value={partCount}
            readOnly={internalCuts}
            onChange={event => {
              if (event.target.value !== '') onChangePartCount(Number(event.target.value))
            }}
            className="h-9 w-14 border-x border-border bg-bg-card text-center text-sm font-bold text-text-primary focus:outline-none"
            aria-label="쇼츠 편수"
          />
          <button
            type="button"
            onClick={() => onChangePartCount(partCount + 1)}
            disabled={internalCuts || partCount >= MAX_SHORTS_PART_COUNT}
            className="h-9 w-9 text-base font-bold text-text-secondary hover:bg-bg-hover hover:text-accent disabled:cursor-not-allowed disabled:opacity-30"
            title="쇼츠 편수 늘리기"
            aria-label="쇼츠 편수 늘리기"
          >
            +
          </button>
        </div>
        <span className="shrink-0 text-xs font-semibold text-text-secondary">편</span>
      </div>

      {sections.map(section => {
        const slices = internalCuts && section.key > 0 ? shortsPartSlicesOf(script, section.key) : []
        const items = internalCuts
          ? slices.map(slice => ({ group: slice.group, index: slice.groupIndex }))
          : groups
              .map((group, index) => ({ group, index }))
              .filter(({ group }) => !group.disabled && (group.part ?? 0) === section.key)

        if (items.length === 0 && section.key !== 0) {
          return (
            <div key={section.key} className="rounded-md border border-dashed border-border/60 px-3 py-2 text-xs text-text-dim">
              {section.label} — 배정된 세력이 없습니다. 다른 편 세력의 「편」 선택을 「{section.label}」으로 바꾸면 이 묶음으로 옮겨집니다.
            </div>
          )
        }

        const partScript = internalCuts && section.key > 0
          ? shortsPartScriptOf(script, section.key)
          : { ...script, groups: items.map(item => item.group) }
        const groupChips = items
          .map(item => {
            const color = item.group.color ?? '#92400e'
            return {
              index: item.index,
              name: (item.group.name ?? '').split('\n')[0].trim(),
              color,
              textColor: contrastText(color),
            }
          })
          .filter(chip => chip.name)
        const collapsed = !!collapsedParts[section.key]

        return (
          <div key={section.key} className="overflow-hidden rounded-lg border border-border">
            <FactionShortsPartHeader
              part={section.key}
              label={section.label}
              collapsed={collapsed}
              groups={groupChips}
              peopleCount={totalPeople(partScript)}
              durationSec={totalSec(partScript)}
              script={script}
              update={onChange}
              editLang={editLang}
              series={series}
              episodeName={episodeName}
              onToggle={() => setCollapsedParts(current => ({
                ...current,
                [section.key]: !current[section.key],
              }))}
              onGroupClick={groupIndex => onJumpToGroup(section.key, groupIndex)}
            />

            {!collapsed && (
              <div className="space-y-2 border-t border-border bg-bg-main/20 p-2.5">
                <div className="space-y-2 rounded-md border border-border/60 bg-bg-card/30 p-2.5">
                  {section.key === 0 && (
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                      <label className="w-20 shrink-0 text-xs text-text-dim">시간 -</label>
                      <span className="inline-flex items-center gap-1 text-xs text-text-dim" title="시작 화면(영상 도입)이 떠 있는 시간. 비우면 2.5초, 시작문구가 길면 늘린다">
                        시작 화면
                        <input
                          type="number" min={1} max={12} step={0.5} placeholder="2.5"
                          value={script.introSec ?? ''}
                          onChange={event => {
                            const value = event.target.value === '' ? undefined : Number(event.target.value)
                            onChange({ introSec: value != null && Number.isFinite(value) ? value : undefined })
                          }}
                          className="w-14 rounded-md border border-border bg-bg-card px-2 py-1.5 text-sm focus:border-accent focus:outline-none"
                        />
                        초
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs text-text-dim" title="영상 끝 화면(브랜드 또는 종료 이미지)이 떠 있는 시간. 비우면 2.5초">
                        종료 화면
                        <input
                          type="number" min={0} step={0.5} placeholder="2.5"
                          value={script.outroHoldSec ?? ''}
                          onChange={event => onChange({ outroHoldSec: event.target.value === '' ? undefined : Number(event.target.value) })}
                          className="w-14 rounded-md border border-border bg-bg-card px-2 py-1.5 text-sm focus:border-accent focus:outline-none"
                        />
                        초
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs text-text-dim" title="로고 영상(logoVid) 또는 이미지(logoImg) 타이틀 카드 재생 시간. 로고 있는 세력의 풀스크린 진입 화면 길이. 비우면 4초. 스튜디오/렌더에 즉시 반영됨">
                        로고 타이틀
                        <input
                          type="number" min={0.5} max={8} step={0.1} placeholder="4"
                          value={script.groupSec ?? ''}
                          onChange={event => {
                            const value = event.target.value === '' ? undefined : Number(event.target.value)
                            onChange({ groupSec: value != null && Number.isFinite(value) ? value : undefined })
                          }}
                          className="w-14 rounded-md border border-border bg-bg-card px-2 py-1.5 text-sm focus:border-accent focus:outline-none"
                        />
                        초
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs text-text-dim" title="그룹샷(단체사진) 카드 재생 시간 — 그룹명이 뜨는 화면 길이. 비우면 인원 수에 맞춰 자동(2.6~3.2초). 지정하면 인원 수와 무관하게 이 값으로 고정">
                        그룹명 출력
                        <input
                          type="number" min={0.5} max={8} step={0.1} placeholder="자동"
                          value={script.clusterSec ?? ''}
                          onChange={event => {
                            const value = event.target.value === '' ? undefined : Number(event.target.value)
                            onChange({ clusterSec: value != null && Number.isFinite(value) ? value : undefined })
                          }}
                          className="w-14 rounded-md border border-border bg-bg-card px-2 py-1.5 text-sm focus:border-accent focus:outline-none"
                        />
                        초
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs text-text-dim" title="마지막 인물 대사가 끝난 뒤, 그 화면을 멈춘 채 기다리는 시간. 비우면 4초">
                        대사 후 대기
                        <input
                          type="number" min={0} step={0.5} placeholder="4"
                          value={script.endHoldSec ?? ''}
                          onChange={event => onChange({ endHoldSec: event.target.value === '' ? undefined : Number(event.target.value) })}
                          className="w-14 rounded-md border border-border bg-bg-card px-2 py-1.5 text-sm focus:border-accent focus:outline-none"
                        />
                        초
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs text-text-dim" title="맨 끝에서 화면이 검정으로 서서히 어두워지는 시간. 비우면 3초">
                        암전
                        <input
                          type="number" min={0} step={0.5} placeholder="3"
                          value={script.endFadeSec ?? ''}
                          onChange={event => onChange({ endFadeSec: event.target.value === '' ? undefined : Number(event.target.value) })}
                          className="w-14 rounded-md border border-border bg-bg-card px-2 py-1.5 text-sm focus:border-accent focus:outline-none"
                        />
                        초
                      </span>
                    </div>
                  )}

                  {section.key === 0 && (
                    <label className="flex items-center gap-2 text-xs text-text-dim">
                      <input
                        type="checkbox"
                        checked={!!script.noOutro}
                        onChange={event => onChange({ noOutro: event.target.checked || undefined })}
                        className="accent-accent"
                      />
                      종료 화면 없이 마지막 인물 화면에서 끝내기
                      <span className="text-[10px] text-text-dim">켜면 위 종료 화면·브랜드 화면(롱폼·편별 포함)을 모두 생략하고, 마지막 인물이 검정으로 사라지며 끝납니다</span>
                    </label>
                  )}

                  <FactionHeroPicker
                    script={script}
                    candidates={heroCandidates}
                    series={series}
                    episodeName={episodeName}
                    onChange={onChange}
                    part={section.key}
                    partCount={partCount}
                  />

                  {section.key === 0 && (
                    <>
                      <div className="flex items-center gap-2">
                        <label className="w-20 shrink-0 text-xs text-text-dim">시작 효과음 -</label>
                        <select
                          value={script.startSfx ?? ''}
                          onChange={event => onChange({ startSfx: event.target.value || undefined })}
                          className="rounded-md border border-border bg-bg-card px-2 py-1.5 text-sm"
                        >
                          <option value="">없음</option>
                          {sfxList.map(sfx => <option key={sfx} value={sfx}>{sfx}</option>)}
                        </select>
                        <span className="text-[10px] text-text-dim">시작문구와 함께 울리고 같이 사라짐</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="w-20 shrink-0 text-xs text-text-dim">로고 효과음 -</label>
                        <select
                          value={script.groupSfx ?? ''}
                          onChange={event => onChange({ groupSfx: event.target.value || undefined })}
                          className="rounded-md border border-border bg-bg-card px-2 py-1.5 text-sm"
                        >
                          <option value="">없음</option>
                          {sfxList.map(sfx => <option key={sfx} value={sfx}>{sfx}</option>)}
                        </select>
                        <span className="text-[10px] text-text-dim">세력 로고가 뜰 때마다 울림</span>
                      </div>
                    </>
                  )}

                  {section.key !== 0 && (
                    <div className="flex items-center gap-2">
                      <label className="w-16 shrink-0 text-xs text-text-dim">배경음악 -</label>
                      <select
                        value={script.musicByPart?.[section.key] ?? ''}
                        onChange={event => {
                          const musicByPart: Record<number, string> = { ...(script.musicByPart ?? {}) }
                          if (event.target.value) musicByPart[section.key] = event.target.value
                          else delete musicByPart[section.key]
                          onChange({ musicByPart: Object.keys(musicByPart).length ? musicByPart : undefined })
                        }}
                        className="rounded-md border border-border bg-bg-card px-2 py-1.5 text-sm"
                      >
                        <option value="">공통 곡 사용</option>
                        {musicList.map(music => <option key={music} value={music}>{musicLabel(music)}</option>)}
                      </select>
                      {script.musicByPart?.[section.key] && (
                        <span className="flex items-center gap-1" title="이 편 배경음악 음량. 100%가 원음">
                          <input
                            type="range" min={0} max={1} step={0.05}
                            value={script.musicVolumeByPart?.[section.key] ?? 1}
                            onChange={event => {
                              const value = Number(event.target.value)
                              const volumes: Record<number, number> = { ...(script.musicVolumeByPart ?? {}) }
                              if (value === 1) delete volumes[section.key]
                              else volumes[section.key] = value
                              onChange({ musicVolumeByPart: Object.keys(volumes).length ? volumes : undefined })
                            }}
                            className="w-20 accent-accent"
                          />
                          <span className="w-9 text-right font-mono text-[10px] text-text-secondary">
                            {Math.round((script.musicVolumeByPart?.[section.key] ?? 1) * 100)}%
                          </span>
                        </span>
                      )}
                      <span className="text-[10px] text-text-dim">이 편만 다른 곡(공통 곡 무시, 반복)</span>
                    </div>
                  )}
                </div>

                <FactionCommentPanel series={series} episodeName={episodeName} part={section.key} />

                <div className="space-y-1">
                  {internalCuts && section.key > 0
                    ? slices.map(slice => {
                        const color = slice.group.color ?? '#92400e'
                        const label = (slice.group.name ?? '').split('\n')[0]?.trim() || '(이름 없음)'
                        return (
                          <div
                            key={`${slice.groupIndex}-${slice.step.sequenceStart}`}
                            className="flex items-center gap-2 rounded-md border border-border bg-bg-card/50 px-2.5 py-1.5"
                          >
                            <span
                              className="max-w-[14rem] shrink-0 truncate rounded px-2 py-0.5 text-xs font-bold"
                              style={{ backgroundColor: color, color: contrastText(color) }}
                            >
                              {label}
                            </span>
                            <span className="min-w-0 flex-1 truncate text-[11px] text-text-secondary" title={shortsSliceSummary(slice)}>
                              {shortsSliceSummary(slice)}
                            </span>
                            <button
                              type="button"
                              onClick={() => onEditGroup(slice.groupIndex)}
                              className="shrink-0 rounded border border-border px-2 py-1 text-[11px] font-semibold text-text-secondary hover:bg-bg-hover"
                              title="정비 탭에서 이야기 순서와 편 경계 편집"
                            >
                              경계 편집
                            </button>
                          </div>
                        )
                      })
                    : items.map(({ group, index }) => (
                        <FactionComposeRow
                          key={index}
                          group={group}
                          groupIndex={index}
                          partOptions={partAssignOptions}
                          onPart={part => onSetGroupPart(index, part)}
                          onMoveUp={() => onMoveGroupInPart(index, -1)}
                          onMoveDown={() => onMoveGroupInPart(index, 1)}
                          onEdit={() => onEditGroup(index)}
                        />
                      ))}
                </div>
              </div>
            )}
          </div>
        )
      })}

      {excludedGroups.length > 0 && (
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => setCollapsedParts(current => ({ ...current, [-1]: !current[-1] }))}
            className="flex w-full items-center gap-2 rounded-md border border-dashed border-border/60 bg-bg-card/30 px-3 py-1.5 text-left hover:bg-bg-card"
            title={collapsedParts[-1] ? '펼치기' : '접기'}
          >
            <span className="text-text-dim">
              {collapsedParts[-1] ? <ChevronsUpDown size={14} /> : <ChevronsDownUp size={14} />}
            </span>
            <span className="text-sm font-bold text-text-dim">재료 (영상 제외)</span>
            <span className="text-[10px] text-text-dim">어느 편에도 안 들어감 · 「편」을 골라 넣으면 영상에 포함 · {excludedGroups.length}개</span>
          </button>
          {!collapsedParts[-1] && excludedGroups.map(({ group, index }) => (
            <FactionComposeRow
              key={index}
              group={group}
              groupIndex={index}
              partOptions={partAssignOptions}
              onPart={part => onSetGroupPart(index, part)}
              onMoveUp={() => onMoveGroupInPart(index, -1)}
              onMoveDown={() => onMoveGroupInPart(index, 1)}
              onEdit={() => onEditGroup(index)}
            />
          ))}
        </div>
      )}
    </>
  )
})
