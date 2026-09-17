'use client'

/**
 * 도감 행 설정 한 벌 — 간판(이름·색)·설명(±영문)·주소(slug)·소속 분류·진열 순서·노출·단체샷·인물 명단.
 *
 * 저장은 기존 액션(updateFactionEntry 외)을 그대로 쓴다 — 저장 즉시 서비스에 반영된다.
 * 분류(L1)에는 소속 분류·기간·단체샷·인물 명단이 없다 — 그 칸은 세력(L2)에만 선다.
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Wand2 } from 'lucide-react'
import { updateFactionEntry, deleteFactionEntry, type FactionMember } from '@/actions/admin/factions/entries'
import type { FactionEditorData } from '@/actions/admin/factions/board'
import { FormRow, PRESET_COLORS, slugify } from './bits'
import { TeamImagesField } from './TeamImagesField'
import { MemberList } from './MemberList'

export function EntrySettings({ data }: { data: FactionEditorData }) {
  const router = useRouter()
  const isSection = data.entry.level === 1

  // #region 행 정보 상태 (저장된 값 ↔ 편집 중인 값)
  const [entry, setEntry] = useState(data.entry)
  const [form, setForm] = useState({
    name: data.entry.name,
    name_en: data.entry.name_en ?? '',
    description: data.entry.description ?? '',
    description_en: data.entry.description_en ?? '',
    color: data.entry.color,
    slug: data.entry.slug ?? '',
    is_featured: data.entry.is_featured,
    lv1_id: data.entry.lv1_id ?? '',
    start_date: data.entry.start_date ?? '',
    end_date: data.entry.end_date ?? '',
    sort_order: data.entry.sort_order,
  })
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [members, setMembers] = useState<FactionMember[]>(data.members)

  const hasChanges =
    form.description !== (entry.description ?? '') ||
    form.description_en !== (entry.description_en ?? '') ||
    form.slug !== (entry.slug ?? '') ||
    form.lv1_id !== (entry.lv1_id ?? '') ||
    form.sort_order !== entry.sort_order ||
    form.name !== entry.name ||
    form.name_en !== (entry.name_en ?? '') ||
    form.color !== entry.color ||
    form.is_featured !== entry.is_featured ||
    form.start_date !== (entry.start_date ?? '') ||
    form.end_date !== (entry.end_date ?? '')
  // #endregion

  const handleSave = async () => {
    if (!form.name.trim()) return
    setIsSaving(true)
    const result = await updateFactionEntry({
      id: entry.id,
      description: form.description,
      description_en: form.description_en,
      slug: form.slug || null,
      ...(isSection ? {} : { lv1_id: form.lv1_id || null }),
      sort_order: form.sort_order,
      name: form.name,
      name_en: form.name_en,
      color: form.color,
      is_featured: form.is_featured,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
    })
    setIsSaving(false)
    if (result.success) {
      setEntry(prev => ({
        ...prev,
        description: form.description || null,
        description_en: form.description_en || null,
        slug: form.slug || null,
        lv1_id: isSection ? null : form.lv1_id || null,
        sort_order: form.sort_order,
        name: form.name,
        name_en: form.name_en || null,
        color: form.color,
        is_featured: form.is_featured,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        updated_at: new Date().toISOString(),
      }))
      // 위계·순서가 바뀌면 목록·다른 세력의 선택지도 달라진다 — 서버 데이터를 다시 받는다
      router.refresh()
    } else {
      alert(result.error ?? '저장 실패')
    }
  }

  const handleDelete = async () => {
    const question = isSection
      ? '이 분류를 지울까요? 아래에 세력이 남아 있으면 지워지지 않습니다.'
      : '이 세력을 지우면 소속 인물에서도 모두 해제됩니다. 계속할까요?'
    if (!confirm(question)) return
    setIsDeleting(true)
    const result = await deleteFactionEntry(entry.id)
    if (result.success) {
      router.push('/factions')
    } else {
      setIsDeleting(false)
      alert(result.error ?? '삭제 실패')
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-4 rounded-xl border border-border bg-bg-card p-4">
        <FormRow label="이름">
          <div className="flex-1 space-y-1.5">
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-lg border border-border bg-bg-secondary px-4 py-2.5 text-base text-text-primary focus:outline-none focus:ring-1 focus:ring-accent/50"
            />
            <input
              type="text"
              value={form.name_en}
              onChange={(e) => setForm({ ...form, name_en: e.target.value })}
              placeholder="EN name (optional)"
              className="w-full rounded-lg border border-border bg-bg-secondary px-4 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent/50"
            />
          </div>
        </FormRow>

        <FormRow label="주소(slug)">
          <div className="flex flex-1 items-center gap-2">
            <div className="flex flex-1 items-center rounded-lg border border-border bg-bg-secondary px-3 focus-within:ring-1 focus-within:ring-accent/50">
              <span className="shrink-0 text-sm text-text-tertiary">/explore/faction/</span>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })}
                placeholder="xai"
                className="flex-1 bg-transparent py-2.5 text-base text-text-primary placeholder:text-text-tertiary focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => setForm({ ...form, slug: slugify(form.name_en || form.name) })}
              disabled={!form.name_en && !form.name}
              className="flex items-center gap-1 rounded-lg border border-border bg-bg-secondary px-3 py-2.5 text-sm text-text-secondary hover:border-accent hover:text-text-primary disabled:opacity-50"
              title="영문 이름에서 자동 생성"
            >
              <Wand2 className="h-4 w-4" /> 자동
            </button>
          </div>
        </FormRow>

        <FormRow label="설명">
          <div className="flex-1 space-y-1.5">
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="도감 목록에 붙는 한 줄 설명"
              className="w-full rounded-lg border border-border bg-bg-secondary px-4 py-2.5 text-base text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent/50"
            />
            <input
              type="text"
              value={form.description_en}
              onChange={(e) => setForm({ ...form, description_en: e.target.value })}
              placeholder="EN description (optional)"
              className="w-full rounded-lg border border-border bg-bg-secondary px-4 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent/50"
            />
          </div>
        </FormRow>

        {!isSection && (
          <FormRow label="소속 분류">
            <div className="flex-1 space-y-1.5">
              <select
                value={form.lv1_id}
                onChange={(e) => setForm({ ...form, lv1_id: e.target.value })}
                className="w-full rounded-lg border border-border bg-bg-secondary px-4 py-2.5 text-base text-text-primary focus:outline-none focus:ring-1 focus:ring-accent/50 disabled:opacity-50"
              >
                {data.lv1Options.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — 세력 {p.childCount}개를 거느림
                  </option>
                ))}
              </select>
              <p className="text-xs text-text-tertiary">
                세력은 반드시 분류 하나에 속합니다. 도감에서 그 분류를 펼쳤을 때 안쪽에 실립니다.
              </p>
            </div>
          </FormRow>
        )}
        {isSection && data.ownChildCount > 0 && (
          <FormRow label="소속 세력">
            <p className="flex-1 pt-2 text-sm text-text-tertiary">
              이 분류는 세력 {data.ownChildCount}개를 거느리고 있습니다.
            </p>
          </FormRow>
        )}

        <FormRow label="진열 순서">
          <div className="flex flex-1 items-center gap-2">
            <input
              type="number"
              value={form.sort_order}
              onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
              className="w-28 rounded-lg border border-border bg-bg-secondary px-4 py-2.5 text-base tabular-nums text-text-primary focus:outline-none focus:ring-1 focus:ring-accent/50"
            />
            <span className="text-xs text-text-tertiary">도감 목록에서의 자리 — 숫자가 작을수록 앞에 실립니다.</span>
          </div>
        </FormRow>

        <FormRow label="색상">
          <div className="flex flex-wrap gap-2 pt-1">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setForm({ ...form, color: c })}
                className={`h-8 w-8 rounded-full border-2 ${form.color === c ? 'border-white' : 'border-transparent'}`}
                style={{ backgroundColor: c }}
              />
            ))}
            <input
              type="color"
              value={form.color}
              onChange={(e) => setForm({ ...form, color: e.target.value })}
              className="h-8 w-8 cursor-pointer rounded-full"
            />
          </div>
        </FormRow>
        <FormRow label="도감 노출">
          <div className="flex items-center gap-3 pt-1">
            <input
              type="checkbox"
              checked={form.is_featured}
              onChange={(e) => setForm({ ...form, is_featured: e.target.checked })}
              className="h-5 w-5 rounded border-border bg-bg-secondary accent-accent"
            />
            {form.is_featured && !isSection && (
              <>
                <input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  className="rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-text-primary"
                />
                <span className="text-sm text-text-tertiary">~</span>
                <input
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                  className="rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-text-primary"
                />
              </>
            )}
          </div>
        </FormRow>

        {!isSection && (
          <FormRow label="단체 사진">
            <TeamImagesField lv2Id={entry.id} initialImages={entry.team_images} members={members} />
          </FormRow>
        )}

        <div className="flex items-center justify-end gap-3 border-t border-border/60 pt-3">
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex h-11 w-11 items-center justify-center rounded-lg text-red-500 hover:bg-red-500/10 disabled:opacity-50"
            title={isSection ? '분류 삭제' : '세력 삭제'}
          >
            <Trash2 className="h-5 w-5" />
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || isSaving || !form.name.trim() || (!isSection && !form.lv1_id)}
            className="rounded-lg bg-accent px-6 py-2.5 text-base font-medium text-white hover:bg-accent-hover disabled:opacity-50"
          >
            {isSaving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>

      {!isSection && (
        <div className="rounded-xl border border-border bg-bg-card p-4">
          <MemberList
            lv2Id={entry.id}
            members={members}
            onMembersChange={setMembers}
          />
        </div>
      )}
    </div>
  )
}
