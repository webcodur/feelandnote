'use client'

import { useCallback, useMemo, useState } from 'react'
import { ImageIcon } from 'lucide-react'
import {
  BOOK_PERSON_IMAGE_DND, ImagePool, ImageSlot,
} from '@feelandnote/shared/bo/media'
import { useImagePoolToggle } from '@/lib/useImagePoolToggle'
import type { BookPersonScript } from '@/features/book-person/types'

const SERIES = 'book-person'

export { BOOK_PERSON_IMAGE_DND }

export function collectUsedImages(script: BookPersonScript): Set<string> {
  const raw = [script.bg, ...script.books.map(b => b.image)].filter((p): p is string => Boolean(p))
  const used = new Set<string>()
  for (const p of raw) {
    used.add(p)
    if (!p.includes('/')) used.add(`images/${p}`)
    if (p.startsWith('images/')) used.add(p.slice('images/'.length))
  }
  return used
}

export function remapImages(script: BookPersonScript, from: string, to: string): BookPersonScript {
  const hit = (p?: string) => {
    if (!p) return false
    if (p === from) return true
    if (!p.includes('/') && from.endsWith(`/${p}`)) return true
    return false
  }
  const next = (p?: string) => (hit(p) ? to : p)
  return {
    ...script,
    bg: next(script.bg),
    books: script.books.map(b => ({ ...b, image: next(b.image) })),
  }
}

async function folderOp(ep: string, body: Record<string, string>) {
  const res = await fetch(`/api/${SERIES}/media/folder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ep, ...body }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data.ok) {
    alert(data.error ?? '폴더 작업 실패')
    return null
  }
  return data as { ok: true; from?: string; to?: string }
}

export function BookPersonImageSlot({
  folder, value, onChange, label, onUploaded,
}: {
  folder: string
  value?: string
  onChange: (next: string | undefined) => void
  label: string
  onUploaded?: () => void
}) {
  return (
    <ImageSlot
      value={value}
      onChange={onChange}
      series={SERIES}
      episodeName={folder}
      dnd={BOOK_PERSON_IMAGE_DND}
      label={label}
      emptyText="끌어다 놓기"
      size={88}
      onUploaded={onUploaded}
    />
  )
}

export function BookPersonPool({
  folder,
  script,
  onRemap,
}: {
  folder: string
  script: BookPersonScript
  onRemap: (from: string, to: string) => void
}) {
  const { open, setOpen } = useImagePoolToggle()
  const [reloadKey, setReloadKey] = useState(0)
  const usedImages = useMemo(() => collectUsedImages(script), [script])

  const bump = useCallback(() => setReloadKey(k => k + 1), [])

  const createFolder = useCallback(async (path: string) => {
    const r = await folderOp(folder, { action: 'create', folder: path })
    if (r) bump()
    return !!r
  }, [folder, bump])

  const deleteFolder = useCallback(async (path: string) => {
    const r = await folderOp(folder, { action: 'delete', folder: path })
    if (r) bump()
    return !!r
  }, [folder, bump])

  const moveFile = useCallback(async (from: string, toFolder: string) => {
    const r = await folderOp(folder, { action: 'move', from, toFolder })
    if (!r?.from || !r.to) return false
    onRemap(r.from, r.to)
    bump()
    return true
  }, [folder, onRemap, bump])

  const renameFolder = useCallback(async (path: string, newName: string) => {
    const r = await folderOp(folder, { action: 'rename', folder: path, name: newName })
    if (!r?.from || !r.to) return false
    onRemap(r.from, r.to)
    bump()
    return true
  }, [folder, onRemap, bump])

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm font-semibold ${
          open ? 'border-accent bg-accent/10 text-accent' : 'border-border bg-bg-card text-text-secondary hover:bg-bg-hover hover:text-accent'
        }`}
        title="사진 목록 · Ctrl+Q"
      >
        <ImageIcon className="h-4 w-4" /> 사진 목록
      </button>
      {open && (
        <aside className="w-full shrink-0 rounded-lg border border-border bg-bg-card/40 p-3 xl:sticky xl:top-4 xl:max-h-[calc(100vh-2rem)] xl:w-[26rem] xl:overflow-y-auto">
          <ImagePool
            series={SERIES}
            episodeName={folder}
            usedImages={usedImages}
            dnd={BOOK_PERSON_IMAGE_DND}
            reloadKey={reloadKey}
            onMoveFile={moveFile}
            onCreateFolder={createFolder}
            onRenameFolder={renameFolder}
            onDeleteFolder={deleteFolder}
          />
        </aside>
      )}
    </div>
  )
}
