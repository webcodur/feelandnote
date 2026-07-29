import { NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { REMOTION_ROOT } from '@feelandnote/shared/bo/remotion-root'
import { getSeriesById } from '@/features/book-recommend/lib/series-registry'
import { createAdminClient } from '@/features/book-recommend/lib/supabase'

const LINEUP_PATH = path.join(REMOTION_ROOT, 'scripts', 'youtube', 'youtube-lineup.json')

/**
 * lineup.json의 특정 에피소드 uploads를 profiles.youtube_videos에 UPSERT한다.
 * 에피소드명 = profiles.slug 규약 전제.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ series: string }> },
) {
  const { series } = await params
  if (!getSeriesById(series)) {
    return NextResponse.json({ error: 'invalid series' }, { status: 404 })
  }

  const url = new URL(req.url)
  const episode = url.searchParams.get('episode')
  if (!episode) {
    return NextResponse.json({ error: 'episode required' }, { status: 400 })
  }

  if (!existsSync(LINEUP_PATH)) {
    return NextResponse.json({ error: 'lineup.json not found' }, { status: 404 })
  }

  const all = JSON.parse(await readFile(LINEUP_PATH, 'utf-8')) as Record<
    string,
    { uploads?: Record<string, { videoId: string; uploadedAt: string }> }
  >
  const ep = all[episode]
  const uploads = ep?.uploads ?? null

  if (!uploads || Object.keys(uploads).length === 0) {
    return NextResponse.json(
      { error: `no uploads found for "${episode}"` },
      { status: 400 },
    )
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('profiles')
    .update({ youtube_videos: uploads })
    .eq('slug', episode)
    .eq('profile_type', 'CELEB')
    .select('id, slug')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json(
      { error: `profile not found for slug "${episode}"` },
      { status: 404 },
    )
  }

  const variantCount = Object.keys(uploads).length
  return NextResponse.json({
    ok: true,
    slug: data.slug,
    profileId: data.id,
    variantCount,
    variants: Object.keys(uploads).sort(),
  })
}
