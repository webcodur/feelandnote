'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import {
  getWebContentRevalidationSnapshot,
  revalidateWebContent,
} from '@/lib/revalidate-web'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { requireAdmin } from '@/lib/admin-auth'
import { validateExternalImageUrl } from '@/lib/external-image'

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
  record_count: number
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
  verified: boolean | null
  sources: Record<string, unknown> | null
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

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null
}

export async function getContent(contentId: string): Promise<ContentDetail | null> {
  const supabase = await createClient()

  const { data: content, error } = await supabase
    .from('contents')
    .select('*')
    .eq('id', contentId)
    .maybeSingle()

  if (error) throw new Error(`Failed to load content: ${error.message}`)
  if (!content) return null

  const [editionsResult, memberContentsResult, celebContentsResult, recordsResult] = await Promise.all([
    supabase
      .from('content_locales')
      .select('locale, title, creator, isbn, thumbnail_url, publisher, description, affiliate_url, verified, sources')
      .eq('content_id', contentId)
      .order('locale'),
    supabase
      .from('member_contents')
      .select(`
        status,
        created_at,
        account:user_accounts!member_contents_member_id_fkey (
          id,
          profile:member_profiles!member_profiles_id_fkey (nickname, avatar_url)
        )
      `)
      .eq('content_id', contentId)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('celeb_contents')
      .select(`
        status,
        created_at,
        celeb:celebs!celeb_contents_celeb_id_fkey (id, nickname, avatar_url)
      `)
      .eq('content_id', contentId)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('records')
      .select(`
        id,
        type,
        content,
        created_at,
        account:user_accounts!records_user_accounts_fkey (
          profile:member_profiles!member_profiles_id_fkey (nickname)
        )
      `)
      .eq('content_id', contentId)
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  for (const result of [editionsResult, memberContentsResult, celebContentsResult, recordsResult]) {
    if (result.error) throw result.error
  }

  const memberUsers = (memberContentsResult.data || []).map((entry) => {
    const account = firstRelation(entry.account)
    const profile = firstRelation(account?.profile)
    return {
      id: account?.id ?? '',
      nickname: profile?.nickname ?? null,
      avatar_url: profile?.avatar_url ?? null,
      status: entry.status,
      created_at: entry.created_at,
    }
  })
  const celebUsers = (celebContentsResult.data || []).map((entry) => {
    const celeb = firstRelation(entry.celeb)
    return {
      id: celeb?.id ?? '',
      nickname: celeb?.nickname ?? null,
      avatar_url: celeb?.avatar_url ?? null,
      status: entry.status,
      created_at: entry.created_at,
    }
  })

  return {
    ...content,
    editions: (editionsResult.data || []) as ContentEdition[],
    users: [...memberUsers, ...celebUsers]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10),
    records: (recordsResult.data || []).map(r => {
      const account = firstRelation(r.account)
      const profile = firstRelation(account?.profile)
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

export async function updateContentCover(input: {
  contentId: string
  locale: 'ko' | 'en'
  thumbnailUrl: string
  thumbnailSource: string
}): Promise<void> {
  await requireAdmin()

  const thumbnailUrl = input.thumbnailUrl.trim()
  if (thumbnailUrl) {
    const checked = validateExternalImageUrl(thumbnailUrl)
    if ('error' in checked) throw new Error(checked.error)
  }

  const admin = createAdminClient()
  const { data: current, error: readError } = await admin
    .from('content_locales')
    .select('sources')
    .eq('content_id', input.contentId)
    .eq('locale', input.locale)
    .maybeSingle()
  if (readError) throw readError
  if (!current) {
    throw new Error(`${input.locale.toUpperCase()} 판본이 없습니다. 판본 메타를 먼저 등록하세요.`)
  }

  const sources = {
    ...((current?.sources as Record<string, unknown> | null) ?? {}),
  }
  const thumbnailSource = input.thumbnailSource.trim()
  if (thumbnailSource) sources.thumbnail = thumbnailSource
  else delete sources.thumbnail

  const { error } = await admin
    .from('content_locales')
    .update({
      thumbnail_url: thumbnailUrl || null,
      sources: Object.keys(sources).length ? sources : null,
    })
    .eq('content_id', input.contentId)
    .eq('locale', input.locale)
  if (error) throw error

  revalidatePath('/contents')
  revalidatePath(`/contents/${input.contentId}`)
  // 표지는 인물 서가의 초기 HTML에도 들어간다. 작품·인물의 UUID와 공개 URL 별칭을 함께 비운다.
  await revalidateWebContent(input.contentId, { includeCelebLibraries: true })
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
  await requireAdmin()
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
    const { error } = await supabase.from('content_locales').upsert({
      content_id: contentId,
      locale: 'ko',
      ...(data.title && { title: data.title }),
      ...(data.creator && { creator: data.creator }),
      ...(data.description && { description: data.description }),
      ...(data.publisher && { publisher: data.publisher }),
    }, { onConflict: 'content_id,locale' })
    if (error) throw error
  }

  // content_locales 업데이트 (en)
  if (data.title_en || data.creator_en || data.isbn_en) {
    const { error } = await supabase.from('content_locales').upsert({
      content_id: contentId,
      locale: 'en',
      ...(data.title_en && { title: data.title_en }),
      ...(data.creator_en && { creator: data.creator_en }),
      ...(data.isbn_en && { isbn: data.isbn_en }),
    }, { onConflict: 'content_id,locale' })
    if (error) throw error
  }

  revalidatePath('/contents')
  revalidatePath(`/contents/${contentId}`)
  // 제목·창작자·isbn은 인물 서가 초기 HTML에도 들어간다. 설명·출판사·출간일은 작품 상세만 비운다.
  const includeCelebLibraries = [
    data.title,
    data.title_en,
    data.creator,
    data.creator_en,
    data.isbn_en,
  ].some((value) => value !== undefined)
  await revalidateWebContent(contentId, { includeCelebLibraries })
}

export async function updateAffiliateLinks(
  contentId: string,
  links: AffiliateLink[] | null
): Promise<void> {
  await requireAdmin()
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
  // 구매 링크는 작품 상세에서만 쓴다. 인물 서가 전체를 다시 만들지 않는다.
  await revalidateWebContent(contentId)
}

/** 단일 플랫폼 링크를 upsert(추가/수정)하거나 삭제한다. url이 빈 문자열이면 해당 플랫폼 제거. */
export async function upsertAffiliatePlatform(
  contentId: string,
  platform: string,
  url: string,
  locale: string = 'ko'
): Promise<void> {
  await requireAdmin()
  const supabase = await createClient()

  // 현재 값 조회 (content_locales에서 읽기)
  const { data, error: localeError } = await supabase
    .from('content_locales')
    .select('affiliate_url')
    .eq('content_id', contentId)
    .eq('locale', locale)
    .single()

  if (localeError) throw localeError

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
  if (error) throw error

  revalidatePath('/contents')
  revalidatePath(`/contents/${contentId}`)
  await revalidateWebContent(contentId)
}

export async function deleteContent(contentId: string): Promise<void> {
  await requireAdmin()
  const admin = createAdminClient()

  // 대표 원전은 먼저 지정을 해제해야 한다. 콘텐츠 삭제가 FK에서 막히기 전에 안내한다.
  const { data: fictionSource, error: fictionSourceError } = await admin
    .from('fiction_source_contents')
    .select('content_id')
    .eq('content_id', contentId)
    .maybeSingle()
  if (fictionSourceError) throw fictionSourceError
  if (fictionSource) {
    throw new Error('픽션 대표 원전으로 지정된 콘텐츠입니다. 픽션 원전 관리에서 지정을 먼저 해제하세요.')
  }

  // 삭제 뒤에는 external_id와 celeb_contents 연쇄 삭제로 공개 URL 별칭을 찾을 수 없다.
  const webCacheSnapshot = await getWebContentRevalidationSnapshot(contentId, true)

  const { error } = await admin
    .from('contents')
    .delete()
    .eq('id', contentId)

  if (error) throw error

  revalidatePath('/contents')
  // contents + member_contents + celeb_contents + records 연쇄 삭제
  // 삭제는 목록 구성까지 바꾸므로 도메인도 함께 비운다
  await revalidateWebContent(webCacheSnapshot, {
    listDomains: [CACHE_TAGS.CONTENTS, CACHE_TAGS.CELEBS],
  })
}
