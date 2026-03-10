/**
 * 셀럽 창작 서가 v3 — 잔여 셀럽 보완 수집
 *
 * v2에서 누락된 381명 대상:
 * 1. QID 매칭 개선 (profession 필터 완화 + fallback)
 * 2. P161 (cast member) → 배우 출연작 VIDEO/performer
 * 3. P175 (performer) → 음악가 연주곡 MUSIC/performer
 * 4. 기존 P800/P50/P170/P57/P86 유지
 *
 * 사용법:
 *   node scripts/celeb-works-v3.mjs
 *   node scripts/celeb-works-v3.mjs --dry-run
 *   node scripts/celeb-works-v3.mjs --offset 0 --limit 50
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { resolve } from 'path'
import { writeFileSync } from 'fs'

dotenv.config({ path: resolve('sw/web/.env') })
dotenv.config({ path: resolve('sw/web/.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET

const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const OFFSET = parseInt(args[args.indexOf('--offset') + 1]) || 0
const LIMIT = parseInt(args[args.indexOf('--limit') + 1]) || 99999

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

// ── Wikidata QID 검색 (개선: 2단계 매칭) ──

const PROF_KEYWORDS = {
  author: ['writer', 'author', 'poet', 'novelist', 'playwright', 'essayist', 'literary'],
  humanities_scholar: ['philosopher', 'historian', 'theologian', 'scholar', 'thinker', 'jurist', 'philologist', 'political', 'reformer', 'monk', 'cleric', 'nun', 'rabbi'],
  scientist: ['physicist', 'mathematician', 'scientist', 'astronomer', 'chemist', 'biologist', 'naturalist', 'inventor', 'engineer'],
  director: ['director', 'filmmaker', 'screenwriter'],
  musician: ['musician', 'composer', 'singer', 'rapper', 'songwriter', 'pianist', 'conductor', 'guitarist', 'DJ', 'duo', 'band', 'tenor', 'baritone', 'soprano'],
  visual_artist: ['painter', 'artist', 'sculptor', 'architect', 'photographer', 'calligrapher'],
  actor: ['actor', 'actress', 'film', 'television'],
  politician: ['politician', 'president', 'prime minister', 'statesman', 'emperor', 'king', 'queen', 'pharaoh', 'chancellor', 'monarch', 'sultan', 'caliph', 'ruler', 'regent', 'prince', 'princess', 'empress', 'governor', 'senator'],
  commander: ['general', 'admiral', 'commander', 'military', 'marshal', 'conqueror', 'warrior', 'explorer', 'navigator', 'samurai', 'warlord'],
  entrepreneur: ['entrepreneur', 'businessman', 'businesswoman', 'executive', 'founder', 'industrialist', 'inventor', 'engineer'],
  leader: ['leader', 'activist', 'revolutionary', 'reformer', 'saint', 'apostle', 'priest', 'religious', 'missionary', 'prophet', 'dancer'],
  athlete: ['athlete', 'player', 'footballer', 'boxer', 'swimmer', 'chess', 'basketball', 'martial', 'coach', 'manager', 'bodybuilder'],
  social_scientist: ['economist', 'sociologist', 'psychologist', 'anthropologist', 'political scientist', 'consultant', 'management'],
  investor: ['investor', 'financier', 'philanthropist', 'venture', 'hedge fund', 'capitalist'],
  influencer: ['influencer', 'youtuber', 'host', 'presenter', 'dancer', 'activist'],
}

function matchDescription(description, profession) {
  if (!description) return false
  const desc = description.toLowerCase()
  const keywords = PROF_KEYWORDS[profession] || []
  return keywords.some(kw => desc.toLowerCase().includes(kw.toLowerCase()))
}

async function searchWikidataQID(nameEn, profession, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      const url = `https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&limit=10&language=en&search=${encodeURIComponent(nameEn)}`
      const res = await fetch(url, { headers: { 'User-Agent': 'FeelandnoteBot/1.0' } })
      if (res.status === 429) { await sleep(5000); continue }
      if (!res.ok) return null
      const data = await res.json()
      if (!data.search?.length) return null

      // 1차: profession 키워드 매칭
      for (const s of data.search) {
        if (matchDescription(s.description, profession)) {
          return { qid: s.id, label: s.label, description: s.description }
        }
      }

      // 2차: 사람 관련 description (생몰년 포함)
      for (const s of data.search) {
        if (s.description && /\d{3,4}/.test(s.description)) {
          return { qid: s.id, label: s.label, description: s.description }
        }
      }

      // 3차: 'human' 또는 사람 관련 키워드
      const personKeywords = ['human', 'person', 'people', 'figure', 'character']
      for (const s of data.search) {
        if (s.description && personKeywords.some(kw => s.description.toLowerCase().includes(kw))) {
          return { qid: s.id, label: s.label, description: s.description }
        }
      }

      return null
    } catch {
      if (i < retries) await sleep(2000)
    }
  }
  return null
}

// ── SPARQL ──

async function sparqlQuery(sparql, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      const url = `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(sparql)}`
      const res = await fetch(url, { headers: { 'User-Agent': 'FeelandnoteBot/1.0' } })
      if (res.status === 429) { await sleep(5000); continue }
      if (!res.ok) return []
      const data = await res.json()
      return data.results?.bindings || []
    } catch {
      if (i < retries) await sleep(2000)
    }
  }
  return []
}

// P800 (notable work)
async function getWorksP800(qid) {
  return sparqlQuery(`SELECT ?work ?workLabel ?workLabelKo ?date ?type WHERE {
    wd:${qid} wdt:P800 ?work .
    OPTIONAL { ?work wdt:P577 ?date }
    OPTIONAL { ?work wdt:P31 ?type }
    OPTIONAL { ?work rdfs:label ?workLabelKo . FILTER(LANG(?workLabelKo) = "ko") }
    SERVICE wikibase:label { bd:serviceParam wikibase:language "en" }
  }`)
}

// P50 (author of)
async function getWorksP50(qid) {
  return sparqlQuery(`SELECT ?work ?workLabel ?workLabelKo ?date ?type WHERE {
    ?work wdt:P50 wd:${qid} .
    OPTIONAL { ?work wdt:P577 ?date }
    OPTIONAL { ?work wdt:P31 ?type }
    OPTIONAL { ?work rdfs:label ?workLabelKo . FILTER(LANG(?workLabelKo) = "ko") }
    SERVICE wikibase:label { bd:serviceParam wikibase:language "en" }
  } LIMIT 40`)
}

// P170 (creator) — 미술
async function getWorksP170(qid) {
  return sparqlQuery(`SELECT ?work ?workLabel ?workLabelKo ?date ?type WHERE {
    ?work wdt:P170 wd:${qid} .
    OPTIONAL { ?work wdt:P577 ?date }
    OPTIONAL { ?work wdt:P31 ?type }
    OPTIONAL { ?work rdfs:label ?workLabelKo . FILTER(LANG(?workLabelKo) = "ko") }
    SERVICE wikibase:label { bd:serviceParam wikibase:language "en" }
  } LIMIT 40`)
}

// P57 (director)
async function getWorksP57(qid) {
  return sparqlQuery(`SELECT ?work ?workLabel ?workLabelKo ?date ?type WHERE {
    ?work wdt:P57 wd:${qid} .
    OPTIONAL { ?work wdt:P577 ?date }
    OPTIONAL { ?work wdt:P31 ?type }
    OPTIONAL { ?work rdfs:label ?workLabelKo . FILTER(LANG(?workLabelKo) = "ko") }
    SERVICE wikibase:label { bd:serviceParam wikibase:language "en" }
  } LIMIT 40`)
}

// P86 (composer)
async function getWorksP86(qid) {
  return sparqlQuery(`SELECT ?work ?workLabel ?workLabelKo ?date ?type WHERE {
    ?work wdt:P86 wd:${qid} .
    OPTIONAL { ?work wdt:P577 ?date }
    OPTIONAL { ?work wdt:P31 ?type }
    OPTIONAL { ?work rdfs:label ?workLabelKo . FILTER(LANG(?workLabelKo) = "ko") }
    SERVICE wikibase:label { bd:serviceParam wikibase:language "en" }
  } LIMIT 40`)
}

// P161 (cast member) — 배우 출연작: sitelinks 수로 대표작 우선
async function getWorksP161(qid) {
  return sparqlQuery(`SELECT ?work ?workLabel ?workLabelKo ?date ?type WHERE {
    ?work wdt:P161 wd:${qid} .
    ?work wikibase:sitelinks ?sl .
    OPTIONAL { ?work wdt:P577 ?date }
    OPTIONAL { ?work wdt:P31 ?type }
    OPTIONAL { ?work rdfs:label ?workLabelKo . FILTER(LANG(?workLabelKo) = "ko") }
    SERVICE wikibase:label { bd:serviceParam wikibase:language "en" }
  } ORDER BY DESC(?sl) LIMIT 40`)
}

// P175 (performer) — 음악가 연주곡: sitelinks 수로 대표곡 우선
async function getWorksP175(qid) {
  return sparqlQuery(`SELECT ?work ?workLabel ?workLabelKo ?date ?type WHERE {
    ?work wdt:P175 wd:${qid} .
    ?work wikibase:sitelinks ?sl .
    OPTIONAL { ?work wdt:P577 ?date }
    OPTIONAL { ?work wdt:P31 ?type }
    OPTIONAL { ?work rdfs:label ?workLabelKo . FILTER(LANG(?workLabelKo) = "ko") }
    SERVICE wikibase:label { bd:serviceParam wikibase:language "en" }
  } ORDER BY DESC(?sl) LIMIT 40`)
}

// ── P31 타입 매핑 ──

const P31_BOOK = new Set([
  'Q7725634', 'Q571', 'Q8261', 'Q47461344', 'Q49084',
  'Q5185279', 'Q35760', 'Q277759', 'Q23622',
  'Q131539', 'Q780605', 'Q386724', 'Q5292',
  'Q860861', 'Q17518461', 'Q3331189', 'Q28869365',
])
const P31_VIDEO = new Set([
  'Q11424', 'Q5398426', 'Q24856', 'Q93204', 'Q226730',
  'Q1261214',
])
const P31_MUSIC = new Set([
  'Q105543609', 'Q482994', 'Q7366', 'Q55850593',
  'Q9734', 'Q1344', 'Q34379',
])
const P31_ART = new Set([
  'Q3305213', 'Q219423', 'Q4989906', 'Q18573970',
  'Q11060274', 'Q17516',
])

function classifyWorkType(p31Ids) {
  if (!p31Ids?.length) return null
  for (const id of p31Ids) {
    if (P31_VIDEO.has(id)) return 'VIDEO'
    if (P31_MUSIC.has(id)) return 'MUSIC'
    if (P31_ART.has(id)) return 'ART'
    if (P31_BOOK.has(id)) return 'BOOK'
  }
  return null
}

function defaultWorkType(profession) {
  if (['director', 'actor'].includes(profession)) return 'VIDEO'
  if (['musician'].includes(profession)) return 'MUSIC'
  if (['visual_artist'].includes(profession)) return 'ART'
  return 'BOOK'
}

function defaultRole(profession, workType) {
  if (workType === 'VIDEO' && profession === 'actor') return 'performer'
  if (workType === 'VIDEO') return 'director'
  if (workType === 'MUSIC' && profession === 'musician') return 'performer'
  if (workType === 'MUSIC') return 'composer'
  if (workType === 'ART') return 'artist'
  return 'author'
}

// ── 파싱 ──

function parseBindings(bindings) {
  const workMap = new Map()
  for (const b of bindings) {
    const en = b.workLabel?.value || ''
    const qid = b.work?.value?.split('/').pop() || ''
    if (!en || (en.startsWith('Q') && /^\d+$/.test(en.slice(1)))) continue

    if (!workMap.has(qid)) {
      workMap.set(qid, {
        en,
        ko: b.workLabelKo?.value || '',
        year: b.date?.value?.slice(0, 4) || null,
        wikidata_id: qid,
        p31Ids: [],
      })
    }
    const typeId = b.type?.value?.split('/').pop()
    if (typeId) workMap.get(qid).p31Ids.push(typeId)
  }

  const seen = new Set()
  const works = []
  for (const w of workMap.values()) {
    const key = w.en.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    works.push(w)
  }
  return works
}

function mergeWorks(existing, newWorks) {
  const titles = new Set(existing.map(w => w.en.toLowerCase()))
  for (const w of newWorks) {
    if (!titles.has(w.en.toLowerCase())) {
      existing.push(w)
      titles.add(w.en.toLowerCase())
    }
  }
  return existing
}

async function getAllWorks(qid, profession) {
  // P800
  let works = parseBindings(await getWorksP800(qid))
  await sleep(800)

  // P50
  works = mergeWorks(works, parseBindings(await getWorksP50(qid)))
  await sleep(800)

  // 직군별 추가
  if (['visual_artist'].includes(profession)) {
    works = mergeWorks(works, parseBindings(await getWorksP170(qid)))
    await sleep(800)
  }
  if (['director'].includes(profession)) {
    works = mergeWorks(works, parseBindings(await getWorksP57(qid)))
    await sleep(800)
  }
  if (['musician'].includes(profession)) {
    works = mergeWorks(works, parseBindings(await getWorksP86(qid)))
    await sleep(800)
    works = mergeWorks(works, parseBindings(await getWorksP175(qid)))
    await sleep(800)
  }

  // 배우: P161 (출연작)
  if (['actor'].includes(profession)) {
    works = mergeWorks(works, parseBindings(await getWorksP161(qid)))
    await sleep(800)
  }

  return works
}

// ── Naver Books ──

async function searchNaverBooks(title, author) {
  if (!NAVER_CLIENT_ID) return null
  const query = author ? `${title} ${author}` : title
  const url = `https://openapi.naver.com/v1/search/book.json?query=${encodeURIComponent(query)}&display=5`
  try {
    const res = await fetch(url, {
      headers: {
        'X-Naver-Client-Id': NAVER_CLIENT_ID,
        'X-Naver-Client-Secret': NAVER_CLIENT_SECRET,
      },
    })
    if (!res.ok) return null
    const data = await res.json()
    if (!data.items?.length) return null
    const titleLower = title.toLowerCase().trim()
    for (const item of data.items) {
      const clean = item.title.replace(/<[^>]*>/g, '').trim()
      if (clean.toLowerCase().includes(titleLower) || titleLower.includes(clean.toLowerCase())) {
        return {
          title: clean,
          author: item.author?.replace(/<[^>]*>/g, '') || null,
          isbn: item.isbn?.split(' ').pop() || null,
          thumbnail: item.image || null,
          publisher: item.publisher || null,
          description: item.description?.replace(/<[^>]*>/g, '').slice(0, 500) || null,
        }
      }
    }
    const item = data.items[0]
    return {
      title: item.title.replace(/<[^>]*>/g, '').trim(),
      author: item.author?.replace(/<[^>]*>/g, '') || null,
      isbn: item.isbn?.split(' ').pop() || null,
      thumbnail: item.image || null,
      publisher: item.publisher || null,
      description: item.description?.replace(/<[^>]*>/g, '').slice(0, 500) || null,
    }
  } catch {
    return null
  }
}

// ── DB ──

async function findContentByTitle(titleEn, titleKo) {
  if (titleEn) {
    const { data } = await supabase.from('content_locales').select('content_id').eq('locale', 'en').ilike('title', titleEn).limit(1)
    if (data?.length) return data[0].content_id
  }
  if (titleKo) {
    const { data } = await supabase.from('content_locales').select('content_id').eq('locale', 'ko').ilike('title', titleKo).limit(1)
    if (data?.length) return data[0].content_id
  }
  return null
}

async function createBookContent(work, naverData) {
  const externalId = naverData?.isbn || `wikidata-${work.wikidata_id}`
  const externalSource = naverData?.isbn ? 'naver_book' : 'wikidata'

  const { data: existing } = await supabase.from('contents').select('id').eq('external_id', externalId).maybeSingle()
  if (existing) return existing.id

  const { data: newContent, error } = await supabase.from('contents').insert({
    type: 'BOOK',
    external_id: externalId,
    external_source: externalSource,
    release_date: work.year ? `${work.year}-01-01` : null,
  }).select('id').single()

  if (error || !newContent) return null
  const contentId = newContent.id

  if (naverData) {
    await supabase.from('content_locales').insert({
      content_id: contentId, locale: 'ko',
      title: naverData.title, creator: naverData.author,
      thumbnail_url: naverData.thumbnail, isbn: naverData.isbn,
      publisher: naverData.publisher, description: naverData.description,
      sources: { primary: 'naver_book' }, verified: true,
    })
  } else if (work.ko) {
    await supabase.from('content_locales').insert({
      content_id: contentId, locale: 'ko',
      title: work.ko, sources: { primary: 'wikidata' }, verified: false,
    })
  }

  if (work.en) {
    await supabase.from('content_locales').insert({
      content_id: contentId, locale: 'en',
      title: work.en, sources: { primary: 'wikidata' }, verified: false,
    })
  }

  return contentId
}

// ── 메인 ──

async function main() {
  console.log('셀럽 창작 서가 v3 — 잔여 셀럽 보완')
  console.log(`옵션: offset=${OFFSET}, limit=${LIMIT}, dry=${DRY_RUN}\n`)

  // celeb_works 없는 셀럽만 조회
  const { data: allCelebs, error } = await supabase
    .from('profiles')
    .select('id, nickname, nickname_en, profession')
    .not('celeb_tier', 'is', null)
    .not('profession', 'is', null)
    .not('nickname_en', 'is', null)
    .order('nickname')

  if (error) throw new Error(`DB 조회 실패: ${error.message}`)

  const { data: existingCelebIds } = await supabase
    .from('celeb_works')
    .select('celeb_id')

  const withWorks = new Set((existingCelebIds || []).map(r => r.celeb_id))
  const targets = allCelebs.filter(c => !withWorks.has(c.id)).slice(OFFSET, OFFSET + LIMIT)

  console.log(`전체 ${allCelebs.length}명 중 잔여 대상 ${targets.length}명\n`)

  const stats = { success: 0, noQid: 0, noWorks: 0, worksInserted: 0, contentsCreated: 0 }
  const logs = []
  const failures = []

  for (let i = 0; i < targets.length; i++) {
    const celeb = targets[i]
    const label = `[${i}] ${celeb.nickname}`

    // QID 검색 (개선된 매칭)
    const wd = await searchWikidataQID(celeb.nickname_en, celeb.profession)
    await sleep(400)

    if (!wd) {
      stats.noQid++
      logs.push(`${label} | QID 미매칭 (${celeb.nickname_en})`)
      failures.push({ ...celeb, reason: 'QID 미매칭' })
      continue
    }

    // 작품 수집
    const works = await getAllWorks(wd.qid, celeb.profession)

    if (!works.length) {
      stats.noWorks++
      logs.push(`${label} | QID=${wd.qid} 작품 0건`)
      failures.push({ ...celeb, reason: '작품 없음', qid: wd.qid })
      continue
    }

    let celebWorksCount = 0
    for (const work of works) {
      const workType = classifyWorkType(work.p31Ids) || defaultWorkType(celeb.profession)
      const role = defaultRole(celeb.profession, workType)

      let contentId = await findContentByTitle(work.en, work.ko)

      if (!contentId && workType === 'BOOK' && !DRY_RUN) {
        const searchTitle = work.ko || work.en
        const naver = await searchNaverBooks(searchTitle, celeb.nickname)
        await sleep(300)
        contentId = await createBookContent(work, naver)
        if (contentId) stats.contentsCreated++
      }

      if (workType === 'ART') contentId = null

      if (!DRY_RUN) {
        const { error: insertErr } = await supabase.from('celeb_works').insert({
          celeb_id: celeb.id,
          content_id: contentId || null,
          title: work.ko || work.en,
          title_en: work.en,
          role,
          work_type: workType,
          release_year: work.year ? parseInt(work.year) : null,
          search_keyword: ['ART', 'MUSIC'].includes(workType) || !contentId
            ? `${work.en} ${celeb.nickname_en}`
            : null,
        })
        if (insertErr) {
          if (insertErr.code === '23505') continue
          continue
        }
      }

      celebWorksCount++
      stats.worksInserted++
    }

    if (celebWorksCount > 0) {
      stats.success++
      const types = [...new Set(works.map(w => classifyWorkType(w.p31Ids) || defaultWorkType(celeb.profession)))]
      logs.push(`${label} | QID=${wd.qid} | ${celebWorksCount}작품 (${types.join('/')})`)
    } else {
      stats.noWorks++
      logs.push(`${label} | QID=${wd.qid} 작품 0건`)
      failures.push({ ...celeb, reason: '작품 없음', qid: wd.qid })
    }

    const done = i + 1
    if (done % 10 === 0 || done >= targets.length) {
      console.log(`[${done}/${targets.length}] ✓${stats.success} works=${stats.worksInserted} created=${stats.contentsCreated} noQid=${stats.noQid} noWorks=${stats.noWorks}`)
    }
  }

  console.log('\n===== 완료 =====')
  console.log(`성공: ${stats.success} | 작품: ${stats.worksInserted} | 콘텐츠: ${stats.contentsCreated}`)
  console.log(`QID미매칭: ${stats.noQid} | 작품없음: ${stats.noWorks}`)

  const logFile = resolve('scripts/celeb-works-v3.log')
  writeFileSync(logFile, logs.join('\n'), 'utf8')
  console.log(`로그 → ${logFile}`)

  if (failures.length) {
    const failFile = resolve('scripts/celeb-works-v3-failures.json')
    writeFileSync(failFile, JSON.stringify(failures, null, 2), 'utf8')
    console.log(`실패 → ${failFile} (${failures.length}건)`)
  }
}

main().catch(err => {
  console.error('치명적 오류:', err)
  process.exit(1)
})
