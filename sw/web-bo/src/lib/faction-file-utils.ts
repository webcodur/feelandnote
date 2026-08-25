/**
 * 세력도감 파일 IO — 서버 전용. **DB 로 옮기지 않은 것들만** 여기 있다.
 *
 * 글과 구성의 원본은 DB 다(문서 §0). 그런데 아래 네 가지는 아직 렌더 저장소(sw/remotion)의
 * 파일이 원본이라 옛 영상 관리 대시보드에서 그대로 옮겨 왔다.
 *   1. 편별 댓글(해설 글)  — public/factions/{ep}/comment.p<part>.txt
 *   2. 배경음악 목록        — public/music/
 *   3. 효과음 목록          — public/common/sfx/
 *   4. 카드뉴스 대본        — public/factions/{ep}/person-cards|group-cards/*.json
 *
 * 옮기며 바꾼 곳은 딱 두 군데다.
 *   - 뿌리 경로: `process.cwd()` 조립 대신 공용 부품(`FACTIONS_DIR`·`REMOTION_ROOT`)을 쓴다.
 *   - 곡 사용처 집계(`listMusicWithUsage`): 편별 대본을 파일이 아니라 DB 에서 받는다.
 */

import { readFile, readdir, writeFile, mkdir, rm } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { episodeDirOf } from '@feelandnote/shared/bo/episode-store'
import { REMOTION_ROOT } from '@feelandnote/shared/bo/remotion-root'
import { FACTIONS_DIR } from '@/lib/faction-paths'
import { factionAdminClient } from '@/lib/faction-db'
import { loadFactionScriptFromDb } from '@/lib/faction-episode-data'
import type {
  FactionScript, FactionCardFields, FactionGroupCardFields, FactionCardsFile,
} from '@/lib/faction-types'

export const MUSIC_DIR = path.join(REMOTION_ROOT, 'public', 'music')
export const SFX_DIR = path.join(REMOTION_ROOT, 'public', 'common', 'sfx')

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
 * 노출(등록)된 세력의 대본을 훑어, 값이 실재 음원 파일명과 일치하는 모든 위치
 * (공통 곡·편별·startSfx 등)를 필드 불문 수집한다.
 *
 * 교체: 원본은 등록 편들의 faction-data.json 파일을 읽었다 — 이제 대본은 DB 에서 조립해 받는다.
 */
export async function listMusicWithUsage(): Promise<{ files: string[]; usage: Record<string, string[]> }> {
  const files = await listMusic()
  const fileSet = new Set(files)
  const usage: Record<string, string[]> = {}

  // 등록 목록(_episodes.json)을 읽는 대신 faction_episodes.registered 로 활성 편을 고른다
  const db = factionAdminClient()
  const { data, error } = await db.from('faction_episodes')
    .select('folder,title').eq('registered', true).order('sort_order')
  if (error) throw new Error(`faction_episodes 조회 실패: ${error.message}`)

  for (const row of (data ?? []) as { folder: string; title: string | null }[]) {
    let script: FactionScript
    try { script = await loadFactionScriptFromDb(row.folder) } catch { continue } // 조립 실패한 편은 건너뜀
    const title = script.title ?? row.title ?? row.folder

    const hits = new Set<string>()
    const walk = (v: unknown) => {
      if (typeof v === 'string') { if (fileSet.has(v)) hits.add(v); return }
      if (Array.isArray(v)) { v.forEach(walk); return }
      if (v && typeof v === 'object') for (const k in v as Record<string, unknown>) walk((v as Record<string, unknown>)[k])
    }
    walk(script)
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
  return path.join(episodeDirOf(FACTIONS_DIR, name), 'faction-cards.json')
}

function cardsDirPath(name: string): string {
  return path.join(episodeDirOf(FACTIONS_DIR, name), 'person-cards')
}

function groupCardsDirPath(name: string): string {
  return path.join(episodeDirOf(FACTIONS_DIR, name), 'group-cards')
}

function legacyCardsDirPath(name: string): string {
  return path.join(episodeDirOf(FACTIONS_DIR, name), 'faction-cards')
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

/** 교체: 원본은 그룹 카드 파일을 any 로 읽었다 — 같은 모양을 타입으로 적어 lint 를 통과시킨다 */
type SplitFactionGroupCardFile =
  Partial<FactionGroupCardFields> & { groupName?: string; card?: Partial<FactionGroupCardFields> & { groupName?: string } }

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
      const raw = JSON.parse(await readFile(path.join(gDir, file), 'utf-8')) as SplitFactionGroupCardFile
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
  const files = await readdir(dir).catch(() => [] as string[])
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

  for (const file of await readdir(dir).catch(() => [] as string[])) {
    if (!file.endsWith('.json')) continue
    if (!planned.has(file.toLocaleLowerCase('ko-KR'))) await rm(path.join(dir, file), { force: true })
  }
}
