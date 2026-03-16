import { readFile } from 'fs/promises'
import path from 'path'
import { VOICE_DIR } from '@/lib/server-utils'

export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await params
  const abs = path.join(VOICE_DIR, ...segments)
  try {
    const buf = await readFile(abs)
    return new Response(buf, { headers: { 'Content-Type': 'audio/wav' } })
  } catch {
    return Response.json({ error: 'not found' }, { status: 404 })
  }
}
