import { NextResponse } from 'next/server'
import path from 'path'
import { mkdir, rename, rm, writeFile } from 'fs/promises'
import {
  EPISODES_DIR,
  listEpisodes,
  loadEpisode,
  scanLocalWavs,
} from '@/features/book-recommend/lib/server-utils'
import { isValidSeries, seriesDataModel, type SeriesDataModel } from '@/features/book-recommend/lib/series-registry'
import { supabase } from '@/features/book-recommend/lib/supabase'

/**
 * 책 기반이 아닌 시리즈의 목록·생성 — 에피소드 한 편이 파일 몇 개라 폴더명·영상 명칭만 받는다.
 * 책 기반(서재 탐방)은 DB 셀럽에서 뼈대를 뽑는 스캐폴딩이라 아래 본문 경로를 탄다.
 *
 * ⚠ 26.07.26 현재 표가 비었다 — 유일한 항목이던 가상 담화가 web-bo 로 이관됐다.
 */
const FILE_SERIES: Partial<Record<SeriesDataModel, {
  list: () => Promise<unknown>
  create: (name: string, init: { title?: string; music?: string }) => Promise<unknown>
}>> = {}

function fileSeries(series: string) {
  const model = seriesDataModel(series)
  return model ? FILE_SERIES[model] : undefined
}

function bookFolderSegment(title: string): string {
  return title
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/g, '')
    .slice(0, 80) || 'untitled'
}

async function writeJson(file: string, data: unknown): Promise<void> {
  await writeFile(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
}

export async function GET(_req: Request, { params }: { params: Promise<{ series: string }> }) {
  const { series } = await params
  if (!isValidSeries(series)) return NextResponse.json({ error: 'invalid series' }, { status: 404 })

  // 책 기반이 아닌 시리즈: 자기 디렉토리의 에피소드 파일을 그대로 목록화한다
  const fs = fileSeries(series)
  if (fs) return NextResponse.json(await fs.list())

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
    .select('slug, nickname, birth_date')
    .in('slug', slugs)
    .eq('profile_type', 'CELEB')
  const birthMap = new Map((profiles ?? []).map(p => [p.slug, p.birth_date]))
  const nicknameMap = new Map((profiles ?? []).map(p => [p.slug, p.nickname]))

  const list = await Promise.all(items.map(async ({ id: name, status, group }) => {
    // 작업 시작 안 한 인물 폴더(ko/en 본문 부재)는 loadEpisode 가 실패할 수 있다. 폴백으로 최소 정보만 반환.
    const fallbackNickname = nicknameMap.get(toSlug(name)) ?? name
    let nickname = fallbackNickname
    let booksCount = 0
    let hasShorts = false
    try {
      const ep = await loadEpisode(series, name)
      nickname = ep.host?.nickname ?? fallbackNickname
      booksCount = ep.books?.length ?? 0
      hasShorts = !!ep.shorts
    } catch { /* 본문 없음 — 카드만 표시 (DB nickname 폴백 유지) */ }
    const wavs = await scanLocalWavs(name).catch(() => [] as Array<{ size: number }>)
    return {
      name,
      nickname,
      booksCount,
      hasShorts,
      voiceCount: wavs.length,
      voiceSizeMB: +(wavs.reduce((s: number, w: { size: number }) => s + w.size, 0) / 1024 / 1024).toFixed(1),
      birthYear: (() => { const d = birthMap.get(toSlug(name)); if (!d) return null; const y = parseInt(d, 10); return isNaN(y) ? null : y })(),
      status,
      group,
    }
  }))
  return NextResponse.json(list)
}

/** POST: 스캐폴딩 — DB 데이터 → JSON 뼈대 생성 */
export async function POST(req: Request, { params }: { params: Promise<{ series: string }> }) {
  const { series } = await params
  if (!isValidSeries(series)) return NextResponse.json({ error: 'invalid series' }, { status: 404 })

  // 책 기반이 아닌 시리즈: 빈 에피소드 생성 (영상 명칭·음악만 받고 내용은 편집기에서 채운다)
  const fs = fileSeries(series)
  if (fs) {
    const { name, title, music } = await req.json()
    if (!name?.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 })
    try {
      await fs.create(name.trim(), { title, music })
      return NextResponse.json({ ok: true, name: name.trim() })
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      const status = msg.includes('already exists') ? 409 : 400
      return NextResponse.json({ error: msg }, { status })
    }
  }

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

  // 콘텐츠 목록 조회 — 서재 탐방은 비도서도 category를 붙여 다룬다.
  const { data: userContents, error: contentsError } = await supabase
    .from('user_contents')
    .select(`
      id, content_id, review, source_url,
      contents!inner(
        id, type, release_date,
        content_locales(title, creator, thumbnail_url, locale)
      )
    `)
    .eq('user_id', profile.id)
    .eq('visibility', 'public')
    .in('contents.type', ['BOOK', 'VIDEO', 'GAME', 'MUSIC'])
  if (contentsError) {
    return NextResponse.json({ error: contentsError.message }, { status: 500 })
  }

  // 콘텐츠 뼈대 생성. 외부 표지 URL은 원본 스냅샷으로만 두고 렌더 경로에는 넣지 않는다.
  const books = (userContents ?? []).map((uc: Record<string, unknown>) => {
    const content = uc.contents as Record<string, unknown>
    const locales = (content?.content_locales ?? []) as Array<{
      title: string
      creator: string
      thumbnail_url: string | null
      locale: string
    }>
    const ko = locales.find(l => l.locale === 'ko')
    const display = ko ?? locales[0]
    const contentId = (uc.content_id as string) ?? (content?.id as string) ?? ''
    const contentType = String(content?.type ?? 'BOOK')
    const thumbnailSourceUrl = ko?.thumbnail_url ?? ''

    return {
      contentId,
      userContentId: (uc.id as string) ?? '',
      title: display?.title ?? '',
      creator: display?.creator ?? '',
      thumbnail_url: thumbnailSourceUrl && contentId
        ? `covers/content/${contentId}/ko.webp`
        : '',
      ...(thumbnailSourceUrl
        ? {
            thumbnailSourceUrl,
            thumbnailSourceLocale: 'ko',
          }
        : {}),
      ...(contentType === 'BOOK' ? {} : { category: contentType }),
      summary: '', // AI 초안 대상
      contextMain: '', // AI 초안 대상
      quotePairs: [],
      stats: {
        publishYear: String(content?.release_date ?? '').slice(0, 4),
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
      title: profile.title ?? '',
      featuredQuote: '',
      philosophy: '', // AI 초안 대상
      // 불변 셀럽 ID — slug·표기가 바뀌어도 보이스·셀럽 정보를 다시 잇는 열쇠
      celebId: profile.id,
      elevenlabsVoiceId: profile.voice_id_ko ?? '',
    },
    books,
  }

  // 새 에피소드도 즉시 책별 신구조로 만든다. 구형 통짜 ko.json을 새로 생산하지 않는다.
  if (!/^[a-z0-9][a-z0-9_-]*$/i.test(slug)) {
    return NextResponse.json({ error: 'invalid slug' }, { status: 400 })
  }
  const targetDir = path.join(EPISODES_DIR, slug)
  const tempDir = path.join(
    EPISODES_DIR,
    `_scaffold-${slug}-${process.pid}-${Date.now()}`,
  )

  try {
    await mkdir(path.join(tempDir, 'books'), { recursive: true })
    await writeJson(path.join(tempDir, '_status.json'), { status: 'todo' })
    const meta = {
      narrator: episode.narrator,
      host: episode.host,
    }
    await writeJson(path.join(tempDir, 'meta.ko.json'), meta)

    for (let index = 0; index < books.length; index++) {
      const book = books[index]
      const folder = `${String(index + 1).padStart(2, '0')}-${bookFolderSegment(book.title)}`
      const bookDir = path.join(tempDir, 'books', folder)
      await mkdir(bookDir, { recursive: true })
      await writeJson(path.join(bookDir, 'book.ko.json'), book)
    }

    await rename(tempDir, targetDir)
  } catch (error) {
    await rm(tempDir, { recursive: true, force: true })
    const message = error instanceof Error ? error.message : String(error)
    const status = /exist|already/i.test(message) ? 409 : 500
    return NextResponse.json({ error: message }, { status })
  }

  return NextResponse.json({ ok: true, name: slug, booksCount: books.length })
}
