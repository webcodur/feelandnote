'use client'

import Link from 'next/link'
import { Field } from './RankingEntryRow'
import type { RankingFactionOption } from '@/lib/ranking-celeb'

export default function RankingFactionField({
  factions,
  factionSlug,
  onChange,
}: {
  factions: RankingFactionOption[]
  factionSlug: string
  onChange: (slug: string) => void
}) {
  const current = factions.find(t => t.slug === factionSlug)
  return (
    <div className="md:col-span-2">
      <Field label="세력">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={factionSlug}
            onChange={e => onChange(e.target.value)}
            className="min-w-56 flex-1 rounded border border-border bg-bg-secondary px-2 py-1.5 text-sm text-text-primary"
          >
            <option value="">없음</option>
            {factionSlug && !current ? <option value={factionSlug}>{factionSlug}</option> : null}
            {factions.map(t => (
              <option key={t.id} value={t.slug}>{t.name}</option>
            ))}
          </select>
          {current ? (
            <Link
              href={`/factions/${current.id}`}
              className="text-xs text-accent hover:underline"
            >
              세력 편집
            </Link>
          ) : null}
        </div>
      </Field>
      <p className="mt-1 text-xs text-text-secondary">
        인물 풀과 개인화보는 이 세력을 쓴다. 순위와 설명만 이 편에서 고친다.
      </p>
    </div>
  )
}

export function AddFactionPerson({
  people,
  usedNames,
  onAdd,
}: {
  people: { id: string; nickname: string; slug: string | null }[]
  usedNames: string[]
  onAdd: (person: { nickname: string; slug: string | null }) => void
}) {
  const used = new Set(usedNames.map(n => n.trim()))
  const leftover = people.filter(p => p.nickname && !used.has(p.nickname))
  if (!leftover.length) return null
  return (
    <select
      defaultValue=""
      onChange={e => {
        const person = leftover.find(p => p.id === e.target.value)
        e.currentTarget.value = ''
        if (person) onAdd({ nickname: person.nickname, slug: person.slug })
      }}
      className="rounded border border-border bg-bg-secondary px-2 py-1.5 text-xs text-text-secondary hover:text-accent"
    >
      <option value="" disabled>세력에서 넣기</option>
      {leftover.map(p => (
        <option key={p.id} value={p.id}>{p.nickname}</option>
      ))}
    </select>
  )
}
