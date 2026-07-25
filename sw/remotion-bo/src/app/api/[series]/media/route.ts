/**
 * 에피소드 사진 창구 — 목록·업로드·삭제. 가상 담화가 쓴다.
 *
 * 시리즈가 갈리는 지점은 `mediaRootOf(series)` 하나뿐이다.
 * 값을 돌려주지 않는 시리즈(서재 탐방)는 이 창구를 쓰지 않으므로 그대로 404 다.
 * 실제 파일 조작은 공용 부품 `shared/bo/episode-store` 한 곳에만 있다.
 */

import { NextResponse } from 'next/server'
import { listImages, listImageTree, saveImage, deleteImage, saveImageFromUrl } from '@feelandnote/shared/bo/episode-store'
import { mediaRootOf } from '@/lib/media-root'

/**
 * GET ?ep=        : images/ 직속 파일명 목록 (사진 고르기 모달용)
 * GET ?ep=&tree=1 : 에피소드 폴더 전체 { files, folders } (사진 목록용)
 */
export async function GET(req: Request, { params }: { params: Promise<{ series: string }> }) {
  const { series } = await params
  const root = mediaRootOf(series)
  if (!root) return NextResponse.json({ error: 'invalid series' }, { status: 404 })

  const url = new URL(req.url)
  const ep = url.searchParams.get('ep')
  if (!ep) return NextResponse.json({ error: 'ep required' }, { status: 400 })
  try {
    if (url.searchParams.get('tree') === '1') {
      return NextResponse.json(await listImageTree(root, ep))
    }
    return NextResponse.json(await listImages(root, ep))
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 400 })
  }
}

/**
 * POST multipart(ep, file)        : 파일 업로드
 * POST json({ep, url, basename})  : 외부 주소 사진을 내려받아 저장
 * 둘 다 images/ 직속에 떨어지고 저장된 파일명을 돌려준다.
 */
export async function POST(req: Request, { params }: { params: Promise<{ series: string }> }) {
  const { series } = await params
  const root = mediaRootOf(series)
  if (!root) return NextResponse.json({ error: 'invalid series' }, { status: 404 })

  const ctype = req.headers.get('content-type') ?? ''
  try {
    if (ctype.includes('application/json')) {
      const { ep, url, basename } = (await req.json()) as { ep?: string; url?: string; basename?: string }
      if (!ep || !url) return NextResponse.json({ error: 'ep and url required' }, { status: 400 })
      const saved = await saveImageFromUrl(root, ep, url, basename ?? 'image')
      return NextResponse.json({ ok: true, file: saved })
    }
    const form = await req.formData()
    const ep = form.get('ep')
    const file = form.get('file')
    if (typeof ep !== 'string' || !(file instanceof File)) {
      return NextResponse.json({ error: 'ep and file required' }, { status: 400 })
    }
    const buf = Buffer.from(await file.arrayBuffer())
    const saved = await saveImage(root, ep, file.name, buf)
    return NextResponse.json({ ok: true, file: saved })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 400 })
  }
}

/** DELETE ?ep=&file= : 파일 삭제. file 은 에피소드 폴더 기준 상대경로(하위 폴더 포함) */
export async function DELETE(req: Request, { params }: { params: Promise<{ series: string }> }) {
  const { series } = await params
  const root = mediaRootOf(series)
  if (!root) return NextResponse.json({ error: 'invalid series' }, { status: 404 })

  const url = new URL(req.url)
  const ep = url.searchParams.get('ep')
  const file = url.searchParams.get('file')
  if (!ep || !file) return NextResponse.json({ error: 'ep and file required' }, { status: 400 })
  try {
    await deleteImage(root, ep, file)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 400 })
  }
}
