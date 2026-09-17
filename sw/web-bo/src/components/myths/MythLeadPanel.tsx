'use client'

/**
 * 대표 인물 — 신화 카드 타이틀 아트에 세우는 3인. 명단 차례와는 별개로 따로 고른다.
 * 저장은 faction_lv2.lead_person_ids — 배열 차례가 아트에 서는 차례다.
 */

import { useState } from 'react'
import { ArrowDown, ArrowUp, Plus, X } from 'lucide-react'
import { setFactionLeadPersons, type FactionMember } from '@/actions/admin/factions/entries'
import { Avatar } from '@/components/factions/entry/bits'
import { MYTH_BUTTON, MYTH_CARD, MYTH_INPUT } from './styles'

const MAX_LEADS = 3
const ARROW = 'rounded p-0.5 text-text-tertiary hover:bg-bg-secondary hover:text-text-primary disabled:opacity-30 disabled:hover:bg-transparent'

export function MythLeadPanel({ lv2Id, leadIds, members, onSaved }: {
  lv2Id: string
  leadIds: string[]
  members: FactionMember[]
  onSaved: (next: string[]) => void
}) {
  const [leads, setLeads] = useState<string[]>(leadIds)
  const [pick, setPick] = useState('')
  const [busy, setBusy] = useState(false)

  const memberOf = (id: string) => members.find(m => m.celeb_id === id)
  /** 명단에 있는 인물만 후보가 된다 — 명단 밖 인물을 세우면 아트가 명단과 어긋난다 */
  const candidates = members.filter(m => !m.hidden && !leads.includes(m.celeb_id))
  const changed = leads.length !== leadIds.length || leads.some((id, i) => id !== leadIds[i])

  const move = (index: number, delta: -1 | 1) => {
    const target = index + delta
    if (target < 0 || target >= leads.length) return
    const next = [...leads]
    ;[next[index], next[target]] = [next[target], next[index]]
    setLeads(next)
  }

  const add = () => {
    if (!pick || leads.includes(pick) || leads.length >= MAX_LEADS) return
    setLeads([...leads, pick])
    setPick('')
  }

  const save = async () => {
    setBusy(true)
    const result = await setFactionLeadPersons(lv2Id, leads)
    setBusy(false)
    if (!result.success) return alert(result.error ?? '대표 인물을 저장하지 못했습니다.')
    onSaved(leads)
  }

  return (
    <section className={MYTH_CARD}>
      <header className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="text-base font-semibold text-text-primary">
          대표 인물 <span className="text-sm font-normal text-text-tertiary">{leads.length}/{MAX_LEADS}</span>
        </h2>
        <p className="text-xs text-text-tertiary">신화 카드 타이틀 아트에 서는 얼굴입니다. 왼쪽부터 세웁니다.</p>
      </header>

      <ul className="space-y-1.5">
        {leads.map((id, index) => {
          const member = memberOf(id)
          return (
            <li key={id} className="flex items-center gap-2.5 rounded-lg bg-bg-secondary/30 p-2.5">
              <div className="flex shrink-0 flex-col">
                <button type="button" onClick={() => move(index, -1)} disabled={index === 0} className={ARROW} title="앞으로">
                  <ArrowUp className="size-3.5" />
                </button>
                <button type="button" onClick={() => move(index, 1)} disabled={index === leads.length - 1} className={ARROW} title="뒤로">
                  <ArrowDown className="size-3.5" />
                </button>
              </div>
              <Avatar url={member?.celeb?.avatar_url} name={member?.celeb?.nickname} />
              <p className="min-w-0 flex-1 truncate text-sm font-medium text-text-primary">
                {member?.celeb?.nickname ?? '(명단에 없는 인물)'}
                {member?.hidden && <span className="ms-2 text-xs font-normal text-text-tertiary">숨김 — 아트에 서려면 명단에서 보이게 하세요</span>}
              </p>
              <button type="button" onClick={() => setLeads(leads.filter(l => l !== id))} title="대표에서 빼기" className="shrink-0 rounded p-1 text-text-tertiary hover:text-red-500">
                <X className="size-4" />
              </button>
            </li>
          )
        })}
        {leads.length === 0 && (
          <li className="rounded-lg border border-dashed border-border px-3 py-2 text-xs text-text-tertiary">
            아직 없습니다. 비우면 아트 자리는 명단 앞쪽 인물로 채워집니다.
          </li>
        )}
      </ul>

      {leads.length < MAX_LEADS && (
        <div className="mt-3 flex gap-2">
          <select value={pick} onChange={e => setPick(e.target.value)} aria-label="대표 인물 후보" className={`${MYTH_INPUT} flex-1 text-sm`}>
            <option value="">명단에서 고르기…</option>
            {candidates.map(m => (
              <option key={m.celeb_id} value={m.celeb_id}>{m.celeb?.nickname ?? m.celeb_id}</option>
            ))}
          </select>
          <button type="button" onClick={add} disabled={!pick} className={MYTH_BUTTON}>
            <Plus className="size-4" />
            세우기
          </button>
        </div>
      )}

      <div className="mt-3 flex justify-end">
        <button type="button" onClick={save} disabled={!changed || busy} className={MYTH_BUTTON}>저장</button>
      </div>
    </section>
  )
}
