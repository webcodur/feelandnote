import { NextResponse } from 'next/server'
import {
  listImages, listImageTree, saveImage, deleteImage, saveImageFromUrl,
} from '@feelandnote/shared/bo/episode-store'
import { BOOK_PERSON_DIR } from '@/lib/book-person-paths'
import { guardBookPersonRoute } from '@/lib/book-person-route'

export async function GET(req: Request) {
  const denied = await guardBookPersonRoute()
  if (denied) return denied

  const url = new URL(req.url)
  const ep = url.searchParams.get('ep')
  if (!ep) return NextResponse.json({ error: 'ep required' }, { status: 400 })
  try {
    if (url.searchParams.get('tree') === '1') {
      return NextResponse.json(await listImageTree(BOOK_PERSON_DIR, ep))
    }
    return NextResponse.json(await listImages(BOOK_PERSON_DIR, ep))
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 400 })
  }
}

export async function POST(req: Request) {
  const denied = await guardBookPersonRoute()
  if (denied) return denied

  const ctype = req.headers.get('content-type') ?? ''
  try {
    if (ctype.includes('application/json')) {
      const { ep, url, basename } = (await req.json()) as { ep?: string; url?: string; basename?: string }
      if (!ep || !url) return NextResponse.json({ error: 'ep and url required' }, { status: 400 })
      const saved = await saveImageFromUrl(BOOK_PERSON_DIR, ep, url, basename ?? 'image')
      return NextResponse.json({ ok: true, file: saved })
    }
    const form = await req.formData()
    const ep = form.get('ep')
    const file = form.get('file')
    if (typeof ep !== 'string' || !(file instanceof File)) {
      return NextResponse.json({ error: 'ep and file required' }, { status: 400 })
    }
    const buf = Buffer.from(await file.arrayBuffer())
    const saved = await saveImage(BOOK_PERSON_DIR, ep, file.name, buf)
    return NextResponse.json({ ok: true, file: saved })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 400 })
  }
}

export async function DELETE(req: Request) {
  const denied = await guardBookPersonRoute()
  if (denied) return denied

  const url = new URL(req.url)
  const ep = url.searchParams.get('ep')
  const file = url.searchParams.get('file')
  if (!ep || !file) return NextResponse.json({ error: 'ep and file required' }, { status: 400 })
  try {
    await deleteImage(BOOK_PERSON_DIR, ep, file)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 400 })
  }
}
