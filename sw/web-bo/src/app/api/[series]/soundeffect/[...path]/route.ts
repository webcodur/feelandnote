import { readFile, readdir, stat } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { findEpisodeDir } from '@/features/book-recommend/lib/server-utils'
import { isValidSeries } from '@/features/book-recommend/lib/series-registry'

const execFileP = promisify(execFile)

const AUDIO_EXTS = new Set(['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac'])
const MIME: Record<string, string> = {
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4', '.aac': 'audio/aac', '.flac': 'audio/flac',
}

async function probeDuration(abs: string): Promise<number | null> {
  try {
    const { stdout } = await execFileP('ffprobe', [
      '-v', 'error',
      '-select_streams', 'a:0',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      abs,
    ], { timeout: 5000 })
    const sec = parseFloat(stdout.trim())
    return Number.isFinite(sec) ? sec : null
  } catch {
    return null
  }
}

export async function GET(_req: Request, { params }: { params: Promise<{ series: string; path: string[] }> }) {
  const { series, path: segments } = await params
  if (!isValidSeries(series)) return Response.json({ error: 'invalid series' }, { status: 404 })
  const episodeName = segments[0]
  const fileParts = segments.slice(1)

  const found = findEpisodeDir(episodeName)
  if (!found) return Response.json({ error: 'episode not found' }, { status: 404 })

  const sfxDir = path.join(found.dir, 'soundeffect')

  // 파일 경로 없음 → soundeffect/ 디렉토리 내 오디오 목록 반환
  if (!fileParts.length) {
    const basePath = `episodes/${found.status}/${episodeName}/soundeffect`
    if (!existsSync(sfxDir)) return Response.json({ files: [], basePath })
    const entries = await readdir(sfxDir, { withFileTypes: true })
    const names = entries
      .filter(e => e.isFile() && AUDIO_EXTS.has(path.extname(e.name).toLowerCase()))
      .map(e => e.name)
      .sort()
    const files = await Promise.all(
      names.map(async name => {
        const duration = await probeDuration(path.join(sfxDir, name))
        return { name, duration }
      }),
    )
    return Response.json({ files, basePath })
  }

  // 파일 서빙
  const abs = path.join(sfxDir, ...fileParts)
  if (!existsSync(abs)) return Response.json({ error: 'not found' }, { status: 404 })

  const ext = path.extname(abs).toLowerCase()
  const mime = MIME[ext] ?? 'application/octet-stream'
  const fileStat = await stat(abs)
  const buf = await readFile(abs)

  return new Response(buf, {
    headers: {
      'Content-Type': mime,
      'Content-Length': String(fileStat.size),
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
