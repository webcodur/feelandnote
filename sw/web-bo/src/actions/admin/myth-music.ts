'use server'

import { readFile } from 'fs/promises'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/db/admin'
import { revalidateWebLists } from '@/lib/revalidate-web'
import { missingR2Env, R2_PUBLIC_URL, uploadToR2 } from '@/lib/r2'
import {
  MYTH_MUSIC_DIR, mythMusicObjectKey, mythMusicValue, scanMythMusicFolder, toMythMusicEntry,
  type MythMusicEntry, type MythMusicScan, type MythMusicTarget,
} from '@/lib/myth-music'

const MYTH_COLUMNS = 'id,name,slug,theme_music'

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

async function loadMythTargets(): Promise<MythMusicTarget[]> {
  const db = createAdminClient()
  // 테마곡은 L2 신화 카드의 속성이다 — is_myth=true인 faction_lv2 전량이 대상
  const { data, error } = await db.from('faction_lv2').select(MYTH_COLUMNS).eq('is_myth', true).order('sort_order').order('name')
  if (error) throw new Error('신화 조회 실패: ' + error.message)

  return (data ?? []) as MythMusicTarget[]
}

async function scanCatalog(): Promise<{ scan: MythMusicScan; entries: MythMusicEntry[] }> {
  const myths = await loadMythTargets()
  const scan = await scanMythMusicFolder(myths)
  return { scan, entries: scan.files.map(toMythMusicEntry) }
}

/** 관리자 화면에서 준비 폴더와 현재 서비스 연결 상태를 읽는다. */
export async function getMythMusicCatalog(): Promise<MythMusicCatalog> {
  await requireAdmin()
  const { scan, entries } = await scanCatalog()
  return {
    folder: MYTH_MUSIC_DIR,
    folderExists: scan.folderExists,
    r2Ready: missingR2Env().length === 0,
    entries,
  }
}

/** 준비 폴더의 매칭된 mp3를 R2에 올리고 해당 신화의 theme_music을 갱신한다. */
export async function syncMythMusic(): Promise<MythMusicSyncResult> {
  await requireAdmin()
  const { scan } = await scanCatalog()
  if (!scan.folderExists) {
    return { ok: false, updated: 0, skipped: 0, blocked: 0, message: '폴더가 없습니다: ' + MYTH_MUSIC_DIR }
  }
  const missing = missingR2Env()
  if (missing.length > 0) {
    return { ok: false, updated: 0, skipped: 0, blocked: scan.files.length, message: 'R2 환경변수 누락: ' + missing.join(', ') }
  }

  const db = createAdminClient()
  let updated = 0
  let skipped = 0
  let blocked = 0
  for (const file of scan.files) {
    if (!file.myth) { blocked += 1; continue }
    const current = file.myth.theme_music as { file?: unknown; url?: unknown } | null
    try {
      const bytes = await readFile(file.absPath)
      const key = mythMusicObjectKey(bytes, file.file)
      const url = `${R2_PUBLIC_URL}/${key}`
      if (current?.file === file.file && current.url === url) {
        skipped += 1
        continue
      }
      await uploadToR2(key, bytes, 'audio/mpeg')
      const { error } = await db
        .from('faction_lv2')
        .update({ theme_music: mythMusicValue(file.file, url, new Date().toISOString()) })
        .eq('id', file.myth.id)
      if (error) throw new Error(error.message)
      updated += 1
    } catch (error) {
      blocked += 1
      console.error('[myth-music] ' + file.file + ' 반영 실패', error)
    }
  }

  if (updated > 0) await revalidateWebLists(CACHE_TAGS.FACTIONS)
  return { ok: blocked === 0, updated, skipped, blocked, message: '반영 ' + updated + '곡 · 유지 ' + skipped + '곡 · 확인 필요 ' + blocked + '곡' }
}
