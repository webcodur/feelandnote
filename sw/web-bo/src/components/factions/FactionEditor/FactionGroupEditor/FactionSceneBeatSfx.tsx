'use client'

import { Plus } from '@feelandnote/shared/bo/icons'
import type { FactionSceneSfx } from '@/lib/faction-types'
import { FactionSceneSfxRow } from './FactionSceneSfxRow'

type Props = {
  value?: string
  startPercent?: number
  sfxs?: FactionSceneSfx[]
  files: string[]
  series: string
  index: number
  /** 이 효과음 묶음의 주인 이름 — 읽어 주는 라벨에 쓴다. 비우면 「N번 컷」. */
  ownerLabel?: string
  /** 몇 개인지 아래에 붙는 안내 문구. 비우면 컷 기준 문구를 쓴다. */
  hint?: (count: number) => string
  onChange: (patch: { sfx?: string; sfxStartPercent?: number; sfxs?: FactionSceneSfx[] }) => void
}

function itemsOf(value: string | undefined, startPercent: number | undefined, sfxs: FactionSceneSfx[] | undefined): FactionSceneSfx[] {
  if (sfxs?.length) return sfxs
  return value ? [{ file: value, startPercent }] : []
}

/** 통합 장면 컷에 여러 효과음을 겹쳐 배치하고 각각의 시작 위치를 조정한다. */
const beatHint = (count: number) =>
  count === 1 ? '이 컷 안에서 1회 재생' : count ? `${count}개 · 컷 안에서 각각 1회 재생` : '효과음 없음'

export function FactionSceneBeatSfx({ value, startPercent, sfxs, files, series, index, ownerLabel, hint = beatHint, onChange }: Props) {
  const items = itemsOf(value, startPercent, sfxs)
  const updateItems = (next: FactionSceneSfx[]) => onChange({
    sfx: undefined,
    sfxStartPercent: undefined,
    sfxs: next.length ? next : undefined,
  })
  const changeItem = (itemIndex: number, patch: Partial<FactionSceneSfx>) => {
    if ('file' in patch && !patch.file) {
      updateItems(items.filter((_, current) => current !== itemIndex))
      return
    }
    updateItems(items.map((item, current) => current === itemIndex ? { ...item, ...patch } : item))
  }
  const addSfx = () => updateItems([...items, { file: '' }])
  const owner = ownerLabel ?? `${index + 1}번 컷`

  return (
    <section
      data-faction-scene-sfx="true"
      className="mt-2 space-y-2 rounded-md border border-border/70 bg-bg-main/25 px-3 py-2.5"
      aria-label={`${owner} 효과음`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-[11px] font-black text-text-secondary">효과음</div>
          <div className="text-[10px] text-text-dim">{hint(items.length)}</div>
        </div>
        <button
          type="button"
          onClick={addSfx}
          className="inline-flex h-8 items-center gap-1 rounded-md border border-dashed border-border bg-bg-card px-2.5 text-xs font-semibold text-text-secondary hover:border-accent hover:bg-accent/10 hover:text-accent active:bg-accent/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          aria-label={`${owner} SFX 추가`}
        >
          <Plus size={13} /> SFX 추가
        </button>
      </div>

      {items.map((item, itemIndex) => (
        <FactionSceneSfxRow
          key={`${itemIndex}-${item.file}`}
          item={item}
          index={itemIndex}
          files={files}
          series={series}
          beatIndex={index}
          ownerLabel={owner}
          onChange={patch => changeItem(itemIndex, patch)}
          onRemove={() => updateItems(items.filter((_, current) => current !== itemIndex))}
        />
      ))}
    </section>
  )
}
