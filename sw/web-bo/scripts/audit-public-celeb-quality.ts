/**
 * 사용자 웹에 노출되는 셀럽·세력도감 데이터의 구조/결측 1차 감사.
 *
 * 사실 검증이나 문체 판정을 대신하지 않는다. 전수 리서치 전에 깨진 구조, 빈 필드,
 * 지나치게 짧은 원고, 중복 대사와 유튜브 업로드 보호 범위를 한 번에 찾는 읽기 전용 도구다.
 *
 * 실행:
 *   pnpm exec tsx scripts/audit-public-celeb-quality.ts
 *   pnpm exec tsx scripts/audit-public-celeb-quality.ts --json
 */

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config({ path: path.resolve(process.cwd(), '.env'), quiet: true })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 없음')

const db = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const PAGE = 1000
const DIALOGUE_KEYS = [
  'greeting',
  'roll_call',
  'deploy',
  'battle_win',
  'battle_draw',
  'battle_lose',
  'clash_attack',
] as const
const INFLUENCE_AXES = ['political', 'strategic', 'tech', 'social', 'economic', 'cultural'] as const
const PERSONA_GROUPS = ['abilities', 'inner_virtues', 'outer_virtues', 'dispositions'] as const

type DbError = { message: string } | null
type PageResult<T> = { data: T[] | null; error: DbError }
type Json = Record<string, unknown>

type ProfileRow = {
  id: string
  slug: string | null
  nickname: string | null
  nickname_en: string | null
  avatar_url: string | null
  profession: string | null
  title: string | null
  title_en: string | null
  bio: string | null
  bio_en: string | null
  nationality: string | null
  birth_date: string | null
  death_date: string | null
  publication_status: string | null
  celeb_tier: string | null
  speech_tone: string | null
  consumption_philosophy: string | null
  consumption_philosophy_en: string | null
  virtual_monologue: string | null
  virtual_monologue_en: string | null
}

type DialogueRow = {
  celeb_id: string
  lines: Json | null
  lines_en: Json | null
}

type InfluenceRow = {
  celeb_id: string
  total_score: number | null
  transhistoricity_exp: string | null
  transhistoricity_exp_en: string | null
} & Record<`${(typeof INFLUENCE_AXES)[number]}_exp`, string | null>
  & Record<`${(typeof INFLUENCE_AXES)[number]}_exp_en`, string | null>

type PersonaRow = { celeb_id: string; persona: Json | null }

type CelebContentRow = {
  id: string
  celeb_id: string
  content_id: string
  review: string | null
  review_en: string | null
  source_url: string | null
}

type ContentRow = { id: string; type: string; external_source: string | null }
type LocaleRow = {
  content_id: string
  locale: string
  title: string | null
  creator: string | null
  thumbnail_url: string | null
  isbn: string | null
}

type AssignmentRow = {
  tag_id: string
  celeb_id: string
  short_desc: string | null
  short_desc_en: string | null
  long_desc: string | null
  long_desc_en: string | null
  quote: string | null
  quote_en: string | null
}

type EpisodeRow = { id: string; folder: string; registered: boolean; status: string }
type GroupRow = { id: string; episode_id: string; tag_id: string | null }
type ClusterRow = { id: string; group_id: string }
type FactionPersonRow = {
  id: string
  cluster_id: string
  celeb_id: string | null
  name: string
  quote: string | null
  quote_en: string | null
  quote_chunks: string[] | null
  quote_en_chunks: string[] | null
  quote_origin: string | null
  epithet: string | null
  epithet_en: string | null
}

type DialogueProblem = {
  celebId: string
  slug: string
  nickname: string
  /** 참고 정보다. 웹용 21개 개인 대사는 팩션 영상과 별개라 보호 판정에 쓰지 않는다. */
  inUploadedFactionCast: boolean
  missingKo: number
  legacyAnswer: boolean
  malformed: boolean
  shapeIssues: string[]
}

type MissingField = { field: string; count: number; examples: string[] }

async function allRows<T>(
  label: string,
  page: (from: number, to: number) => Promise<PageResult<T>>,
): Promise<T[]> {
  const out: T[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1)
    if (error) throw new Error(`${label} 조회 실패: ${error.message}`)
    const rows = data ?? []
    out.push(...rows)
    if (rows.length < PAGE) return out
  }
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function dialogueProblemScore(row: DialogueProblem): number {
  return Number(row.malformed) * 100
    + row.missingKo * 10
    + Number(row.legacyAnswer) * 50
}

function fieldAudit(rows: ProfileRow[], field: keyof ProfileRow): MissingField {
  const missing = rows.filter(row => !text(row[field]))
  return {
    field,
    count: missing.length,
    examples: missing.slice(0, 8).map(row => row.nickname ?? row.id),
  }
}

function percentile(values: number[], p: number): number {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p))]
}

async function main() {
  // 전수 표를 동시에 당기면 운영 DB statement timeout을 만들 수 있다. 큰 표부터 순차 페이징한다.
  const profiles = await allRows<ProfileRow>('celebs', async (from, to) => {
    const { data, error } = await db
      .from('celebs')
      .select('id, slug, nickname, nickname_en, avatar_url, profession, title, title_en, bio, bio_en, nationality, birth_date, death_date, publication_status, celeb_tier, speech_tone, consumption_philosophy, consumption_philosophy_en, virtual_monologue, virtual_monologue_en')
      .eq('publication_status', 'active')
      .order('id')
      .range(from, to)
    return { data: data as unknown as ProfileRow[] | null, error }
  })
  const dialogues = await allRows<DialogueRow>('celeb_dialogues', async (from, to) => {
    const { data, error } = await db.from('celeb_dialogues').select('celeb_id, lines, lines_en').order('celeb_id').range(from, to)
    return { data: data as unknown as DialogueRow[] | null, error }
  })
  const influences = await allRows<InfluenceRow>('celeb_influence', async (from, to) => {
    const exp = INFLUENCE_AXES.flatMap(axis => [`${axis}_exp`, `${axis}_exp_en`]).join(', ')
    const { data, error } = await db
      .from('celeb_influence')
      .select(`celeb_id, total_score, transhistoricity_exp, transhistoricity_exp_en, ${exp}`)
      .order('celeb_id')
      .range(from, to)
    return { data: data as unknown as InfluenceRow[] | null, error }
  })
  const personas = await allRows<PersonaRow>('celeb_persona', async (from, to) => {
    const { data, error } = await db.from('celeb_persona').select('celeb_id, persona').order('celeb_id').range(from, to)
    return { data: data as unknown as PersonaRow[] | null, error }
  })
  const celebContents = await allRows<CelebContentRow>('celeb_contents', async (from, to) => {
    const { data, error } = await db
      .from('celeb_contents')
      .select('id, celeb_id, content_id, review, review_en, source_url')
      .order('id')
      .range(from, to)
    return { data: data as unknown as CelebContentRow[] | null, error }
  })
  const contents = await allRows<ContentRow>('contents', async (from, to) => {
    const { data, error } = await db.from('contents').select('id, type, external_source').order('id').range(from, to)
    return { data: data as unknown as ContentRow[] | null, error }
  })
  const locales = await allRows<LocaleRow>('content_locales', async (from, to) => {
    const { data, error } = await db
      .from('content_locales')
      .select('content_id, locale, title, creator, thumbnail_url, isbn')
      .order('content_id')
      .order('locale')
      .range(from, to)
    return { data: data as unknown as LocaleRow[] | null, error }
  })
  const assignments = await allRows<AssignmentRow>('celeb_tag_assignments', async (from, to) => {
    const { data, error } = await db
      .from('celeb_tag_assignments')
      .select('tag_id, celeb_id, short_desc, short_desc_en, long_desc, long_desc_en, quote, quote_en')
      .order('tag_id')
      .order('celeb_id')
      .range(from, to)
    return { data: data as unknown as AssignmentRow[] | null, error }
  })
  const episodes = await allRows<EpisodeRow>('faction_episodes', async (from, to) => {
    const { data, error } = await db
      .from('faction_episodes')
      .select('id, folder, registered, status')
      .order('id')
      .range(from, to)
    return { data: data as unknown as EpisodeRow[] | null, error }
  })
  const groups = await allRows<GroupRow>('faction_groups', async (from, to) => {
    const { data, error } = await db
      .from('faction_groups')
      .select('id, episode_id, tag_id')
      .order('id')
      .range(from, to)
    return { data: data as unknown as GroupRow[] | null, error }
  })
  const clusters = await allRows<ClusterRow>('faction_clusters', async (from, to) => {
    const { data, error } = await db.from('faction_clusters').select('id, group_id').order('id').range(from, to)
    return { data: data as unknown as ClusterRow[] | null, error }
  })
  const factionPeople = await allRows<FactionPersonRow>('faction_people', async (from, to) => {
    const { data, error } = await db
      .from('faction_people')
      .select('id, cluster_id, celeb_id, name, quote, quote_en, quote_chunks, quote_en_chunks, quote_origin, epithet, epithet_en')
      .order('id')
      .range(from, to)
    return { data: data as unknown as FactionPersonRow[] | null, error }
  })

  const publicIds = new Set(profiles.map(row => row.id))
  const fullLight = profiles.filter(row => row.celeb_tier === 'full' || row.celeb_tier === 'light')
  const fullIds = new Set(profiles.filter(row => row.celeb_tier === 'full').map(row => row.id))
  const dialogueById = new Map(dialogues.map(row => [row.celeb_id, row]))
  const influenceById = new Map(influences.map(row => [row.celeb_id, row]))
  const personaById = new Map(personas.map(row => [row.celeb_id, row]))

  const lineupPath = path.resolve(process.cwd(), '../remotion/scripts/youtube/faction-lineup.json')
  const lineup = JSON.parse(await readFile(lineupPath, 'utf8')) as Record<string, { uploads?: Json }>
  const uploadedFolders = new Set(
    Object.entries(lineup)
      .filter(([, value]) => value.uploads && Object.keys(value.uploads).length > 0)
      .map(([folder]) => folder),
  )

  const episodeById = new Map(episodes.map(row => [row.id, row]))
  const groupById = new Map(groups.map(row => [row.id, row]))
  const clusterById = new Map(clusters.map(row => [row.id, row]))
  const factionEpisodeOf = (person: FactionPersonRow): EpisodeRow | undefined => {
    const cluster = clusterById.get(person.cluster_id)
    const group = cluster ? groupById.get(cluster.group_id) : undefined
    return group ? episodeById.get(group.episode_id) : undefined
  }
  const uploadedPeople = factionPeople.filter(person => {
    const episode = factionEpisodeOf(person)
    return !!episode && uploadedFolders.has(episode.folder)
  })
  const protectedCelebIds = new Set(uploadedPeople.flatMap(person => person.celeb_id ? [person.celeb_id] : []))

  const profileMissing = [
    'slug',
    'nickname',
    'nickname_en',
    'avatar_url',
    'profession',
    'title',
    'title_en',
    'bio',
    'bio_en',
  ].map(field => fieldAudit(profiles, field as keyof ProfileRow))

  const fullLightMissing = [
    'speech_tone',
    'consumption_philosophy',
    'consumption_philosophy_en',
    'virtual_monologue',
    'virtual_monologue_en',
  ].map(field => fieldAudit(fullLight, field as keyof ProfileRow))

  const influenceMissing = fullLight.filter(row => !influenceById.has(row.id))
  const influenceTextIncomplete = fullLight.filter(profile => {
    const row = influenceById.get(profile.id)
    if (!row) return false
    return INFLUENCE_AXES.some(axis => !text(row[`${axis}_exp`]) || !text(row[`${axis}_exp_en`]))
      || !text(row.transhistoricity_exp)
      || !text(row.transhistoricity_exp_en)
  })

  const personaMissing = fullLight.filter(row => !personaById.has(row.id))
  const personaIncomplete = fullLight.filter(profile => {
    const persona = personaById.get(profile.id)?.persona
    if (!persona) return false
    if (!text(persona.rationale_ko) || !text(persona.rationale_en)) return true
    return PERSONA_GROUPS.some(group => {
      const values = persona[group]
      if (!values || typeof values !== 'object' || Array.isArray(values)) return true
      return Object.values(values as Json).some(value => {
        if (!value || typeof value !== 'object' || Array.isArray(value)) return true
        const field = value as Json
        return typeof field.score !== 'number' || !text(field.reason_ko) || !text(field.reason_en)
      })
    })
  })

  const dialogueProblems: DialogueProblem[] = fullLight.map(profile => {
    const row = dialogueById.get(profile.id)
    const ko = row?.lines ?? null
    let malformed = !row || !ko
    const shapeIssues: string[] = []
    if (!row) shapeIssues.push('dialogue-row-missing')
    if (!ko) shapeIssues.push('lines-missing')
    let missingKo = 0

    for (const key of DIALOGUE_KEYS) {
      const koValues = ko?.[key]
      if (!Array.isArray(koValues) || koValues.length !== 3 || koValues.some(v => typeof v !== 'string')) {
        malformed = true
        shapeIssues.push(`ko.${key}:${Array.isArray(koValues) ? koValues.length : typeof koValues}`)
      }
      missingKo += Array.isArray(koValues) ? Math.max(0, 3 - koValues.filter(v => text(v)).length) : 3
    }

    return {
      celebId: profile.id,
      slug: profile.slug ?? profile.id,
      nickname: profile.nickname ?? profile.id,
      inUploadedFactionCast: protectedCelebIds.has(profile.id),
      missingKo,
      legacyAnswer: !!ko?.answer,
      malformed,
      shapeIssues,
    }
  })

  const rankedDialogueProblems = dialogueProblems
    .filter(row => row.missingKo || row.legacyAnswer || row.malformed)
    .sort((a, b) => {
      return dialogueProblemScore(b) - dialogueProblemScore(a) || a.slug.localeCompare(b.slug)
    })
  const scopeContents = celebContents.filter(row => fullIds.has(row.celeb_id))
  const contentById = new Map(contents.map(row => [row.id, row]))
  const profileById = new Map(profiles.map(row => [row.id, row]))
  const localesByContent = new Map<string, LocaleRow[]>()
  for (const row of locales) {
    if (!localesByContent.has(row.content_id)) localesByContent.set(row.content_id, [])
    localesByContent.get(row.content_id)!.push(row)
  }

  const contentIssuesByCeleb = new Map<string, {
    contentCount: number
    reviewMissingKo: number
    reviewMissingEn: number
    reviewThinKo: number
    reviewThinEn: number
    sourceMissing: number
    localeMissingKo: number
    localeMissingEn: number
    thumbnailMissingKo: number
    thumbnailMissingEn: number
    legacyBookSource: number
  }>()
  for (const row of scopeContents) {
    const issue = contentIssuesByCeleb.get(row.celeb_id) ?? {
      contentCount: 0,
      reviewMissingKo: 0,
      reviewMissingEn: 0,
      reviewThinKo: 0,
      reviewThinEn: 0,
      sourceMissing: 0,
      localeMissingKo: 0,
      localeMissingEn: 0,
      thumbnailMissingKo: 0,
      thumbnailMissingEn: 0,
      legacyBookSource: 0,
    }
    const rowLocales = localesByContent.get(row.content_id) ?? []
    const ko = rowLocales.find(locale => locale.locale === 'ko')
    const en = rowLocales.find(locale => locale.locale === 'en')
    const content = contentById.get(row.content_id)

    issue.contentCount += 1
    issue.reviewMissingKo += Number(!text(row.review))
    issue.reviewMissingEn += Number(!text(row.review_en))
    issue.reviewThinKo += Number(text(row.review).length > 0 && text(row.review).length < 80)
    issue.reviewThinEn += Number(text(row.review_en).length > 0 && text(row.review_en).length < 160)
    issue.sourceMissing += Number(!text(row.source_url))
    issue.localeMissingKo += Number(!ko)
    issue.localeMissingEn += Number(!en)
    issue.thumbnailMissingKo += Number(Boolean(ko) && !text(ko?.thumbnail_url))
    issue.thumbnailMissingEn += Number(Boolean(en) && !text(en?.thumbnail_url))
    issue.legacyBookSource += Number(content?.type === 'BOOK'
      && !['kakao_book', 'aladin', 'openlibrary'].includes(content.external_source ?? ''))
    contentIssuesByCeleb.set(row.celeb_id, issue)
  }
  const contentAuditQueue = [...contentIssuesByCeleb.entries()]
    .map(([celebId, issue]) => {
      const hardDefects = issue.reviewMissingKo
        + issue.reviewMissingEn
        + issue.sourceMissing
        + issue.localeMissingKo
        + issue.localeMissingEn
        + issue.thumbnailMissingKo
        + issue.thumbnailMissingEn
        + issue.legacyBookSource
      const thinSignals = issue.reviewThinKo + issue.reviewThinEn
      const profile = profileById.get(celebId)
      return {
        celebId,
        slug: profile?.slug ?? '',
        nickname: profile?.nickname ?? celebId,
        hardDefects,
        thinSignals,
        ...issue,
      }
    })
    .filter(row => row.hardDefects > 0 || row.thinSignals > 0)
    .sort((a, b) => {
      return b.hardDefects - a.hardDefects
        || b.thinSignals - a.thinSignals
        || b.contentCount - a.contentCount
        || a.slug.localeCompare(b.slug)
    })

  const contentAudit = {
    rows: scopeContents.length,
    fullProfilesWithoutContent: profiles
      .filter(row => row.celeb_tier === 'full')
      .filter(profile => !scopeContents.some(row => row.celeb_id === profile.id))
      .map(row => row.nickname ?? row.id),
    reviewMissingKo: scopeContents.filter(row => !text(row.review)).length,
    reviewMissingEn: scopeContents.filter(row => !text(row.review_en)).length,
    reviewThinKo: scopeContents.filter(row => text(row.review).length > 0 && text(row.review).length < 80).length,
    reviewThinEn: scopeContents.filter(row => text(row.review_en).length > 0 && text(row.review_en).length < 160).length,
    sourceMissing: scopeContents.filter(row => !text(row.source_url)).length,
    localeMissingKo: scopeContents.filter(row => !(localesByContent.get(row.content_id) ?? []).some(loc => loc.locale === 'ko')).length,
    localeMissingEn: scopeContents.filter(row => !(localesByContent.get(row.content_id) ?? []).some(loc => loc.locale === 'en')).length,
    thumbnailMissingKo: scopeContents.filter(row => {
      const ko = (localesByContent.get(row.content_id) ?? []).find(loc => loc.locale === 'ko')
      return !!ko && !text(ko.thumbnail_url)
    }).length,
    thumbnailMissingEn: scopeContents.filter(row => {
      const en = (localesByContent.get(row.content_id) ?? []).find(loc => loc.locale === 'en')
      return !!en && !text(en.thumbnail_url)
    }).length,
    legacyBookSource: scopeContents.filter(row => {
      const content = contentById.get(row.content_id)
      return content?.type === 'BOOK' && !['kakao_book', 'aladin', 'openlibrary'].includes(content.external_source ?? '')
    }).length,
    reviewLengthKo: {
      p10: percentile(scopeContents.map(row => text(row.review).length).filter(Boolean), 0.1),
      median: percentile(scopeContents.map(row => text(row.review).length).filter(Boolean), 0.5),
    },
    auditQueueSize: contentAuditQueue.length,
    auditQueue: contentAuditQueue.slice(0, 50),
  }

  const publicAssignments = assignments.filter(row => publicIds.has(row.celeb_id))
  const factionAssignmentAudit = {
    rows: publicAssignments.length,
    shortMissingKo: publicAssignments.filter(row => !text(row.short_desc)).length,
    longMissingKo: publicAssignments.filter(row => !text(row.long_desc)).length,
    quoteMissingKo: publicAssignments.filter(row => !text(row.quote)).length,
  }

  const nonUploadedFactionPeople = factionPeople.filter(person => {
    const episode = factionEpisodeOf(person)
    return !episode || !uploadedFolders.has(episode.folder)
  })
  const draftArtifactPattern = /(?:^|\n)\s*\(?\d+\s*안(?:\s|[·:：.)])|최종안|대안\s*[·:：]|후보\s*[·:：]/m
  const draftArtifactRows = nonUploadedFactionPeople
    .filter(row => draftArtifactPattern.test(text(row.quote)))
    .map(row => ({
      episode: factionEpisodeOf(row)?.folder ?? '(episode-unresolved)',
      person: row.name,
      excerpt: text(row.quote).slice(0, 100),
    }))
  const compactDialogue = (value: string): string => value.replace(/\s+/g, ' ').trim()
  const chunksMismatch = (quote: string | null, chunks: string[] | null): boolean => {
    if (!text(quote) || !Array.isArray(chunks)) return false
    return compactDialogue(text(quote)) !== compactDialogue(chunks.join(' '))
  }
  const factionDialogueByEpisode = episodes
    .map(episode => {
      const people = factionPeople.filter(person => factionEpisodeOf(person)?.id === episode.id)
      return {
        folder: episode.folder,
        status: episode.status,
        registered: episode.registered,
        protected: uploadedFolders.has(episode.folder),
        placements: people.length,
        missingQuoteKo: people.filter(row => !text(row.quote)).length,
        chunkMismatchKo: people.filter(row => chunksMismatch(row.quote, row.quote_chunks)).length,
      }
    })
    .filter(row =>
      row.missingQuoteKo > 0
      || row.chunkMismatchKo > 0,
    )
    .sort((a, b) =>
      Number(a.protected) - Number(b.protected)
      || b.missingQuoteKo - a.missingQuoteKo
      || a.folder.localeCompare(b.folder),
    )
  const factionDialogueAudit = {
    totalPeople: factionPeople.length,
    uploadedFolders: [...uploadedFolders].sort(),
    protectedPlacements: uploadedPeople.length,
    protectedUniqueCelebs: protectedCelebIds.size,
    protectedMissingQuoteKo: uploadedPeople.filter(row => !text(row.quote)).length,
    protectedChunkMismatchKo: uploadedPeople.filter(row => chunksMismatch(row.quote, row.quote_chunks)).length,
    editablePlacements: nonUploadedFactionPeople.length,
    editableMissingQuoteKo: nonUploadedFactionPeople.filter(row => !text(row.quote)).length,
    editableChunkMismatchKo: nonUploadedFactionPeople
      .filter(row => chunksMismatch(row.quote, row.quote_chunks)).length,
    editableDraftArtifacts: draftArtifactRows.length,
    draftArtifactExamples: draftArtifactRows.slice(0, 30),
    byEpisode: factionDialogueByEpisode,
  }

  const report = {
    generatedAt: new Date().toISOString(),
    scope: {
      activeProfiles: profiles.length,
      byTier: Object.fromEntries(
        [...new Set(profiles.map(row => row.celeb_tier ?? 'null'))]
          .sort()
          .map(tier => [tier, profiles.filter(row => (row.celeb_tier ?? 'null') === tier).length]),
      ),
      fullLight: fullLight.length,
    },
    profiles: {
      missing: profileMissing.filter(row => row.count),
      fullLightMissing: fullLightMissing.filter(row => row.count),
      thinBioKo: profiles.filter(row => text(row.bio).length > 0 && text(row.bio).length < 80).length,
      thinBioEn: profiles.filter(row => text(row.bio_en).length > 0 && text(row.bio_en).length < 160).length,
      thinPhilosophyKo: fullLight.filter(row => text(row.consumption_philosophy).length > 0 && text(row.consumption_philosophy).length < 500).length,
      thinMonologueKo: fullLight.filter(row => text(row.virtual_monologue).length > 0 && text(row.virtual_monologue).length < 700).length,
    },
    influence: {
      missing: influenceMissing.length,
      textIncomplete: influenceTextIncomplete.length,
      examples: [...influenceMissing, ...influenceTextIncomplete].slice(0, 12).map(row => row.nickname ?? row.id),
    },
    persona: {
      missing: personaMissing.length,
      incomplete: personaIncomplete.length,
      examples: [...personaMissing, ...personaIncomplete].slice(0, 12).map(row => row.nickname ?? row.id),
    },
    dialogues: {
      rowsInScope: dialogueProblems.length,
      uploadedFactionCastCelebs: protectedCelebIds.size,
      malformed: dialogueProblems.filter(row => row.malformed).length,
      malformedPeople: rankedDialogueProblems
        .filter(row => row.malformed)
        .map(row => ({
          celebId: row.celebId,
          slug: row.slug,
          nickname: row.nickname,
          missingKo: row.missingKo,
          shapeIssues: row.shapeIssues,
        })),
      missingAnyKo: dialogueProblems.filter(row => row.missingKo).length,
      missingQueue: rankedDialogueProblems
        .filter(row => row.missingKo)
        .map(row => ({
          celebId: row.celebId,
          slug: row.slug,
          nickname: row.nickname,
          missingKo: row.missingKo,
          malformed: row.malformed,
        })),
      legacyAnswer: dialogueProblems.filter(row => row.legacyAnswer).length,
      topProblems: rankedDialogueProblems.slice(0, 30),
    },
    contents: contentAudit,
    factionAssignments: factionAssignmentAudit,
    factionDialogues: factionDialogueAudit,
  }

  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(report, null, 2))
    return
  }

  console.log(JSON.stringify(report, null, 2))
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
