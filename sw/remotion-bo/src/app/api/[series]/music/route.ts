import { NextResponse } from 'next/server'
import { existsSync, mkdirSync } from 'fs'
import { readdir } from 'fs/promises'
import { spawn } from 'child_process'
import path from 'path'
import { isValidSeries } from '@/lib/series-registry'

/**
 * 배경음악 창구 — 음악 파일은 시리즈와 무관하게 public/music/ 한 곳에 모여 있다.
 * 세력도 전용이던 창구(faction-music)를 걷어내면서 시리즈 공용으로 남겼다.
 */
const MUSIC_DIR = path.join(process.cwd(), '..', 'remotion', 'public', 'music')

/** GET : public/music/ 의 음악 파일 목록 */
export async function GET(_req: Request, { params }: { params: Promise<{ series: string }> }) {
  const { series } = await params
  if (!isValidSeries(series)) return NextResponse.json({ error: 'invalid series' }, { status: 404 })
  let files: string[] = []
  try { files = (await readdir(MUSIC_DIR)).filter(f => /\.(mp3|wav|m4a|ogg)$/i.test(f)).sort() }
  catch { files = [] }
  return NextResponse.json({ files })
}

/** POST : 음악 폴더(public/music)를 OS 탐색기로 연다. 없으면 만들어 둔다. */
export async function POST(_req: Request, { params }: { params: Promise<{ series: string }> }) {
  const { series } = await params
  if (!isValidSeries(series)) return NextResponse.json({ error: 'invalid series' }, { status: 404 })
  if (!existsSync(MUSIC_DIR)) {
    try { mkdirSync(MUSIC_DIR, { recursive: true }) } catch { /* ignore */ }
  }
  const platform = process.platform
  const cmd = platform === 'win32' ? 'explorer' : platform === 'darwin' ? 'open' : 'xdg-open'
  // 탐색기는 띄우고 즉시 분리한다(explorer 는 정상이어도 종료 코드 1을 반환할 수 있어 무시).
  const child = spawn(cmd, [path.normalize(MUSIC_DIR)], { detached: true, stdio: 'ignore' })
  child.unref()
  return NextResponse.json({ ok: true })
}
