'use server'

import { unstable_cache } from 'next/cache'
import { getLocale } from 'next-intl/server'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { createStaticClient } from '@/lib/db/static'
import { STATIC_REVALIDATE, throwOnQueryError } from '@/lib/cache'
import { readRoster } from '@/lib/game/suikoden/roster-data'

export interface CheondoLines { greeting: string[]; rollCall: string[]; deploy: string[]; clash: string[]; win: string[]; lose: string[]; quote: string }
async function fetchRoster(locale: string) { return readRoster(createStaticClient(), locale) }
const cachedRoster = unstable_cache(fetchRoster, ['cheondo-roster-v3-historical'], { revalidate: STATIC_REVALIDATE, tags: [CACHE_TAGS.CELEBS] })
export async function loadCheondoRoster() { return cachedRoster(await getLocale()) }

export async function loadCheondoLines(ids: string[]): Promise<Record<string, CheondoLines>> {
  const safeIds = [...new Set(ids)].filter(id => /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)).slice(0, 100)
  if (!safeIds.length) return {}
  const db = createStaticClient(), locale = await getLocale()
  const active = await db.from('celebs').select('id').in('id', safeIds).eq('publication_status', 'active')
  throwOnQueryError('[Cheondo] public dialogue owners', active.error)
  const publicIds = (active.data ?? []).map(row => row.id)
  if (!publicIds.length) return {}
  const result = await db.from('celeb_dialogues').select('celeb_id,lines,lines_en').in('celeb_id', publicIds)
  throwOnQueryError('[Cheondo] lines', result.error)
  const out: Record<string, CheondoLines> = {}
  for (const row of result.data ?? []) {
    const value = locale === 'en' ? row.lines_en || row.lines : row.lines
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue
    const list = (key: string) => { const field = value[key as keyof typeof value]; return Array.isArray(field) ? field.filter((line): line is string => typeof line === 'string') : [] }
    const quote = value.quote
    out[row.celeb_id] = { greeting: list('greeting'), rollCall: list('roll_call'), deploy: list('deploy'), clash: list('clash_attack'), win: list('battle_win'), lose: list('battle_lose'), quote: typeof quote === 'string' ? quote : '' }
  }
  return out
}
