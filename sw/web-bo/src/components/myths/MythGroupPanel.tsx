'use client'

/**
 * 그룹 — 신화 화면의 그룹 탭 하나가 한 줄이다. 이름(ko·en)·차례·설명(그룹 개요 본문)·삭제를 다룬다.
 * 인물을 그룹에 넣고 빼는 일은 아래 인물 명단의 그룹 칸이 한다.
 */

import { useRef, useState } from 'react'
import { ArrowDown, ArrowUp, ChevronDown, Plus, Trash2 } from 'lucide-react'
import {
  createFactionGroup, deleteFactionGroup, reorderFactionGroups, updateFactionGroup,
  type FactionGroup, type FactionMember,
} from '@/actions/admin/factions/entries'
import { MYTH_BUTTON, MYTH_CARD, MYTH_INPUT } from './styles'

type GroupText = Pick<FactionGroup, 'name' | 'name_en' | 'description' | 'description_en'>

const textOf = (group: FactionGroup): GroupText => ({
  name: group.name,
  name_en: group.name_en,
  description: group.description,
  description_en: group.description_en,
})

const ARROW = 'rounded p-0.5 text-text-tertiary hover:bg-bg-secondary hover:text-text-primary disabled:opacity-30 disabled:hover:bg-transparent'

export function MythGroupPanel({ lv2Id, groups, members, onGroupsChange, onMembersChange }: {
  lv2Id: string
  groups: FactionGroup[]
  members: FactionMember[]
  onGroupsChange: (next: FactionGroup[]) => void
  onMembersChange: (next: FactionMember[]) => void
}) {
  const [openId, setOpenId] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  /** 마지막으로 저장된 글 — 칸을 스치기만 한 blur는 저장하지 않는다 */
  const saved = useRef(new Map(groups.map(group => [group.id, textOf(group)])))
  const countOf = (groupId: string) => members.filter(m => m.lv3_id === groupId).length

  const edit = (groupId: string, field: keyof GroupText, value: string) =>
    onGroupsChange(groups.map(g => (g.id === groupId ? { ...g, [field]: value } : g)))

  const save = async (group: FactionGroup, field: keyof GroupText) => {
    const before = saved.current.get(group.id)
    const raw = group[field]
    const value = field === 'name' ? (raw ?? '').trim() : raw?.trim() || null
    if (!before || before[field] === value) return
    const result = await updateFactionGroup(group.id, { [field]: value } as Partial<GroupText>)
    if (!result.success) {
      alert(result.error ?? '그룹을 저장하지 못했습니다.')
      onGroupsChange(groups.map(g => (g.id === group.id ? { ...g, [field]: before[field] } : g)))
      return
    }
    saved.current.set(group.id, { ...before, [field]: value })
    if (field === 'name') {
      onMembersChange(members.map(m => (m.lv3_id === group.id ? { ...m, group_name: value as string } : m)))
    }
  }

  const move = async (index: number, delta: -1 | 1) => {
    const target = index + delta
    if (target < 0 || target >= groups.length) return
    const next = [...groups]
    ;[next[index], next[target]] = [next[target], next[index]]
    onGroupsChange(next)
    const result = await reorderFactionGroups(lv2Id, next.map(g => g.id))
    if (!result.success) {
      alert(result.error ?? '그룹 차례를 저장하지 못했습니다.')
      onGroupsChange(groups)
    }
  }

  const add = async () => {
    const result = await createFactionGroup(lv2Id, newName, null)
    if (!result.group) return alert(result.error ?? '그룹을 더하지 못했습니다.')
    saved.current.set(result.group.id, textOf(result.group))
    onGroupsChange([...groups, result.group])
    setNewName('')
  }

  const remove = async (group: FactionGroup) => {
    const count = countOf(group.id)
    const question = count > 0
      ? `「${group.name}」을(를) 지우면 구성원 ${count}명이 「그 외」로 갑니다. 지울까요?`
      : `「${group.name}」을(를) 지울까요?`
    if (!confirm(question)) return
    const result = await deleteFactionGroup(group.id)
    if (!result.success) return alert(result.error ?? '그룹을 지우지 못했습니다.')
    onGroupsChange(groups.filter(g => g.id !== group.id))
    onMembersChange(members.map(m => (m.lv3_id === group.id ? { ...m, lv3_id: null, group_name: null } : m)))
  }

  return (
    <section className={MYTH_CARD}>
      <header className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="text-base font-semibold text-text-primary">
          그룹 <span className="text-sm font-normal text-text-tertiary">{groups.length}</span>
        </h2>
        <p className="text-xs text-text-tertiary">위에서부터 신화 화면의 그룹 탭 차례입니다. 그룹이 둘 미만이면 탭 줄이 숨습니다.</p>
      </header>

      <ul className="space-y-1.5">
        {groups.map((group, index) => {
          const open = openId === group.id
          const described = Boolean(group.description?.trim())
          return (
            <li key={group.id} className="rounded-lg bg-bg-secondary/30">
              <div className="flex items-center gap-2 p-2">
                <div className="flex shrink-0 flex-col">
                  <button type="button" onClick={() => move(index, -1)} disabled={index === 0} className={ARROW} title="위로">
                    <ArrowUp className="size-3.5" />
                  </button>
                  <button type="button" onClick={() => move(index, 1)} disabled={index === groups.length - 1} className={ARROW} title="아래로">
                    <ArrowDown className="size-3.5" />
                  </button>
                </div>
                <input
                  value={group.name}
                  onChange={e => edit(group.id, 'name', e.target.value)}
                  onBlur={() => save(group, 'name')}
                  aria-label="그룹 이름"
                  className={`${MYTH_INPUT} flex-1 text-sm`}
                />
                <input
                  value={group.name_en ?? ''}
                  onChange={e => edit(group.id, 'name_en', e.target.value)}
                  onBlur={() => save(group, 'name_en')}
                  placeholder="English name"
                  aria-label="영문 그룹 이름"
                  className={`${MYTH_INPUT} flex-1 text-xs`}
                />
                <span className="w-10 shrink-0 text-end text-xs tabular-nums text-text-tertiary">{countOf(group.id)}명</span>
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : group.id)}
                  aria-expanded={open}
                  className={`flex shrink-0 items-center gap-1 rounded-lg border px-2 py-1.5 text-xs ${described
                    ? 'border-accent/40 text-accent hover:bg-accent/10'
                    : 'border-dashed border-border text-text-tertiary hover:border-accent hover:text-accent'}`}
                >
                  {described ? '설명' : '설명 없음'}
                  <ChevronDown className={`size-3.5 ${open ? 'rotate-180' : ''}`} />
                </button>
                <button type="button" onClick={() => remove(group)} title="그룹 삭제" className="shrink-0 rounded p-1 text-text-tertiary hover:text-red-500">
                  <Trash2 className="size-4" />
                </button>
              </div>
              {open && (
                <div className="grid gap-1.5 px-2 pb-2 ps-9 md:grid-cols-2">
                  <textarea
                    rows={4}
                    value={group.description ?? ''}
                    onChange={e => edit(group.id, 'description', e.target.value)}
                    onBlur={() => save(group, 'description')}
                    placeholder="이 무리가 누구이고 작품에서 무슨 일을 하는지 두세 문장으로 적어 주세요."
                    className={`${MYTH_INPUT} w-full resize-y text-sm leading-6`}
                  />
                  <textarea
                    rows={4}
                    value={group.description_en ?? ''}
                    onChange={e => edit(group.id, 'description_en', e.target.value)}
                    onBlur={() => save(group, 'description_en')}
                    placeholder="English description (optional)"
                    className={`${MYTH_INPUT} w-full resize-y text-xs leading-5`}
                  />
                </div>
              )}
            </li>
          )
        })}
      </ul>

      <div className="mt-3 flex gap-2">
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && newName.trim()) add() }}
          placeholder="새 그룹 이름"
          className={`${MYTH_INPUT} flex-1 text-sm`}
        />
        <button type="button" onClick={add} disabled={!newName.trim()} className={MYTH_BUTTON}>
          <Plus className="size-4" />
          그룹 추가
        </button>
      </div>
    </section>
  )
}
