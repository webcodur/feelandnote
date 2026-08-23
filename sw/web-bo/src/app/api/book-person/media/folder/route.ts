import { NextResponse } from 'next/server'
import { spawn } from 'child_process'
import { existsSync } from 'fs'
import path from 'path'
import {
  createFolder, renameFolder, deleteFolder, moveImage, episodeDirOf, safeRelSegs,
} from '@feelandnote/shared/bo/episode-store'
import { BOOK_PERSON_DIR } from '@/lib/book-person-paths'
import { guardBookPersonRoute } from '@/lib/book-person-route'

type Body = {
  ep?: string
  action?: 'create' | 'rename' | 'delete' | 'move' | 'open'
  folder?: string
  name?: string
  from?: string
  toFolder?: string
}

export async function POST(req: Request) {
  const denied = await guardBookPersonRoute()
  if (denied) return denied

  const body = (await req.json().catch(() => ({}))) as Body
  const { ep, action } = body
  if (!ep || !action) return NextResponse.json({ error: 'ep and action required' }, { status: 400 })

  try {
    switch (action) {
      case 'create': {
        const folder = await createFolder(BOOK_PERSON_DIR, ep, body.folder ?? '')
        return NextResponse.json({ ok: true, folder })
      }
      case 'rename': {
        const r = await renameFolder(BOOK_PERSON_DIR, ep, body.folder ?? '', body.name ?? '')
        return NextResponse.json({ ok: true, ...r })
      }
      case 'delete': {
        await deleteFolder(BOOK_PERSON_DIR, ep, body.folder ?? '')
        return NextResponse.json({ ok: true })
      }
      case 'move': {
        const r = await moveImage(BOOK_PERSON_DIR, ep, body.from ?? '', body.toFolder ?? '')
        return NextResponse.json({ ok: true, ...r })
      }
      case 'open': {
        const target = path.normalize(path.join(episodeDirOf(BOOK_PERSON_DIR, ep), ...safeRelSegs(body.folder ?? '')))
        if (!existsSync(target)) {
          return NextResponse.json({ error: 'folder not found', target }, { status: 404 })
        }
        const cmd = process.platform === 'win32' ? 'explorer'
          : process.platform === 'darwin' ? 'open'
          : 'xdg-open'
        const child = spawn(cmd, [target], { detached: true, stdio: 'ignore' })
        child.unref()
        return NextResponse.json({ ok: true, opened: target })
      }
      default:
        return NextResponse.json({ error: 'unknown action' }, { status: 400 })
    }
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 400 })
  }
}
