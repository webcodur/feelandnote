import { NextResponse } from 'next/server'
import { listCandidates, loadCandidate, listEpisodes, promoteCandidate } from '@/features/book-recommend/lib/server-utils'
import { isValidSeries } from '@/features/book-recommend/lib/series-registry'
import { supabase } from '@/features/book-recommend/lib/supabase'

/** GET: Candidate 목록 */
export async function GET(_req: Request, { params }: { params: Promise<{ series: string }> }) {
  const { series } = await params
  if (!isValidSeries(series)) return NextResponse.json({ error: 'invalid series' }, { status: 404 })

  const names = await listCandidates(series)

  const toSlug = (n: string) => n.replace(/-\d+$/, '')
  const slugs = [...new Set(names.map(toSlug))]
  const { data: celebs, error: celebsError } = await supabase
    .from('celebs')
    .select('slug, birth_date')
    .in('slug', slugs)
  if (celebsError) return NextResponse.json({ error: celebsError.message }, { status: 500 })
  const birthMap = new Map((celebs ?? []).map(p => [p.slug, p.birth_date]))

  const list = await Promise.all(names.map(async (name) => {
    try {
      const ep = await loadCandidate(series, name)
      return {
        name,
        nickname: ep.host?.nickname ?? name,
        booksCount: ep.books?.length ?? 0,
        birthYear: (() => { const d = birthMap.get(toSlug(name)); if (!d) return null; const y = parseInt(d, 10); return isNaN(y) ? null : y })(),
      }
    } catch {
      return { name, nickname: name, booksCount: 0, birthYear: null as number | null }
    }
  }))
  return NextResponse.json(list)
}

/** POST: Candidate → Lineup promote */
export async function POST(req: Request, { params }: { params: Promise<{ series: string }> }) {
  const { series } = await params
  if (!isValidSeries(series)) return NextResponse.json({ error: 'invalid series' }, { status: 404 })

  const { name } = await req.json()
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })

  const existing = await listEpisodes(series)
  if (existing.some(e => e.id === name)) {
    return NextResponse.json({ error: 'already in lineup' }, { status: 409 })
  }

  try {
    await promoteCandidate(series, name)
    return NextResponse.json({ ok: true, name })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
