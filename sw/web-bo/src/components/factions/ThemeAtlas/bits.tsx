'use client'

/**
 * 도감 테마 편집 공용 잔부품 — 폼 한 줄·아바타·사진 추가 단추·개인샷 썸네일.
 *
 * 옛 테마 편집기(/factions/themes)의 부품을 그대로 옮겨 왔다. 지금은 편 편집기의
 * 도감 구획(상세 설정)과 웹 전용 테마 화면이 함께 쓴다.
 */

import { useState } from 'react'
import { ImagePlus, Loader2, User, X } from 'lucide-react'

/** 이름·영문명 → 주소(slug) 후보 (소문자·하이픈) */
export function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

export const PRESET_COLORS = [
  '#7c4dff', '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280',
]

export function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4">
      <label className="w-24 shrink-0 pt-2 text-sm font-medium text-text-secondary">{label}</label>
      {children}
    </div>
  )
}

export function Avatar({ url, name }: { url?: string | null; name?: string }) {
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={name} className="h-10 w-10 shrink-0 rounded-full object-cover" />
  ) : (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-bg-tertiary">
      <User className="h-5 w-5 text-text-tertiary" />
    </div>
  )
}

/** 단체 사진 추가 단추 (끌어놓기/클릭) */
export function ImagePickerButton({ busy, onPick }: { busy: boolean; onPick: (file: File) => void }) {
  const [dragging, setDragging] = useState(false)
  return (
    <label
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={(e) => { e.preventDefault(); setDragging(false) }}
      onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files?.[0]; if (f) onPick(f) }}
      className={`flex h-24 w-24 cursor-pointer items-center justify-center rounded-lg border border-dashed ${dragging ? 'border-accent bg-accent/10' : 'border-border hover:border-accent'}`}
    >
      <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onPick(f); e.target.value = '' }} />
      {busy ? <Loader2 className="h-5 w-5 animate-spin text-accent" /> : <ImagePlus className="h-6 w-6 text-text-tertiary" />}
    </label>
  )
}

/** 인물 개인샷 썸네일 (추가/교체/삭제. readOnly 면 보기만 — 제작 유래 인물은 인물 행에서 손질) */
export function CelebFactionImage({ url, busy, readOnly, onPick, onRemove }: {
  url: string | null
  busy: boolean
  readOnly?: boolean
  onPick: (file: File) => void
  onRemove: () => void
}) {
  if (readOnly) {
    return url ? (
      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-accent/50" title="도감 개인샷 — 편 편집기 인물 행에서 손질">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="" className="h-full w-full object-cover" />
      </div>
    ) : (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-dashed border-border/60 text-text-tertiary" title="개인샷 없음 — 편 편집기 인물 행에서 올립니다">
        <ImagePlus className="h-5 w-5 opacity-40" />
      </div>
    )
  }
  if (url) {
    return (
      <div className="group relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-accent/50" title="도감 개인샷">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="" className="h-full w-full object-cover" />
        <button
          type="button"
          onClick={onRemove}
          className="absolute inset-0 flex items-center justify-center bg-black/60 text-white opacity-0 group-hover:opacity-100"
          title="개인샷 삭제"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    )
  }
  return (
    <label className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-dashed border-border hover:border-accent" title="도감 개인샷 추가">
      <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onPick(f); e.target.value = '' }} />
      {busy ? <Loader2 className="h-4 w-4 animate-spin text-accent" /> : <ImagePlus className="h-5 w-5 text-text-tertiary" />}
    </label>
  )
}
