'use client'

/**
 * 테마 설정 한 벌 — 설명(±영문)·주소(slug)·상위 묶음·진열 순서·단체샷·수동 인물 명단.
 *
 * 두 자리에서 같은 부품을 쓴다(편집 틀 하나 — 26.08.03 통합).
 * - embedded   : 편 편집기 세력 카드의 도감 구획(상세 설정). 간판(이름·색)과 노출 스위치는
 *                구획 머리에 이미 있으므로 여기서는 뺀다.
 * - standalone : 영상 없는 웹 전용 테마 화면(/factions/<테마>). 간판·노출·기간·삭제까지 다 나온다.
 *
 * 저장은 기존 태그 액션(updateTag 외)을 그대로 쓴다 — 저장 즉시 서비스에 반영된다.
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Trash2, Wand2 } from 'lucide-react'
import { updateTag, deleteTag, type CelebTagAssignment } from '@/actions/admin/tags'
import { getThemeEditorData, type ThemeEditorData } from '@/actions/admin/factions/themes'
import { FormRow, PRESET_COLORS, slugify } from './bits'
import { ThemeTeamImagesField } from './ThemeTeamImagesField'
import { ThemeMemberList } from './ThemeMemberList'

export type ThemeAtlasVariant = 'embedded' | 'standalone'

export function ThemeAtlasSettings({
  tagId,
  variant,
  initialData,
}: {
  tagId: string
  variant: ThemeAtlasVariant
  /** 서버에서 미리 받은 데이터 — 없으면(편 편집기 펼침) 여기서 조회한다 */
  initialData?: ThemeEditorData
}) {
  const [data, setData] = useState<ThemeEditorData | null>(initialData ?? null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (initialData) return
    let cancelled = false
    getThemeEditorData(tagId)
      .then(d => {
        if (cancelled) return
        if (d) setData(d)
        else setLoadError('테마를 찾을 수 없습니다.')
      })
      .catch(e => { if (!cancelled) setLoadError(e instanceof Error ? e.message : String(e)) })
    return () => { cancelled = true }
  }, [tagId, initialData])

  if (loadError) {
    return <p className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger-text">테마 설정을 불러오지 못했습니다 — {loadError}</p>
  }
  if (!data) {
    return (
      <p className="flex items-center gap-2 px-1 py-2 text-xs text-text-dim">
        <Loader2 className="h-4 w-4 animate-spin" /> 테마 설정 불러오는 중…
      </p>
    )
  }
  return <SettingsInner key={data.tag.id} data={data} variant={variant} />
}

function SettingsInner({ data, variant }: { data: ThemeEditorData; variant: ThemeAtlasVariant }) {
  const router = useRouter()
  const standalone = variant === 'standalone'

  // #region 테마 정보 상태 (저장된 값 ↔ 편집 중인 값)
  const [tag, setTag] = useState(data.tag)
  const [form, setForm] = useState({
    name: data.tag.name,
    name_en: data.tag.name_en ?? '',
    description: data.tag.description ?? '',
    description_en: data.tag.description_en ?? '',
    color: data.tag.color,
    slug: data.tag.slug ?? '',
    is_featured: data.tag.is_featured,
    parent_id: data.tag.parent_id ?? '',
    start_date: data.tag.start_date ?? '',
    end_date: data.tag.end_date ?? '',
    sort_order: data.tag.sort_order,
  })
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [celebs, setCelebs] = useState<CelebTagAssignment[]>(data.celebs)

  // embedded 는 간판(이름·색)·노출을 구획 머리가 쥔다 — 여기서는 나머지만 대조·저장한다
  const sharedChanged =
    form.description !== (tag.description ?? '') ||
    form.description_en !== (tag.description_en ?? '') ||
    form.slug !== (tag.slug ?? '') ||
    form.parent_id !== (tag.parent_id ?? '') ||
    form.sort_order !== tag.sort_order
  const signChanged =
    form.name !== tag.name ||
    form.name_en !== (tag.name_en ?? '') ||
    form.color !== tag.color ||
    form.is_featured !== tag.is_featured ||
    form.start_date !== (tag.start_date ?? '') ||
    form.end_date !== (tag.end_date ?? '')
  const hasChanges = sharedChanged || (standalone && signChanged)
  // #endregion

  const handleSave = async () => {
    if (standalone && !form.name.trim()) return
    setIsSaving(true)
    const result = await updateTag({
      id: tag.id,
      description: form.description,
      description_en: form.description_en,
      slug: form.slug || null,
      parent_id: form.parent_id || null,
      sort_order: form.sort_order,
      // 간판·노출은 standalone 에서만 이 폼이 쥔다(embedded 는 구획 머리 소관)
      ...(standalone ? {
        name: form.name,
        name_en: form.name_en,
        color: form.color,
        is_featured: form.is_featured,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
      } : {}),
    })
    setIsSaving(false)
    if (result.success) {
      setTag(prev => ({
        ...prev,
        description: form.description || null,
        description_en: form.description_en || null,
        slug: form.slug || null,
        parent_id: form.parent_id || null,
        sort_order: form.sort_order,
        ...(standalone ? {
          name: form.name,
          name_en: form.name_en || null,
          color: form.color,
          is_featured: form.is_featured,
          start_date: form.start_date || null,
          end_date: form.end_date || null,
        } : {}),
        updated_at: new Date().toISOString(),
      }))
      // 위계·순서가 바뀌면 목록·다른 테마의 선택지도 달라진다 — standalone 만 서버 데이터를 다시 받는다
      if (standalone) router.refresh()
    } else {
      alert(result.error ?? '테마 저장 실패')
    }
  }

  const handleDelete = async () => {
    if (!confirm('이 테마를 지우면 소속 인물에서도 모두 해제됩니다. 계속할까요?')) return
    setIsDeleting(true)
    const result = await deleteTag(tag.id)
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
        {standalone && (
          <FormRow label="테마 이름">
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
        )}

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

        <FormRow label="상위 묶음">
          <div className="flex-1 space-y-1.5">
            <select
              value={form.parent_id}
              onChange={(e) => setForm({ ...form, parent_id: e.target.value })}
              disabled={data.ownChildCount > 0}
              className="w-full rounded-lg border border-border bg-bg-secondary px-4 py-2.5 text-base text-text-primary focus:outline-none focus:ring-1 focus:ring-accent/50 disabled:opacity-50"
            >
              <option value="">묶음 없음 (도감에 단독으로 실림)</option>
              {data.parentOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}{p.childCount > 0 ? ` — 테마 ${p.childCount}개를 거느림` : ' — 고르면 새 묶음이 됩니다'}
                </option>
              ))}
            </select>
            <p className="text-xs text-text-tertiary">
              {data.ownChildCount > 0
                ? `이 테마는 아래에 테마 ${data.ownChildCount}개를 거느린 묶음입니다. 묶음은 다시 다른 묶음에 들어갈 수 없습니다.`
                : '묶음을 고르면 도감에서 그 묶음을 펼쳤을 때 안쪽에 실립니다.'}
            </p>
          </div>
        </FormRow>

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

        {standalone && (
          <>
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
                {form.is_featured && (
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
          </>
        )}

        <FormRow label="단체 사진">
          <ThemeTeamImagesField tagId={tag.id} initialImages={tag.team_images} celebs={celebs} />
        </FormRow>

        <div className="flex items-center justify-end gap-3 border-t border-border/60 pt-3">
          {standalone && (
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex h-11 w-11 items-center justify-center rounded-lg text-red-500 hover:bg-red-500/10 disabled:opacity-50"
              title="테마 삭제"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={!hasChanges || isSaving || (standalone && !form.name.trim())}
            className="rounded-lg bg-accent px-6 py-2.5 text-base font-medium text-white hover:bg-accent-hover disabled:opacity-50"
          >
            {isSaving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-bg-card p-4">
        <ThemeMemberList
          tagId={tag.id}
          celebs={celebs}
          onCelebsChange={setCelebs}
          hideProduction={!standalone}
        />
      </div>
    </div>
  )
}
