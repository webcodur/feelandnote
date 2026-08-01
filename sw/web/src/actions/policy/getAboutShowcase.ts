/*
  파일명: /actions/policy/getAboutShowcase.ts
  기능: 서비스 소개 페이지 지향점 구획에 붙는 실물 자료 조회
  책임: 네 항목(얼굴·진영·감상 경위·내 기록)이 각각 무엇을 만든다고 말하는지를
        실제 데이터로 한 컷씩 보여 준다. 새 자산을 만들지 않고 이미 서비스에 있는 것만 쓴다.
*/ // ------------------------------

'use server'

import { unstable_cache } from 'next/cache'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { toTeamImages } from '@feelandnote/shared/lib/faction-team-image'
import { STATIC_REVALIDATE } from '@/lib/cache'
import { createStaticClient } from '@/lib/supabase/static'

/**
 * 그림을 눌렀을 때 뜨는 안내.
 *
 * 예시 그림은 다른 화면으로 넘기지 않는다. 대신 "이게 누구/무엇인지"만 그 자리에서 알려 준다.
 */
export interface AboutInfo {
  heading: string
  subheading?: string
  /** 생몰·국적처럼 짧은 항목 */
  facts: string[]
  /** 소개 한 대목 */
  body?: string
}

export interface AboutFace {
  slug: string | null
  name: string
  avatarUrl: string
  /** 사망 연도 표기. 사진이 남을 수 없던 시대라는 근거로 얼굴 밑에 붙는다 */
  deathLabel: string
  info: AboutInfo
}

export interface AboutTeamShot {
  url: string
  label: string | null
  tagName: string
  tagSlug: string | null
  info: AboutInfo
}

export interface AboutCover {
  title: string
  thumbnailUrl: string
}

/** 작품 하나와 그 작품에 대해 본인이 남긴 말. 둘은 반드시 같은 작품이어야 한다 */
export interface AboutJourneyItem extends AboutCover {
  quote: string
  info: AboutInfo
}

/** 한 사람이 무엇을 보고 무슨 말을 남겼는지 한 장면으로 보여 주기 위한 묶음 */
export interface AboutJourney {
  name: string
  slug: string | null
  avatarUrl: string
  /** 이 사람이 누구인지 알려 주는 안내 */
  face: AboutInfo
  items: AboutJourneyItem[]
}

/** 기록 한 건과 그 근거가 된 자료. "확인된 것만 싣는다"는 말을 실물로 보인다 */
export interface AboutEvidence {
  celebName: string
  avatarUrl: string
  workTitle: string
  thumbnailUrl: string | null
  excerpt: string
  sourceUrl: string
  sourceHost: string
}

export interface AboutShowcase {
  faces: AboutFace[]
  teamShots: AboutTeamShot[]
  journey: AboutJourney | null
  evidence: AboutEvidence | null
  /** "지금 이 안에 있는 것" 구획에 세우는 실제 수치. 글에 숫자를 박아 두면 이내 사실과 어긋난다 */
  counts: { celebs: number; records: number; factions: number }
}

/**
 * 첫 항목에 세우는 얼굴.
 *
 * 자동으로 뽑으면 조회수·기록 수가 손대는 대로 흔들려 낯선 인물이 앞에 선다.
 * 사진술 이전에 살았고 이름이 널리 알려진 사람을 한국·영미에서 반씩 고정한다.
 * 인물이 지워지거나 얼굴이 빠지면 그 자리는 자동으로 비고 나머지가 그대로 선다.
 */
const FACE_SLUGS = [
  'sejong-the-great',
  'william-shakespeare',
  'yi-sun-sin',
  'isaac-newton',
  'gwanggaeto-the-great',
  'benjamin-franklin',
  'jeong-yak-yong',
  'thomas-jefferson',
] as const

/** 세 번째 항목의 장면에 세울 인물 후보. 앞에서부터 자료가 갖춰진 사람을 쓴다 */
const JOURNEY_SLUGS = ['elon-musk', 'bill-gates', 'park-chan-wook', 'quentin-tarantino'] as const

/**
 * 장면에 세울 작품을 못박는다.
 *
 * 자료에서 아무 기록이나 집으면 말씨가 제각각이고(대개 평서체) 그 사람이 드러나지도 않는다.
 * 화면에 세울 세 권만 골라 두고, 그 기록은 정중한 말씨로 다듬어 두었다.
 * 목록에 없거나 기록이 사라진 작품은 자동으로 빠지고 남은 것만 선다.
 */
const JOURNEY_CONTENT_IDS: Record<string, readonly string[]> = {
  'elon-musk': [
    'f1a2b3c4-5d6e-7f80-9a1b-2c3d4e5f6a7b', // 파운데이션
    '6d3fb602-14e4-473b-88ed-652ee986757b', // 차라투스트라는 이렇게 말했다
    '6b6937bb-e041-4750-916e-12988089fe02', // 호빗
  ],
}

/** 장면에 세우는 작품 수 */
const JOURNEY_ITEMS = 3

/**
 * 근거를 보일 기록의 인물 후보.
 *
 * 첫 항목에 얼굴이 선 사람을 앞에 둔다. 같은 사람이 위아래로 이어지면
 * "이 사람의 기록이 이렇게 만들어졌다"가 한눈에 읽힌다.
 */
const EVIDENCE_SLUGS = ['isaac-newton', 'sejong-the-great', 'william-shakespeare', 'bill-gates'] as const

/** "1450-03-30" → 1450, "-399" → -399 */
function toYear(raw: string | null): number | null {
  if (!raw) return null
  const bc = raw.startsWith('-')
  const year = Number.parseInt(bc ? raw.slice(1, 5) : raw.slice(0, 4), 10)
  if (!Number.isFinite(year)) return null
  return bc ? -year : year
}

function yearText(year: number, isEn: boolean): string {
  return year < 0 ? (isEn ? `${-year} BC` : `기원전 ${-year}`) : `${year}`
}

/** 얼굴 밑에 붙는 짧은 표기 */
function toDeathLabel(raw: string | null, isEn: boolean): string {
  const year = toYear(raw)
  if (year === null) return ''
  if (year < 0) return yearText(year, isEn)
  return isEn ? `d. ${year}` : `${year}년 몰`
}

/** 안내에 넣을 생몰 한 줄 */
function toLifespan(birth: string | null, death: string | null, isEn: boolean): string | null {
  const b = toYear(birth)
  const d = toYear(death)
  if (b === null && d === null) return null
  const left = b === null ? '?' : yearText(b, isEn)
  const right = d === null ? '?' : yearText(d, isEn)
  return `${left} ~ ${right}`
}

/** 소개 문단에서 안내에 얹을 앞 대목만 자른다 */
function toBrief(text: string | null, max = 150): string | undefined {
  if (!text) return undefined
  const flat = text.replace(/\s+/g, ' ').trim()
  if (!flat) return undefined
  return flat.length <= max ? flat : `${flat.slice(0, max).trimEnd()}…`
}

async function fetchFaces(
  supabase: ReturnType<typeof createStaticClient>,
  isEn: boolean
): Promise<AboutFace[]> {
  const { data } = await supabase
    .from('profiles')
    .select(
      'slug, nickname, nickname_en, avatar_url, death_date, birth_date, title, title_en, bio, bio_en, profession'
    )
    .in('slug', FACE_SLUGS as unknown as string[])
    .eq('status', 'active')
    .not('avatar_url', 'is', null)

  const bySlug = new Map((data ?? []).map((row) => [row.slug, row]))
  const faces: AboutFace[] = []
  for (const slug of FACE_SLUGS) {
    const row = bySlug.get(slug)
    if (!row?.avatar_url) continue
    const name = (isEn ? row.nickname_en : row.nickname) || row.nickname
    const lifespan = toLifespan(row.birth_date, row.death_date, isEn)
    faces.push({
      slug: row.slug,
      name,
      avatarUrl: row.avatar_url,
      deathLabel: toDeathLabel(row.death_date, isEn),
      info: {
        heading: name,
        subheading: (isEn ? row.title_en : row.title) || undefined,
        facts: [row.profession, lifespan].filter((v): v is string => Boolean(v)),
        body: toBrief(isEn ? row.bio_en : row.bio),
      },
    })
  }
  return faces
}

async function fetchJourney(
  supabase: ReturnType<typeof createStaticClient>,
  locale: string,
  isEn: boolean
): Promise<AboutJourney | null> {
  const { data: people } = await supabase
    .from('profiles')
    .select(
      'id, slug, nickname, nickname_en, avatar_url, title, title_en, bio, bio_en, profession, birth_date, death_date'
    )
    .in('slug', JOURNEY_SLUGS as unknown as string[])
    .eq('status', 'active')
    .not('avatar_url', 'is', null)

  for (const slug of JOURNEY_SLUGS) {
    const person = (people ?? []).find((p) => p.slug === slug)
    if (!person?.avatar_url) continue

    const pinned = JOURNEY_CONTENT_IDS[slug]
    if (!pinned?.length) continue

    // user_contents와 content_locales는 contents를 거쳐 이어지므로 한 번에 조인하지 않고 나눠 읽는다
    const reviewField = isEn ? 'review_en' : 'review'
    const { data: rows } = await supabase
      .from('user_contents')
      .select(`content_id, ${reviewField}`)
      .eq('user_id', person.id)
      .in('content_id', pinned as unknown as string[])
      .not(reviewField, 'is', null)

    const reviewByContent = new Map<string, string>()
    for (const row of rows ?? []) {
      const r = row as unknown as Record<string, string | null>
      const review = r[reviewField]
      if (r.content_id && review && review.trim().length > 40) {
        reviewByContent.set(r.content_id, review)
      }
    }
    if (reviewByContent.size === 0) continue

    const { data: locales } = await supabase
      .from('content_locales')
      .select('content_id, title, thumbnail_url, creator, description')
      .in('content_id', [...reviewByContent.keys()])
      .eq('locale', locale === 'en' ? 'en' : 'ko')
      .not('thumbnail_url', 'is', null)
      .limit(60)

    // 못박아 둔 순서대로 세운다. 기록 앞 대목을 그대로 쓰므로 말씨는 자료가 쥔다
    const byContent = new Map((locales ?? []).map((loc) => [loc.content_id, loc]))
    const items: AboutJourneyItem[] = []
    for (const contentId of pinned) {
      if (items.length >= JOURNEY_ITEMS) break
      const loc = byContent.get(contentId)
      const review = reviewByContent.get(contentId)
      if (!loc?.thumbnail_url || !review) continue
      items.push({
        title: loc.title,
        thumbnailUrl: loc.thumbnail_url,
        quote: toBrief(review, 110) ?? '',
        info: {
          heading: loc.title,
          subheading: loc.creator || undefined,
          facts: [],
          body: toBrief(review, 300),
        },
      })
    }
    if (items.length < 2) continue

    const name = (isEn ? person.nickname_en : person.nickname) || person.nickname
    return {
      name,
      slug: person.slug,
      avatarUrl: person.avatar_url,
      face: {
        heading: name,
        subheading: (isEn ? person.title_en : person.title) || undefined,
        facts: [
          person.profession,
          toLifespan(person.birth_date, person.death_date, isEn),
        ].filter((v): v is string => Boolean(v)),
        body: toBrief(isEn ? person.bio_en : person.bio),
      },
      items,
    }
  }
  return null
}

async function fetchEvidence(
  supabase: ReturnType<typeof createStaticClient>,
  locale: string,
  isEn: boolean
): Promise<AboutEvidence | null> {
  const { data: people } = await supabase
    .from('profiles')
    .select('id, slug, nickname, nickname_en, avatar_url')
    .in('slug', EVIDENCE_SLUGS as unknown as string[])
    .eq('status', 'active')
    .not('avatar_url', 'is', null)

  for (const slug of EVIDENCE_SLUGS) {
    const matched = (people ?? []).find((p) => p.slug === slug)
    if (!matched?.avatar_url) continue

    const reviewField = isEn ? 'review_en' : 'review'
    const { data: rows } = await supabase
      .from('user_contents')
      .select(`content_id, source_url, ${reviewField}`)
      .eq('user_id', matched.id)
      .not('source_url', 'is', null)
      .not(reviewField, 'is', null)
      .limit(20)

    for (const row of rows ?? []) {
      const r = row as unknown as Record<string, string | null>
      const url = r.source_url ?? ''
      const review = r[reviewField] ?? ''
      if (!url.startsWith('http') || review.trim().length < 40 || !r.content_id) continue

      const { data: loc } = await supabase
        .from('content_locales')
        .select('title, thumbnail_url')
        .eq('content_id', r.content_id)
        .eq('locale', locale === 'en' ? 'en' : 'ko')
        .maybeSingle()
      if (!loc?.title) continue

      let host = ''
      try {
        host = new URL(url).hostname.replace(/^www\./, '')
      } catch {
        continue
      }

      return {
        celebName: (isEn ? matched.nickname_en : matched.nickname) || matched.nickname,
        avatarUrl: matched.avatar_url,
        workTitle: loc.title,
        thumbnailUrl: loc.thumbnail_url,
        excerpt: toBrief(review, 130) ?? '',
        sourceUrl: url,
        sourceHost: host,
      }
    }
  }
  return null
}

async function fetchAboutShowcase(locale: string): Promise<AboutShowcase> {
  const supabase = createStaticClient()
  const isEn = locale === 'en'

  const [faces, tagsRes, journey, evidence, celebCountRes, recordCountRes, factionCountRes] = await Promise.all([
    fetchFaces(supabase, isEn),
    supabase
      .from('celeb_tags')
      .select('name, name_en, slug, team_images, is_featured, parent_id, description, description_en')
      .not('team_images', 'is', null)
      .eq('is_fiction', false)
      .order('is_featured', { ascending: false, nullsFirst: false })
      .limit(40),
    fetchJourney(supabase, locale, isEn),
    fetchEvidence(supabase, locale, isEn),
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('profile_type', 'CELEB')
      .eq('status', 'active'),
    supabase
      .from('user_contents')
      .select('id, user:profiles!user_contents_user_id_fkey!inner(profile_type)', {
        count: 'exact',
        head: true,
      })
      .not('review', 'is', null)
      .eq('user.profile_type', 'CELEB'),
    supabase
      .from('celeb_tags')
      .select('id', { count: 'exact', head: true })
      .eq('is_fiction', false),
  ])

  // 같은 계열이 나란히 뜨면 "여러 분야를 묶는다"는 말과 어긋나므로 상위 묶음이 겹치지 않게 고른다
  const teamShots: AboutTeamShot[] = []
  const seenParent = new Set<string>()
  for (const tag of tagsRes.data ?? []) {
    if (teamShots.length >= 2) break
    const parentKey = tag.parent_id ?? tag.slug ?? tag.name
    if (seenParent.has(parentKey)) continue
    const shot = toTeamImages(tag.team_images)[0]
    if (!shot) continue
    seenParent.add(parentKey)
    const tagName = (isEn ? tag.name_en : tag.name) || tag.name
    const label = (isEn ? shot.labelEn : shot.label) ?? shot.label ?? null
    teamShots.push({
      url: shot.url,
      label,
      tagName,
      tagSlug: tag.slug,
      info: {
        heading: tagName,
        subheading: label ?? undefined,
        facts: [],
        body: toBrief(isEn ? tag.description_en : tag.description),
      },
    })
  }

  return {
    faces,
    teamShots,
    journey,
    evidence,
    counts: {
      celebs: celebCountRes.count ?? 0,
      records: recordCountRes.count ?? 0,
      factions: factionCountRes.count ?? 0,
    },
  }
}

export async function getAboutShowcase(locale: string): Promise<AboutShowcase> {
  return unstable_cache(
    () => fetchAboutShowcase(locale),
    ['about-showcase', locale],
    { revalidate: STATIC_REVALIDATE, tags: [CACHE_TAGS.CELEBS, CACHE_TAGS.CONTENTS, CACHE_TAGS.TAGS] }
  )()
}
