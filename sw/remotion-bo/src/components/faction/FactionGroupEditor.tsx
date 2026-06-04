'use client'

import { useState } from 'react'
import type { FactionGroup, FactionPerson } from '@/lib/faction-types'
import { imageSrc } from './timing'
import { ChevronUp, ChevronDown, Trash2, Search, UserPlus, ImageIcon } from './icons'
import { FactionPersonRow } from './FactionPersonRow'
import { FactionImagePicker } from './FactionImagePicker'
import { FactionCelebSearchModal, type CelebResult } from './FactionCelebSearchModal'

type Props = {
  group: FactionGroup
  onChange: (next: FactionGroup) => void
  onDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  series: string
  episodeName: string
}

const DEFAULT_COLOR = '#92400e'

export function FactionGroupEditor({ group, onChange, onDelete, onMoveUp, onMoveDown, series, episodeName }: Props) {
  const [expanded, setExpanded] = useState(true)
  const [logoOpen, setLogoOpen] = useState(false)
  const [celebOpen, setCelebOpen] = useState(false)

  const people = group.people ?? []
  const color = group.color ?? DEFAULT_COLOR
  const logoSrc = imageSrc(series, episodeName, group.logo)

  // 인물 배열 갱신 헬퍼
  const updatePeople = (next: FactionPerson[]) => onChange({ ...group, people: next })
  const setPerson = (i: number, p: FactionPerson) => updatePeople(people.map((x, idx) => (idx === i ? p : x)))
  const deletePerson = (i: number) => updatePeople(people.filter((_, idx) => idx !== i))
  const movePerson = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= people.length) return
    const next = [...people]
    ;[next[i], next[j]] = [next[j], next[i]]
    updatePeople(next)
  }

  // 셀럽 선택 → 인물 생성
  const addCeleb = (c: CelebResult) => {
    const person: FactionPerson = {
      name: c.nickname,
      role: c.title || c.profession || '',
      org: '',
      image: c.avatar_url || undefined,
      slug: c.slug,
    }
    updatePeople([...people, person])
  }

  const addBlankPerson = () => updatePeople([...people, { name: '', role: '', org: '' }])

  return (
    <div className="rounded-lg border border-border bg-bg-secondary">
      {/* 헤더 */}
      <div className="flex items-center gap-2 p-3">
        <span className="h-4 w-4 shrink-0 rounded-full border border-border" style={{ backgroundColor: color }} />
        <input
          type="text"
          placeholder="세력명"
          value={group.name}
          onChange={e => onChange({ ...group, name: e.target.value })}
          className="min-w-0 flex-1 rounded-md border border-border bg-bg-card px-2 py-1.5 text-sm font-semibold focus:border-accent focus:outline-none"
        />
        <span className="shrink-0 text-xs text-text-dim">인물 {people.length}</span>
        <button onClick={() => setExpanded(v => !v)} className="rounded-md border border-border p-1.5 text-text-secondary hover:bg-bg-hover" title={expanded ? '접기' : '펼치기'}>
          {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </button>
        <button onClick={onMoveUp} className="rounded-md border border-border p-1.5 text-text-secondary hover:bg-bg-hover" title="위로">
          <ChevronUp size={15} />
        </button>
        <button onClick={onMoveDown} className="rounded-md border border-border p-1.5 text-text-secondary hover:bg-bg-hover" title="아래로">
          <ChevronDown size={15} />
        </button>
        <button onClick={onDelete} className="rounded-md border border-border p-1.5 text-danger-text hover:bg-danger" title="세력 삭제">
          <Trash2 size={15} />
        </button>
      </div>

      {expanded && (
        <div className="space-y-3 border-t border-border p-3">
          {/* 한 줄 설명 + 색 + 로고 */}
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              placeholder="한 줄 설명"
              value={group.tagline ?? ''}
              onChange={e => onChange({ ...group, tagline: e.target.value })}
              className="min-w-0 flex-1 rounded-md border border-border bg-bg-card px-2 py-1.5 text-sm focus:border-accent focus:outline-none"
            />
            <div className="flex items-center gap-1">
              <input
                type="color"
                value={color}
                onChange={e => onChange({ ...group, color: e.target.value })}
                className="h-8 w-10 cursor-pointer rounded border border-border bg-bg-card"
                title="테마 색"
              />
              <input
                type="text"
                value={color}
                onChange={e => onChange({ ...group, color: e.target.value })}
                className="w-24 rounded-md border border-border bg-bg-card px-2 py-1.5 text-xs focus:border-accent focus:outline-none"
              />
            </div>
            <button
              onClick={() => setLogoOpen(true)}
              className="flex items-center gap-1.5 rounded-md border border-border bg-bg-card px-2 py-1.5 text-sm text-text-secondary hover:bg-bg-hover"
            >
              {logoSrc ? (
                <img src={logoSrc} alt="" className="h-5 w-5 rounded object-cover" />
              ) : (
                <ImageIcon size={15} />
              )}
              로고
            </button>
          </div>

          {/* 인물 목록 */}
          <div className="space-y-2">
            {people.map((p, i) => (
              <FactionPersonRow
                key={i}
                person={p}
                onChange={next => setPerson(i, next)}
                onDelete={() => deletePerson(i)}
                onMoveUp={() => movePerson(i, -1)}
                onMoveDown={() => movePerson(i, 1)}
                series={series}
                episodeName={episodeName}
              />
            ))}
            {people.length === 0 && <p className="text-xs text-text-dim">아직 인물이 없습니다.</p>}
          </div>

          {/* 인물 추가 */}
          <div className="flex gap-2">
            <button
              onClick={() => setCelebOpen(true)}
              className="flex items-center gap-1.5 rounded-md border border-border bg-bg-card px-3 py-1.5 text-sm font-semibold text-text-secondary hover:bg-bg-hover"
            >
              <Search size={15} /> 셀럽에서 추가
            </button>
            <button
              onClick={addBlankPerson}
              className="flex items-center gap-1.5 rounded-md border border-border bg-bg-card px-3 py-1.5 text-sm font-semibold text-text-secondary hover:bg-bg-hover"
            >
              <UserPlus size={15} /> 직접 추가
            </button>
          </div>
        </div>
      )}

      {logoOpen && (
        <FactionImagePicker
          value={group.logo}
          onChange={next => onChange({ ...group, logo: next })}
          series={series}
          episodeName={episodeName}
          onClose={() => setLogoOpen(false)}
        />
      )}

      <FactionCelebSearchModal open={celebOpen} onClose={() => setCelebOpen(false)} onSelect={addCeleb} />
    </div>
  )
}
