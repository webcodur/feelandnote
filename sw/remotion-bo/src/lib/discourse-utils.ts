/**
 * 가상 담화(Discourse) 데이터 IO — 서버 전용.
 *
 * 에피소드 한 편은 sw/remotion/public/discourses/{name}/ 아래 **세 파일**로 나뉜다(모두 한국어 + 영문 *En 병기).
 *   discourse-data.json  메타·편성   cast.json  인물   turns.json  발언
 * 편집기는 나뉜 것을 모른다 — 이 모듈이 읽을 때 합치고 쓸 때 나눈다. 화면·API는 통짜 DiscourseScript 하나만 다룬다.
 * 진행 상태는 같은 폴더의 _status.json 에 둔다. 팩션(factions/)·서재 탐방(episodes/)과 완전히 분리된 경로다.
 * 경로 규격은 docs/project/remotion/discourse.md §8.
 */

import { readFile, readdir, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import type { DiscourseScript, DiscourseStatus, DiscourseEpisodeListItem, Speaker, Turn } from './discourse-types'
// wav 헤더 해석은 시리즈와 무관한 순수 계산이라 팩션 것을 그대로 쓴다(복제 금지)
import { wavDurationSec } from './faction-utils'

/** 팩션과 동일 어휘 */
const VALID_STATUSES: DiscourseStatus[] = ['todo', 'live', 'done']

const REMOTION_ROOT = path.join(process.cwd(), '..', 'remotion')
export const DISCOURSES_DIR = path.join(REMOTION_ROOT, 'public', 'discourses')

/** 등록 에피소드 화이트리스트(_episodes.json) — 있으면 그 목록만 노출, 없으면 전체(하위호환) */
const REGISTRY_PATH = path.join(DISCOURSES_DIR, '_episodes.json')
async function readRegistry(): Promise<Set<string> | null> {
  try { return new Set(JSON.parse(await readFile(REGISTRY_PATH, 'utf-8')) as string[]) }
  catch { return null }
}

/** 에피소드 폴더명 안전화 — 경로 이탈만 차단 */
export function safeDirName(name: string): string {
  return path.basename(name).replace(/[/\\]/g, '')
}

function dataPath(name: string): string {
  return path.join(DISCOURSES_DIR, safeDirName(name), 'discourse-data.json')
}

/** 인물 파일 — Speaker[] 만 담는다 */
function castPath(name: string): string {
  return path.join(DISCOURSES_DIR, safeDirName(name), 'cast.json')
}

/** 발언 파일 — Turn[] 만 담는다. 가장 자주 고치고 가장 두꺼워 따로 뗐다 */
function turnsPath(name: string): string {
  return path.join(DISCOURSES_DIR, safeDirName(name), 'turns.json')
}

function statusPath(name: string): string {
  return path.join(DISCOURSES_DIR, safeDirName(name), '_status.json')
}

/* ── 진행 상태 ── */

/** 담화 진행 상태 읽기 — _status.json 없으면 'todo' */
export async function readDiscourseStatus(name: string): Promise<DiscourseStatus> {
  try {
    const raw = await readFile(statusPath(name), 'utf-8')
    const s = (JSON.parse(raw) as { status?: string }).status
    return VALID_STATUSES.includes(s as DiscourseStatus) ? (s as DiscourseStatus) : 'todo'
  } catch {
    return 'todo'
  }
}

/** 담화 진행 상태 저장 */
export async function writeDiscourseStatus(name: string, status: DiscourseStatus): Promise<void> {
  if (!VALID_STATUSES.includes(status)) throw new Error('invalid status')
  const fp = statusPath(name)
  await mkdir(path.dirname(fp), { recursive: true })
  await writeFile(fp, JSON.stringify({ status }, null, 2) + '\n', 'utf-8')
}

/* ── 에피소드 ── */

export async function listDiscourseEpisodes(): Promise<DiscourseEpisodeListItem[]> {
  let entries
  try { entries = await readdir(DISCOURSES_DIR, { withFileTypes: true }) }
  catch { return [] }

  const allow = await readRegistry()
  const items: DiscourseEpisodeListItem[] = []
  for (const e of entries) {
    if (!e.isDirectory() || e.name.startsWith('_')) continue
    if (allow && !allow.has(e.name)) continue // 등록 목록에 없는 폴더는 숨김(파일은 보존)
    if (!existsSync(dataPath(e.name))) continue
    try {
      const data = await loadDiscourseEpisode(e.name)
      items.push({
        id: e.name,
        title: data.title ?? e.name,
        castCount: data.cast?.length ?? 0,
        turnCount: data.turns?.length ?? 0,
        hasMusic: !!data.music || !!data.tracks?.length,
        status: await readDiscourseStatus(e.name),
      })
    } catch { /* 손상 파일 건너뜀 */ }
  }
  items.sort((a, b) => a.id.localeCompare(b.id))
  return items
}

/** JSON 한 덩이 읽기 — 없으면 에러. 조용한 빈 배열 폴백은 두지 않는다(인물·대사 없는 편이 그대로 저장돼 버린다) */
async function readJson<T>(fp: string, what: string): Promise<T> {
  try { return JSON.parse(await readFile(fp, 'utf-8')) as T }
  catch { throw new Error(`${what} 읽기 실패: ${path.basename(fp)}`) }
}

async function writeJson(fp: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(fp), { recursive: true })
  await writeFile(fp, JSON.stringify(value, null, 2) + '\n', 'utf-8')
}

/** 세 파일을 합쳐 한 벌로 — 호출자는 나뉘어 있다는 사실을 모른다 */
export async function loadDiscourseEpisode(name: string): Promise<DiscourseScript> {
  const [meta, cast, turns] = await Promise.all([
    readJson<Omit<DiscourseScript, 'cast' | 'turns'>>(dataPath(name), '담화 메타'),
    readJson<Speaker[]>(castPath(name), '담화 인물'),
    readJson<Turn[]>(turnsPath(name), '담화 발언'),
  ])
  return { ...meta, cast, turns }
}

/** 한 벌을 세 파일로 나눠 저장 — cast·turns 를 메타 파일에 남기지 않는다(두 곳에 같은 값이 생기면 갈린다) */
export async function saveDiscourseEpisode(name: string, data: DiscourseScript): Promise<void> {
  const { cast, turns, ...meta } = data
  await Promise.all([
    writeJson(dataPath(name), meta),
    writeJson(castPath(name), cast ?? []),
    writeJson(turnsPath(name), turns ?? []),
  ])
}

/* ── 음원 ── */

/** 발언 음원 폴더 — public/discourses/{name}/voice */
export function discourseVoiceDir(name: string): string {
  return path.join(DISCOURSES_DIR, safeDirName(name), 'voice')
}

/** 음원 파일 한 개의 절대 경로 — 파일명 안전화로 경로 이탈 차단 */
export function discourseVoiceFilePath(name: string, file: string): string {
  return path.join(discourseVoiceDir(name), path.basename(file).replace(/[/\\]/g, ''))
}

/** 음원 파일 한 개 — 편집기가 존재·길이 표시와 자리 검증(vnVerify)에 쓴다 */
export interface DiscourseVoiceFile {
  file: string
  size: number
  /** 초. 헤더 해석 실패 시 0 */
  duration: number
}

/**
 * 에피소드 voice/ 폴더의 wav 목록.
 * 편집기는 이 목록을 발언 배열과 대조해 음원 자리가 밀렸는지 잡는다(discourse-voice.ts vnVerify).
 */
export async function listDiscourseVoices(name: string): Promise<DiscourseVoiceFile[]> {
  const dir = discourseVoiceDir(name)
  let entries
  try { entries = await readdir(dir, { withFileTypes: true }) }
  catch { return [] }
  const out: DiscourseVoiceFile[] = []
  for (const e of entries) {
    if (!e.isFile() || !/\.wav$/i.test(e.name)) continue
    try {
      const buf = await readFile(path.join(dir, e.name))
      out.push({ file: e.name, size: buf.length, duration: wavDurationSec(buf) })
    } catch { /* 손상 파일 건너뜀 */ }
  }
  out.sort((a, b) => a.file.localeCompare(b.file))
  return out
}

export async function createDiscourseEpisode(name: string, init: Partial<DiscourseScript>): Promise<DiscourseScript> {
  const safe = safeDirName(name)
  if (!safe) throw new Error('invalid episode name')
  if (existsSync(dataPath(safe))) throw new Error('episode already exists')
  const data: DiscourseScript = {
    title: init.title?.trim() || safe,
    music: init.music,
    cast: init.cast ?? [],
    turns: init.turns ?? [],
  }
  await saveDiscourseEpisode(safe, data)
  await writeDiscourseStatus(safe, 'todo')
  return data
}
