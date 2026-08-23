/**
 * 랭킹 사진 폴더 정리 — 만들기·이름변경·삭제·파일 이동·탐색기로 열기.
 */

import { NextResponse } from 'next/server'
import { spawn } from 'child_process'
import { existsSync } from 'fs'
import path from 'path'
import {
  createFolder, renameFolder, deleteFolder, moveImage, episodeDirOf, safeRelSegs, RANKINGS_DIR,
} from '@feelandnote/shared/bo/episode-store'
import { guardRankingRoute } from '@/lib/ranking-route'

type Body = {
  ep?: string
  action?: 'create' | 'rename' | 'delete' | 'move' | 'open'
  folder?: string
  name?: string
  from?: string
  toFolder?: string
}

const FOLDER_ACTION = {
  create: async (ep: string, body: Body) => {
    const folder = await createFolder(RANKINGS_DIR, ep, body.folder ?? '')
    return { ok: true as const, folder }
  },
  rename: async (ep: string, body: Body) => {
    const r = await renameFolder(RANKINGS_DIR, ep, body.folder ?? '', body.name ?? '')
    return { ok: true as const, ...r }
  },
  delete: async (ep: string, body: Body) => {
    await deleteFolder(RANKINGS_DIR, ep, body.folder ?? '')
    return { ok: true as const }
  },
  move: async (ep: string, body: Body) => {
    const r = await moveImage(RANKINGS_DIR, ep, body.from ?? '', body.toFolder ?? '')
    return { ok: true as const, ...r }
  },
  open: async (ep: string, body: Body) => {
    const target = path.normalize(path.join(episodeDirOf(RANKINGS_DIR, ep), ...safeRelSegs(body.folder ?? '')))
    if (!existsSync(target)) {
      return { error: 'folder not found', target, status: 404 as const }
    }
    const cmd = process.platform === 'win32' ? 'explorer'
      : process.platform === 'darwin' ? 'open'
      : 'xdg-open'
    const child = spawn(cmd, [target], { detached: true, stdio: 'ignore' })
    child.unref()
    return { ok: true as const, opened: target }
  },
}

export async function POST(req: Request) {
  const denied = await guardRankingRoute()
  if (denied) return denied

  const body = (await req.json().catch(() => ({}))) as Body
  const { ep, action } = body
  if (!ep || !action) return NextResponse.json({ error: 'ep and action required' }, { status: 400 })

  const run = FOLDER_ACTION[action]
  if (!run) return NextResponse.json({ error: 'unknown action' }, { status: 400 })

  try {
    const result = await run(ep, body)
    if ('status' in result) {
      return NextResponse.json({ error: result.error, target: result.target }, { status: result.status })
    }
    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 400 })
  }
}
