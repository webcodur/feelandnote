'use client'

/**
 * 신화 편집 화면 — 왼쪽 신화 목록, 오른쪽 고른 신화의 기본 정보·그룹·인물.
 * 서비스 「신화의 세계」에 나가는 값만 둔다. 상세 소개처럼 신화 화면이 쓰지 않는 칸은 없다.
 */

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  updateFactionEntry,
  type FactionEntry, type FactionMember, type FactionGroup,
} from '@/actions/admin/factions/entries'
import type { MythMusicCatalog } from '@/actions/admin/myth-music'
import type { MythEditorData, MythSummary } from '@/actions/admin/myths'
import { MythGroupPanel } from './MythGroupPanel'
import { MythLeadPanel } from './MythLeadPanel'
import { MythMemberPanel } from './MythMemberPanel'
import MythMusicPanel from './MythMusicPanel'
import { MYTH_BUTTON, MYTH_CARD, MYTH_INPUT } from './styles'

export default function MythEditor({ myths, selectedId, detail, musicCatalog }: {
  myths: MythSummary[]
  selectedId: string | null
  detail: MythEditorData | null
  musicCatalog: MythMusicCatalog
}) {
  const router = useRouter()
  const [members, setMembers] = useState<FactionMember[]>(detail?.members ?? [])
  const [groups, setGroups] = useState<FactionGroup[]>(detail?.groups ?? [])
  const [leadIds, setLeadIds] = useState<string[]>(detail?.entry.lead_person_ids ?? [])
  /* 인원·공개 여부가 바뀌면 왼쪽 목록만 서버에서 다시 받는다. 오른쪽은 이 화면의 상태가 원천이라 그대로 둔다 */
  const refreshList = () => router.refresh()

  return (
    <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
      <nav aria-label="신화 목록" className="rounded-xl border border-border bg-bg-card p-2 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:self-start lg:overflow-y-auto">
        <ul className="space-y-0.5">
          {myths.map(item => (
            <li key={item.id}>
              {item.depth === 0 ? (
                <p className="px-2.5 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-text-tertiary">
                  {item.name}
                </p>
              ) : (
                <Link
                  href={`/myths?myth=${item.id}`}
                  className={`flex items-center gap-2 rounded-lg px-2.5 py-2 ps-6 text-sm ${item.id === selectedId ? 'bg-accent/10 font-medium text-accent' : 'text-text-secondary hover:bg-bg-secondary hover:text-text-primary'}`}
                >
                  <span
                    aria-label={item.published ? '공개' : '잠금'}
                    title={item.published ? '서비스에 공개 중' : '잠금 — 서비스에서 「작업 예정」'}
                    className={`size-1.5 shrink-0 rounded-full ${item.published ? 'bg-green-500' : 'bg-text-tertiary/40'}`}
                  />
                  <span className="min-w-0 flex-1 truncate">{item.name}</span>
                  <span title={`노출 ${item.visibleCount}명 · 숨김 포함 ${item.totalCount}명`} className="shrink-0 text-xs tabular-nums text-text-tertiary">
                    {item.visibleCount}
                  </span>
                </Link>
              )}
            </li>
          ))}
        </ul>
      </nav>

      {detail ? (
        <div className="min-w-0 space-y-4">
          <MythInfoCard entry={detail.entry} onSaved={refreshList} />
          <MythLeadPanel
            lv2Id={detail.entry.id}
            leadIds={leadIds}
            members={members}
            onSaved={setLeadIds}
          />
          <MythMusicPanel catalog={musicCatalog} onSynced={refreshList} />
          <MythGroupPanel
            lv2Id={detail.entry.id}
            groups={groups}
            members={members}
            onGroupsChange={setGroups}
            onMembersChange={setMembers}
          />
          <MythMemberPanel
            lv2Id={detail.entry.id}
            groups={groups}
            members={members}
            onMembersChange={setMembers}
            onRosterChange={refreshList}
          />
        </div>
      ) : (
        <p className={`${MYTH_CARD} text-sm text-text-tertiary`}>고를 신화가 없습니다.</p>
      )}
    </div>
  )
}

/** 신화 이름·소개(신화 개요 본문)·공개 스위치 */
function MythInfoCard({ entry, onSaved }: { entry: FactionEntry; onSaved: () => void }) {
  const [saved, setSaved] = useState(entry)
  const [form, setForm] = useState({
    name: entry.name,
    name_en: entry.name_en ?? '',
    description: entry.description ?? '',
    description_en: entry.description_en ?? '',
  })
  const [busy, setBusy] = useState(false)
  const changed = form.name !== saved.name
    || form.name_en !== (saved.name_en ?? '')
    || form.description !== (saved.description ?? '')
    || form.description_en !== (saved.description_en ?? '')

  const save = async () => {
    if (!form.name.trim()) return alert('신화 이름을 적어 주세요.')
    setBusy(true)
    const result = await updateFactionEntry({ id: entry.id, ...form })
    setBusy(false)
    if (!result.success) return alert(result.error ?? '저장하지 못했습니다.')
    setSaved(prev => ({
      ...prev,
      name: form.name.trim(),
      name_en: form.name_en.trim() || null,
      description: form.description.trim() || null,
      description_en: form.description_en.trim() || null,
    }))
    onSaved()
  }

  const togglePublished = async () => {
    const next = !saved.published
    const question = next
      ? `「${saved.name}」을(를) 서비스에 공개할까요?`
      : `「${saved.name}」을(를) 잠글까요? 서비스에서는 「작업 예정」 칩으로 바뀝니다.`
    if (!confirm(question)) return
    setBusy(true)
    const result = await updateFactionEntry({ id: entry.id, published: next })
    setBusy(false)
    if (!result.success) return alert(result.error ?? '공개 상태를 바꾸지 못했습니다.')
    setSaved(prev => ({ ...prev, published: next }))
    onSaved()
  }

  return (
    <section className={MYTH_CARD}>
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="min-w-0 flex-1 truncate text-lg font-bold text-text-primary">{saved.name}</h2>
        <button
          type="button"
          onClick={togglePublished}
          disabled={busy}
          className={`shrink-0 rounded-lg border px-3 py-1.5 text-sm font-medium disabled:opacity-40 ${saved.published
            ? 'border-green-500/40 bg-green-500/10 text-green-400 hover:bg-green-500/20'
            : 'border-border text-text-tertiary hover:border-accent hover:text-accent'}`}
        >
          {saved.published ? '공개 중' : '잠금 · 작업 예정'}
        </button>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="space-y-1">
          <span className="text-xs font-medium text-text-secondary">이름</span>
          <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={`${MYTH_INPUT} w-full text-sm`} />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-text-secondary">English name</span>
          <input value={form.name_en} onChange={e => setForm({ ...form, name_en: e.target.value })} className={`${MYTH_INPUT} w-full text-sm`} />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-text-secondary">소개 — 신화 개요 본문</span>
          <textarea rows={5} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className={`${MYTH_INPUT} w-full resize-y text-sm leading-6`} />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-text-secondary">English intro</span>
          <textarea rows={5} value={form.description_en} onChange={e => setForm({ ...form, description_en: e.target.value })} className={`${MYTH_INPUT} w-full resize-y text-xs leading-6`} />
        </label>
      </div>
      <div className="mt-3 flex justify-end">
        <button type="button" onClick={save} disabled={!changed || busy} className={MYTH_BUTTON}>저장</button>
      </div>
    </section>
  )
}
