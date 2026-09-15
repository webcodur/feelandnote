'use server'

import { readFile } from 'fs/promises'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { requireFactionAdmin, factionAdminClient } from '@/lib/faction-db'
import { revalidateWebLists } from '@/lib/revalidate-web'
import { fileHash } from '@/lib/faction-sync/manifest'
import { musicKey } from '@/lib/faction-sync/music'
import { missingR2Env, publicUrl, uploadToR2 } from '@/lib/faction-sync/r2'
import {
  MYTH_MUSIC_DIR, mythMusicValue, scanMythMusicFolder, toMythMusicEntry,
  type MythMusicEntry, type MythMusicScan, type MythMusicTag,
} from '@/lib/myth-music'

const TAG_COLUMNS = 'id,name,slug,parent_id,theme_music'

export interface MythMusicCatalog {
  folder: string
  folderExists: boolean
  r2Ready: boolean
  entries: MythMusicEntry[]
}

export interface MythMusicSyncResult {
  ok: boolean
  updated: number
  skipped: number
  blocked: number
  message: string
}

async function loadMythTags(): Promise<MythMusicTag[]> {
  const db = factionAdminClient()
  const { data, error } = await db.from('celeb_tags').select(TAG_COLUMNS).order('sort_order').order('name')
  if (error) throw new Error('신화 전승 조회 실패: ' + error.message)

  const rows = (data ?? []) as Array<MythMusicTag & { parent_id: string | null }>
  const root = rows.find((row) => row.slug === 'myth-and-fiction')
  if (!root) return []
  const rootIds = new Set(rows.filter((row) => row.parent_id === root.id).map((row) => row.id))
  return rows.filter((row) => rootIds.has(row.parent_id ?? '') || rootIds.has(row.id))
}

async function scanCatalog(): Promise<{ scan: MythMusicScan; entries: MythMusicEntry[] }> {
  const tags = await loadMythTags()
  const scan = await scanMythMusicFolder(tags)
  return { scan, entries: scan.files.map(toMythMusicEntry) }
}

/** 관리자 화면에서 준비 폴더와 현재 서비스 연결 상태를 읽는다. */
export async function getMythMusicCatalog(): Promise<MythMusicCatalog> {
  await requireFactionAdmin()
  const { scan, entries } = await scanCatalog()
  return {
    folder: MYTH_MUSIC_DIR,
    folderExists: scan.folderExists,
    r2Ready: missingR2Env().length === 0,
    entries,
  }
}

/** 준비 폴더의 매칭된 mp3를 R2에 올리고 해당 신화 전승의 theme_music을 갱신한다. */
export async function syncMythMusic(): Promise<MythMusicSyncResult> {
  await requireFactionAdmin()
  const { scan } = await scanCatalog()
  if (!scan.folderExists) {
    return { ok: false, updated: 0, skipped: 0, blocked: 0, message: '폴더가 없습니다: ' + MYTH_MUSIC_DIR }
  }
  const missing = missingR2Env()
  if (missing.length > 0) {
    return { ok: false, updated: 0, skipped: 0, blocked: scan.files.length, message: 'R2 환경변수 누락: ' + missing.join(', ') }
  }

  const db = factionAdminClient()
  let updated = 0
  let skipped = 0
  let blocked = 0
  for (const file of scan.files) {
    if (!file.tag) { blocked += 1; continue }
    const current = file.tag.theme_music as { file?: unknown; url?: unknown } | null
    try {
      const bytes = await readFile(file.absPath)
      const key = musicKey(fileHash(bytes), file.file)
      const url = publicUrl(key, false)
      if (current?.file === file.file && current.url === url) {
        skipped += 1
        continue
      }
      await uploadToR2(key, bytes, 'audio/mpeg')
      const { error } = await db
        .from('celeb_tags')
        .update({ theme_music: mythMusicValue(file.file, url, new Date().toISOString()) })
        .eq('id', file.tag.id)
      if (error) throw new Error(error.message)
      updated += 1
    } catch (error) {
      blocked += 1
      console.error('[myth-music] ' + file.file + ' 반영 실패', error)
    }
  }

  if (updated > 0) await revalidateWebLists(CACHE_TAGS.TAGS)
  return { ok: blocked === 0, updated, skipped, blocked, message: '반영 ' + updated + '곡 · 유지 ' + skipped + '곡 · 확인 필요 ' + blocked + '곡' }
}
