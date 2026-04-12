import { NextResponse } from 'next/server'
import { listEpisodes, loadEpisode, saveEpisode, scanLocalWavs } from '@/lib/server-utils'
import { isValidSeries } from '@/lib/series-registry'
import { supabase } from '@/lib/supabase'

export async function GET(_req: Request, { params }: { params: Promise<{ series: string }> }) {
  const { series } = await params
  if (!isValidSeries(series)) return NextResponse.json({ error: 'invalid series' }, { status: 404 })

  const items = await listEpisodes(series)

  // slug 추출: episode ID → person name (elon-musk-2-en → elon-musk)
  const toSlug = (n: string) => {
    const base = n.endsWith('-en') ? n.slice(0, -3) : n
    const m = base.match(/^(.+)-\d+$/)
    return m ? m[1] : base
  }
  const slugs = [...new Set(items.map(i => toSlug(i.id)))]
  const { data: profiles } = await supabase
    .from('profiles')
    .select('slug, birth_date')
    .in('slug', slugs)
    .eq('profile_type', 'CELEB')
  const birthMap = new Map((profiles ?? []).map(p => [p.slug, p.birth_date]))

  const list = await Promise.all(items.map(async ({ id: name, status }) => {
    const ep = await loadEpisode(series, name)
    const wavs = await scanLocalWavs(name)
    return {
      name,
      nickname: ep.host?.nickname ?? name,
      booksCount: ep.books?.length ?? 0,
      hasShorts: !!ep.shorts,
      voiceCount: wavs.length,
      voiceSizeMB: +(wavs.reduce((s: number, w: { size: number }) => s + w.size, 0) / 1024 / 1024).toFixed(1),
      birthYear: (() => { const d = birthMap.get(toSlug(name)); if (!d) return null; const y = parseInt(d, 10); return isNaN(y) ? null : y })(),
      status,
    }
  }))
  return NextResponse.json(list)
}

/** POST: 스캐폴딩 — DB 데이터 → JSON 뼈대 생성 */
export async function POST(req: Request, { params }: { params: Promise<{ series: string }> }) {
  const { series } = await params
  if (!isValidSeries(series)) return NextResponse.json({ error: 'invalid series' }, { status: 404 })

  const { slug } = await req.json()
  if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 })

  // 중복 확인
  const existing = await listEpisodes(series)
  if (existing.some(e => e.id === slug)) {
    return NextResponse.json({ error: 'episode already exists' }, { status: 409 })
  }

  // 프로필 조회
  const { data: profile, error: pErr } = await supabase
    .from('profiles')
    .select(`
      id, slug, nickname, nickname_en, title, bio, avatar_url,
      speech_tone, has_voice, voice_id_ko, voice_id_en, voice_speed
    `)
    .eq('slug', slug)
    .eq('profile_type', 'CELEB')
    .single()

  if (pErr || !profile) return NextResponse.json({ error: 'celeb not found' }, { status: 404 })

  // 도서 목록 조회
  const { data: userContents } = await supabase
    .from('user_contents')
    .select(`
      review, source_url,
      contents!inner(
        id, type, thumbnail_url, publish_year,
        content_locales(title, creator, locale)
      )
    `)
    .eq('user_id', profile.id)
    .eq('visibility', 'public')
    .eq('contents.type', 'BOOK')

  // 도서 뼈대 생성
  const books = (userContents ?? []).map((uc: Record<string, unknown>) => {
    const content = uc.contents as Record<string, unknown>
    const locales = (content?.content_locales ?? []) as Array<{ title: string; creator: string; locale: string }>
    const ko = locales.find(l => l.locale === 'ko') ?? locales[0]

    return {
      title: ko?.title ?? '',
      creator: ko?.creator ?? '',
      thumbnail_url: (content?.thumbnail_url as string) ?? '',
      summary: '', // AI 초안 대상
      contextMain: '', // AI 초안 대상
      quotePairs: [],
      stats: {
        publishYear: (content?.publish_year as string) ?? '',
      },
    }
  })

  // JSON 뼈대 조립
  const episode = {
    narrator: {
      serviceGreeting: '안녕하세요, 필앤노트입니다. 서재 탐방 코너에서는 한 인물의 서재를 열어, 그들이 사랑한 것들과 그 이유를 소개합니다.',
      serviceIntro: `오늘 함께할 인물은 ${profile.nickname}입니다.`,
      celebIntro: '', // AI 초안 대상 (bio 기반 재작성)
      bridge: '이제 그의 서재를 열어보겠습니다.',
      outro: `이상으로 ${profile.nickname}의 ${books.length}권의 책이었습니다. 더 깊은 이야기가 궁금하신가요? 지금 바로 Feel & Note 앱에서 만나보세요.`,
    },
    host: {
      nickname: profile.nickname,
      nickname_en: profile.nickname_en ?? '',
      speech_tone: profile.speech_tone ?? '',
      avatar_url: profile.avatar_url ?? '',
      bio: profile.bio ?? '',
      title: profile.title ?? '',
      featuredQuote: '',
      philosophy: '', // AI 초안 대상
      elevenlabsVoiceId: profile.voice_id_ko ?? '',
    },
    books,
  }

  await saveEpisode(series, slug, episode)
  return NextResponse.json({ ok: true, name: slug, booksCount: books.length })
}
