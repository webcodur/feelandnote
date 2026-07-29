import { readdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

export { IMG_EXTS, VID_EXTS, IMG_MIME, VID_MIME, isVideoFile, isImageFile } from './media-exts'

export type MediaScanResult = {
  files: string[]
  folders: string[]
  fileFolders: Record<string, string>
  fileAbsPaths: Record<string, string>
  duplicates: Array<{ name: string; folders: string[] }>
}

/**
 * 주어진 루트 디렉토리를 재귀 스캔하여 지정 확장자 파일만 수집 — 서버 전용.
 * - files: 하위 폴더 포함 모든 파일 basename (평면 배열)
 * - folders: 하위 폴더 상대경로 (POSIX '/')
 * - fileFolders: basename → 폴더 상대경로 ('' = 루트)
 *
 * 파일명 전역 유일 전제. 충돌 시 먼저 스캔된 쪽 유지, 뒤에 것은 duplicates에 담긴다.
 */
export async function scanMediaRecursive(rootDir: string, exts: Set<string>): Promise<MediaScanResult> {
  const files: string[] = []
  const folders: string[] = []
  const fileFolders: Record<string, string> = {}
  const fileAbsPaths: Record<string, string> = {}
  const dupMap = new Map<string, string[]>()

  async function walk(dir: string, rel: string) {
    let entries
    try { entries = await readdir(dir, { withFileTypes: true }) } catch { return }
    for (const e of entries) {
      const abs = path.join(dir, e.name)
      const subRel = rel ? `${rel}/${e.name}` : e.name
      if (e.isDirectory()) {
        if (e.name.startsWith('.') || e.name.startsWith('_')) continue
        folders.push(subRel)
        await walk(abs, subRel)
      } else if (e.isFile() && exts.has(path.extname(e.name).toLowerCase())) {
        if (fileFolders[e.name] !== undefined) {
          const arr = dupMap.get(e.name) ?? [fileFolders[e.name]]
          arr.push(rel)
          dupMap.set(e.name, arr)
          continue
        }
        files.push(e.name)
        fileFolders[e.name] = rel
        fileAbsPaths[e.name] = abs
      }
    }
  }

  if (existsSync(rootDir)) await walk(rootDir, '')

  const duplicates = Array.from(dupMap.entries()).map(([name, fs]) => ({ name, folders: fs }))
  files.sort()
  folders.sort()
  return { files, folders, fileFolders, fileAbsPaths, duplicates }
}
