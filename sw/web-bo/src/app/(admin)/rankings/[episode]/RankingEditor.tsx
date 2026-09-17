'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useToast } from '@/contexts/ToastContext'
import {
  loadRankingCelebProfiles, loadRankingFactionMembers,
} from '@/actions/admin/rankings/celebs'
import { syncScriptToCelebs, type RankingCelebProfile, type RankingFactionOption } from '@/lib/ranking-celeb'
import { saveRankingScript, type RankingCategory, type RankingEntry, type RankingScript } from '@/actions/admin/rankings/script'
import type { CelebSearchItem } from '@/components/celeb/CelebSearchBar'
import { Field, RankingEntryRow } from './RankingEntryRow'
import { uniqueRankingNames } from './RankingCelebPhotos'
import { RankingPool, remapImages } from './RankingMedia'
import RankingFactionField, { AddFactionPerson } from './RankingFactionField'

function mergeProfiles(a: RankingCelebProfile[], b: RankingCelebProfile[]) {
  const map = new Map(a.map(p => [p.id, p]))
  for (const p of b) if (!map.has(p.id)) map.set(p.id, p)
  return [...map.values()]
}

function withRanks(entries: RankingEntry[]): RankingEntry[] {
  return entries.map((e, i) => ({ ...e, rank: i + 1 }))
}

function normalizeScript(script: RankingScript): RankingScript {
  return {
    ...script,
    categories: script.categories.map(c => ({
      ...c,
      entries: withRanks(c.entries.toSorted((a, b) => (a.rank || 0) - (b.rank || 0))),
    })),
  }
}

const emptyEntry = (): RankingEntry => ({
  rank: 0, name: '', line: '', note: '', image: '', avatar: '', celebSlug: '',
})

export default function RankingEditor({
  folder,
  initial,
  factions,
}: {
  folder: string
  initial: RankingScript
  factions: RankingFactionOption[]
}) {
  const { showToast } = useToast()
  const [pending, startTransition] = useTransition()
  const [script, setScript] = useState(() => normalizeScript(initial))
  const [drag, setDrag] = useState<{ ci: number; ei: number } | null>(null)
  const [profiles, setProfiles] = useState<RankingCelebProfile[]>([])
  const [factionMembers, setFactionMembers] = useState<RankingCelebProfile[]>([])
  const nameKey = useMemo(
    () => uniqueRankingNames(script.categories.flatMap(c => c.entries.map(e => e.name))).join('\0'),
    [script.categories],
  )
  const slugKey = useMemo(
    () => uniqueRankingNames(script.categories.flatMap(c => c.entries.map(e => e.celebSlug ?? ''))).join('\0'),
    [script.categories],
  )
  const names = useMemo(() => nameKey.split('\0').filter(Boolean), [nameKey])
  const slugs = useMemo(() => slugKey.split('\0').filter(Boolean), [slugKey])

  const themeSlug = script.themeSlug ?? ''

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      const faction = themeSlug
        ? await loadRankingFactionMembers(themeSlug)
        : { profiles: [] as RankingCelebProfile[] }
      const haveName = new Set(faction.profiles.map(p => p.nickname))
      const haveSlug = new Set(faction.profiles.flatMap(p => p.slug ? [p.slug] : []))
      const extras = await loadRankingCelebProfiles(
        names.filter(n => !haveName.has(n)),
        slugs.filter(s => s && !haveSlug.has(s)),
      )
      const rows = mergeProfiles(faction.profiles, extras)
      if (cancelled) return
      setFactionMembers(faction.profiles)
      setProfiles(rows)
      setScript(cur => syncScriptToCelebs(cur, rows))
    }
    run().catch(e => showToast('error', e instanceof Error ? e.message : String(e)))
    return () => { cancelled = true }
  }, [themeSlug, names, slugs, showToast])

  const patchProfile = (nickname: string, patch: Partial<RankingCelebProfile>) => {
    setProfiles(cur => {
      const next = cur.map(p => (p.nickname === nickname ? { ...p, ...patch } : p))
      setScript(s => syncScriptToCelebs(s, next))
      return next
    })
  }

  const linkCeleb = (name: string, item: CelebSearchItem) => {
    startTransition(async () => {
      try {
        const rows = await loadRankingCelebProfiles(
          [...names, item.nickname ?? name],
          [...slugs, item.slug ?? ''],
        )
        setProfiles(rows)
        setScript(cur => syncScriptToCelebs({
          ...cur,
          categories: cur.categories.map(c => ({
            ...c,
            entries: c.entries.map(e => (e.name === name ? {
              ...e,
              name: item.nickname ?? e.name,
              celebSlug: item.slug ?? '',
            } : e)),
          })),
        }, rows))
      } catch (e) {
        showToast('error', e instanceof Error ? e.message : String(e))
      }
    })
  }

  const setField = <K extends keyof RankingScript>(key: K, value: RankingScript[K]) => {
    setScript(cur => ({ ...cur, [key]: value }))
  }

  const setCategory = (i: number, next: RankingCategory) => {
    setScript(cur => ({
      ...cur,
      categories: cur.categories.map((c, idx) => (idx === i ? next : c)),
    }))
  }

  const setEntries = (ci: number, entries: RankingEntry[]) => {
    setScript(cur => ({
      ...cur,
      categories: cur.categories.map((c, idx) => (idx === ci ? { ...c, entries: withRanks(entries) } : c)),
    }))
  }

  const moveEntry = (ci: number, from: number, to: number) => {
    if (from === to) return
    setScript(cur => {
      const category = cur.categories[ci]
      if (!category) return cur
      const next = [...category.entries]
      const [row] = next.splice(from, 1)
      next.splice(to, 0, row)
      return {
        ...cur,
        categories: cur.categories.map((c, idx) => (idx === ci ? { ...c, entries: withRanks(next) } : c)),
      }
    })
    setDrag({ ci, ei: to })
  }

  const save = () => {
    startTransition(async () => {
      try {
        await saveRankingScript(folder, script)
        showToast('success', '저장했습니다')
      } catch (e) {
        showToast('error', e instanceof Error ? e.message : String(e))
      }
    })
  }

  return (
    <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
    <div className="min-w-0 flex-1 space-y-6">
      <div className="grid gap-3 rounded-xl border border-border bg-bg-card p-4 md:grid-cols-2">
        <Field label="제목">
          <textarea
            value={script.title}
            onChange={e => setField('title', e.target.value)}
            rows={2}
            className="w-full rounded border border-border bg-bg-secondary px-2 py-1.5 text-sm text-text-primary"
          />
        </Field>
        <Field label="시작 문구">
          <textarea
            value={script.logline ?? ''}
            onChange={e => setField('logline', e.target.value)}
            rows={2}
            className="w-full rounded border border-border bg-bg-secondary px-2 py-1.5 text-sm text-text-primary"
          />
        </Field>
        <RankingFactionField
          factions={factions}
          factionSlug={themeSlug}
          onChange={slug => setField('themeSlug', slug)}
        />
        <Field label="음악 경로">
          <input
            value={script.music ?? ''}
            onChange={e => setField('music', e.target.value)}
            placeholder="music/foo.mp3"
            className="w-full rounded border border-border bg-bg-secondary px-2 py-1.5 text-sm text-text-primary"
          />
        </Field>
        <div className="flex items-end">
          <button
            type="button"
            disabled={pending}
            onClick={save}
            className="rounded-md border border-accent bg-accent/10 px-4 py-2 text-sm font-semibold text-accent hover:bg-accent/20"
          >
            저장
          </button>
        </div>
      </div>

      {script.categories.map((category, ci) => (
        <section key={ci} className="space-y-3 rounded-xl border border-border bg-bg-card p-4">
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={category.name}
              onChange={e => setCategory(ci, { ...category, name: e.target.value })}
              className="min-w-40 flex-1 rounded border border-border bg-bg-secondary px-2 py-1.5 text-sm font-semibold text-text-primary"
            />
            <AddFactionPerson
              people={factionMembers}
              usedNames={category.entries.map(e => e.name)}
              onAdd={person => setEntries(ci, [...category.entries, {
                ...emptyEntry(),
                name: person.nickname,
                celebSlug: person.slug ?? '',
              }])}
            />
            <button
              type="button"
              onClick={() => setEntries(ci, [...category.entries, emptyEntry()])}
              className="inline-flex items-center gap-1 rounded border border-border px-2 py-1.5 text-xs text-text-secondary hover:text-accent"
            >
              <Plus className="h-3.5 w-3.5" /> 인물
            </button>
            <button
              type="button"
              onClick={() => setScript(cur => ({
                ...cur,
                categories: cur.categories.filter((_, idx) => idx !== ci),
              }))}
              className="inline-flex items-center gap-1 rounded border border-border px-2 py-1.5 text-xs text-text-secondary hover:text-red-400"
            >
              <Trash2 className="h-3.5 w-3.5" /> 축 삭제
            </button>
          </div>
          {category.entries.map((entry, ei) => (
            <RankingEntryRow
              key={ei}
              folder={folder}
              entry={entry}
              dragging={drag?.ci === ci && drag.ei === ei}
              profile={profiles.find(p => p.nickname === entry.name || (entry.celebSlug && p.slug === entry.celebSlug))}
              factionMembers={factionMembers}
              onProfilePatch={patchProfile}
              onLink={linkCeleb}
              onDragStart={() => setDrag({ ci, ei })}
              onDragOver={() => {
                if (!drag || drag.ci !== ci) return
                moveEntry(ci, drag.ei, ei)
              }}
              onDragEnd={() => setDrag(null)}
              onChange={next => setEntries(ci, category.entries.map((row, idx) => (idx === ei ? next : row)))}
              onRemove={() => setEntries(ci, category.entries.filter((_, idx) => idx !== ei))}
            />
          ))}
        </section>
      ))}

      <button
        type="button"
        onClick={() => setScript(cur => ({
          ...cur,
          categories: [...cur.categories, { name: '새 축', entries: [] }],
        }))}
        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-bg-card px-3 py-2 text-sm font-semibold text-text-secondary hover:text-accent"
      >
        <Plus className="h-4 w-4" /> 축 추가
      </button>
    </div>
      <RankingPool
        folder={folder}
        script={script}
        onRemap={(from, to) => setScript(cur => remapImages(cur, from, to))}
      />
    </div>
  )
}
