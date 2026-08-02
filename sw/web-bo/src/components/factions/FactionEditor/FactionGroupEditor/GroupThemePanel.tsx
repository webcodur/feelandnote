'use client'

/**
 * 세력의 도감 구획 — 연결 테마의 간판(이름·영문·색)과 노출 스위치를 세력 카드 안에서 바로 고친다.
 *
 * 테마 간판은 세력 명칭(영상 자막 표기)과 별개의 도감 표기다(매체별 표기 두 개 구조 — P7).
 * 여러 세력이 한 테마를 공유하면 대표(첫 자리) 세력에만 편집 UI 를 두고 나머지는 배지만 단다.
 * 저장은 기존 테마 액션(updateTag)을 그대로 쓰므로 저장 즉시 서비스에 반영된다.
 *
 * 「상세 설정」을 펼치면 옛 테마 편집기가 쥐던 나머지(설명·주소·상위 묶음·진열 순서·단체샷·
 * 수동 인물 명단)까지 이 자리에서 다룬다 — 26.08.03 편집 화면 통합으로 테마 편집기는 폐기됐다.
 */

import { useEffect, useState } from 'react'
import { ChevronDown, Eye, EyeOff } from '@feelandnote/shared/bo/icons'
import { updateTag } from '@/actions/admin/tags'
import { ThemeAtlasSettings } from '../../ThemeAtlas/ThemeAtlasSettings'
import { useFactionAtlas } from '../../shared/FactionAtlasContext'

/** 세력 헤더용 작은 배지 — 연결 테마 이름과 노출 상태만 보인다(편집은 펼침 패널에서) */
export function GroupThemeBadge({ groupIndex }: { groupIndex: number }) {
  const atlas = useFactionAtlas()
  const theme = atlas?.groupLink(groupIndex)?.theme
  if (!theme) return null
  return (
    <span
      className="flex shrink-0 items-center gap-1 self-center rounded border border-white/30 bg-black/25 px-1.5 py-0.5 text-[10px] font-semibold text-white"
      title={`도감 테마: ${theme.name} — ${theme.is_featured ? '도감에 노출 중' : '준비 중(비노출)'}`}
    >
      <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: theme.color }} />
      도감 {theme.name}
      {theme.is_featured ? <Eye size={11} /> : <EyeOff size={11} className="opacity-60" />}
    </span>
  )
}

export function GroupThemePanel({ groupIndex }: { groupIndex: number }) {
  const atlas = useFactionAtlas()
  const link = atlas?.groupLink(groupIndex) ?? null
  const theme = link?.theme ?? null

  // 간판 편집 로컬 상태 — 손을 뗄 때(blur) 저장한다
  const [name, setName] = useState('')
  const [nameEn, setNameEn] = useState('')
  const [color, setColor] = useState('#7c4dff')
  const [saving, setSaving] = useState(false)
  // 상세 설정(설명·주소·상위 묶음·단체샷·수동 명단) 펼침 — 펼칠 때 데이터를 그때 불러온다
  const [detailOpen, setDetailOpen] = useState(false)

  useEffect(() => {
    if (!theme) return
    setName(theme.name)
    setNameEn(theme.name_en ?? '')
    setColor(theme.color)
  }, [theme?.id, theme?.name, theme?.name_en, theme?.color]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!atlas?.loaded) return null

  if (!theme) {
    return (
      <div className="rounded-md border border-dashed border-border bg-bg-card/60 px-3 py-2 text-xs text-text-dim">
        도감 테마 미연결 — 대본을 저장하면 편 제목으로 테마가 자동 생성·연결됩니다(준비 중 상태).
      </div>
    )
  }

  const saveSign = async (patch: { name?: string; name_en?: string | null; color?: string }) => {
    setSaving(true)
    const res = await updateTag({ id: theme.id, ...patch })
    setSaving(false)
    if (res.success) {
      atlas.patchTheme(theme.id, {
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(patch.name_en !== undefined ? { name_en: patch.name_en || null } : {}),
        ...(patch.color !== undefined ? { color: patch.color } : {}),
      })
    } else {
      alert(res.error ?? '테마 저장 실패')
      // 저장 실패 — 화면 값을 저장본으로 되돌린다
      setName(theme.name)
      setNameEn(theme.name_en ?? '')
      setColor(theme.color)
    }
  }

  const toggleFeatured = async () => {
    const next = !theme.is_featured
    atlas.patchTheme(theme.id, { is_featured: next })
    const res = await updateTag({ id: theme.id, is_featured: next })
    if (!res.success) {
      atlas.patchTheme(theme.id, { is_featured: !next })
      alert(res.error ?? '노출 전환 실패')
    }
  }

  if (!link?.representative) {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-bg-card/60 px-3 py-2">
        <span className="text-xs font-semibold text-text-dim">도감 테마 -</span>
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium"
          style={{ backgroundColor: `${theme.color}20`, color: theme.color }}
        >
          <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: theme.color }} />
          {theme.name}
        </span>
        {theme.name_en && <span className="text-[11px] text-text-dim">{theme.name_en}</span>}
        <span className="text-[11px] text-text-dim">
          {theme.is_featured ? '도감 노출 중' : '준비 중(비노출)'} · 같은 테마의 대표 세력에서 편집합니다
        </span>
      </div>
    )
  }

  return (
    <div className="space-y-1.5 rounded-md border border-border bg-bg-card/60 px-3 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="shrink-0 text-xs font-semibold text-text-dim" title="세력도감(/explore/faction)에 실리는 이 세력의 도감 표기 — 영상 자막 표기(세력 명칭)와 별개">
          도감 테마 -
        </span>
        <input
          type="color"
          value={color}
          onChange={e => setColor(e.target.value)}
          onBlur={() => { if (color !== theme.color) void saveSign({ color }) }}
          className="h-7 w-9 shrink-0 cursor-pointer rounded border border-border bg-bg-card"
          title="도감 테마 색"
        />
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          onBlur={() => { const v = name.trim(); if (v && v !== theme.name) void saveSign({ name: v }) }}
          placeholder="도감 이름 (한글)"
          className="w-40 rounded-md border border-border bg-bg-card px-2 py-1 text-sm font-semibold focus:border-accent focus:outline-none"
        />
        <input
          type="text"
          value={nameEn}
          onChange={e => setNameEn(e.target.value)}
          onBlur={() => { if (nameEn.trim() !== (theme.name_en ?? '')) void saveSign({ name_en: nameEn.trim() || null }) }}
          placeholder="EN name"
          className="w-36 rounded-md border border-border/60 bg-bg-card/50 px-2 py-1 text-xs text-text-secondary focus:border-accent focus:outline-none"
        />
        <button
          type="button"
          onClick={toggleFeatured}
          className={`flex shrink-0 items-center gap-1 rounded-md border px-2 py-1 text-xs font-semibold ${
            theme.is_featured
              ? 'border-accent/40 bg-accent/10 text-accent hover:bg-accent/20'
              : 'border-border bg-bg-card text-text-dim hover:border-accent hover:text-accent'
          }`}
          title={theme.is_featured ? '도감에 노출 중 — 누르면 내림(준비 중)' : '준비 중(비노출) — 누르면 도감에 노출'}
        >
          {theme.is_featured ? <Eye size={13} /> : <EyeOff size={13} />}
          {theme.is_featured ? '도감 노출 중' : '준비 중'}
        </button>
        <button
          type="button"
          onClick={() => setDetailOpen(v => !v)}
          className={`flex shrink-0 items-center gap-1 rounded border px-2 py-1 text-[11px] font-semibold ${
            detailOpen
              ? 'border-accent bg-accent/10 text-accent'
              : 'border-border bg-bg-card text-text-secondary hover:border-accent hover:text-accent'
          }`}
          title="설명·주소(slug)·상위 묶음·진열 순서·단체샷·수동 인물 명단"
        >
          <ChevronDown size={13} className={detailOpen ? '' : '-rotate-90'} />
          상세 설정
        </button>
        {saving && <span className="text-[10px] text-text-dim">저장 중…</span>}
      </div>
      <p className="text-[10px] text-text-dim">
        저장 즉시 서비스에 반영됩니다. 이름·색은 손을 뗄 때 저장, 노출은 누르는 즉시 전환.
      </p>
      {detailOpen && (
        <div className="pt-1">
          <ThemeAtlasSettings tagId={theme.id} variant="embedded" />
        </div>
      )}
    </div>
  )
}
