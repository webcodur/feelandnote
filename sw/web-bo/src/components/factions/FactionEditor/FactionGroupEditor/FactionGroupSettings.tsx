'use client'

import type { FactionGroup } from '@/lib/faction-types'
import { GroupThemePanel } from './GroupThemePanel'

type Props = {
  group: FactionGroup
  groupIndex: number
  onChange: (next: FactionGroup) => void
}

export function FactionGroupSettings({ group, groupIndex, onChange }: Props) {
  const color = group.color ?? '#92400e'
  const disabled = !!group.disabled

  return (
    <>
      <GroupThemePanel groupIndex={groupIndex} />
      <section className="space-y-3 rounded-md border border-border bg-bg-card p-3" aria-label="세력 설정">
        {disabled ? <div className="mb-2 border-b border-border/50 pb-2 text-xs font-semibold text-danger-text">이 세력은 영상에서 제외되어 있습니다. 아래 설정은 다시 포함했을 때 적용됩니다.</div> : null}

        <div className="flex items-center gap-3">
          <span className="w-16 shrink-0 text-right text-xs font-semibold text-text-dim">테마 색 -</span>
          <div className="flex items-center gap-1">
            <input type="color" value={color} onChange={event => onChange({ ...group, color: event.target.value })} className="h-8 w-10 cursor-pointer rounded border border-border bg-bg-card" title="테마 색" />
            <input type="text" value={color} onChange={event => onChange({ ...group, color: event.target.value })} className="w-24 rounded-md border border-border bg-bg-card px-2 py-1.5 text-xs focus:border-accent focus:outline-none" />
          </div>
          <span className="ml-2 hidden text-[10px] text-text-dim sm:inline-block">세력 명칭은 상단 헤더 영역에서 직접 입력합니다. (첫 줄=명칭, 둘째 줄부터=설명)</span>
        </div>

        <div className="flex items-center gap-3">
          <span className="w-16 shrink-0 text-right text-xs font-semibold text-text-dim">노출 모드 -</span>
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex cursor-pointer items-center gap-1.5 text-sm text-text-secondary" title="회사·팀이 아닌 개인들의 모음입니다. 켜면 팀 이름 카드와 단체사진을 건너뛰고 인물만 차례로 나옵니다.">
              <input type="checkbox" checked={!!group.solo} onChange={event => onChange({ ...group, solo: event.target.checked || undefined })} />
              무소속 개인군 <span className="text-[10px] text-text-dim">(팀 화보 생략)</span>
            </label>
            <label className="flex cursor-pointer items-center gap-1.5 text-sm text-text-secondary">
              <input type="checkbox" checked={!!group.longformOnly} onChange={event => onChange({ ...group, longformOnly: event.target.checked || undefined })} />
              롱폼 전용 <span className="text-[10px] text-text-dim">(쇼츠 제외)</span>
            </label>
          </div>
        </div>

      </section>
    </>
  )
}
