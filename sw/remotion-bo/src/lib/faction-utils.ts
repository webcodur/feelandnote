/**
 * 세력도(Faction) 데이터·이미지 IO — 서버 전용.
 *
 * 데이터는 sw/remotion/public/factions/{name}/faction-data.json (한국어 + 영문 *En 병기),
 * 이미지는 sw/remotion/public/factions/{name}/images/ 에 둔다.
 * BookRecommend(episodes/)와 완전히 분리된 경로다.
 *
 * 폴더 스캔·사진 정리·음원 목록·진행 상태·노출 목록은 담화(discourses/)와 규칙이 같아 `episode-store.ts` 로 뽑았다.
 * 아래 faction* 함수들은 뿌리 디렉토리만 채워 넘기는 얇은 껍데기이고, 실제 동작은 그쪽 한 곳에만 있다.
 */

import { readFile, readdir, writeFile, mkdir, rm } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import type { FactionScript, FactionEpisodeListItem, FactionStatus, FactionCardFields, FactionGroupCardFields, FactionCardsFile } from './faction-types'
import {
  FACTIONS_DIR,
  MEDIA_RE,
  safeFilename,
  safeDirName,
  episodeDirOf,
  imagesDirOf,
  saveImage,
  listEpisodeDirs,
  listVoices,
  voiceDirOf,
  readStatus,
  writeStatus,
} from './episode-store'

export { FACTIONS_DIR }

const REMOTION_ROOT = path.join(process.cwd(), '..', 'remotion')
export const MUSIC_DIR = path.join(REMOTION_ROOT, 'public', 'music')
const SFX_DIR = path.join(REMOTION_ROOT, 'public', 'common', 'sfx')

function dataPath(name: string): string {
  return path.join(FACTIONS_DIR, safeDirName(name), 'faction-data.json')
}

function imagesDir(name: string): string {
  return imagesDirOf(FACTIONS_DIR, name)
}

/* ── 진행 상태 ── */

/** 세력도 진행 상태 저장 */
export function writeFactionStatus(name: string, status: FactionStatus): Promise<void> {
  return writeStatus(FACTIONS_DIR, name, status)
}

/* ── 에피소드 ── */

export async function listFactionEpisodes(): Promise<FactionEpisodeListItem[]> {
  const items: FactionEpisodeListItem[] = []
  for (const id of await listEpisodeDirs(FACTIONS_DIR)) {
    const fp = dataPath(id)
    if (!existsSync(fp)) continue
    try {
      const data = JSON.parse(await readFile(fp, 'utf-8')) as FactionScript
      // 인물은 항상 그룹(clusters) 안에 담긴다 — 그룹별 인원을 합산한다.
      const personCount = (data.groups ?? []).reduce(
        (s, g) => s + (g.clusters ?? []).reduce((x, c) => x + (c.people?.length ?? 0), 0),
        0,
      )
      items.push({
        id,
        title: data.title ?? id,
        groupCount: data.groups?.length ?? 0,
        personCount,
        hasMusic: !!data.music,
        status: await readStatus(FACTIONS_DIR, id),
      })
    } catch { /* 손상 파일 건너뜀 */ }
  }
  return items
}

export async function loadFactionEpisode(name: string): Promise<FactionScript> {
  const raw = await readFile(dataPath(name), 'utf-8')
  return JSON.parse(raw) as FactionScript
}

export async function saveFactionEpisode(name: string, data: FactionScript): Promise<void> {
  const fp = dataPath(name)
  await mkdir(path.dirname(fp), { recursive: true })
  await writeFile(fp, JSON.stringify(data, null, 2) + '\n', 'utf-8')
}

export async function createFactionEpisode(name: string, init: Partial<FactionScript>): Promise<FactionScript> {
  const safe = safeDirName(name)
  if (!safe) throw new Error('invalid episode name')
  if (existsSync(dataPath(safe))) throw new Error('episode already exists')
  const data: FactionScript = {
    title: init.title?.trim() || safe,
    music: init.music,
    groups: init.groups ?? [],
  }
  await saveFactionEpisode(safe, data)
  await writeFactionStatus(safe, 'todo')
  return data
}

export async function deleteFactionEpisode(name: string): Promise<void> {
  await rm(path.join(FACTIONS_DIR, safeDirName(name)), { recursive: true, force: true })
}

export async function duplicateFactionEpisode(src: string, dst: string): Promise<FactionScript> {
  const safeDst = safeDirName(dst)
  if (existsSync(dataPath(safeDst))) throw new Error('target episode already exists')
  const data = await loadFactionEpisode(src)
  await saveFactionEpisode(safeDst, data)
  // 이미지도 복사
  const srcImg = imagesDir(src)
  if (existsSync(srcImg)) {
    const dstImg = imagesDir(safeDst)
    await mkdir(dstImg, { recursive: true })
    for (const f of await readdir(srcImg)) {
      if (!MEDIA_RE.test(f)) continue
      await writeFile(path.join(dstImg, f), await readFile(path.join(srcImg, f)))
    }
  }
  return data
}

/* ── 이미지 ── */

/**
 * 인물 사진 저장 — 세력도 아바타 창구(api/[series]/faction-avatar)만 쓴다.
 * 목록·삭제·폴더 정리는 시리즈 공용 창구(api/[series]/media)가 episode-store 를 직접 부른다.
 */
export const saveFactionImage = (name: string, filename: string, buf: Buffer) =>
  saveImage(FACTIONS_DIR, name, filename, buf)

/* ── 음성 (인물 대사 TTS) ── */

/** 에피소드 음성 디렉토리 — public/factions/{name}/voice/ */
export function factionVoiceDir(name: string): string {
  return voiceDirOf(FACTIONS_DIR, name)
}

/** 음성 파일 절대경로 — basename으로 경로 이탈 차단 */
export function factionVoiceFilePath(name: string, file: string): string {
  return path.join(factionVoiceDir(name), safeFilename(file))
}

/** 에피소드 voice/ 디렉토리의 인물 대사 wav 목록 (이름·크기·길이) */
export function listFactionVoices(name: string) {
  return listVoices(FACTIONS_DIR, name)
}

/* ── 댓글 (편별 해설 텍스트) ── */

/** 편별 댓글 파일 경로 — public/factions/{name}/comment.p<part>.txt. part 는 정수로 강제해 경로 이탈 차단 */
function commentPath(name: string, part: number): string {
  const p = Math.max(0, Math.floor(Number(part) || 0))
  return path.join(episodeDirOf(FACTIONS_DIR, name), `comment.p${p}.txt`)
}

/** 편별 댓글 읽기 — 파일 없으면 빈 문자열 */
export async function readFactionComment(name: string, part: number): Promise<string> {
  try { return await readFile(commentPath(name, part), 'utf-8') }
  catch { return '' }
}

/** 편별 댓글 저장 — 내용이 비면 파일 삭제 */
export async function writeFactionComment(name: string, part: number, text: string): Promise<void> {
  const fp = commentPath(name, part)
  if (!text.trim()) { await rm(fp, { force: true }); return }
  await mkdir(path.dirname(fp), { recursive: true })
  await writeFile(fp, text, 'utf-8')
}

/* ── 음악 ── */

async function listMusic(): Promise<string[]> {
  try { return (await readdir(MUSIC_DIR)).filter(f => /\.(mp3|wav|m4a|ogg)$/i.test(f)).sort() }
  catch { return [] }
}

/**
 * 음악 파일 목록 + 각 곡이 어느 세력에 연결됐는지 집계.
 * 활성 세력(_episodes.json 등록분)의 faction-data.json을 훑어,
 * 값이 실재 음원 파일명과 일치하는 모든 위치(공통 곡·편별·startSfx 등)를 필드 불문 수집한다.
 */
export async function listMusicWithUsage(): Promise<{ files: string[]; usage: Record<string, string[]> }> {
  const files = await listMusic()
  const fileSet = new Set(files)
  const usage: Record<string, string[]> = {}

  // 등록 목록(_episodes.json)에 없는 비활성 세력은 listEpisodeDirs 가 이미 걸러낸다
  for (const id of await listEpisodeDirs(FACTIONS_DIR)) {
    const fp = dataPath(id)
    if (!existsSync(fp)) continue
    let data: unknown
    try { data = JSON.parse(await readFile(fp, 'utf-8')) } catch { continue }
    const title = (data as FactionScript)?.title ?? id

    const hits = new Set<string>()
    const walk = (v: unknown) => {
      if (typeof v === 'string') { if (fileSet.has(v)) hits.add(v); return }
      if (Array.isArray(v)) { v.forEach(walk); return }
      if (v && typeof v === 'object') for (const k in v as Record<string, unknown>) walk((v as Record<string, unknown>)[k])
    }
    walk(data)
    for (const f of hits) (usage[f] ??= []).push(title)
  }
  return { files, usage }
}

/** 효과음(SFX) 파일 목록 — public/common/sfx/ (시리즈 공통) */
export async function listSfx(): Promise<string[]> {
  try { return (await readdir(SFX_DIR)).filter(f => /\.(mp3|wav|m4a|ogg)$/i.test(f)).sort() }
  catch { return [] }
}

/* ── 팩션 인물 카드 대본 (person-cards/<person>.json) ── */

function cardsPath(name: string): string {
  return path.join(FACTIONS_DIR, safeDirName(name), 'faction-cards.json')
}

function cardsDirPath(name: string): string {
  return path.join(FACTIONS_DIR, safeDirName(name), 'person-cards')
}

function groupCardsDirPath(name: string): string {
  return path.join(FACTIONS_DIR, safeDirName(name), 'group-cards')
}

function legacyCardsDirPath(name: string): string {
  return path.join(FACTIONS_DIR, safeDirName(name), 'faction-cards')
}

function safePersonCardFilename(personName: string): string {
  const safe = personName
    .trim()
    .normalize('NFKC')
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
    .replace(/[. ]+$/g, '')
  return `${safe || 'person'}.json`
}

type SplitFactionCardFile =
  | { personName?: string; card?: Partial<FactionCardFields> }
  | (Partial<FactionCardFields> & { personName?: string })

function splitCardPayload(raw: SplitFactionCardFile): { personName?: string; card: Partial<FactionCardFields> } {
  const personName = typeof raw.personName === 'string' ? raw.personName : undefined
  if ('card' in raw && raw.card && typeof raw.card === 'object' && !Array.isArray(raw.card)) {
    return { personName, card: raw.card }
  }
  const { personName: _personName, ...card } = raw as Partial<FactionCardFields> & { personName?: string }
  return { personName, card }
}

async function loadSplitFactionCards(name: string): Promise<FactionCardsFile | null> {
  const preferredDir = cardsDirPath(name)
  const dir = existsSync(preferredDir) ? preferredDir : legacyCardsDirPath(name)
  const gDir = groupCardsDirPath(name)
  
  if (!existsSync(dir) && !existsSync(gDir)) return null

  const people: NonNullable<FactionCardsFile['people']> = {}
  if (existsSync(dir)) {
    const files = (await readdir(dir)).filter(f => f.endsWith('.json')).sort((a, b) => a.localeCompare(b, 'ko-KR'))
    for (const file of files) {
      const raw = JSON.parse(await readFile(path.join(dir, file), 'utf-8')) as SplitFactionCardFile
      const { personName, card } = splitCardPayload(raw)
      const nameFromFile = path.basename(file, '.json')
      people[personName || nameFromFile] = card
    }
  }

  const groups: NonNullable<FactionCardsFile['groups']> = {}
  if (existsSync(gDir)) {
    const files = (await readdir(gDir)).filter(f => f.endsWith('.json')).sort((a, b) => a.localeCompare(b, 'ko-KR'))
    for (const file of files) {
      const raw = JSON.parse(await readFile(path.join(gDir, file), 'utf-8')) as any
      // Group cards will save under { groupName, card }
      const groupName = typeof raw.groupName === 'string' ? raw.groupName : path.basename(file, '.json')
      const card = raw.card || raw
      // omit groupName from card just in case
      const { groupName: _omit, ...rest } = card
      groups[groupName] = rest
    }
  }

  if (Object.keys(people).length === 0 && Object.keys(groups).length === 0) return { people: {}, groups: {} }
  return { people, groups }
}

async function writeJsonIfChanged(file: string, value: unknown): Promise<void> {
  const text = `${JSON.stringify(value, null, 2)}\n`
  try {
    if ((await readFile(file, 'utf-8')) === text) return
  } catch {
    // New file.
  }
  await writeFile(file, text, 'utf-8')
}

async function personCardPath(name: string, personName: string): Promise<string> {
  const dir = cardsDirPath(name)
  const files = await readdir(dir).catch(() => [])
  const fallbackFilename = safePersonCardFilename(personName)
  const used = new Set(files.filter(f => f.endsWith('.json')).map(f => f.toLocaleLowerCase('ko-KR')))

  for (const file of files) {
    if (!file.endsWith('.json')) continue
    try {
      const raw = JSON.parse(await readFile(path.join(dir, file), 'utf-8')) as SplitFactionCardFile
      const { personName: existingName } = splitCardPayload(raw)
      if ((existingName || path.basename(file, '.json')) === personName) return path.join(dir, file)
    } catch {
      // Ignore malformed card files while choosing a save target.
    }
  }

  if (!used.has(fallbackFilename.toLocaleLowerCase('ko-KR'))) return path.join(dir, fallbackFilename)

  const base = path.basename(fallbackFilename, '.json')
  let index = 2
  let filename = `${base}-${index}.json`
  while (used.has(filename.toLocaleLowerCase('ko-KR'))) {
    index += 1
    filename = `${base}-${index}.json`
  }
  return path.join(dir, filename)
}

function removeUndefinedCardFields(card: Partial<FactionCardFields>): Partial<FactionCardFields> {
  return Object.fromEntries(Object.entries(card).filter(([, value]) => value !== undefined)) as Partial<FactionCardFields>
}

/** 에피소드 카드 대본 읽기 — 새 인물별 폴더 우선, 없으면 예전 통합 파일을 호환 로드 */
export async function loadFactionCards(name: string): Promise<FactionCardsFile> {
  const split = await loadSplitFactionCards(name)
  if (split) return split
  try {
    return JSON.parse(await readFile(cardsPath(name), 'utf-8')) as FactionCardsFile
  } catch {
    return { people: {}, groups: {} }
  }
}

/** 인물 하나의 카드 대본 저장 — person-cards/<인물>.json 하나만 기록 */
export async function saveFactionCardPerson(name: string, personName: string, card: Partial<FactionCardFields>): Promise<void> {
  const cleanName = personName.trim()
  if (!cleanName) throw new Error('personName is required')

  const dir = cardsDirPath(name)
  await mkdir(dir, { recursive: true })
  const file = await personCardPath(name, cleanName)
  const cleanCard = removeUndefinedCardFields(card)
  if (!Object.keys(cleanCard).length) {
    await rm(file, { force: true })
    return
  }
  await writeJsonIfChanged(file, { personName: cleanName, card: cleanCard })
}

/** 그룹 하나의 카드 대본 저장 — group-cards/<그룹>.json 하나만 기록 */
export async function saveFactionCardGroup(name: string, groupName: string, card: Partial<FactionGroupCardFields>): Promise<void> {
  const cleanName = groupName.trim()
  if (!cleanName) throw new Error('groupName is required')

  const dir = groupCardsDirPath(name)
  await mkdir(dir, { recursive: true })
  const filename = `${safePersonCardFilename(cleanName)}`
  const file = path.join(dir, filename)
  const cleanCard = removeUndefinedCardFields(card as Partial<FactionCardFields>)
  if (!Object.keys(cleanCard).length) {
    await rm(file, { force: true })
    return
  }
  await writeJsonIfChanged(file, { groupName: cleanName, card: cleanCard })
}

/** 에피소드 카드 대본 저장 — 인물별 파일로만 기록 */
export async function saveFactionCards(name: string, data: FactionCardsFile): Promise<void> {
  const dir = cardsDirPath(name)
  await mkdir(dir, { recursive: true })

  const people = data.people ?? {}
  const planned = new Set<string>()
  for (const [personName, card] of Object.entries(people)) {
    let filename = safePersonCardFilename(personName)
    if (planned.has(filename.toLocaleLowerCase('ko-KR'))) {
      const base = path.basename(filename, '.json')
      let index = 2
      do {
        filename = `${base}-${index}.json`
        index += 1
      } while (planned.has(filename.toLocaleLowerCase('ko-KR')))
    }
    planned.add(filename.toLocaleLowerCase('ko-KR'))
    await writeJsonIfChanged(path.join(dir, filename), { personName, card })
  }

  for (const file of await readdir(dir).catch(() => [])) {
    if (!file.endsWith('.json')) continue
    if (!planned.has(file.toLocaleLowerCase('ko-KR'))) await rm(path.join(dir, file), { force: true })
  }
}
