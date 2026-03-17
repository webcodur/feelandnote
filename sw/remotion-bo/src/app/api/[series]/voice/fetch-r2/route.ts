import { NextResponse } from 'next/server'

/**
 * POST /api/{series}/voice/fetch-r2
 * web R2 퍼블릭 URL의 음원을 서버에서 대리 fetch → base64 반환 (CORS 우회)
 */
export async function POST(req: Request) {
  const { url } = await req.json()
  if (!url || typeof url !== 'string') {
    return NextResponse.json({ success: false, error: 'url required' }, { status: 400 })
  }
  try {
    const res = await fetch(url)
    if (!res.ok) return NextResponse.json({ success: false, error: `HTTP ${res.status}` }, { status: res.status })
    const buf = Buffer.from(await res.arrayBuffer())
    const contentType = res.headers.get('Content-Type') ?? 'audio/mpeg'
    return NextResponse.json({ success: true, base64: buf.toString('base64'), bytes: buf.length, contentType })
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 })
  }
}
