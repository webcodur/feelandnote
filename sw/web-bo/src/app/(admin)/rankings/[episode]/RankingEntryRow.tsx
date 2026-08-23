'use client'

import { GripVertical, Trash2 } from 'lucide-react'
import type { CelebSearchItem } from '@/components/celeb/CelebSearchBar'
import type { RankingEntry } from '@/actions/admin/rankings/script'
import type { RankingCelebProfile } from '@/lib/ranking-celeb'
import { RankingPersonShot } from './RankingCelebPhotos'

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-text-secondary">
      {label}
      {children}
    </label>
  )
}

export function RankingEntryRow({
  folder,
  entry,
  dragging,
  profile,
  themeMembers,
  onChange,
  onRemove,
  onProfilePatch,
  onLink,
  onDragStart,
  onDragOver,
  onDragEnd,
}: {
  folder: string
  entry: RankingEntry
  dragging: boolean
  profile?: RankingCelebProfile
  themeMembers: RankingCelebProfile[]
  onChange: (next: RankingEntry) => void
  onRemove: () => void
  onProfilePatch: (nickname: string, patch: Partial<RankingCelebProfile>) => void
  onLink: (name: string, item: CelebSearchItem) => void
  onDragStart: () => void
  onDragOver: () => void
  onDragEnd: () => void
}) {
  const set = (patch: Partial<RankingEntry>) => onChange({ ...entry, ...patch })
  return (
    <div
      onDragOver={e => { e.preventDefault(); onDragOver() }}
      onDrop={e => e.preventDefault()}
      className={`flex gap-3 rounded-lg border bg-bg-secondary p-3 ${dragging ? 'border-accent opacity-50' : 'border-border'}`}
    >
      {/* 입력칸의 텍스트 선택을 막지 않도록 손잡이만 draggable */}
      <div
        draggable
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        className="flex shrink-0 cursor-grab items-center text-text-tertiary hover:text-text-primary active:cursor-grabbing"
        aria-label="순서 이동"
      >
        <GripVertical className="h-5 w-5" />
      </div>
      <RankingPersonShot
        folder={folder}
        name={entry.name}
        profile={profile}
        themeMembers={themeMembers}
        onProfilePatch={onProfilePatch}
        onLink={onLink}
      />
      <div className="grid min-w-0 flex-1 gap-2 md:grid-cols-[4rem_1fr]">
        <Field label="순위">
          <input
            type="number"
            value={entry.rank || ''}
            onChange={e => set({ rank: Number(e.target.value) })}
            className="w-full rounded border border-border bg-bg-card px-2 py-1.5 text-sm text-text-primary"
          />
        </Field>
        <Field label="이름">
          <input
            value={entry.name}
            onChange={e => set({ name: e.target.value })}
            className="w-full rounded border border-border bg-bg-card px-2 py-1.5 text-sm text-text-primary"
          />
        </Field>
        <div className="md:col-span-2">
          <Field label="설명">
            <textarea
              value={entry.line ?? ''}
              onChange={e => set({ line: e.target.value })}
              rows={2}
              className="w-full rounded border border-border bg-bg-card px-2 py-1.5 text-sm text-text-primary"
            />
          </Field>
        </div>
        <div className="flex items-end gap-2 md:col-span-2">
          <Field label="꼬리">
            <input
              value={entry.note ?? ''}
              onChange={e => set({ note: e.target.value })}
              className="w-full rounded border border-border bg-bg-card px-2 py-1.5 text-sm text-text-primary"
            />
          </Field>
          <button
            type="button"
            onClick={onRemove}
            className="mb-0.5 rounded border border-border p-2 text-text-secondary hover:text-red-400"
            aria-label="인물 삭제"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
