'use client'

import { useCallback, useMemo, useState } from 'react'
import { ImageIcon } from 'lucide-react'
import {
  RANKING_IMAGE_DND, ImagePool, ImageSlot,
} from '@feelandnote/shared/bo/media'
import { makePathRemapper } from '@feelandnote/shared/bo/editor'
import { useImagePoolToggle } from '@/lib/useImagePoolToggle'
import { RANKING_SERIES } from '@/lib/ranking-paths'
import type { RankingScript } from '@/actions/admin/rankings/script'

export { RANKING_IMAGE_DND }

export function collectUsedImages(script: RankingScript): Set<string> {
  const raw = script.categories.flatMap(c => c.entries.flatMap(e => [e.image, e.avatar])).filter((p): p is string => Boolean(p))
  const used = new Set<string>()
  for (const p of raw) {
    used.add(p)
    if (!p.includes('/')) used.add(`images/${p}`)
    if (p.startsWith('images/')) used.add(p.slice('images/'.length))
  }
  return used
}

export function remapImages(script: RankingScript, from: string, to: string): RankingScript {
  const remap = makePathRemapper(from, to)
  let changed = false
  const nextPath = (p?: string) => {
    if (!p) return p
    const a = remap(p)
    if (a !== p) {
      changed = true
      return a
    }
    if (!p.includes('/') && from.endsWith(`/${p}`)) {
      changed = true
      return to
    }
    return p
  }
  const categories = script.categories.map(c => ({
    ...c,
    entries: c.entries.map(e => ({ ...e, image: nextPath(e.image), avatar: nextPath(e.avatar) })),
  }))
  return changed ? { ...script, categories } : script
}

async function folderOp(ep: string, body: Record<string, string>) {
  const res = await fetch(`/api/${RANKING_SERIES}/media/folder`, {
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

export function RankingImageSlot({
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
      series={RANKING_SERIES}
      episodeName={folder}
      dnd={RANKING_IMAGE_DND}
      label={label}
      emptyText="끌어다 놓기"
      size={88}
      onUploaded={onUploaded}
    />
  )
}

export function RankingPool({
  folder,
  script,
  onRemap,
}: {
  folder: string
  script: RankingScript
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

  const deleteFile = useCallback(async (file: string) => {
    const res = await fetch(
      `/api/${RANKING_SERIES}/media?ep=${encodeURIComponent(folder)}&file=${encodeURIComponent(file)}`,
      { method: 'DELETE' },
    )
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data.ok) {
      alert(data.error ?? '파일 삭제 실패')
      return false
    }
    bump()
    return true
  }, [folder, bump])

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
            series={RANKING_SERIES}
            episodeName={folder}
            usedImages={usedImages}
            dnd={RANKING_IMAGE_DND}
            reloadKey={reloadKey}
            onMoveFile={moveFile}
            onCreateFolder={createFolder}
            onRenameFolder={renameFolder}
            onDeleteFolder={deleteFolder}
            onDeleteFile={deleteFile}
          />
        </aside>
      )}
    </div>
  )
}
