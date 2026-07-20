/**
 * 신화·전설·허구 인물 명세를 profiles에 동기화한다.
 *
 * 기본은 dry-run이며 --apply를 붙여야 실제 DB를 변경한다.
 * 신규 인물은 auth.users와 profiles를 같은 id로 생성하고, 기존 fiction 인물은
 * 명세와 다른 기본 정보·가상 독백만 갱신한다. avatar_url은 건드리지 않는다.
 *
 * 실행 예:
 *   node --env-file=.env --import tsx scripts/sync-fiction-profiles.ts \
 *     --file ../remotion/public/factions/Homer-Iliad/_docs/fiction-profiles.ko.json
 *   node --env-file=.env --import tsx scripts/sync-fiction-profiles.ts \
 *     --file ../remotion/public/factions/Homer-Iliad/_docs/fiction-profiles.ko.json --apply
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

type SourceRef = {
  work: string
  passages: string
  url: string
}

type FictionProfileInput = {
  slug: string
  nickname: string
  nickname_en: string
  profession: string
  title: string
  nationality: string
  gender: boolean | null
  birth_date?: string | null
  death_date?: string | null
  bio: string
  virtual_monologue: string
  sources: SourceRef[]
}

type Manifest = {
  episode: string
  people: FictionProfileInput[]
}

type ExistingProfile = {
  id: string
  slug: string | null
  nickname: string | null
  nickname_en: string | null
  profession: string | null
  title: string | null
  nationality: string | null
  gender: boolean | null
  birth_date: string | null
  death_date: string | null
  bio: string | null
  virtual_monologue: string | null
  celeb_tier: string | null
  profile_type: string | null
}

const argValue = (name: string): string | null => {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] ?? null : null
}

const fileArg = argValue('--file')
const apply = process.argv.includes('--apply')

if (!fileArg) throw new Error('--file <명세 JSON>이 필요합니다.')
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL과 SUPABASE_SERVICE_ROLE_KEY가 필요합니다.')
}

const manifest = JSON.parse(readFileSync(resolve(process.cwd(), fileArg), 'utf8')) as Manifest
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

const allowedProfessions = new Set([
  'leader',
  'politician',
  'commander',
  'entrepreneur',
  'investor',
  'humanities_scholar',
  'social_scientist',
  'scientist',
  'director',
  'musician',
  'visual_artist',
  'author',
  'actor',
  'influencer',
  'athlete',
  'other',
])

function validateManifest(input: Manifest) {
  if (!input.episode?.trim()) throw new Error('episode이 비어 있습니다.')
  if (!Array.isArray(input.people) || input.people.length === 0) {
    throw new Error('people이 비어 있습니다.')
  }

  const slugs = new Set<string>()
  const nicknames = new Set<string>()
  const englishNames = new Set<string>()

  for (const person of input.people) {
    if (!person.slug || !person.nickname || !person.nickname_en) {
      throw new Error(`필수 이름값 누락: ${JSON.stringify(person)}`)
    }
    if (slugs.has(person.slug)) throw new Error(`slug 중복: ${person.slug}`)
    if (nicknames.has(person.nickname)) throw new Error(`nickname 중복: ${person.nickname}`)
    if (englishNames.has(person.nickname_en)) throw new Error(`nickname_en 중복: ${person.nickname_en}`)
    slugs.add(person.slug)
    nicknames.add(person.nickname)
    englishNames.add(person.nickname_en)

    if (!allowedProfessions.has(person.profession)) {
      throw new Error(`${person.slug}: 알 수 없는 profession ${person.profession}`)
    }
    if (!person.title || person.title.length > 8) {
      throw new Error(`${person.slug}: title은 1~8자여야 합니다.`)
    }
    if (!person.bio || person.bio.length > 100) {
      throw new Error(`${person.slug}: bio는 1~100자여야 합니다.`)
    }
    if (!person.virtual_monologue || person.virtual_monologue.length < 450) {
      throw new Error(`${person.slug}: virtual_monologue가 450자 미만입니다.`)
    }
    if (!/(나는|내가|나의|저는|제가|저의)/.test(person.virtual_monologue)) {
      throw new Error(`${person.slug}: 가상 독백에 1인칭 자기 지칭이 없습니다.`)
    }
    if (/—/.test(person.virtual_monologue)) {
      throw new Error(`${person.slug}: 가상 독백에 금지된 em dash가 있습니다.`)
    }
    if (/[一-鿿]/.test(person.virtual_monologue)) {
      throw new Error(`${person.slug}: 가상 독백에 한자가 있습니다.`)
    }
    if (!Array.isArray(person.sources) || person.sources.length === 0) {
      throw new Error(`${person.slug}: 원전 근거가 없습니다.`)
    }
  }
}

async function fetchExisting(client: SupabaseClient, people: FictionProfileInput[]) {
  const columns = [
    'id', 'slug', 'nickname', 'nickname_en', 'profession', 'title', 'nationality',
    'gender', 'birth_date', 'death_date', 'bio', 'virtual_monologue',
    'celeb_tier', 'profile_type',
  ].join(',')

  const [bySlug, byEnglishName] = await Promise.all([
    client.from('profiles').select(columns).in('slug', people.map((person) => person.slug)),
    client.from('profiles').select(columns).in('nickname_en', people.map((person) => person.nickname_en)),
  ])
  if (bySlug.error) throw bySlug.error
  if (byEnglishName.error) throw byEnglishName.error

  const rows = [...(bySlug.data ?? []), ...(byEnglishName.data ?? [])] as unknown as ExistingProfile[]
  return [...new Map(rows.map((row) => [row.id, row])).values()]
}

const updatableKeys = [
  'nickname',
  'nickname_en',
  'profession',
  'title',
  'nationality',
  'gender',
  'birth_date',
  'death_date',
  'bio',
  'virtual_monologue',
] as const

function desiredProfile(person: FictionProfileInput) {
  return {
    nickname: person.nickname,
    nickname_en: person.nickname_en,
    profession: person.profession,
    title: person.title,
    nationality: person.nationality || null,
    gender: person.gender,
    birth_date: person.birth_date || null,
    death_date: person.death_date || null,
    bio: person.bio,
    virtual_monologue: person.virtual_monologue,
    celeb_tier: 'fiction',
    profile_type: 'CELEB',
  }
}

function changedKeys(existing: ExistingProfile, person: FictionProfileInput) {
  const desired = desiredProfile(person)
  return updatableKeys.filter((key) => {
    if (key === 'nationality' && !existing[key] && !desired[key]) return false
    return existing[key] !== desired[key]
  })
}

async function createFictionProfile(client: SupabaseClient, person: FictionProfileInput) {
  const dummyId = crypto.randomUUID()
  const email = `celeb_${dummyId}@feelandnote.local`
  const password = crypto.randomUUID() + crypto.randomUUID()
  const { data: authData, error: authError } = await client.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (authError) throw authError

  const userId = authData.user.id
  try {
    const { error: profileError } = await client
      .from('profiles')
      .update({ ...desiredProfile(person), status: 'inactive', is_verified: false })
      .eq('id', userId)
    if (profileError) throw profileError

    const { data: createdProfile, error: createdProfileError } = await client
      .from('profiles')
      .select('slug')
      .eq('id', userId)
      .single()
    if (createdProfileError) throw createdProfileError
    if (createdProfile.slug !== person.slug) {
      throw new Error(
        `${person.nickname_en}: 생성된 slug ${createdProfile.slug}가 명세 ${person.slug}와 다릅니다.`,
      )
    }

    const [social, scores] = await Promise.all([
      client.from('user_social').upsert({
        user_id: userId,
        follower_count: 0,
        following_count: 0,
        friend_count: 0,
        influence: 0,
      }),
      client.from('user_scores').upsert({
        user_id: userId,
        activity_score: 0,
        title_bonus: 0,
        total_score: 0,
      }),
    ])
    if (social.error) throw social.error
    if (scores.error) throw scores.error
  } catch (error) {
    await client.auth.admin.deleteUser(userId)
    throw error
  }
}

async function main() {
  validateManifest(manifest)
  const existingRows = await fetchExisting(supabase, manifest.people)
  const bySlug = new Map(existingRows.filter((row) => row.slug).map((row) => [row.slug!, row]))
  const byEnglishName = new Map(
    existingRows.filter((row) => row.nickname_en).map((row) => [row.nickname_en!, row]),
  )

  let created = 0
  let updated = 0
  let skipped = 0

  for (const person of manifest.people) {
    const slugMatch = bySlug.get(person.slug)
    const nameMatch = byEnglishName.get(person.nickname_en)
    if (slugMatch && nameMatch && slugMatch.id !== nameMatch.id) {
      throw new Error(`${person.slug}: slug와 영문명이 서로 다른 기존 인물을 가리킵니다.`)
    }
    const existing = slugMatch ?? nameMatch

    if (!existing) {
      console.log(`[CREATE] ${person.slug}`)
      if (apply) await createFictionProfile(supabase, person)
      created += 1
      continue
    }
    if (existing.profile_type !== 'CELEB' || existing.celeb_tier !== 'fiction') {
      throw new Error(
        `${person.slug}: 기존 인물의 profile_type/celeb_tier가 CELEB/fiction이 아닙니다. ` +
        `(${existing.profile_type}/${existing.celeb_tier})`,
      )
    }
    if (existing.slug !== person.slug) {
      throw new Error(
        `${person.nickname_en}: 기존 slug ${existing.slug}가 명세 ${person.slug}와 다릅니다.`,
      )
    }

    const fields = changedKeys(existing, person)
    if (fields.length === 0) {
      console.log(`[SKIP] ${person.slug}`)
      skipped += 1
      continue
    }

    console.log(`[UPDATE] ${person.slug}: ${fields.join(', ')}`)
    if (apply) {
      const { error } = await supabase
        .from('profiles')
        .update(desiredProfile(person))
        .eq('id', existing.id)
      if (error) throw error
    }
    updated += 1
  }

  console.log(`\n${apply ? 'APPLY' : 'DRY-RUN'} ${manifest.episode}`)
  console.log(`CREATED: ${created}`)
  console.log(`UPDATED: ${updated}`)
  console.log(`SKIPPED: ${skipped}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
