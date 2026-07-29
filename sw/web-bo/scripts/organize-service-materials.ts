/**
 * D:\image\서비스_재료 정리기.
 *
 * 기본은 dry-run이며 `_정리_계획.json`만 작성한다.
 * `--apply`를 붙이면 계획을 다시 계산·검증한 뒤 이동/삭제하고
 * `_정리_매니페스트.json`을 남긴다.
 * `--purge-person-materials`는 R2 반영을 끝낸 뒤 `인물/` 아래의
 * 로컬 재료를 전량 제거하고 검색기·다운로드 폴더만 남긴다.
 *
 * 보존 구조:
 *   인물/<slug>/<slug>__source|cutout|prompt__<dimensions>__<sha12>.<ext>
 *   _미분류/<reason>/...
 *
 * 삭제 대상:
 *   - 현재 R2와 일치하거나 R2에서 대체된 루트 800×800 WebP 출력본
 *   - 명백히 불량/거절본인 `_backup`
 *   - 새 매니페스트로 대체되는 `_목록.txt`
 *   - 동일 인물에 귀속되는 바이트 동일 중복
 */

import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import {
  access,
  copyFile,
  lstat,
  mkdir,
  readFile,
  readdir,
  rename,
  rmdir,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const ROOT = path.resolve('D:\\image\\서비스_재료')
const PEOPLE_DIR = '인물'
const UNRESOLVED_DIR = '_미분류'
const DOWNLOAD_DIR = '_R2_다운로드'
const PLAN_NAME = '_정리_계획.json'
const MANIFEST_NAME = '_정리_매니페스트.json'
const LAUNCHER_NAME = 'R2_아바타_검색기.cmd'
const LEGACY_DIRS = ['_backup', '입력1', '입력2', '입력3', '입력4', '입력5', '입력6', '입력7']
const IMAGE_EXTENSIONS = new Set(['.png', '.webp', '.jpg', '.jpeg'])
const APPLY = process.argv.includes('--apply')
const RESUME = process.argv.includes('--resume')
const VERIFY = process.argv.includes('--verify')
const REPAIR_WINDOWS_PATHS = process.argv.includes('--repair-windows-paths')
const DELETE_LEGACY_VERTICAL = process.argv.includes('--delete-legacy-vertical')
const PURGE_PERSON_MATERIALS = process.argv.includes('--purge-person-materials')

type Profile = {
  id: string
  nickname: string
  nickname_en: string | null
  slug: string | null
  avatar_url: string | null
}

type MatchResult = {
  profile: Profile | null
  candidates: Profile[]
  method: string
}

type ImageInfo = {
  width: number
  height: number
  format: string
  opaque: boolean
}

type AssetAction = 'move' | 'delete' | 'ignore'

type AssetRecord = {
  originalRelativePath: string
  bytes: number
  sha256: string
  extension: string
  kind: 'image' | 'prompt' | 'other'
  width: number | null
  height: number | null
  format: string | null
  opaque: boolean | null
  role: 'source' | 'cutout' | 'prompt' | 'other'
  profileId: string | null
  slug: string | null
  nickname: string | null
  nicknameEn: string | null
  matchMethod: string
  matchCandidates: string[]
  action: AssetAction
  reason: string
  targetRelativePath: string | null
  r2Comparison?: 'exact' | 'different' | 'unavailable'
  r2Sha256?: string
}

type ProfileMaps = {
  profiles: Profile[]
  bySlug: Map<string, Profile>
  byNickname: Map<string, Profile[]>
  byNormalizedName: Map<string, Profile[]>
}

const NAME_ALIASES = new Map<string, string>([
  ['마크주커버그', 'mark-zuckerberg'],
  ['반고흐', 'vincent-van-gogh'],
  ['사토루이와타', 'satoru-iwata'],
  ['선다피차이', 'sundar-pichai'],
  ['아베신조', 'shinzo-abe'],
  ['아키오토요다', 'akio-toyoda'],
  ['어윈슈뢰딩거', 'erwin-schrodinger'],
  ['재키로빈슨', 'jackie-robinson'],
  ['조셀디나', 'zoe-saldana'],
  ['조드카림', 'jawed-karim'],
  ['테레사수녀', 'mother-teresa'],
  ['필리포스', 'philip-ii-of-macedon'],
  ['피터티엘', 'peter-thiel'],
])

function parseEnv(text: string): Record<string, string> {
  const values: Record<string, string> = {}
  for (const rawLine of text.replace(/^\uFEFF/, '').split(/\r?\n/)) {
    let line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    if (line.startsWith('export ')) line = line.slice(7).trimStart()
    const separator = line.indexOf('=')
    if (separator < 1) continue
    const key = line.slice(0, separator).trim()
    let value = line.slice(separator + 1).trim()
    if (
      value.length >= 2
      && ((value.startsWith('"') && value.endsWith('"'))
        || (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1)
    }
    values[key] = value
  }
  return values
}

async function loadConnectionConfig() {
  const envCandidates = [
    path.resolve('.env'),
    path.resolve('sw/web-bo/.env'),
    path.resolve('C:\\project\\feelandnote\\sw\\web-bo\\.env'),
  ]
  let envPath: string | null = null
  for (const candidate of envCandidates) {
    if (await fileExists(candidate)) {
      envPath = candidate
      break
    }
  }
  if (!envPath) throw new Error('sw/web-bo/.env를 찾지 못했습니다.')
  const values = parseEnv(await readFile(envPath, 'utf8'))
  const supabaseUrl = values.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, '')
  const anonKey = values.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const r2PublicUrl = values.R2_PUBLIC_URL?.replace(/\/+$/, '')
  if (!supabaseUrl || !anonKey || !r2PublicUrl) {
    throw new Error('sw/web-bo/.env 공개 Supabase/R2 설정이 부족합니다.')
  }
  return { supabaseUrl, anonKey, r2PublicUrl }
}

function assertInsideRoot(target: string, allowRoot = false) {
  const resolved = path.resolve(target)
  const relative = path.relative(ROOT, resolved)
  if ((!allowRoot && relative === '') || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`서비스_재료 밖 경로를 거부했습니다: ${resolved}`)
  }
}

function toPosix(relativePath: string) {
  return relativePath.split(path.sep).join('/')
}

function fromPosix(relativePath: string) {
  return path.join(...relativePath.split('/'))
}

function normalizeName(value: string) {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\s*\([^)]*\)\s*$/u, '')
    .replace(/_nobg$/iu, '')
    .replace(/[^a-z0-9가-힣]/gu, '')
}

function safeFilePart(value: string) {
  const cleaned = value
    .normalize('NFKC')
    .replace(/[<>:"/\\|?*\u0000-\u001f]/gu, '_')
    .replace(/\s+/gu, ' ')
    .trim()
    .replace(/[. ]+$/gu, '')
  return (cleaned || 'unnamed').slice(0, 140)
}

function canonicalExtension(format: string | null, originalExtension: string) {
  if (format === 'jpeg') return '.jpg'
  if (format === 'png') return '.png'
  if (format === 'webp') return '.webp'
  return originalExtension.toLowerCase()
}

async function fetchAllProfiles(
  config: Awaited<ReturnType<typeof loadConnectionConfig>>,
): Promise<Profile[]> {
  const profiles: Profile[] = []
  const pageSize = 1000
  for (let offset = 0; ; offset += pageSize) {
    const params = new URLSearchParams({
      select: 'id,nickname,nickname_en,slug,avatar_url',
      profile_type: 'eq.CELEB',
      order: 'id.asc',
      limit: String(pageSize),
      offset: String(offset),
    })
    const response = await fetch(`${config.supabaseUrl}/rest/v1/profiles?${params}`, {
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${config.anonKey}`,
      },
    })
    if (!response.ok) {
      throw new Error(`프로필 조회 실패: HTTP ${response.status} ${await response.text()}`)
    }
    const rows = await response.json() as Profile[]
    profiles.push(...rows)
    if (rows.length < pageSize) break
  }
  return profiles
}

function pushMap(map: Map<string, Profile[]>, key: string, profile: Profile) {
  const current = map.get(key)
  if (current) current.push(profile)
  else map.set(key, [profile])
}

function buildProfileMaps(profiles: Profile[]): ProfileMaps {
  const bySlug = new Map<string, Profile>()
  const byNickname = new Map<string, Profile[]>()
  const byNormalizedName = new Map<string, Profile[]>()
  for (const profile of profiles) {
    if (profile.slug) bySlug.set(profile.slug.toLowerCase(), profile)
    pushMap(byNickname, profile.nickname, profile)
    pushMap(byNormalizedName, normalizeName(profile.nickname), profile)
    if (profile.nickname_en) {
      pushMap(byNormalizedName, normalizeName(profile.nickname_en), profile)
    }
  }
  return { profiles, bySlug, byNickname, byNormalizedName }
}

async function walkSourceFiles() {
  const output: string[] = []
  const excludedRootDirs = new Set([PEOPLE_DIR, UNRESOLVED_DIR, DOWNLOAD_DIR])
  const excludedRootFiles = new Set([PLAN_NAME, MANIFEST_NAME, LAUNCHER_NAME])

  async function walk(directory: string, depth: number) {
    const entries = await readdir(directory, { withFileTypes: true })
    for (const entry of entries) {
      if (depth === 0 && entry.isDirectory() && excludedRootDirs.has(entry.name)) continue
      if (depth === 0 && entry.isFile() && excludedRootFiles.has(entry.name)) continue
      const absolutePath = path.join(directory, entry.name)
      assertInsideRoot(absolutePath)
      if (entry.isSymbolicLink()) {
        throw new Error(`심볼릭 링크는 정리하지 않습니다: ${absolutePath}`)
      }
      if (entry.isDirectory()) await walk(absolutePath, depth + 1)
      else if (entry.isFile()) output.push(absolutePath)
    }
  }

  await walk(ROOT, 0)
  return output.sort((a, b) => a.localeCompare(b, 'ko'))
}

async function sha256File(filePath: string) {
  return await new Promise<string>((resolve, reject) => {
    const hash = createHash('sha256')
    const stream = createReadStream(filePath)
    stream.on('data', chunk => hash.update(chunk))
    stream.on('error', reject)
    stream.on('end', () => resolve(hash.digest('hex')))
  })
}

async function imageInfo(filePath: string): Promise<ImageInfo> {
  const instance = sharp(filePath, { failOn: 'none' })
  const metadata = await instance.metadata()
  if (!metadata.width || !metadata.height || !metadata.format) {
    throw new Error('이미지 크기 또는 형식을 읽지 못했습니다.')
  }
  let opaque = !metadata.hasAlpha
  if (metadata.hasAlpha) {
    const stats = await sharp(filePath, { failOn: 'none' }).stats()
    opaque = stats.isOpaque
  }
  return {
    width: metadata.width,
    height: metadata.height,
    format: metadata.format,
    opaque,
  }
}

function findProfile(
  relativePath: string,
  basename: string,
  maps: ProfileMaps,
): MatchResult {
  const firstDirectory = relativePath.includes('/') ? relativePath.split('/')[0] : ''
  const cleanedBase = basename
    .replace(/^prompt-/iu, '')
    .replace(/_nobg$/iu, '')
    .replace(/\s*\([^)]*\)\s*$/u, '')

  if (/^입력[3-7]$/u.test(firstDirectory)) {
    const bySlug = maps.bySlug.get(cleanedBase.toLowerCase())
    if (bySlug) return { profile: bySlug, candidates: [bySlug], method: 'legacy-slug' }
  }

  const directSlug = maps.bySlug.get(cleanedBase.toLowerCase())
  if (directSlug) return { profile: directSlug, candidates: [directSlug], method: 'slug' }

  const exact = maps.byNickname.get(cleanedBase) ?? []
  if (exact.length === 1) return { profile: exact[0], candidates: exact, method: 'nickname' }
  if (exact.length > 1) return { profile: null, candidates: exact, method: 'ambiguous-nickname' }

  const normalized = normalizeName(cleanedBase)
  const aliasSlug = NAME_ALIASES.get(normalized)
  if (aliasSlug) {
    const aliasProfile = maps.bySlug.get(aliasSlug)
    if (aliasProfile) {
      return { profile: aliasProfile, candidates: [aliasProfile], method: 'alias' }
    }
  }

  const normalizedMatches = maps.byNormalizedName.get(normalized) ?? []
  if (normalizedMatches.length === 1) {
    return { profile: normalizedMatches[0], candidates: normalizedMatches, method: 'normalized-name' }
  }
  if (normalizedMatches.length > 1) {
    return { profile: null, candidates: normalizedMatches, method: 'ambiguous-normalized-name' }
  }
  return { profile: null, candidates: [], method: 'unmatched' }
}

async function fetchR2Hash(url: string) {
  try {
    const response = await fetch(url, { redirect: 'follow' })
    if (!response.ok) return null
    const body = Buffer.from(await response.arrayBuffer())
    return createHash('sha256').update(body).digest('hex')
  } catch {
    return null
  }
}

async function mapConcurrent<T, R>(
  values: T[],
  concurrency: number,
  callback: (value: T, index: number) => Promise<R>,
) {
  const results = new Array<R>(values.length)
  let nextIndex = 0
  async function worker() {
    while (true) {
      const index = nextIndex++
      if (index >= values.length) return
      results[index] = await callback(values[index], index)
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, worker))
  return results
}

function unresolvedTarget(
  relativePath: string,
  basename: string,
  extension: string,
  hash: string,
  reason: string,
) {
  const sourceBucket = relativePath.includes('/') ? relativePath.split('/')[0] : '루트'
  return toPosix(path.join(
    UNRESOLVED_DIR,
    safeFilePart(reason),
    `${safeFilePart(sourceBucket)}__${safeFilePart(basename)}__${hash.slice(0, 12)}${extension}`,
  ))
}

async function buildRecord(
  absolutePath: string,
  maps: ProfileMaps,
  config: Awaited<ReturnType<typeof loadConnectionConfig>>,
): Promise<AssetRecord> {
  const relativePath = toPosix(path.relative(ROOT, absolutePath))
  const parsed = path.parse(absolutePath)
  const extension = parsed.ext.toLowerCase()
  const fileStats = await stat(absolutePath)
  const hash = await sha256File(absolutePath)
  const firstDirectory = relativePath.includes('/') ? relativePath.split('/')[0] : ''

  if (firstDirectory === '_backup') {
    return {
      originalRelativePath: relativePath,
      bytes: fileStats.size,
      sha256: hash,
      extension,
      kind: IMAGE_EXTENSIONS.has(extension) ? 'image' : 'other',
      width: null,
      height: null,
      format: null,
      opaque: null,
      role: 'other',
      profileId: null,
      slug: null,
      nickname: null,
      nicknameEn: null,
      matchMethod: 'obsolete-backup',
      matchCandidates: [],
      action: 'delete',
      reason: '명백히 불량하거나 사용자가 거절한 이전 서비스 아바타',
      targetRelativePath: null,
    }
  }

  if (extension === '.txt' && /^_?목록/iu.test(parsed.name)) {
    return {
      originalRelativePath: relativePath,
      bytes: fileStats.size,
      sha256: hash,
      extension,
      kind: 'other',
      width: null,
      height: null,
      format: null,
      opaque: null,
      role: 'other',
      profileId: null,
      slug: null,
      nickname: null,
      nicknameEn: null,
      matchMethod: 'legacy-list',
      matchCandidates: [],
      action: 'delete',
      reason: '새 통합 매니페스트로 대체되는 낡거나 불완전한 입력 목록',
      targetRelativePath: null,
    }
  }

  const isPrompt = extension === '.txt'
  let info: ImageInfo | null = null
  let metadataError: string | null = null
  if (IMAGE_EXTENSIONS.has(extension)) {
    try {
      info = await imageInfo(absolutePath)
    } catch (error) {
      metadataError = error instanceof Error ? error.message : String(error)
    }
  }

  const match = findProfile(relativePath, parsed.name, maps)
  const profile = match.profile
  const role: AssetRecord['role'] = isPrompt
    ? 'prompt'
    : info
      ? info.opaque ? 'source' : 'cutout'
      : 'other'
  const actualExtension = canonicalExtension(info?.format ?? null, extension)

  if (metadataError || (!isPrompt && !info)) {
    return {
      originalRelativePath: relativePath,
      bytes: fileStats.size,
      sha256: hash,
      extension,
      kind: IMAGE_EXTENSIONS.has(extension) ? 'image' : 'other',
      width: null,
      height: null,
      format: null,
      opaque: null,
      role: 'other',
      profileId: profile?.id ?? null,
      slug: profile?.slug ?? null,
      nickname: profile?.nickname ?? null,
      nicknameEn: profile?.nickname_en ?? null,
      matchMethod: match.method,
      matchCandidates: match.candidates.map(candidate => candidate.slug ?? candidate.id),
      action: 'move',
      reason: `이미지 판독 실패: ${metadataError ?? '지원하지 않는 파일'}`,
      targetRelativePath: unresolvedTarget(
        relativePath,
        parsed.name,
        extension,
        hash,
        '손상_또는_기타',
      ),
    }
  }

  const isRootServiceExport = !firstDirectory
    && info?.format === 'webp'
    && info.width === 800
    && info.height === 800

  if (info && isRootServiceExport && profile) {
    const r2Url = `${config.r2PublicUrl}/celebs/${profile.id}/avatar.webp`
    const r2Hash = await fetchR2Hash(r2Url)
    if (r2Hash) {
      return {
        originalRelativePath: relativePath,
        bytes: fileStats.size,
        sha256: hash,
        extension,
        kind: 'image',
        width: info.width,
        height: info.height,
        format: info.format,
        opaque: info.opaque,
        role,
        profileId: profile.id,
        slug: profile.slug,
        nickname: profile.nickname,
        nicknameEn: profile.nickname_en,
        matchMethod: match.method,
        matchCandidates: [profile.slug ?? profile.id],
        action: 'delete',
        reason: r2Hash === hash
          ? 'R2에 동일한 800×800 서비스 완성본이 존재'
          : 'R2의 현재 완성본으로 대체된 로컬 800×800 출력본',
        targetRelativePath: null,
        r2Comparison: r2Hash === hash ? 'exact' : 'different',
        r2Sha256: r2Hash,
      }
    }
  }

  if (!profile || !profile.slug) {
    const reason = match.candidates.length > 1 ? '동명이인_판단필요' : 'DB_인물_매칭실패'
    return {
      originalRelativePath: relativePath,
      bytes: fileStats.size,
      sha256: hash,
      extension,
      kind: isPrompt ? 'prompt' : 'image',
      width: info?.width ?? null,
      height: info?.height ?? null,
      format: info?.format ?? null,
      opaque: info?.opaque ?? null,
      role,
      profileId: null,
      slug: null,
      nickname: null,
      nicknameEn: null,
      matchMethod: match.method,
      matchCandidates: match.candidates.map(candidate => candidate.slug ?? candidate.id),
      action: 'move',
      reason,
      targetRelativePath: unresolvedTarget(
        relativePath,
        parsed.name,
        actualExtension,
        hash,
        reason,
      ),
    }
  }

  const dimensions = info ? `${info.width}x${info.height}` : 'text'
  const fileSystemSlug = safeFilePart(profile.slug)
  const targetName = `${fileSystemSlug}__${role}__${dimensions}__${hash.slice(0, 12)}${actualExtension}`
  return {
    originalRelativePath: relativePath,
    bytes: fileStats.size,
    sha256: hash,
    extension,
    kind: isPrompt ? 'prompt' : 'image',
    width: info?.width ?? null,
    height: info?.height ?? null,
    format: info?.format ?? null,
    opaque: info?.opaque ?? null,
    role,
    profileId: profile.id,
    slug: profile.slug,
    nickname: profile.nickname,
    nicknameEn: profile.nickname_en,
    matchMethod: match.method,
    matchCandidates: [profile.slug],
    action: 'move',
    reason: '인물별 표준 경로로 보존',
    targetRelativePath: toPosix(path.join(PEOPLE_DIR, fileSystemSlug, targetName)),
  }
}

function deduplicateSameProfile(records: AssetRecord[]) {
  const groups = new Map<string, AssetRecord[]>()
  for (const record of records) {
    if (record.action !== 'move' || !record.profileId) continue
    const key = `${record.profileId}:${record.sha256}`
    const group = groups.get(key)
    if (group) group.push(record)
    else groups.set(key, [record])
  }
  for (const group of groups.values()) {
    if (group.length < 2) continue
    group.sort((a, b) => a.originalRelativePath.localeCompare(b.originalRelativePath, 'ko'))
    for (const duplicate of group.slice(1)) {
      duplicate.action = 'delete'
      duplicate.reason = `동일 인물의 바이트 동일 중복; 보존본=${group[0].originalRelativePath}`
      duplicate.targetRelativePath = null
    }
  }
}

function findCrossProfileDuplicates(records: AssetRecord[]) {
  const groups = new Map<string, AssetRecord[]>()
  for (const record of records) {
    if (!record.profileId || record.action === 'delete') continue
    const group = groups.get(record.sha256)
    if (group) group.push(record)
    else groups.set(record.sha256, [record])
  }
  return [...groups.entries()]
    .filter(([, group]) => new Set(group.map(record => record.profileId)).size > 1)
    .map(([sha256, group]) => ({
      sha256,
      files: group.map(record => ({
        path: record.originalRelativePath,
        slug: record.slug,
        nickname: record.nickname,
      })),
    }))
}

function summarize(records: AssetRecord[]) {
  const byAction = { move: 0, delete: 0, ignore: 0 }
  const deleteReasons = new Map<string, number>()
  let bytesToDelete = 0
  let unresolved = 0
  for (const record of records) {
    byAction[record.action]++
    if (record.action === 'delete') {
      bytesToDelete += record.bytes
      deleteReasons.set(record.reason, (deleteReasons.get(record.reason) ?? 0) + 1)
    }
    if (record.targetRelativePath?.startsWith(`${UNRESOLVED_DIR}/`)) unresolved++
  }
  return {
    totalFiles: records.length,
    byAction,
    bytesToDelete,
    megabytesToDelete: Math.round(bytesToDelete / 1024 / 1024 * 10) / 10,
    unresolved,
    deleteReasons: Object.fromEntries([...deleteReasons].sort((a, b) => b[1] - a[1])),
  }
}

async function fileExists(filePath: string) {
  try {
    await access(filePath)
    return true
  } catch {
    return false
  }
}

async function verifyUnchanged(record: AssetRecord) {
  const source = path.join(ROOT, fromPosix(record.originalRelativePath))
  assertInsideRoot(source)
  const currentStats = await stat(source)
  if (currentStats.size !== record.bytes) {
    throw new Error(`계획 뒤 크기가 바뀐 파일: ${record.originalRelativePath}`)
  }
  const currentHash = await sha256File(source)
  if (currentHash !== record.sha256) {
    throw new Error(`계획 뒤 내용이 바뀐 파일: ${record.originalRelativePath}`)
  }
  return source
}

function isFileSystemError(error: unknown, codes: string[]) {
  return error instanceof Error
    && 'code' in error
    && typeof error.code === 'string'
    && codes.includes(error.code)
}

async function moveWithRetry(source: string, destination: string) {
  for (let attempt = 1; attempt <= 12; attempt++) {
    try {
      await rename(source, destination)
      return
    } catch (error) {
      if (!isFileSystemError(error, ['EBUSY', 'EPERM', 'EACCES']) || attempt === 12) {
        throw error
      }
      await new Promise(resolve => setTimeout(resolve, attempt * 250))
    }
  }
}

async function applyRecords(records: AssetRecord[]) {
  const moveRecords = records.filter(record => record.action === 'move')
  const deleteRecords = records.filter(record => record.action === 'delete')

  for (let index = 0; index < moveRecords.length; index++) {
    const record = moveRecords[index]
    if (!record.targetRelativePath) throw new Error('이동 대상 경로가 없습니다.')
    const source = path.join(ROOT, fromPosix(record.originalRelativePath))
    const destination = path.join(ROOT, fromPosix(record.targetRelativePath))
    assertInsideRoot(source)
    assertInsideRoot(destination)
    await mkdir(path.dirname(destination), { recursive: true })

    if (!(await fileExists(source))) {
      if (!(await fileExists(destination))) {
        throw new Error(`원본과 이동 대상이 모두 없습니다: ${record.originalRelativePath}`)
      }
      const destinationHash = await sha256File(destination)
      if (destinationHash !== record.sha256) {
        throw new Error(`이미 이동된 파일 해시가 다릅니다: ${record.targetRelativePath}`)
      }
      continue
    }

    await verifyUnchanged(record)
    if (await fileExists(destination)) {
      const destinationHash = await sha256File(destination)
      if (destinationHash !== record.sha256) {
        throw new Error(`해시 접두사 충돌 또는 기존 파일 충돌: ${record.targetRelativePath}`)
      }
      await rm(source)
    } else {
      try {
        await moveWithRetry(source, destination)
      } catch (error) {
        // 일부 Windows 미리보기/인덱서 잠금은 rename만 막고 읽기는 허용한다.
        // 복사본 해시를 검증한 뒤 원본 삭제를 재시도하면 데이터 유실 없이 회수 가능하다.
        if (!isFileSystemError(error, ['EBUSY', 'EPERM', 'EACCES'])) throw error
        await copyFile(source, destination, 1)
        const destinationHash = await sha256File(destination)
        if (destinationHash !== record.sha256) {
          await rm(destination)
          throw new Error(`잠금 파일 복사 검증 실패: ${record.originalRelativePath}`)
        }
        await rm(source)
      }
    }
    if ((index + 1) % 100 === 0 || index + 1 === moveRecords.length) {
      console.log(`이동 ${index + 1}/${moveRecords.length}`)
    }
  }

  for (let index = 0; index < deleteRecords.length; index++) {
    const record = deleteRecords[index]
    const expectedSource = path.join(ROOT, fromPosix(record.originalRelativePath))
    assertInsideRoot(expectedSource)
    if (!(await fileExists(expectedSource))) continue
    const source = await verifyUnchanged(record)
    await rm(source)
    if ((index + 1) % 50 === 0 || index + 1 === deleteRecords.length) {
      console.log(`삭제 ${index + 1}/${deleteRecords.length}`)
    }
  }

  async function removeEmptyTree(directory: string) {
    assertInsideRoot(directory)
    if (!(await fileExists(directory))) return
    const entries = await readdir(directory, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.isSymbolicLink()) continue
      await removeEmptyTree(path.join(directory, entry.name))
    }
    const remaining = await readdir(directory)
    if (remaining.length === 0) await rmdir(directory)
  }

  for (const directoryName of LEGACY_DIRS) {
    await removeEmptyTree(path.join(ROOT, directoryName))
  }
}

async function verifyAppliedManifest() {
  const manifestPath = path.join(ROOT, MANIFEST_NAME)
  assertInsideRoot(manifestPath)
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as {
    root: string
    records: AssetRecord[]
  }
  if (path.resolve(manifest.root) !== ROOT || !Array.isArray(manifest.records)) {
    throw new Error('완료 매니페스트의 루트 또는 레코드가 올바르지 않습니다.')
  }

  const failures = await mapConcurrent(manifest.records, 8, async (record, index) => {
    let failure: string | null = null
    if (record.action === 'move') {
      if (!record.targetRelativePath) {
        failure = `이동 대상 누락: ${record.originalRelativePath}`
      } else {
        const target = path.join(ROOT, fromPosix(record.targetRelativePath))
        assertInsideRoot(target)
        if (!(await fileExists(target))) {
          failure = `보존 파일 없음: ${record.targetRelativePath}`
        } else {
          const targetHash = await sha256File(target)
          if (targetHash !== record.sha256) failure = `보존 파일 해시 불일치: ${record.targetRelativePath}`
        }
      }
    } else if (record.action === 'delete') {
      const oldPath = path.join(ROOT, fromPosix(record.originalRelativePath))
      assertInsideRoot(oldPath)
      if (await fileExists(oldPath)) failure = `삭제 대상 잔존: ${record.originalRelativePath}`
    }
    if ((index + 1) % 200 === 0 || index + 1 === manifest.records.length) {
      console.log(`검증 ${index + 1}/${manifest.records.length}`)
    }
    return failure
  })

  const legacyDirectories = []
  for (const directoryName of LEGACY_DIRS) {
    if (await fileExists(path.join(ROOT, directoryName))) legacyDirectories.push(directoryName)
  }
  const rootEntries = await readdir(ROOT, { withFileTypes: true })
  const rootImages = rootEntries
    .filter(entry => entry.isFile() && IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase()))
    .map(entry => entry.name)
  const errors = failures.filter((failure): failure is string => Boolean(failure))
  if (legacyDirectories.length) errors.push(`구형 폴더 잔존: ${legacyDirectories.join(', ')}`)
  if (rootImages.length) errors.push(`루트 이미지 잔존: ${rootImages.join(', ')}`)

  const report = {
    records: manifest.records.length,
    kept: manifest.records.filter(record => record.action === 'move').length,
    deleted: manifest.records.filter(record => record.action === 'delete').length,
    legacyDirectories,
    rootImages,
    errors,
    ok: errors.length === 0,
  }
  console.log(JSON.stringify(report, null, 2))
  if (!report.ok) process.exitCode = 1
}

async function deleteLegacyVerticalAssets() {
  const manifestPath = path.join(ROOT, MANIFEST_NAME)
  assertInsideRoot(manifestPath)
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as {
    records: AssetRecord[]
    summary?: ReturnType<typeof summarize>
    [key: string]: unknown
  }
  if (!Array.isArray(manifest.records)) throw new Error('완료 매니페스트 레코드가 없습니다.')

  const targets = manifest.records.filter(record =>
    record.action === 'move'
    && record.width === 675
    && record.height === 1200
    && record.targetRelativePath,
  )
  let deletedBytes = 0
  const parentDirectories = new Set<string>()
  for (let index = 0; index < targets.length; index++) {
    const record = targets[index]
    const relativePath = record.targetRelativePath!
    const target = path.join(ROOT, fromPosix(relativePath))
    assertInsideRoot(target)
    if (!(await fileExists(target))) throw new Error(`세로 파생본이 없습니다: ${relativePath}`)
    const targetHash = await sha256File(target)
    if (targetHash !== record.sha256) throw new Error(`세로 파생본 해시 불일치: ${relativePath}`)
    await rm(target)
    deletedBytes += record.bytes
    parentDirectories.add(path.dirname(target))
    if ((index + 1) % 100 === 0 || index + 1 === targets.length) {
      console.log(`구형 세로 파생본 삭제 ${index + 1}/${targets.length}`)
    }
  }

  const protectedDirectories = new Set([
    ROOT.toLowerCase(),
    path.join(ROOT, PEOPLE_DIR).toLowerCase(),
    path.join(ROOT, UNRESOLVED_DIR).toLowerCase(),
    path.join(ROOT, DOWNLOAD_DIR).toLowerCase(),
  ])
  const sortedParents = [...parentDirectories].sort((a, b) => b.length - a.length)
  for (const startingDirectory of sortedParents) {
    let current = startingDirectory
    while (!protectedDirectories.has(current.toLowerCase())) {
      assertInsideRoot(current)
      if (!(await fileExists(current))) break
      const remaining = await readdir(current)
      if (remaining.length > 0) break
      await rmdir(current)
      current = path.dirname(current)
    }
  }

  const removed = new Set(targets)
  manifest.records = manifest.records.filter(record => !removed.has(record))
  manifest.summary = summarize(manifest.records)
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
  console.log(JSON.stringify({
    deletedFiles: targets.length,
    deletedBytes,
    deletedMegabytes: Math.round(deletedBytes / 1024 / 1024 * 10) / 10,
  }, null, 2))
}

async function repairWindowsUnsafeSlugs() {
  const manifestPath = path.join(ROOT, MANIFEST_NAME)
  assertInsideRoot(manifestPath)
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as {
    records: AssetRecord[]
    windowsPathRepairs?: Array<{ slug: string; fileSystemSlug: string; files: number }>
    [key: string]: unknown
  }
  if (!Array.isArray(manifest.records)) throw new Error('완료 매니페스트 레코드가 없습니다.')

  const groups = new Map<string, AssetRecord[]>()
  for (const record of manifest.records) {
    if (record.action !== 'move' || !record.slug || !record.targetRelativePath) continue
    const fileSystemSlug = safeFilePart(record.slug)
    if (fileSystemSlug === record.slug) continue
    const group = groups.get(record.slug)
    if (group) group.push(record)
    else groups.set(record.slug, [record])
  }

  const repairs: Array<{ slug: string; fileSystemSlug: string; files: number }> = []
  const peoplePath = path.join(ROOT, PEOPLE_DIR)
  assertInsideRoot(peoplePath)
  for (const [slug, records] of groups) {
    const fileSystemSlug = safeFilePart(slug)
    const entries = await readdir(peoplePath, { withFileTypes: true })
    const unsafeEntry = entries.find(entry => entry.isDirectory() && entry.name === slug)
    const safeDirectory = path.join(peoplePath, fileSystemSlug)
    assertInsideRoot(safeDirectory)

    if (unsafeEntry) {
      const unsafeDirectory = path.join(peoplePath, unsafeEntry.name)
      const temporaryDirectory = path.join(
        peoplePath,
        `${fileSystemSlug}__windows-path-fix-${Date.now()}`,
      )
      assertInsideRoot(unsafeDirectory)
      assertInsideRoot(temporaryDirectory)
      await rename(unsafeDirectory, temporaryDirectory)
      await rename(temporaryDirectory, safeDirectory)
    } else if (!(await fileExists(safeDirectory))) {
      throw new Error(`Windows 경로 교정 대상 폴더가 없습니다: ${slug}`)
    }

    for (const record of records) {
      const oldName = path.basename(fromPosix(record.targetRelativePath!))
      const newName = oldName.startsWith(`${slug}__`)
        ? `${fileSystemSlug}${oldName.slice(slug.length)}`
        : oldName
      const currentFile = path.join(safeDirectory, oldName)
      const newFile = path.join(safeDirectory, newName)
      assertInsideRoot(currentFile)
      assertInsideRoot(newFile)
      if (currentFile !== newFile && await fileExists(currentFile)) {
        await rename(currentFile, newFile)
      }
      record.targetRelativePath = toPosix(path.join(PEOPLE_DIR, fileSystemSlug, newName))
    }
    repairs.push({ slug, fileSystemSlug, files: records.length })
  }

  manifest.windowsPathRepairs = repairs
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
  console.log(JSON.stringify({ repaired: repairs }, null, 2))
}

async function purgePersonMaterials() {
  const peoplePath = path.join(ROOT, PEOPLE_DIR)
  assertInsideRoot(peoplePath)
  const peopleStats = await lstat(peoplePath)
  if (!peopleStats.isDirectory() || peopleStats.isSymbolicLink()) {
    throw new Error(`예상한 실제 인물 디렉터리가 아닙니다: ${peoplePath}`)
  }

  let deletedFiles = 0
  let deletedDirectories = 0
  let deletedBytes = 0

  async function purgeDirectory(directory: string, removeDirectory: boolean) {
    assertInsideRoot(directory)
    const entries = await readdir(directory, { withFileTypes: true })
    for (const entry of entries) {
      const target = path.join(directory, entry.name)
      assertInsideRoot(target)
      if (entry.isSymbolicLink()) {
        throw new Error(`심볼릭 링크는 정리하지 않습니다: ${target}`)
      }
      if (entry.isDirectory()) {
        await purgeDirectory(target, true)
        continue
      }
      if (!entry.isFile()) {
        throw new Error(`지원하지 않는 파일 종류입니다: ${target}`)
      }
      const fileStats = await stat(target)
      await rm(target)
      deletedFiles++
      deletedBytes += fileStats.size
    }
    if (removeDirectory) {
      await rmdir(directory)
      deletedDirectories++
    }
  }

  await purgeDirectory(peoplePath, false)

  for (const generatedIndex of [MANIFEST_NAME, PLAN_NAME]) {
    const generatedPath = path.join(ROOT, generatedIndex)
    assertInsideRoot(generatedPath)
    if (await fileExists(generatedPath)) await rm(generatedPath)
  }

  console.log(JSON.stringify({
    peoplePath,
    deletedFiles,
    deletedDirectories,
    deletedBytes,
    deletedGigabytes: Math.round(deletedBytes / 1024 / 1024 / 1024 * 1000) / 1000,
    preserved: [
      path.join(ROOT, LAUNCHER_NAME),
      path.join(ROOT, DOWNLOAD_DIR),
    ],
  }, null, 2))
}

async function main() {
  const rootStats = await lstat(ROOT)
  if (!rootStats.isDirectory() || rootStats.isSymbolicLink()) {
    throw new Error(`예상한 실제 디렉터리가 아닙니다: ${ROOT}`)
  }
  assertInsideRoot(ROOT, true)

  if (PURGE_PERSON_MATERIALS) {
    await purgePersonMaterials()
    return
  }

  if (DELETE_LEGACY_VERTICAL) {
    await deleteLegacyVerticalAssets()
    return
  }

  if (REPAIR_WINDOWS_PATHS) {
    await repairWindowsUnsafeSlugs()
    return
  }

  if (VERIFY) {
    await verifyAppliedManifest()
    return
  }

  const planPath = path.join(ROOT, PLAN_NAME)
  assertInsideRoot(planPath)
  if (RESUME) {
    if (!APPLY) throw new Error('--resume은 --apply와 함께 사용해야 합니다.')
    const report = JSON.parse(await readFile(planPath, 'utf8')) as {
      root: string
      records: AssetRecord[]
      [key: string]: unknown
    }
    if (path.resolve(report.root) !== ROOT || !Array.isArray(report.records)) {
      throw new Error('재개 계획의 루트 또는 레코드가 올바르지 않습니다.')
    }
    console.log(`기존 계획 재개: ${report.records.length}개`)
    await applyRecords(report.records)
    const manifest = {
      ...report,
      mode: 'applied',
      appliedAt: new Date().toISOString(),
      resumed: true,
    }
    const manifestPath = path.join(ROOT, MANIFEST_NAME)
    assertInsideRoot(manifestPath)
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
    await rm(planPath)
    console.log(`완료 매니페스트: ${manifestPath}`)
    return
  }

  const config = await loadConnectionConfig()
  console.log('CELEB 프로필 전수 조회...')
  const profiles = await fetchAllProfiles(config)
  const maps = buildProfileMaps(profiles)
  console.log(`프로필 ${profiles.length}명`)

  const files = await walkSourceFiles()
  console.log(`분류 대상 ${files.length}개`)
  const records = await mapConcurrent(files, 8, async (filePath, index) => {
    const record = await buildRecord(filePath, maps, config)
    if ((index + 1) % 100 === 0 || index + 1 === files.length) {
      console.log(`분석 ${index + 1}/${files.length}`)
    }
    return record
  })

  deduplicateSameProfile(records)
  const crossProfileDuplicates = findCrossProfileDuplicates(records)
  const summary = summarize(records)
  const report = {
    version: 1,
    mode: APPLY ? 'apply' : 'dry-run',
    generatedAt: new Date().toISOString(),
    root: ROOT,
    policy: {
      finalServiceAsset: 'R2 celebs/{id}/avatar.webp',
      localRoles: ['source', 'cutout', 'prompt'],
      canonicalPattern: '인물/<slug>/<slug>__<role>__<dimensions>__<sha12>.<ext>',
      serviceExports: 'R2 대조 후 로컬 삭제',
      unresolved: '_미분류로 보존',
    },
    summary,
    crossProfileDuplicates,
    records,
  }

  await writeFile(planPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  console.log(JSON.stringify(summary, null, 2))
  console.log(`계획: ${planPath}`)

  if (!APPLY) return

  await applyRecords(records)
  const manifest = {
    ...report,
    mode: 'applied',
    appliedAt: new Date().toISOString(),
  }
  const manifestPath = path.join(ROOT, MANIFEST_NAME)
  assertInsideRoot(manifestPath)
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
  await rm(planPath)
  console.log(`완료 매니페스트: ${manifestPath}`)
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
