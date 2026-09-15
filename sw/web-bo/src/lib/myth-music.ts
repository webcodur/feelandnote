import { readdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

/** 신화 테마곡을 준비하는 로컬 폴더. 다른 컴퓨터에서는 환경변수로 덮어쓴다. */
const DEFAULT_MYTH_MUSIC_DIR = 'D:\\오디오\\신화'
const PREPARED_MYTH_MUSIC_DIR = 'D:\\audios\\BGMS\\bgms\\신화'
export const MYTH_MUSIC_DIR = process.env.MYTH_MUSIC_DIR?.trim()
  || (existsSync(DEFAULT_MYTH_MUSIC_DIR) ? DEFAULT_MYTH_MUSIC_DIR : PREPARED_MYTH_MUSIC_DIR)

/** 파일명과 DB 전승명이 다른 준비곡만 명시적으로 잇는다. */
const FILE_NAME_ALIASES: Record<string, string> = {
  '아트레우스': '아트레우스 가문',
  '오디세우스': '오디세이아',
  '일리아드': '일리아스',
  '헤라클레스': '헤라클레스의 열두 과제',
}

export interface MythMusicTag {
  id: string
  name: string
  slug: string | null
  theme_music: unknown
}

export interface MythMusicFile {
  file: string
  absPath: string
  targetName: string | null
  tag: MythMusicTag | null
}

export interface MythMusicCurrent {
  file: string
  url: string
}

export interface MythMusicEntry {
  file: string
  targetName: string | null
  tagId: string | null
  tagName: string | null
  current: MythMusicCurrent | null
  status: 'ready' | 'linked' | 'unmatched' | 'tag-missing'
}

export interface MythMusicScan {
  folder: string
  folderExists: boolean
  files: MythMusicFile[]
}

/** 공백·표기 부호 차이를 줄여 파일명과 전승명을 비교한다. */
export function mythMusicKey(value: string): string {
  return value
    .normalize('NFKC')
    .replace(/\.mp3$/i, '')
    .replace(/[\s·・:：'"“”‘’]/g, '')
    .toLocaleLowerCase('ko-KR')
}

function stem(file: string): string {
  return path.basename(file, path.extname(file)).trim()
}

function currentMusic(value: unknown): MythMusicCurrent | null {
  if (!value || typeof value !== 'object') return null
  const row = value as Record<string, unknown>
  const file = typeof row.file === 'string' ? row.file.trim() : ''
  const url = typeof row.url === 'string' ? row.url.trim() : ''
  return file && url ? { file, url } : null
}

export function matchMythMusicTag(file: string, tags: readonly MythMusicTag[]): { targetName: string; tag: MythMusicTag | null } {
  const fileStem = stem(file)
  const targetName = FILE_NAME_ALIASES[fileStem] ?? fileStem
  const tag = tags.find((candidate) => mythMusicKey(candidate.name) === mythMusicKey(targetName)) ?? null
  return { targetName, tag }
}

/** 폴더를 읽고 mp3만 DB 전승에 연결한다. 업로드·DB 변경은 여기서 하지 않는다. */
export async function scanMythMusicFolder(tags: readonly MythMusicTag[]): Promise<MythMusicScan> {
  let names: string[]
  try {
    names = (await readdir(MYTH_MUSIC_DIR, { withFileTypes: true }))
      .filter((entry) => entry.isFile() && path.extname(entry.name).toLowerCase() === '.mp3')
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b, 'ko'))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return { folder: MYTH_MUSIC_DIR, folderExists: false, files: [] }
    }
    throw error
  }

  return {
    folder: MYTH_MUSIC_DIR,
    folderExists: true,
    files: names.map((file) => {
      const { targetName, tag } = matchMythMusicTag(file, tags)
      return { file, absPath: path.join(MYTH_MUSIC_DIR, file), targetName, tag }
    }),
  }
}

export function toMythMusicEntry(file: MythMusicFile): MythMusicEntry {
  const current = currentMusic(file.tag?.theme_music)
  return {
    file: file.file,
    targetName: file.targetName,
    tagId: file.tag?.id ?? null,
    tagName: file.tag?.name ?? null,
    current,
    status: !file.targetName || !file.tag
      ? (file.tag ? 'unmatched' : 'tag-missing')
      : current?.file === file.file
        ? 'linked'
        : 'ready',
  }
}

export function mythMusicValue(file: string, url: string, checkedAt: string) {
  return {
    file,
    url,
    episode: 'myth-library',
    variant: 'theme',
    checkedAt,
  }
}
