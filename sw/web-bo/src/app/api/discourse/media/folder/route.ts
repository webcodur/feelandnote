/**
 * 가상 담화 사진 폴더 정리 — 만들기·이름변경·삭제·파일 이동·탐색기로 열기.
 *
 * 이름을 바꾸거나 파일을 옮기면 대본이 가리키던 경로가 어긋난다.
 * 그래서 응답으로 {from, to} 를 돌려주고, 편집기가 그 값으로 대본의 경로를 따라가게 한다.
 */

import { NextResponse } from 'next/server'
import { spawn } from 'child_process'
import { existsSync } from 'fs'
import path from 'path'
import {
  createFolder, renameFolder, deleteFolder, moveImage, episodeDirOf, safeRelSegs,
} from '@feelandnote/shared/bo/episode-store'
import { DISCOURSES_DIR } from '@/lib/discourse-paths'
import { guardDiscourseRoute } from '@/lib/discourse-route'

type Body = {
  ep?: string
  action?: 'create' | 'rename' | 'delete' | 'move' | 'open'
  folder?: string
  name?: string
  from?: string
  toFolder?: string
}

export async function POST(req: Request) {
  const denied = await guardDiscourseRoute()
  if (denied) return denied

  const body = (await req.json().catch(() => ({}))) as Body
  const { ep, action } = body
  if (!ep || !action) return NextResponse.json({ error: 'ep and action required' }, { status: 400 })

  try {
    switch (action) {
      case 'create': {
        const folder = await createFolder(DISCOURSES_DIR, ep, body.folder ?? '')
        return NextResponse.json({ ok: true, folder })
      }
      case 'rename': {
        const r = await renameFolder(DISCOURSES_DIR, ep, body.folder ?? '', body.name ?? '')
        return NextResponse.json({ ok: true, ...r })
      }
      case 'delete': {
        await deleteFolder(DISCOURSES_DIR, ep, body.folder ?? '')
        return NextResponse.json({ ok: true })
      }
      case 'move': {
        const r = await moveImage(DISCOURSES_DIR, ep, body.from ?? '', body.toFolder ?? '')
        return NextResponse.json({ ok: true, ...r })
      }
      case 'open': {
        // 에피소드 폴더(folder 를 주면 그 하위)를 OS 파일 탐색기로 연다
        const target = path.normalize(path.join(episodeDirOf(DISCOURSES_DIR, ep), ...safeRelSegs(body.folder ?? '')))
        if (!existsSync(target)) {
          return NextResponse.json({ error: 'folder not found', target }, { status: 404 })
        }
        const cmd = process.platform === 'win32' ? 'explorer'
          : process.platform === 'darwin' ? 'open'
          : 'xdg-open'
        // 탐색기는 띄우고 즉시 분리한다(explorer 는 정상이어도 종료 코드 1을 반환할 수 있어 무시).
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
