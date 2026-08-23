import { existsSync } from 'fs'
import { mkdir, readdir, readFile, writeFile } from 'fs/promises'
import path from 'path'
import { BOOK_PERSON_DIR, episodeDirOf, safeDirName } from '@feelandnote/shared/bo/episode-store'
import type { BookPersonScript, BookPersonSummary } from '@/features/book-person/types'

const FOLDER_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/

export function assertFolder(folder: string): string {
  const f = (folder ?? '').trim()
  if (!f || !FOLDER_RE.test(f) || f !== safeDirName(f)) {
    throw new Error('폴더명은 영문·숫자로 시작하고 영문·숫자·하이픈만 쓸 수 있다')
  }
  return f
}

const scriptPath = (folder: string) => path.join(episodeDirOf(BOOK_PERSON_DIR, folder), 'ko.json')

function asScript(raw: unknown, fallbackPerson: string): BookPersonScript {
  const o = (raw ?? {}) as Partial<BookPersonScript>
  return {
    person: typeof o.person === 'string' && o.person.trim() ? o.person : fallbackPerson,
    role: typeof o.role === 'string' ? o.role : undefined,
    lead: typeof o.lead === 'string' ? o.lead : undefined,
    intro: typeof o.intro === 'string' ? o.intro : '',
    books: Array.isArray(o.books)
      ? o.books.map(b => ({
          title: typeof b?.title === 'string' ? b.title : '',
          text: typeof b?.text === 'string' ? b.text : '',
          duration: typeof b?.duration === 'number' ? b.duration : undefined,
          image: typeof b?.image === 'string' ? b.image : undefined,
          voice: typeof b?.voice === 'string' ? b.voice : undefined,
        }))
      : [],
    title: typeof o.title === 'string' ? o.title : undefined,
    bg: typeof o.bg === 'string' ? o.bg : undefined,
    locale: o.locale === 'en' ? 'en' : 'ko',
  }
}

function compact(script: BookPersonScript): BookPersonScript {
  return {
    person: script.person.trim(),
    intro: script.intro.trim(),
    books: script.books
      .map(b => ({
        title: b.title.trim(),
        text: b.text.trim(),
        ...(b.duration && b.duration > 0 ? { duration: b.duration } : {}),
        ...(b.image?.trim() ? { image: b.image.trim() } : {}),
        ...(b.voice?.trim() ? { voice: b.voice.trim() } : {}),
      }))
      .filter(b => b.title || b.text),
    ...(script.role?.trim() ? { role: script.role.trim() } : {}),
    ...(script.lead?.trim() ? { lead: script.lead.trim() } : {}),
    ...(script.title?.trim() ? { title: script.title.trim() } : {}),
    ...(script.bg?.trim() ? { bg: script.bg.trim() } : {}),
    ...(script.locale === 'en' ? { locale: 'en' as const } : {}),
  }
}

export async function listEpisodes(): Promise<BookPersonSummary[]> {
  if (!existsSync(BOOK_PERSON_DIR)) return []
  const entries = await readdir(BOOK_PERSON_DIR, { withFileTypes: true })
  const rows: BookPersonSummary[] = []
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('_')) continue
    const file = scriptPath(entry.name)
    if (!existsSync(file)) continue
    const script = asScript(JSON.parse(await readFile(file, 'utf8')), entry.name)
    rows.push({
      folder: entry.name,
      person: script.person,
      role: script.role ?? '',
      bookCount: script.books.length,
      hasIntro: Boolean(script.intro.trim()),
      hasLead: Boolean(script.lead?.trim()),
      hasDraft: true,
    })
  }
  return rows.toSorted((a, b) => a.folder.localeCompare(b.folder))
}

export async function readEpisode(folder: string): Promise<BookPersonScript | null> {
  const name = assertFolder(folder)
  const file = scriptPath(name)
  if (!existsSync(file)) return null
  return asScript(JSON.parse(await readFile(file, 'utf8')), name)
}

export async function writeEpisode(folder: string, script: BookPersonScript): Promise<void> {
  const name = assertFolder(folder)
  const next = compact(script)
  if (!next.person) throw new Error('인물 이름을 적어라')
  const dir = episodeDirOf(BOOK_PERSON_DIR, name)
  await mkdir(dir, { recursive: true })
  await writeFile(scriptPath(name), `${JSON.stringify(next, null, 2)}\n`, 'utf8')
}
