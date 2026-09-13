'use client'

/**
 * 신화 편집 화면 — 왼쪽 전승 목록, 오른쪽 고른 전승의 기본 정보·그룹·인물.
 * 서비스 「신화의 세계」에 나가는 값만 둔다. 영상 대본·음성·상세 소개처럼 신화 화면이 쓰지 않는 칸은 없다.
 */

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { updateTag, type CelebTag, type CelebTagAssignment, type TagGroup } from '@/actions/admin/tags'
import type { MythEditorData, MythSummary } from '@/actions/admin/myths'
import type { ThemeEpisodeLink } from '@/actions/admin/factions/themes'
import { MythGroupPanel } from './MythGroupPanel'
import { MythMemberPanel } from './MythMemberPanel'
import { MYTH_BUTTON, MYTH_CARD, MYTH_INPUT } from './styles'

export default function MythEditor({ myths, selectedId, detail }: {
  myths: MythSummary[]
  selectedId: string | null
  detail: MythEditorData | null
}) {
  const router = useRouter()
  const [members, setMembers] = useState<CelebTagAssignment[]>(detail?.members ?? [])
  const [groups, setGroups] = useState<TagGroup[]>(detail?.groups ?? [])
  /* 인원·공개 여부가 바뀌면 왼쪽 목록만 서버에서 다시 받는다. 오른쪽은 이 화면의 상태가 원천이라 그대로 둔다 */
  const refreshList = () => router.refresh()

  return (
    <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
      <nav aria-label="전승 목록" className="rounded-xl border border-border bg-bg-card p-2 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:self-start lg:overflow-y-auto">
        <ul className="space-y-0.5">
          {myths.map(myth => (
            <li key={myth.id}>
              <Link
                href={`/myths?tag=${myth.id}`}
                className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm ${myth.depth ? 'ps-6' : ''} ${myth.id === selectedId ? 'bg-accent/10 font-medium text-accent' : 'text-text-secondary hover:bg-bg-secondary hover:text-text-primary'}`}
              >
                <span
                  aria-label={myth.published ? '공개' : '잠금'}
                  title={myth.published ? '서비스에 공개 중' : '잠금 — 서비스에서 「작업 예정」'}
                  className={`size-1.5 shrink-0 rounded-full ${myth.published ? 'bg-green-500' : 'bg-text-tertiary/40'}`}
                />
                <span className="min-w-0 flex-1 truncate">{myth.name}</span>
                {myth.productionCount > 0 && (
                  <span title="영상 제작에서 온 인물이 있습니다" className="shrink-0 rounded bg-purple-500/15 px-1 text-[10px] text-purple-400">영상</span>
                )}
                <span title={`노출 ${myth.visibleCount}명 · 숨김 포함 ${myth.totalCount}명`} className="shrink-0 text-xs tabular-nums text-text-tertiary">
                  {myth.visibleCount}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {detail ? (
        <div className="min-w-0 space-y-4">
          <MythInfoCard tag={detail.tag} episodes={detail.episodes} onSaved={refreshList} />
          <MythGroupPanel
            tagId={detail.tag.id}
            groups={groups}
            members={members}
            onGroupsChange={setGroups}
            onMembersChange={setMembers}
          />
          <MythMemberPanel
            tagId={detail.tag.id}
            groups={groups}
            members={members}
            onMembersChange={setMembers}
            onRosterChange={refreshList}
          />
        </div>
      ) : (
        <p className={`${MYTH_CARD} text-sm text-text-tertiary`}>고를 전승이 없습니다.</p>
      )}
    </div>
  )
}

/** 전승 이름·소개(신화 개요 본문)·공개 스위치 */
function MythInfoCard({ tag, episodes, onSaved }: { tag: CelebTag; episodes: ThemeEpisodeLink[]; onSaved: () => void }) {
  const [saved, setSaved] = useState(tag)
  const [form, setForm] = useState({
    name: tag.name,
    name_en: tag.name_en ?? '',
    description: tag.description ?? '',
    description_en: tag.description_en ?? '',
  })
  const [busy, setBusy] = useState(false)
  const changed = form.name !== saved.name
    || form.name_en !== (saved.name_en ?? '')
    || form.description !== (saved.description ?? '')
    || form.description_en !== (saved.description_en ?? '')

  const save = async () => {
    if (!form.name.trim()) return alert('전승 이름을 적어 주세요.')
    setBusy(true)
    const result = await updateTag({ id: tag.id, ...form })
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
    const next = !saved.atlas_published
    const question = next
      ? `「${saved.name}」을(를) 서비스에 공개할까요?`
      : `「${saved.name}」을(를) 잠글까요? 서비스에서는 「작업 예정」 칩으로 바뀝니다.`
    if (!confirm(question)) return
    setBusy(true)
    const result = await updateTag({ id: tag.id, atlas_published: next })
    setBusy(false)
    if (!result.success) return alert(result.error ?? '공개 상태를 바꾸지 못했습니다.')
    setSaved(prev => ({ ...prev, atlas_published: next }))
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
          className={`shrink-0 rounded-lg border px-3 py-1.5 text-sm font-medium disabled:opacity-40 ${saved.atlas_published
            ? 'border-green-500/40 bg-green-500/10 text-green-400 hover:bg-green-500/20'
            : 'border-border text-text-tertiary hover:border-accent hover:text-accent'}`}
        >
          {saved.atlas_published ? '공개 중' : '잠금 · 작업 예정'}
        </button>
      </div>

      {episodes.length > 0 && (
        <p className="mt-3 rounded-lg border border-purple-500/30 bg-purple-500/10 px-3 py-2 text-xs leading-5 text-purple-300">
          영상 「{episodes.map(e => e.title).join('」·「')}」과(와) 연결된 전승입니다.
          영상에서 온 인물은 여기서 고칠 수 없고 세력도감 편 편집기에서 고칩니다.
        </p>
      )}

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
          <textarea rows={5} value={form.description_en} onChange={e => setForm({ ...form, description_en: e.target.value })} className={`${MYTH_INPUT} w-full resize-y text-sm leading-6`} />
        </label>
      </div>
      <div className="mt-3 flex justify-end">
        <button type="button" onClick={save} disabled={!changed || busy} className={MYTH_BUTTON}>저장</button>
      </div>
    </section>
  )
}
