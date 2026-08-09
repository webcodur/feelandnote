import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { guardAdminRoute } from '@/lib/admin-route'

// 이식 시 교체: 원본의 `@/lib/supabase`(anon 클라이언트 + createAdminClient) 대신 이 앱의 관례를 쓴다 —
// 읽기는 `@/lib/supabase/server` 의 createClient(), 쓰기는 `@/lib/supabase/admin` 의 createAdminClient().
// 이식 시 추가: 이 앱의 `/api/**` 는 미들웨어가 없어 그냥 열려 있으므로 관리자 확인을 앞에 둔다.
//   (service role 로 프로필을 고치는 PUT 이 있어 특히 필요하다.)

// 경로 파라미터가 불변 셀럽 ID(UUID)인지 slug 인지 가린다. 팩션 인물은 celebId(불변)로 잇는 게 원칙이라
// 둘 다 받아 같은 라우트로 처리한다(UUID 면 id 컬럼, 아니면 slug 컬럼으로 조회).
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const keyColumn = (key: string) => (UUID_RE.test(key) ? 'id' : 'slug')

/**
 * GET /api/celebs/[slug]/voice
 * 현재 DB에 저장된 voice_id_ko / voice_id_en 조회. [slug] 자리에 불변 셀럽 ID(UUID)도 받는다.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const denied = await guardAdminRoute()
  if (denied) return denied

  const { slug } = await params
  if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 })

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('celebs')
    .select('id, slug, nickname, gender, voice_id_ko, voice_id_en')
    .eq(keyColumn(slug), slug)
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'celeb not found' }, { status: 404 })
  return NextResponse.json(data)
}

/**
 * PUT /api/celebs/[slug]/voice
 * body: { locale: 'ko'|'en', voiceId: string }
 * celebs.voice_id_ko / voice_id_en을 업데이트한다(인물 단위 영구 저장).
 */
export async function PUT(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const denied = await guardAdminRoute()
  if (denied) return denied

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
  const { data, error } = await admin
    .from('celebs')
    .update({ [col]: voiceId || null })
    .eq(keyColumn(slug), slug)
    .select('id')
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'celeb not found' }, { status: 404 })
  return NextResponse.json({ ok: true, slug, locale, voiceId })
}
