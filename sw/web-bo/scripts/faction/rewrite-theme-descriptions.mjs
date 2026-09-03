import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import { agyCall, AGY_TEXT_MODEL } from '../../../../.agents/skills/agy-antigravity/scripts/agy-call.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(HERE, '../../../..')
const WORK_DIR = join(tmpdir(), 'feelandnote-faction-theme-descriptions-v1')
const SNAPSHOT_PATH = join(WORK_DIR, 'snapshot.json')
const CANDIDATES_PATH = join(WORK_DIR, 'candidates.json')
const REVIEWS_PATH = join(WORK_DIR, 'reviews.json')
const FINAL_PATH = join(WORK_DIR, 'final.json')
const PAGE_SIZE = 800
const DOCS = [
  '.agents/skills/no-trash-prose/SKILL.md',
  '.agents/skills/ko-detranslate/SKILL.md',
]

const dbUrl = process.env.NEXT_PUBLIC_DB_API_URL
const dbKey = process.env.DB_SECRET_KEY
if (!dbUrl || !dbKey) throw new Error('NEXT_PUBLIC_DB_API_URL 또는 DB_SECRET_KEY가 없다.')
const db = createClient(dbUrl, dbKey, { auth: { persistSession: false, autoRefreshToken: false } })

const mode = process.argv[2] ?? 'status'
const redoArg = process.argv.find((arg) => arg.startsWith('--redo='))?.slice('--redo='.length) ?? ''
const redoKeys = new Set(redoArg.split(',').map((value) => value.trim()).filter(Boolean))

function sha(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex')
}

function readJson(path, fallback) {
  return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : fallback
}

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true })
  const next = `${path}.next`
  writeFileSync(next, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
  renameSync(next, path)
}

async function selectAll(table, columns, configure = (query) => query) {
  const rows = []
  for (let from = 0; ; from += PAGE_SIZE) {
    let query = db.from(table).select(columns).range(from, from + PAGE_SIZE - 1)
    query = configure(query)
    const { data, error } = await query
    if (error) throw new Error(`${table} 조회 실패: ${error.message}`)
    rows.push(...(data ?? []))
    if (!data || data.length < PAGE_SIZE) break
  }
  return rows
}

function compactText(value, max = 240) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim()
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

function kindOf(tag, parent, childNames) {
  if (parent?.slug === 'myth-and-fiction') return 'myth'
  if (childNames.length > 0) return 'group'
  return 'faction'
}

async function prepare() {
  const [tags, members, groups, episodes, clusters, rawPeople] = await Promise.all([
    selectAll(
      'celeb_tags',
      'id,parent_id,slug,name,name_en,description,description_en,is_featured,is_fiction,sort_order,updated_at',
      (query) => query.order('sort_order').order('name'),
    ),
    selectAll(
      'faction_atlas_members',
      'tag_id,celeb_id,short_desc,long_desc,sort_order,hidden,source,person_id,assignment_id',
      (query) => query.eq('hidden', false).order('tag_id').order('sort_order'),
    ),
    selectAll(
      'faction_groups',
      'id,episode_id,tag_id,name,position',
      (query) => query.order('id'),
    ),
    selectAll(
      'faction_episodes',
      'id,folder,title,title_en,logline,status,registered,sort_order',
      (query) => query.order('id'),
    ),
    selectAll(
      'faction_clusters',
      'id,group_id,position',
      (query) => query.order('id'),
    ),
    selectAll(
      'faction_people',
      'id,cluster_id,position,is_person,celeb_id,name,epithet',
      (query) => query.eq('is_person', true).order('id'),
    ),
  ])

  const memberIds = [...new Set(members.map((row) => row.celeb_id).filter(Boolean))]
  const profiles = []
  for (let index = 0; index < memberIds.length; index += 150) {
    const ids = memberIds.slice(index, index + 150)
    const { data, error } = await db.from('celebs')
      .select('id,nickname,title,headline').in('id', ids)
    if (error) throw new Error(`celebs 조회 실패: ${error.message}`)
    profiles.push(...(data ?? []))
  }

  const tagById = new Map(tags.map((row) => [row.id, row]))
  const profileById = new Map(profiles.map((row) => [row.id, row]))
  const episodeById = new Map(episodes.map((row) => [row.id, row]))
  const groupById = new Map(groups.map((row) => [row.id, row]))
  const clusterById = new Map(clusters.map((row) => [row.id, row]))

  const items = tags.map((tag) => {
    const parent = tag.parent_id ? tagById.get(tag.parent_id) : null
    const childNames = tags.filter((row) => row.parent_id === tag.id).map((row) => row.name)
    const atlasMembers = members
      .filter((row) => row.tag_id === tag.id)
      .slice(0, 30)
      .map((row) => {
        const profile = profileById.get(row.celeb_id)
        return {
          name: profile?.nickname ?? row.celeb_id,
          title: profile?.title ?? null,
          headline: profile?.headline ?? null,
          placement: compactText(row.long_desc || row.short_desc, 180) || null,
        }
      })

    const linkedGroups = groups.filter((row) => row.tag_id === tag.id)
    const episodeEvidence = linkedGroups.map((group) => {
      const episode = episodeById.get(group.episode_id)
      return {
        title: compactText(episode?.title, 180),
        logline: compactText(episode?.logline, 260) || null,
        group: compactText(group.name, 120) || null,
        registered: episode?.registered === true,
      }
    })

    const rawMemberEvidence = rawPeople.flatMap((person) => {
      const cluster = clusterById.get(person.cluster_id)
      const group = cluster ? groupById.get(cluster.group_id) : null
      if (!group || group.tag_id !== tag.id) return []
      return [{
        name: compactText(person.name, 100),
        epithet: compactText(person.epithet, 180) || null,
      }]
    }).slice(0, 30)

    const kind = kindOf(tag, parent, childNames)
    const stable = {
      id: tag.id,
      slug: tag.slug,
      name: tag.name,
      nameEn: tag.name_en,
      parentId: tag.parent_id,
      parentName: parent?.name ?? null,
      parentSlug: parent?.slug ?? null,
      description: tag.description,
      descriptionEn: tag.description_en,
      isFeatured: tag.is_featured,
      isFiction: tag.is_fiction,
      sortOrder: tag.sort_order,
      updatedAt: tag.updated_at,
      kind,
      childNames,
      atlasMembers,
      rawMemberEvidence,
      episodeEvidence,
    }
    return { ...stable, sourceHash: sha(stable) }
  })

  const snapshot = {
    createdAt: new Date().toISOString(),
    count: items.length,
    sourceHash: sha(items.map((item) => item.sourceHash)),
    items,
  }
  writeJson(SNAPSHOT_PATH, snapshot)
  console.log(`PREPARED count=${items.length} myth=${items.filter((item) => item.kind === 'myth').length} group=${items.filter((item) => item.kind === 'group').length} faction=${items.filter((item) => item.kind === 'faction').length}`)
  console.log(`SNAPSHOT=${SNAPSHOT_PATH}`)
}

function generationInput(item) {
  return {
    id: item.id,
    name: item.name,
    slug: item.slug,
    parent: item.parentName,
    kind: item.kind,
    currentDescription: item.description,
    childThemes: item.childNames,
    episodes: item.episodeEvidence,
    members: item.atlasMembers.length > 0 ? item.atlasMembers : item.rawMemberEvidence,
  }
}

function parseObject(text) {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start < 0 || end <= start) throw new Error(`JSON 객체가 없다: ${cleaned.slice(0, 180)}`)
  return JSON.parse(cleaned.slice(start, end + 1))
}

async function callJson(prompt, expectedIds) {
  let lastError
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const output = await agyCall(prompt, {
        docs: DOCS,
        repoRoot: REPO_ROOT,
        model: AGY_TEXT_MODEL,
        timeoutMs: 1_500_000,
      })
      const parsed = parseObject(output)
      if (!Array.isArray(parsed.items)) throw new Error('items 배열이 없다.')
      const ids = parsed.items.map((item) => item.id)
      const missing = expectedIds.filter((id) => !ids.includes(id))
      const extras = ids.filter((id) => !expectedIds.includes(id))
      if (missing.length || extras.length) {
        throw new Error(`ID 불일치 missing=${missing.length} extras=${extras.length}`)
      }
      return parsed.items
    } catch (error) {
      lastError = error
      console.error(`AGY_ATTEMPT_FAILED attempt=${attempt} message=${error.message}`)
    }
  }
  throw lastError
}

function generationPrompt(batch) {
  return `당신은 Feel&Note 세력도감의 한국어 대중 교양 편집자다. 아래 테마들의 기존 개요를 실제 화면에서 읽을 최종 후보로 다시 써라.

각 항목마다 먼저 웹을 검색해 사실을 확인하라. 박물관·대학·원전 번역·공식 기록·학술 출판물처럼 해당 문장을 직접 뒷받침하는 자료를 우선한다. 신화와 고전은 일반 백과사전 두 곳만 보고 쓰지 말고, 박물관·대학·원전 번역 가운데 적어도 하나를 반드시 확인한다. 최신 기업·산업 주제는 공식 자료와 신뢰할 만한 보도를 대조한다. 입력의 기존 문장과 멤버 목록은 테마의 범위를 알려주는 내부 자료이지 사실 근거가 아니다. 내부 제목이 비유적이면 멤버와 에피소드 문맥으로 뜻을 파악하고, 근거가 부족한 세부 사건은 만들지 마라.

공통 목표:
- 첫 문장부터 독자가 사람, 사건, 선택, 대립 가운데 하나를 구체적으로 붙잡게 한다.
- 이름과 업적을 나열하지 말고, 이 테마의 사람들이 무엇을 놓고 움직였으며 무엇이 달라졌는지 설명한다.
- 멋있는 표어, 영웅 찬양, 광고 문구, 교훈, 오늘날의 울림으로 끝내지 않는다.
- 확정하기 어려운 평가와 최상급을 쓰지 않는다. 서로 다른 관점이나 판본이 중요하면 숨기지 않는다.
- 사건을 흥미롭게 보이게 하려고 원전에 없는 인과와 응보를 만들지 않는다. “사람들은 이 신화에서 배웠다”, “그 대가를 치렀다”, “이 사건 때문에 한 시대가 끝났다”처럼 자료가 직접 입증하지 않는 해석은 빼고, 장면을 나란히 놓아 독자가 느끼게 한다.
- 번역에 따라 뜻이 갈릴 수 있는 물건·행동은 익숙한 단어로 단정하지 말고 정확한 한국어 명칭을 확인한다. 예를 들어 놀이의 말을 동물인 말처럼 쓰지 않는다.
- 한국어 기본 동사와 자연스러운 어순을 쓴다. 제공된 no-trash-prose와 ko-detranslate 규칙을 모두 지킨다.
- em dash(—), 번역투, 사물 주어 의인화, 억지 대구를 쓰지 않는다.
- 큰따옴표로 꾸민 가짜 인용을 만들지 않는다.

종류별 규격:
- myth: 2문단, 500~750자. 정의·시대·문헌 목록으로 시작하지 말고 대표 사건으로 시작한다. 첫 문단은 사건과 인물 관계가 보이게, 둘째 문단은 그 사건들이 보여주는 세계관·갈등·의례를 구체적인 장면으로 연결한다. 작품과 판본 차이를 존중한다.
- faction: 줄바꿈 없는 2~3문장, 120~220자. 상세 화면에서는 온전히 읽히고 목록에서는 첫 줄이 미리보기로 쓰인다. 테마의 범위와 중심 갈등이 모두 보여야 한다.
- group: 줄바꿈 없는 1~2문장, 80~150자. 자식 테마들을 억지로 전부 열거하지 말고 이 묶음이 무엇을 함께 보게 하는지 설명한다.

출력은 설명 없이 다음 JSON 객체 하나만 반환한다.
{"items":[{"id":"입력 id","description":"최종 한국어 개요","sources":["문장 세부를 직접 뒷받침하는 URL 1","URL 2","URL 3"]}]}

입력:
${JSON.stringify(batch.map(generationInput))}`
}

async function generate() {
  const snapshot = readJson(SNAPSHOT_PATH)
  if (!snapshot) throw new Error('snapshot이 없다. prepare부터 실행하라.')
  const state = readJson(CANDIDATES_PATH, { sourceHash: snapshot.sourceHash, items: {} })
  if (state.sourceHash !== snapshot.sourceHash) throw new Error('candidate와 snapshot 해시가 다르다.')
  for (const item of snapshot.items) {
    if (redoKeys.has(item.id) || redoKeys.has(item.slug)) delete state.items[item.id]
  }

  const sizes = { myth: 3, group: 8, faction: 12 }
  let batchNumber = 0
  while (true) {
    const remaining = snapshot.items.filter((item) => !state.items[item.id])
    if (remaining.length === 0) break
    const kind = remaining[0].kind
    const batch = remaining.filter((item) => item.kind === kind).slice(0, sizes[kind])
    batchNumber += 1
    console.log(`GENERATE_START batch=${batchNumber} kind=${kind} count=${batch.length} remaining=${remaining.length}`)
    const output = await callJson(generationPrompt(batch), batch.map((item) => item.id))
    for (const result of output) {
      if (typeof result.description !== 'string' || !result.description.trim()) {
        throw new Error(`빈 description: ${result.id}`)
      }
      state.items[result.id] = {
        description: result.description.trim(),
        sources: Array.isArray(result.sources) ? result.sources.filter((value) => typeof value === 'string') : [],
      }
    }
    state.updatedAt = new Date().toISOString()
    writeJson(CANDIDATES_PATH, state)
    console.log(`GENERATE_DONE batch=${batchNumber} total=${Object.keys(state.items).length}/${snapshot.items.length}`)
  }
  console.log(`GENERATED count=${Object.keys(state.items).length}`)
}

function reviewPrompt(batch) {
  const input = batch.map(({ item, candidate }) => ({
    id: item.id,
    name: item.name,
    slug: item.slug,
    kind: item.kind,
    parent: item.parentName,
    currentDescription: item.description,
    candidateDescription: candidate.description,
    candidateSources: candidate.sources,
    childThemes: item.childNames,
    episodes: item.episodeEvidence,
    members: item.atlasMembers.length > 0 ? item.atlasMembers : item.rawMemberEvidence,
  }))
  return `당신은 Feel&Note 세력도감 개요의 독립 검수자다. 현재 문장과 새 후보를 비교하고, 웹 검색으로 사실을 다시 확인한 뒤 실제 게시할 최종 한국어 문장을 정하라.

검수 기준:
- 독자가 이 테마에서 벌어진 일과 중심 갈등을 처음 읽고 이해할 수 있어야 한다. 백과사전 정의, 추상명사 나열, 이름만 늘어놓는 글은 고친다.
- 후보가 현재값보다 나빠졌으면 현재값을 유지할 수 있다. 다만 빈 값이나 너무 짧아 아무 정보가 없는 현재값은 그대로 두지 않는다.
- 사실 오류, 시대 혼동, 과장된 인과, 살아 있는 사람·기업에 대한 근거 없는 평가를 고친다. 신화와 문학은 단일 정본처럼 만들지 않는다.
- 생성자가 사건 사이에 원전에 없는 인과·응보·교훈을 덧붙였는지 특히 의심한다. “배웠다”, “대가를 치렀다”, “질서가 무너졌다” 같은 해석은 직접 근거가 없으면 사건 진술로 바꾼다.
- 번역어 하나가 장면을 바꾸는 오류도 잡는다. 놀이말과 동물인 말, 관과 시신, 저승과 지하 세계처럼 한국어에서 다른 대상을 같은 말로 뭉개지 않는다.
- 내부 멤버·에피소드 자료는 범위 확인용이다. 웹 근거 없이 세부 사실을 발명하지 않는다.
- myth는 정확히 2문단 500~750자, faction은 줄바꿈 없는 2~3문장 120~220자, group은 줄바꿈 없는 1~2문장 80~150자를 목표로 한다.
- no-trash-prose와 ko-detranslate 규칙을 적용한다. 교훈·찬양·광고·AI식 문예 수사로 마무리하지 않는다.
- 필요한 곳만 고친다. 후보가 이미 좋으면 말만 바꾸지 않는다.

출력은 설명 없이 JSON 객체 하나만 반환한다.
{"items":[{"id":"입력 id","decision":"candidate|revise|keep","description":"게시할 최종 개요","issues":["고친 핵심 문제"],"sources":["문장 세부를 직접 확인한 URL"]}]}

입력:
${JSON.stringify(input)}`
}

async function review() {
  const snapshot = readJson(SNAPSHOT_PATH)
  const candidates = readJson(CANDIDATES_PATH)
  if (!snapshot || !candidates) throw new Error('snapshot 또는 candidates가 없다.')
  if (candidates.sourceHash !== snapshot.sourceHash) throw new Error('candidate와 snapshot 해시가 다르다.')
  const state = readJson(REVIEWS_PATH, { sourceHash: snapshot.sourceHash, items: {} })
  if (state.sourceHash !== snapshot.sourceHash) throw new Error('review와 snapshot 해시가 다르다.')
  for (const item of snapshot.items) {
    if (redoKeys.has(item.id) || redoKeys.has(item.slug)) delete state.items[item.id]
  }

  const sizes = { myth: 3, group: 8, faction: 10 }
  let batchNumber = 0
  while (true) {
    const remaining = snapshot.items.filter((item) => !state.items[item.id])
    if (remaining.length === 0) break
    const kind = remaining[0].kind
    const items = remaining.filter((item) => item.kind === kind).slice(0, sizes[kind])
    const batch = items.map((item) => ({ item, candidate: candidates.items[item.id] }))
    if (batch.some((entry) => !entry.candidate)) throw new Error('검수할 candidate가 빠졌다.')
    batchNumber += 1
    console.log(`REVIEW_START batch=${batchNumber} kind=${kind} count=${batch.length} remaining=${remaining.length}`)
    const output = await callJson(reviewPrompt(batch), items.map((item) => item.id))
    for (const result of output) {
      if (!['candidate', 'revise', 'keep'].includes(result.decision)) {
        throw new Error(`잘못된 decision: ${result.id}`)
      }
      if (typeof result.description !== 'string' || !result.description.trim()) {
        throw new Error(`빈 review description: ${result.id}`)
      }
      state.items[result.id] = {
        decision: result.decision,
        description: result.description.trim(),
        issues: Array.isArray(result.issues) ? result.issues.filter((value) => typeof value === 'string') : [],
        sources: Array.isArray(result.sources) ? result.sources.filter((value) => typeof value === 'string') : [],
      }
    }
    state.updatedAt = new Date().toISOString()
    writeJson(REVIEWS_PATH, state)
    console.log(`REVIEW_DONE batch=${batchNumber} total=${Object.keys(state.items).length}/${snapshot.items.length}`)
  }
  console.log(`REVIEWED count=${Object.keys(state.items).length}`)
}

const BANNED = [
  /—/u, /되어졌/u, /에 의해/u, /에 다름 아/u, /에 있어서/u, /이라 할 수 있/u,
  /로 하여금/u, /를 통하여/u, /포개/u, /벼리/u, /빚어내/u, /꿰뚫/u,
  /스며들/u, /깃들/u, /아로새/u, /길어 올/u, /삶으로 증명/u, /온몸으로 증명/u,
  /오늘날에도[^.]{0,30}울림/u, /결국 세상을/u,
]

function sentenceCount(text) {
  return text.split(/[.!?](?:\s|$)/u).map((value) => value.trim()).filter(Boolean).length
}

function auditDescription(item, description) {
  const errors = []
  const length = description.length
  const paragraphs = description.split(/\n\s*\n/u).filter((value) => value.trim())
  if (item.kind === 'myth') {
    if (length < 480 || length > 820) errors.push(`myth_length=${length}`)
    if (paragraphs.length !== 2) errors.push(`myth_paragraphs=${paragraphs.length}`)
  } else if (item.kind === 'group') {
    if (length < 70 || length > 190) errors.push(`group_length=${length}`)
    if (paragraphs.length !== 1) errors.push(`group_paragraphs=${paragraphs.length}`)
    const sentences = sentenceCount(description)
    if (sentences < 1 || sentences > 3) errors.push(`group_sentences=${sentences}`)
  } else {
    if (length < 105 || length > 270) errors.push(`faction_length=${length}`)
    if (paragraphs.length !== 1) errors.push(`faction_paragraphs=${paragraphs.length}`)
    const sentences = sentenceCount(description)
    if (sentences < 2 || sentences > 4) errors.push(`faction_sentences=${sentences}`)
  }
  for (const pattern of BANNED) {
    if (pattern.test(description)) errors.push(`banned=${pattern.source}`)
  }
  if (/^이 .{0,20}(은|는) .*전승군/u.test(description)) errors.push('definition_opening')
  if (/```|^#|\n[-*] /mu.test(description)) errors.push('markdown_structure')
  return errors
}

async function audit() {
  const snapshot = readJson(SNAPSHOT_PATH)
  const reviews = readJson(REVIEWS_PATH)
  if (!snapshot || !reviews) throw new Error('snapshot 또는 reviews가 없다.')
  const errors = []
  const descriptions = new Map()
  const items = snapshot.items.map((item) => {
    const reviewItem = reviews.items[item.id]
    if (!reviewItem) {
      errors.push(`${item.slug}: review_missing`)
      return null
    }
    const description = reviewItem.description.trim()
    for (const issue of auditDescription(item, description)) errors.push(`${item.slug}: ${issue}`)
    const validSources = (reviewItem.sources ?? []).filter((value) => /^https?:\/\//i.test(value))
    if (item.kind === 'myth' && validSources.length < 2) errors.push(`${item.slug}: myth_sources=${validSources.length}`)
    if (item.kind === 'faction' && validSources.length < 1) errors.push(`${item.slug}: faction_sources=0`)
    const duplicate = descriptions.get(description)
    if (duplicate) errors.push(`${item.slug}: exact_duplicate_of=${duplicate}`)
    descriptions.set(description, item.slug)
    return {
      id: item.id,
      slug: item.slug,
      name: item.name,
      kind: item.kind,
      before: item.description,
      after: description,
      beforeUpdatedAt: item.updatedAt,
      beforeDescriptionEn: item.descriptionEn,
      decision: reviewItem.decision,
      issues: reviewItem.issues,
      sources: reviewItem.sources,
    }
  }).filter(Boolean)

  if (errors.length > 0) {
    console.log(`AUDIT_FAILED count=${errors.length}`)
    for (const error of errors) console.log(error)
    process.exitCode = 2
    return
  }
  const final = {
    createdAt: new Date().toISOString(),
    sourceHash: snapshot.sourceHash,
    count: items.length,
    changedCount: items.filter((item) => item.before !== item.after).length,
    items,
  }
  writeJson(FINAL_PATH, final)
  console.log(`AUDIT_OK count=${final.count} changed=${final.changedCount}`)
  console.log(`FINAL=${FINAL_PATH}`)
}

async function currentTags() {
  return selectAll(
    'celeb_tags',
    'id,parent_id,slug,name,name_en,description,description_en,is_featured,is_fiction,sort_order,updated_at',
    (query) => query.order('sort_order').order('name'),
  )
}

function compareSnapshot(snapshot, current) {
  const errors = []
  const currentById = new Map(current.map((item) => [item.id, item]))
  for (const item of snapshot.items) {
    const now = currentById.get(item.id)
    if (!now) {
      errors.push(`${item.slug}: deleted`)
      continue
    }
    const fields = {
      slug: now.slug,
      name: now.name,
      nameEn: now.name_en,
      parentId: now.parent_id,
      description: now.description,
      descriptionEn: now.description_en,
      isFeatured: now.is_featured,
      isFiction: now.is_fiction,
      sortOrder: now.sort_order,
      updatedAt: now.updated_at,
    }
    for (const [key, value] of Object.entries(fields)) {
      if (value !== item[key]) errors.push(`${item.slug}: changed_${key}`)
    }
  }
  if (current.length !== snapshot.items.length) errors.push(`tag_count_changed=${current.length}`)
  return errors
}

async function applyFinal() {
  const snapshot = readJson(SNAPSHOT_PATH)
  const final = readJson(FINAL_PATH)
  if (!snapshot || !final) throw new Error('snapshot 또는 final이 없다.')
  if (snapshot.sourceHash !== final.sourceHash) throw new Error('final과 snapshot 해시가 다르다.')
  const current = await currentTags()
  const conflicts = compareSnapshot(snapshot, current)
  if (conflicts.length > 0) throw new Error(`DB 현재값 충돌:\n${conflicts.join('\n')}`)

  const patches = final.items
    .filter((item) => item.before !== item.after)
    .map((item) => ({ id: item.id, description: item.after }))
  const { data, error } = await db.from('celeb_tags')
    .upsert(patches, { onConflict: 'id' })
    .select('id,description,description_en')
  if (error) throw new Error(`DB 반영 실패: ${error.message}`)
  if ((data ?? []).length !== patches.length) {
    throw new Error(`DB 반영 행 수 불일치 expected=${patches.length} actual=${data?.length ?? 0}`)
  }
  console.log(`APPLIED changed=${patches.length}`)
}

async function preflight() {
  const snapshot = readJson(SNAPSHOT_PATH)
  if (!snapshot) throw new Error('snapshot이 없다.')
  const current = await currentTags()
  const conflicts = compareSnapshot(snapshot, current)
  if (conflicts.length > 0) throw new Error(`PREFLIGHT_FAILED:\n${conflicts.join('\n')}`)
  console.log(`PREFLIGHT_OK count=${snapshot.items.length} source_hash=${snapshot.sourceHash}`)
}

async function verify() {
  const snapshot = readJson(SNAPSHOT_PATH)
  const final = readJson(FINAL_PATH)
  if (!snapshot || !final) throw new Error('snapshot 또는 final이 없다.')
  const current = await currentTags()
  const currentById = new Map(current.map((item) => [item.id, item]))
  const errors = []
  for (const expected of final.items) {
    const now = currentById.get(expected.id)
    if (!now) {
      errors.push(`${expected.slug}: missing`)
      continue
    }
    if (now.description !== expected.after) errors.push(`${expected.slug}: description_mismatch`)
    if (now.description_en !== expected.beforeDescriptionEn) errors.push(`${expected.slug}: description_en_changed`)
  }
  if (errors.length > 0) throw new Error(`VERIFY_FAILED:\n${errors.join('\n')}`)
  console.log(`VERIFY_OK count=${final.items.length} changed=${final.changedCount} english_preserved=${final.items.length}`)
}

function status() {
  const snapshot = readJson(SNAPSHOT_PATH, null)
  const candidates = readJson(CANDIDATES_PATH, null)
  const reviews = readJson(REVIEWS_PATH, null)
  const final = readJson(FINAL_PATH, null)
  console.log(`WORK_DIR=${WORK_DIR}`)
  console.log(`snapshot=${snapshot?.items?.length ?? 0}`)
  console.log(`candidates=${Object.keys(candidates?.items ?? {}).length}`)
  console.log(`reviews=${Object.keys(reviews?.items ?? {}).length}`)
  console.log(`final=${final?.items?.length ?? 0}`)
}

if (mode === 'prepare') await prepare()
else if (mode === 'generate') await generate()
else if (mode === 'review') await review()
else if (mode === 'audit') await audit()
else if (mode === 'preflight') await preflight()
else if (mode === 'apply') await applyFinal()
else if (mode === 'verify') await verify()
else if (mode === 'status') status()
else throw new Error(`알 수 없는 mode: ${mode}`)
