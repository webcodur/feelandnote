/**
 * 가상 담화(Discourse) 데이터 IO — 서버 전용.
 *
 * 에피소드 한 편은 sw/remotion/public/discourses/{name}/ 아래 **세 파일**로 나뉜다(모두 한국어 + 영문 *En 병기).
 *   discourse-data.json  메타·편성   cast.json  인물   turns.json  발언
 * 편집기는 나뉜 것을 모른다 — 이 모듈이 읽을 때 합치고 쓸 때 나눈다. 화면·API는 통짜 DiscourseScript 하나만 다룬다.
 * 진행 상태는 같은 폴더의 _status.json 에 둔다. 팩션(factions/)·서재 탐방(episodes/)과 완전히 분리된 경로다.
 * 경로 규격은 docs/project/remotion/discourse.md §8.
 *
 * 폴더 스캔·진행 상태·노출 목록·음원 목록은 팩션(factions/)과 규칙이 같아 `episode-store.ts` 한 곳에 있다.
 */

import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import type { DiscourseScript, DiscourseStatus, DiscourseEpisodeListItem, Speaker, Turn } from './discourse-types'
import {
  DISCOURSES_DIR,
  episodeDirOf,
  safeDirName,
  listEpisodeDirs,
  listVoices,
  voiceDirOf,
  readStatus,
  writeStatus,
} from './episode-store'

export { DISCOURSES_DIR }

function dataPath(name: string): string {
  return path.join(episodeDirOf(DISCOURSES_DIR, name), 'discourse-data.json')
}

/** 인물 파일 — Speaker[] 만 담는다 */
function castPath(name: string): string {
  return path.join(episodeDirOf(DISCOURSES_DIR, name), 'cast.json')
}

/** 발언 파일 — Turn[] 만 담는다. 가장 자주 고치고 가장 두꺼워 따로 뗐다 */
function turnsPath(name: string): string {
  return path.join(episodeDirOf(DISCOURSES_DIR, name), 'turns.json')
}

/* ── 진행 상태 ── */

/** 담화 진행 상태 저장 */
export function writeDiscourseStatus(name: string, status: DiscourseStatus): Promise<void> {
  return writeStatus(DISCOURSES_DIR, name, status)
}

/* ── 에피소드 ── */

export async function listDiscourseEpisodes(): Promise<DiscourseEpisodeListItem[]> {
  const items: DiscourseEpisodeListItem[] = []
  for (const id of await listEpisodeDirs(DISCOURSES_DIR)) {
    if (!existsSync(dataPath(id))) continue
    try {
      const data = await loadDiscourseEpisode(id)
      items.push({
        id,
        title: data.title ?? id,
        castCount: data.cast?.length ?? 0,
        turnCount: data.turns?.length ?? 0,
        hasMusic: !!data.music || !!data.tracks?.length,
        status: await readStatus(DISCOURSES_DIR, id),
      })
    } catch { /* 손상 파일 건너뜀 */ }
  }
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

/**
 * 음원 파일 한 개의 절대 경로 — 파일명 안전화로 경로 이탈 차단.
 * 팩션(safeFilename)과 달리 한글·공백을 살린다 — 담화 음원 파일명이 ASCII 로 한정되지 않는다.
 */
export function discourseVoiceFilePath(name: string, file: string): string {
  return path.join(voiceDirOf(DISCOURSES_DIR, name), safeDirName(file))
}

/**
 * 에피소드 voice/ 폴더의 wav 목록.
 * 편집기는 이 목록을 발언 배열과 대조해 음원 자리가 밀렸는지 잡는다(discourse-voice.ts vnVerify).
 */
export function listDiscourseVoices(name: string) {
  return listVoices(DISCOURSES_DIR, name)
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
