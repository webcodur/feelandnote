import type { KeyboardEvent, MouseEvent } from 'react'
import type { FactionScript } from '@/lib/faction-types'
import type { EditLang } from '@feelandnote/shared/bo/editor'
import { formatMmss } from '@feelandnote/shared/bo/editor'
import { ChevronsDownUp, ChevronsUpDown } from '@feelandnote/shared/bo/icons'
import { CoverPickerButton } from '../FactionGroupEditor/CoverPickerButton/CoverPickerButton'
import { PartTextField } from './PartTextField'

export type ShortsPartGroupSummary = {
  index: number
  name: string
  color: string
  textColor: string
}

type Props = {
  part: number
  label: string
  collapsed: boolean
  groups: ShortsPartGroupSummary[]
  peopleCount: number
  durationSec: number
  script: FactionScript
  update: (patch: Partial<FactionScript>) => void
  editLang: EditLang
  series: string
  episodeName: string
  onToggle: () => void
  onGroupClick: (groupIndex: number) => void
}

function stopPropagation(event: MouseEvent | KeyboardEvent) {
  event.stopPropagation()
}

function setPartImage(
  script: FactionScript,
  update: (patch: Partial<FactionScript>) => void,
  part: number,
  commonKey: 'introImage' | 'outroImage',
  byPartKey: 'introImageByPart' | 'outroImageByPart',
  next: string | undefined,
) {
  if (part === 0) {
    update({ [commonKey]: next } as Partial<FactionScript>)
    return
  }

  const values = { ...(script[byPartKey] ?? {}) }
  if (next) values[part] = next
  else delete values[part]
  update({ [byPartKey]: Object.keys(values).length ? values : undefined } as Partial<FactionScript>)
}

export function FactionShortsPartHeader({
  part,
  label,
  collapsed,
  groups,
  peopleCount,
  durationSec,
  script,
  update,
  editLang,
  series,
  episodeName,
  onToggle,
  onGroupClick,
}: Props) {
  const introValue = part === 0 ? script.introImage : script.introImageByPart?.[part]
  const outroValue = part === 0 ? script.outroImage : script.outroImageByPart?.[part]
  const introInherited = part > 0 && !introValue
  const outroInherited = part > 0 && !outroValue
  const groupNames = groups.map(group => group.name).join(' · ')

  return (
    <div
      role="button"
      tabIndex={0}
      aria-expanded={!collapsed}
      onClick={onToggle}
      onKeyDown={event => {
        if (event.target !== event.currentTarget) return
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onToggle()
        }
      }}
      className="flex min-h-28 w-full cursor-pointer select-none flex-wrap items-stretch gap-3 bg-bg-secondary p-3 text-left hover:bg-bg-hover"
      title={collapsed ? '클릭하면 펼치기' : '클릭하면 접기'}
    >
      <div className="flex w-10 shrink-0 flex-col items-center justify-between gap-2 py-1">
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-accent/15 text-sm font-bold text-accent">
          {part === 0 ? '공' : part}
        </span>
        <span className="text-text-secondary">
          {collapsed ? <ChevronsUpDown size={17} /> : <ChevronsDownUp size={17} />}
        </span>
      </div>

      <div className="flex shrink-0 items-stretch gap-1.5" onClick={stopPropagation} onKeyDown={stopPropagation}>
        <CoverPickerButton
          value={introValue}
          previewValue={part > 0 ? script.introImage : undefined}
          onChange={next => setPartImage(script, update, part, 'introImage', 'introImageByPart', next)}
          label={introInherited ? '시작 · 공통' : '시작'}
          emptyText={part === 0 ? '통합화면' : '공통 통합화면'}
          series={series}
          episodeName={episodeName}
          className="h-20 w-28"
        />
        <CoverPickerButton
          value={outroValue}
          previewValue={part > 0 ? script.outroImage : undefined}
          onChange={next => setPartImage(script, update, part, 'outroImage', 'outroImageByPart', next)}
          label={script.noOutro ? '종료 · 꺼짐' : outroInherited ? '종료 · 공통' : '종료'}
          emptyText={script.noOutro ? '종료 없음' : part === 0 ? '브랜드 화면' : '공통 브랜드 화면'}
          series={series}
          episodeName={episodeName}
          className="h-20 w-28"
        />
      </div>

      <div className="flex min-w-48 flex-1 flex-col justify-between gap-2 py-1">
        <div>
          <div className="text-base font-bold text-text-primary">{label}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-text-dim">
            <span>세력 {groups.length}</span>
            <span>인물 {peopleCount}</span>
            <span className="font-mono">{formatMmss(durationSec)}</span>
          </div>
        </div>

        {groups.length ? (
          <div className="flex flex-wrap items-center gap-1" title={groupNames}>
            {groups.map(group => (
              <button
                key={group.index}
                type="button"
                onClick={event => {
                  event.stopPropagation()
                  onGroupClick(group.index)
                }}
                className="cursor-pointer rounded px-1.5 py-0.5 text-[10px] font-bold leading-tight hover:brightness-110 hover:ring-2 hover:ring-white/40"
                style={{
                  backgroundColor: group.color,
                  color: group.textColor,
                  border: `1px solid ${group.textColor === '#ffffff' ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.08)'}`,
                }}
                title={`${group.name}로 이동`}
              >
                {group.name}
              </button>
            ))}
          </div>
        ) : (
          <div className="text-[10px] text-text-dim">쇼츠 모든 편에 적용되는 공통 설정</div>
        )}
      </div>

      <div
        className="flex shrink-0 items-start gap-2 border-l border-border/60 pl-3"
        onClick={stopPropagation}
        onKeyDown={stopPropagation}
      >
        <PartTextField
          part={part}
          label="영상 명칭"
          keys={{ common: 'title', byPart: 'titleByPart', en: 'titleEn' }}
          multiline
          compact
          script={script}
          update={update}
          editLang={editLang}
        />
        <PartTextField
          part={part}
          label="시작문구"
          keys={{ common: 'logline', byPart: 'loglineByPart', en: 'loglineEn' }}
          multiline
          multilineHint="시작문구 (개행하면 위·아래 두 줄)"
          compact
          script={script}
          update={update}
          editLang={editLang}
        />
      </div>
    </div>
  )
}
