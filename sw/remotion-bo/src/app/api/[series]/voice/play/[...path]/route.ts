import { readFile } from 'fs/promises'
import path from 'path'
import { existsSync, readFileSync } from 'fs'
import { VOICE_DIR } from '@/lib/server-utils'

export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await params

  // 직접 경로 시도
  let abs = path.join(VOICE_DIR, ...segments)

  // 없으면 voice-select.json으로 엔진 하위 디렉토리 해소
  if (!existsSync(abs) && segments.length >= 2) {
    const epName = segments[0]
    const fileName = segments.slice(1).join('/')
    const vsPath = path.join(VOICE_DIR, epName, 'voice-select.json')
    if (existsSync(vsPath)) {
      try {
        const vs = JSON.parse(readFileSync(vsPath, 'utf-8'))
        const engine = vs.slots?.[fileName] ?? vs.default
        if (engine) {
          const resolved = path.join(VOICE_DIR, epName, engine, fileName)
          if (existsSync(resolved)) abs = resolved
        }
      } catch { /* ignore */ }
    }
  }

  try {
    const buf = await readFile(abs)
    return new Response(buf, { headers: { 'Content-Type': 'audio/wav' } })
  } catch {
    return Response.json({ error: 'not found' }, { status: 404 })
  }
}
