import { useState } from 'react'
import type { FactionGroup } from '@/lib/faction-types'
import { X } from '@feelandnote/shared/bo/icons'

type Props = {
  groups: FactionGroup[]
  fromGi: number
  fromCi: number
  fromPi: number
  onClose: () => void
  onConfirm: (toGi: number, toCi: number) => void
}

export function FactionPersonMoveModal({ groups, fromGi, fromCi, fromPi, onClose, onConfirm }: Props) {
  const [selected, setSelected] = useState<{ gi: number; ci: number }>({ gi: fromGi, ci: fromCi })

  const options = groups.flatMap((g, gi) =>
    (g.clusters ?? []).map((c, ci) => ({
      gi,
      ci,
      label: `[${g.name?.split('\n')[0] || `세력 ${gi + 1}`}] ${c.label?.split('\n')[0] || `그룹 ${ci + 1}`}`,
    }))
  )

  const handleConfirm = () => {
    if (selected.gi === fromGi && selected.ci === fromCi) {
      onClose()
      return
    }
    onConfirm(selected.gi, selected.ci)
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-lg border border-border bg-bg-main p-4 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold">인물 그룹 이동</h3>
          <button onClick={onClose} className="text-text-dim hover:text-text-primary">
            <X size={20} />
          </button>
        </div>
        
        <div className="mb-6 space-y-2">
          <label className="text-sm text-text-secondary">이동할 대상 그룹을 선택하세요</label>
          <select
            className="w-full rounded-md border border-border bg-bg-card p-2 text-sm focus:border-accent focus:outline-none"
            value={`${selected.gi}-${selected.ci}`}
            onChange={e => {
              const [gi, ci] = e.target.value.split('-').map(Number)
              setSelected({ gi, ci })
            }}
          >
            {options.map(o => (
              <option key={`${o.gi}-${o.ci}`} value={`${o.gi}-${o.ci}`}>
                {o.label} {o.gi === fromGi && o.ci === fromCi ? '(현재 위치)' : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-md border border-border bg-bg-card px-4 py-2 text-sm hover:bg-bg-hover"
          >
            취소
          </button>
          <button
            onClick={handleConfirm}
            className="rounded-md bg-accent px-4 py-2 text-sm text-white hover:bg-accent/90 disabled:opacity-50"
            disabled={selected.gi === fromGi && selected.ci === fromCi}
          >
            이동하기
          </button>
        </div>
      </div>
    </div>
  )
}
