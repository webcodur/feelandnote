import { NextResponse } from 'next/server'
import { supabase, createAdminClient } from '@/lib/supabase'

/**
 * GET /api/celebs/[slug]/voice
 * 현재 DB에 저장된 voice_id_ko / voice_id_en 조회.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 })

  const { data, error } = await supabase
    .from('profiles')
    .select('id, slug, nickname, voice_id_ko, voice_id_en')
    .eq('slug', slug)
    .eq('profile_type', 'CELEB')
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'celeb not found' }, { status: 404 })
  return NextResponse.json(data)
}

/**
 * PUT /api/celebs/[slug]/voice
 * body: { locale: 'ko'|'en', voiceId: string }
 * profiles.voice_id_ko / voice_id_en을 업데이트한다(인물 단위 영구 저장).
 */
export async function PUT(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 })

  const body = await req.json().catch(() => ({}))
  const { locale, voiceId } = body as { locale?: 'ko' | 'en'; voiceId?: string }
  if (locale !== 'ko' && locale !== 'en') {
    return NextResponse.json({ error: "locale must be 'ko' or 'en'" }, { status: 400 })
  }
  if (typeof voiceId !== 'string') {
    return NextResponse.json({ error: 'voiceId required' }, { status: 400 })
  }

  const admin = createAdminClient()
  const col = locale === 'ko' ? 'voice_id_ko' : 'voice_id_en'
  const { error } = await admin
    .from('profiles')
    .update({ [col]: voiceId || null })
    .eq('slug', slug)
    .eq('profile_type', 'CELEB')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, slug, locale, voiceId })
}
