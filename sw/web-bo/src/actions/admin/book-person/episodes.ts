'use server'

import { revalidatePath } from 'next/cache'
import { selectAllPages } from '@feelandnote/shared/lib/paginate'
import { requireAdmin } from '@/lib/admin-auth'
import { createClient } from '@/lib/db/server'
import { createAdminClient } from '@/lib/db/admin'
import { assertRemotionLocal, REMOTION_LOCAL } from '@/lib/remotion-local'
import {
  listEpisodes, readEpisode, writeEpisode,
} from '@/features/book-person/store'
import { emptyScript, type BookPersonScript, type BookPersonSummary } from '@/features/book-person/types'

export type RegisteredBook = {
  contentId: string
  title: string
  creator: string | null
  text: string
}

export type { BookPersonScript, BookPersonSummary }

type CelebRow = {
  slug: string | null
  nickname: string | null
  headline: string | null
  title: string | null
}

function roleOf(row: CelebRow): string {
  return (row.headline || row.title || '').trim()
}

async function loadCelebs(): Promise<CelebRow[]> {
  const db = await createClient()
  return selectAllPages<CelebRow>((from, to) =>
    db
      .from('celebs')
      .select('slug, nickname, headline, title')
      .in('publication_status', ['active', 'inactive'])
      .order('id')
      .range(from, to),
  )
}

export async function listBookPersonPeople(): Promise<BookPersonSummary[]> {
  await requireAdmin()
  const celebs = await loadCelebs()
  const drafts = new Map<string, BookPersonSummary>()
  if (REMOTION_LOCAL) {
    for (const row of await listEpisodes()) drafts.set(row.folder, row)
  }
  return celebs
    .filter(c => c.slug)
    .map(c => {
      const slug = c.slug as string
      const draft = drafts.get(slug)
      if (draft) return draft
      return {
        folder: slug,
        person: (c.nickname || slug).trim(),
        role: roleOf(c),
        bookCount: 0,
        hasIntro: false,
        hasLead: false,
        hasDraft: false,
      }
    })
    .toSorted((a, b) => {
      if (a.hasDraft !== b.hasDraft) return a.hasDraft ? -1 : 1
      return a.person.localeCompare(b.person, 'ko')
    })
}

async function fetchRegisteredBooks(slug: string): Promise<RegisteredBook[]> {
  const admin = createAdminClient()
  const { data: celeb, error: celebError } = await admin
    .from('celebs')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()
  if (celebError || !celeb) return []
  const { data: rows, error } = await admin
    .from('celeb_contents')
    .select('content_id, review')
    .eq('celeb_id', celeb.id)
    .order('created_at', { ascending: true })
  if (error || !rows || rows.length === 0) return []
  const ids = rows.map(r => r.content_id)
  const { data: locales } = await admin
    .from('content_locales')
    .select('content_id, title, creator')
    .in('content_id', ids)
    .eq('locale', 'ko')
  const localeMap = new Map<string, { title: string; creator: string | null }>()
  for (const l of locales ?? []) localeMap.set(l.content_id, { title: l.title, creator: l.creator })
  // contents fallback for missing locale
  const { data: contents } = await admin
    .from('contents')
    .select('id, metadata')
    .in('id', ids)
  const metaMap = new Map<string, string | null>()
  for (const c of contents ?? []) {
    const m = c.metadata as Record<string, unknown> | null
    const fallback = typeof m?.['title'] === 'string' ? String(m?.['title']) : null
    metaMap.set(c.id, fallback)
  }
  return rows.map(r => {
    const loc = localeMap.get(r.content_id)
    const title = loc?.title || metaMap.get(r.content_id) || r.content_id.slice(0, 8)
    return {
      contentId: r.content_id,
      title,
      creator: loc?.creator ?? null,
      text: (r.review || '').trim(),
    }
  }).filter(b => b.title)
}

export async function getBookPersonEpisode(folder: string): Promise<{
  script: BookPersonScript
  hasDraft: boolean
  registeredBooks: RegisteredBook[]
}> {
  await requireAdmin()
  assertRemotionLocal()
  const [draft, registeredBooks] = await Promise.all([
    readEpisode(folder),
    fetchRegisteredBooks(folder),
  ])
  if (draft) return { script: draft, hasDraft: true, registeredBooks }
  const db = await createClient()
  const { data, error } = await db
    .from('celebs')
    .select('slug, nickname, headline, title')
    .eq('slug', folder)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) throw new Error(`${folder} 인물이 없다`)
  const base = emptyScript((data.nickname || folder).trim(), roleOf(data))
  // 등록된 책이 있으면 초안에 그대로 넣어 둔다 — 빈 화면 방지, 선택형으로 쓰기 위해
  if (registeredBooks.length > 0) {
    base.books = registeredBooks.map(b => ({
      title: b.title,
      text: b.text,
    }))
  }
  return {
    script: base,
    hasDraft: false,
    registeredBooks,
  }
}

export async function getRegisteredBooks(folder: string): Promise<RegisteredBook[]> {
  await requireAdmin()
  return fetchRegisteredBooks(folder)
}

export async function saveBookPersonEpisode(folder: string, script: BookPersonScript): Promise<void> {
  await requireAdmin()
  assertRemotionLocal()
  await writeEpisode(folder, script)
  revalidatePath('/book-person')
  revalidatePath(`/book-person/${encodeURIComponent(folder)}`)
}
