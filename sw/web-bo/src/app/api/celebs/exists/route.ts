import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { guardAdminRoute } from '@/lib/admin-route'

// 이식 시 교체: 원본의 anon 키 단일 클라이언트(`@/lib/supabase` 의 supabase) 대신
// 이 앱의 관례인 `@/lib/supabase/server` 의 createClient() (사용자 권한)를 쓴다.
// 이식 시 추가: 이 앱의 `/api/**` 는 미들웨어가 없어 그냥 열려 있으므로 관리자 확인을 앞에 둔다.

/**
 * 셀럽 slug 실존 대조 — 팩션 인물의 본서비스(DB) 등록 여부 판정용.
 * slug가 적혀 있어도 DB에 없는 「유령 연결」을 가려내기 위해 실제 profiles를 조회한다.
 * POST { slugs: string[] } → { existing: string[] }
 */
export async function POST(req: Request) {
  const denied = await guardAdminRoute()
  if (denied) return denied

  const body = await req.json().catch(() => null)
  const slugs: unknown = body?.slugs
  if (!Array.isArray(slugs) || slugs.some(s => typeof s !== 'string')) {
    return NextResponse.json({ error: 'slugs: string[] 필요' }, { status: 400 })
  }
  const unique = [...new Set(slugs as string[])].filter(Boolean)
  if (unique.length === 0) return NextResponse.json({ existing: [] })

  const supabase = await createClient()
  // status 필터 없음 — 신규 셀럽은 검수 전 inactive로 생성되므로, 등록 여부 판정은 활성 여부와 무관하다
  const { data, error } = await supabase
    .from('profiles')
    .select('slug')
    .eq('profile_type', 'CELEB')
    .in('slug', unique)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ existing: (data ?? []).map(r => r.slug) })
}
