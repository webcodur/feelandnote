'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export interface AffiliateLink {
  platform: string
  url: string
}

export interface Content {
  id: string
  external_id: string | null
  type: string
  release_date: string | null
  subtype: string | null
  external_source: string | null
  metadata: Record<string, unknown>
  created_at: string
  user_count: number
}

export interface ContentEdition {
  locale: string
  title: string | null
  creator: string | null
  isbn: string | null
  thumbnail_url: string | null
  publisher: string | null
  description: string | null
  affiliate_url: AffiliateLink[] | null
}

export interface ContentDetail extends Content {
  editions: ContentEdition[]
  users: {
    id: string
    nickname: string | null
    avatar_url: string | null
    status: string
    created_at: string
  }[]
  records: {
    id: string
    type: string
    content: string
    user: { nickname: string | null }
    created_at: string
  }[]
}

export async function getContent(contentId: string): Promise<ContentDetail | null> {
  const supabase = await createClient()

  const { data: content, error } = await supabase
    .from('contents')
    .select('*')
    .eq('id', contentId)
    .single()

  if (error || !content) return null

  // 에디션 정보
  const { data: editions } = await supabase
    .from('content_locales')
    .select('locale, title, creator, isbn, thumbnail_url, publisher, description, affiliate_url')
    .eq('content_id', contentId)
    .order('locale')

  // 이 콘텐츠를 등록한 사용자들
  const { data: userContents } = await supabase
    .from('user_contents')
    .select(`
      status,
      created_at,
      profiles:user_id (id, nickname, avatar_url)
    `)
    .eq('content_id', contentId)
    .order('created_at', { ascending: false })
    .limit(10)

  // 이 콘텐츠의 기록들
  const { data: records } = await supabase
    .from('records')
    .select(`
      id,
      type,
      content,
      created_at,
      profiles:user_id (nickname)
    `)
    .eq('content_id', contentId)
    .order('created_at', { ascending: false })
    .limit(10)

  // 총 사용자 수
  const { count: userCount } = await supabase
    .from('user_contents')
    .select('*', { count: 'exact', head: true })
    .eq('content_id', contentId)

  return {
    ...content,
    user_count: userCount || 0,
    editions: (editions || []) as ContentEdition[],
    users: (userContents || []).map(uc => {
      const profiles = uc.profiles as { id: string; nickname: string | null; avatar_url: string | null }[] | { id: string; nickname: string | null; avatar_url: string | null } | null
      const profile = Array.isArray(profiles) ? profiles[0] : profiles
      return {
        id: profile?.id ?? '',
        nickname: profile?.nickname ?? null,
        avatar_url: profile?.avatar_url ?? null,
        status: uc.status,
        created_at: uc.created_at,
      }
    }),
    records: (records || []).map(r => {
      const profiles = r.profiles as { nickname: string | null }[] | { nickname: string | null } | null
      const profile = Array.isArray(profiles) ? profiles[0] : profiles
      return {
        id: r.id,
        type: r.type,
        content: r.content,
        user: { nickname: profile?.nickname ?? null },
        created_at: r.created_at,
      }
    }),
  }
}

export async function updateContent(
  contentId: string,
  data: {
    title?: string
    title_en?: string | null
    creator?: string
    creator_en?: string | null
    isbn_en?: string | null
    description?: string
    publisher?: string
    release_date?: string
  }
): Promise<void> {
  const supabase = await createClient()

  // contents 테이블에는 release_date만 전송 (로케일 데이터는 content_locales에만)
  if (data.release_date !== undefined) {
    const { error } = await supabase
      .from('contents')
      .update({ release_date: data.release_date })
      .eq('id', contentId)
    if (error) throw error
  }

  // content_locales 업데이트 (ko)
  if (data.title || data.creator || data.description || data.publisher) {
    await supabase.from('content_locales').upsert({
      content_id: contentId,
      locale: 'ko',
      ...(data.title && { title: data.title }),
      ...(data.creator && { creator: data.creator }),
      ...(data.description && { description: data.description }),
      ...(data.publisher && { publisher: data.publisher }),
    }, { onConflict: 'content_id,locale' })
  }

  // content_locales 업데이트 (en)
  if (data.title_en || data.creator_en || data.isbn_en) {
    await supabase.from('content_locales').upsert({
      content_id: contentId,
      locale: 'en',
      ...(data.title_en && { title: data.title_en }),
      ...(data.creator_en && { creator: data.creator_en }),
      ...(data.isbn_en && { isbn: data.isbn_en }),
    }, { onConflict: 'content_id,locale' })
  }

  revalidatePath('/contents')
  revalidatePath(`/contents/${contentId}`)
}

export async function updateAffiliateLinks(
  contentId: string,
  links: AffiliateLink[] | null
): Promise<void> {
  const supabase = await createClient()

  const value = links && links.length > 0 ? links : null

  // content_locales에만 저장
  const { error } = await supabase.from('content_locales').upsert({
    content_id: contentId,
    locale: 'ko',
    affiliate_url: value,
  }, { onConflict: 'content_id,locale' })

  if (error) throw error

  revalidatePath('/contents')
  revalidatePath(`/contents/${contentId}`)
}

/** 단일 플랫폼 링크를 upsert(추가/수정)하거나 삭제한다. url이 빈 문자열이면 해당 플랫폼 제거. */
export async function upsertAffiliatePlatform(
  contentId: string,
  platform: string,
  url: string,
  locale: string = 'ko'
): Promise<void> {
  const supabase = await createClient()

  // 현재 값 조회 (content_locales에서 읽기)
  const { data } = await supabase
    .from('content_locales')
    .select('affiliate_url')
    .eq('content_id', contentId)
    .eq('locale', locale)
    .single()

  const current: AffiliateLink[] = (data?.affiliate_url as AffiliateLink[]) || []

  let next: AffiliateLink[]
  if (url.trim()) {
    // upsert
    const exists = current.some(l => l.platform === platform)
    next = exists
      ? current.map(l => l.platform === platform ? { platform, url: url.trim() } : l)
      : [...current, { platform, url: url.trim() }]
  } else {
    // 삭제
    next = current.filter(l => l.platform !== platform)
  }

  const value = next.length > 0 ? next : null

  // content_locales에만 저장
  const { error } = await supabase.from('content_locales').upsert({
    content_id: contentId,
    locale,
    affiliate_url: value,
  }, { onConflict: 'content_id,locale' })

  revalidatePath('/contents')
  revalidatePath(`/contents/${contentId}`)
}

export async function deleteContent(contentId: string): Promise<void> {
  const admin = createAdminClient()

  // 관련 데이터 삭제 (RLS 우회 필요)
  await admin.from('user_contents').delete().eq('content_id', contentId)
  await admin.from('records').delete().eq('content_id', contentId)

  const { error } = await admin
    .from('contents')
    .delete()
    .eq('id', contentId)

  if (error) throw error

  revalidatePath('/contents')
}
