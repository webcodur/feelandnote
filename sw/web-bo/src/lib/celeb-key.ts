import { createClient } from '@/lib/supabase/server'

/**
 * 인물을 가리키는 값은 두 가지다 — 불변 셀럽 ID(UUID)와 주소용 연결 키(slug).
 * 화면·창구마다 손에 쥔 것이 달라 둘 다 받고, 여기서 어느 컬럼으로 찾을지 가린다.
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function celebKeyColumn(key: string): 'id' | 'slug' {
  return UUID_RE.test(key) ? 'id' : 'slug'
}

/** 셀럽 ID·slug 어느 쪽을 받아도 불변 ID로 바꿔 준다. 없으면 null */
export async function resolveCelebId(key: string): Promise<string | null> {
  if (celebKeyColumn(key) === 'id') return key
  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('slug', key)
    .eq('profile_type', 'CELEB')
    .maybeSingle()
  return (data as { id?: string } | null)?.id ?? null
}
