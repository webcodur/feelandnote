/**
 * 랭킹 사진 창구 — 목록·업로드·삭제.
 *
 * 공용 사진 부품이 `/api/{시리즈}/media` 를 부른다. 시리즈 이름 `ranking` 을
 * 첫 토막에 두면 그 부품을 고치지 않고 쓴다.
 */

import { NextResponse } from 'next/server'
import {
  listImages, listImageTree, saveImage, deleteImage, saveImageFromUrl, RANKINGS_DIR,
} from '@feelandnote/shared/bo/episode-store'
import { guardRankingRoute } from '@/lib/ranking-route'

export async function GET(req: Request) {
  const denied = await guardRankingRoute()
  if (denied) return denied

  const url = new URL(req.url)
  const ep = url.searchParams.get('ep')
  if (!ep) return NextResponse.json({ error: 'ep required' }, { status: 400 })
  try {
    if (url.searchParams.get('tree') === '1') {
      return NextResponse.json(await listImageTree(RANKINGS_DIR, ep))
    }
    return NextResponse.json(await listImages(RANKINGS_DIR, ep))
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 400 })
  }
}

export async function POST(req: Request) {
  const denied = await guardRankingRoute()
  if (denied) return denied

  const ctype = req.headers.get('content-type') ?? ''
  try {
    if (ctype.includes('application/json')) {
      const { ep, url, basename } = (await req.json()) as { ep?: string; url?: string; basename?: string }
      if (!ep || !url) return NextResponse.json({ error: 'ep and url required' }, { status: 400 })
      const saved = await saveImageFromUrl(RANKINGS_DIR, ep, url, basename ?? 'image')
      return NextResponse.json({ ok: true, file: saved })
    }
    const form = await req.formData()
    const ep = form.get('ep')
    const file = form.get('file')
    if (typeof ep !== 'string' || !(file instanceof File)) {
      return NextResponse.json({ error: 'ep and file required' }, { status: 400 })
    }
    const buf = Buffer.from(await file.arrayBuffer())
    const saved = await saveImage(RANKINGS_DIR, ep, file.name, buf)
    return NextResponse.json({ ok: true, file: saved })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 400 })
  }
}

export async function DELETE(req: Request) {
  const denied = await guardRankingRoute()
  if (denied) return denied

  const url = new URL(req.url)
  const ep = url.searchParams.get('ep')
  const file = url.searchParams.get('file')
  if (!ep || !file) return NextResponse.json({ error: 'ep and file required' }, { status: 400 })
  try {
    await deleteImage(RANKINGS_DIR, ep, file)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 400 })
  }
}
