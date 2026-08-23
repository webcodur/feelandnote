import { existsSync } from 'fs'
import path from 'path'

export interface FactionImageRow {
  id?: string
  group_id?: string
  cluster_id?: string
  position?: number
  part?: number
  image?: string | null
  slug?: string | null
  name?: string | null
  is_person?: boolean
  isPerson?: boolean
  clusters?: unknown
  people?: unknown
}

export interface ImageTarget {
  table: 'faction_clusters' | 'faction_people'
  id: string
  subject: string
  before: string | null
  after: string
}

function usage(): never {
  throw new Error('사용: pnpm faction:images-sync -- --episode <폴더명> [--apply]')
}

export function parseArgs(argv: string[]): { folder: string; apply: boolean } {
  const args = argv.slice(2).filter(arg => arg !== '--')
  let folder = ''
  let apply = false
  for (let index = 0; index < args.length; index++) {
    const arg = args[index]
    if (arg === '--episode') folder = args[++index] ?? ''
    else if (arg === '--apply') apply = true
    else usage()
  }
  if (!folder) usage()
  return { folder, apply }
}

export function asRows(value: unknown): FactionImageRow[] {
  return Array.isArray(value) ? value as FactionImageRow[] : []
}

export function imagePath(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null
  return value.trim().replace(/\\/g, '/')
}

export function assertLocalImage(episodeDir: string, relativePath: string, subject: string): void {
  if (path.isAbsolute(relativePath) || relativePath.split('/').includes('..')) {
    throw new Error(`${subject}: 에피소드 밖을 가리키는 이미지 경로: ${relativePath}`)
  }
  if (!/\.(?:png|jpe?g|webp)$/i.test(relativePath)) {
    throw new Error(`${subject}: 지원하지 않는 이미지 확장자: ${relativePath}`)
  }
  const resolved = path.resolve(episodeDir, relativePath)
  const root = path.resolve(episodeDir) + path.sep
  if (!resolved.startsWith(root) || !existsSync(resolved)) {
    throw new Error(`${subject}: 로컬 이미지가 없음: ${relativePath}`)
  }
}

export function byPosition(a: FactionImageRow, b: FactionImageRow): number {
  return Number(a.position) - Number(b.position)
}
