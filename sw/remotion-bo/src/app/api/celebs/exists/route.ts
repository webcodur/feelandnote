import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * 셀럽 slug 실존 대조 — 팩션 인물의 본서비스(DB) 등록 여부 판정용.
 * slug가 적혀 있어도 DB에 없는 「유령 연결」을 가려내기 위해 실제 profiles를 조회한다.
 * POST { slugs: string[] } → { existing: string[] }
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const slugs: unknown = body?.slugs
  if (!Array.isArray(slugs) || slugs.some(s => typeof s !== 'string')) {
    return NextResponse.json({ error: 'slugs: string[] 필요' }, { status: 400 })
  }
  const unique = [...new Set(slugs as string[])].filter(Boolean)
  if (unique.length === 0) return NextResponse.json({ existing: [] })

  // status 필터 없음 — 신규 셀럽은 검수 전 inactive로 생성되므로, 등록 여부 판정은 활성 여부와 무관하다
  const { data, error } = await supabase
    .from('profiles')
    .select('slug')
    .eq('profile_type', 'CELEB')
    .in('slug', unique)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ existing: (data ?? []).map(r => r.slug) })
}
