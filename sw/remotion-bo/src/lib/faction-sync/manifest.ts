/**
 * 출간 매니페스트(_db-sync.json) 읽기·쓰기 — 서버 전용.
 *
 * 경로: sw/remotion/public/factions/<에피소드>/_db-sync.json
 * 내용: 에피소드 폴더 기준 파일 상대경로 → { hash, r2Key, uploadedAt, tagId }
 *
 * 같은 사진을 두 번 올리지 않기 위한 유일한 근거다. 로컬 파일 해시가 기록과 같으면
 * 업로드를 건너뛴다. 미리보기(dryRun)는 이 파일을 절대 쓰지 않는다.
 */

import { readFile, writeFile } from 'fs/promises'
import { createHash } from 'crypto'
import path from 'path'
import { FACTIONS_DIR } from '@/lib/faction-utils'
import { episodeDirOf } from '@/lib/episode-store'

export interface FactionSyncManifestEntry {
  /** 로컬 원본 파일 sha1 앞 8자 */
  hash: string
  /** 올라간 R2 객체 키 */
  r2Key: string
  /** 업로드 시각(ISO) */
  uploadedAt: string
  /** 올릴 때 쓴 태그 id — 태그가 바뀌면 키도 바뀌므로 함께 기록한다 */
  tagId: string
}

/** 파일 상대경로별 기록 */
export type FactionSyncManifest = Record<string, FactionSyncManifestEntry>

const MANIFEST_FILE = '_db-sync.json'

export function manifestPath(episode: string): string {
  return path.join(episodeDirOf(FACTIONS_DIR, episode), MANIFEST_FILE)
}

/** 파일 내용 해시 — 원본 바이트 기준 sha1 앞 8자 */
export function fileHash(buf: Buffer): string {
  return createHash('sha1').update(buf).digest('hex').slice(0, 8)
}

/** 읽기 — 파일이 없거나 형태가 깨졌으면 빈 기록(첫 출간과 같게 동작) */
export async function readManifest(episode: string): Promise<FactionSyncManifest> {
  try {
    const parsed: unknown = JSON.parse(await readFile(manifestPath(episode), 'utf-8'))
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    const out: FactionSyncManifest = {}
    for (const [key, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (!v || typeof v !== 'object') continue
      const e = v as Partial<FactionSyncManifestEntry>
      if (typeof e.hash !== 'string' || typeof e.r2Key !== 'string') continue
      out[key] = {
        hash: e.hash,
        r2Key: e.r2Key,
        uploadedAt: typeof e.uploadedAt === 'string' ? e.uploadedAt : '',
        tagId: typeof e.tagId === 'string' ? e.tagId : '',
      }
    }
    return out
  } catch {
    return {}
  }
}

/** 쓰기 — 키 이름순으로 정렬해 저장(파일 차이가 실제 변경만 드러나게) */
export async function writeManifest(episode: string, manifest: FactionSyncManifest): Promise<void> {
  const sorted: FactionSyncManifest = {}
  for (const key of Object.keys(manifest).sort()) sorted[key] = manifest[key]
  await writeFile(manifestPath(episode), JSON.stringify(sorted, null, 2) + '\n', 'utf-8')
}

/** 이미 올린 그대로인가 — 해시·키·태그가 모두 같을 때만 참 */
export function isUnchanged(
  entry: FactionSyncManifestEntry | undefined,
  hash: string,
  r2Key: string,
  tagId: string,
): boolean {
  return !!entry && entry.hash === hash && entry.r2Key === r2Key && entry.tagId === tagId
}
