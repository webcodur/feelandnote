/**
 * 셀럽 창작 서가 v2 — 전 셀럽 대상, P800+P50, 타입 자동 판별
 *
 * 1. 전체 셀럽 조회 (celeb_tier IS NOT NULL)
 * 2. Wikidata QID 검색 (nickname_en)
 * 3. P800 (notable work) → 없으면 P50 (author of) fallback
 * 4. 작품 P31 (instance of) → work_type 자동 분류
 * 5. DB 매칭 → 없으면 Naver Books (BOOK만) → contents INSERT
 * 6. celeb_works INSERT
 *
 * 사용법:
 *   node scripts/celeb-works-v2.mjs --offset 0 --limit 100
 *   node scripts/celeb-works-v2.mjs --dry-run --limit 10
 *   node scripts/celeb-works-v2.mjs --skip-existing   # 이미 celeb_works 있는 셀럽도 비BOOK 추가 수집
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { resolve } from 'path'
import { writeFileSync, existsSync, readFileSync } from 'fs'

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
const SKIP_EXISTING = args.includes('--skip-existing')
const OFFSET = parseInt(args[args.indexOf('--offset') + 1]) || 0
const LIMIT = parseInt(args[args.indexOf('--limit') + 1]) || 99999

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

// ── Wikidata description 매칭용 키워드 ──

const PROF_KEYWORDS = {
  author: ['writer', 'author', 'poet', 'novelist', 'playwright', 'essayist', 'literary'],
  humanities_scholar: ['philosopher', 'historian', 'theologian', 'scholar', 'thinker', 'jurist', 'philologist', 'political', 'reformer', 'monk', 'cleric', 'nun'],
  scientist: ['physicist', 'mathematician', 'scientist', 'astronomer', 'chemist', 'biologist', 'naturalist', 'inventor'],
  director: ['director', 'filmmaker', 'screenwriter'],
  musician: ['musician', 'composer', 'singer', 'rapper', 'songwriter', 'pianist', 'conductor'],
  visual_artist: ['painter', 'artist', 'sculptor', 'architect', 'photographer'],
  actor: ['actor', 'actress'],
  politician: ['politician', 'president', 'prime minister', 'statesman', 'emperor', 'king', 'queen', 'pharaoh', 'chancellor'],
  commander: ['general', 'admiral', 'commander', 'military', 'marshal', 'conqueror', 'warrior'],
  entrepreneur: ['entrepreneur', 'businessman', 'businesswoman', 'executive', 'founder', 'industrialist'],
  leader: ['leader', 'activist', 'revolutionary', 'reformer'],
  athlete: ['athlete', 'player', 'footballer', 'boxer', 'swimmer'],
  social_scientist: ['economist', 'sociologist', 'psychologist', 'anthropologist', 'political scientist'],
  investor: ['investor', 'financier', 'philanthropist'],
  influencer: ['influencer', 'youtuber', 'host', 'presenter'],
}

function matchDescription(description, profession) {
  if (!description) return false
  const desc = description.toLowerCase()
  const keywords = PROF_KEYWORDS[profession] || []
  return keywords.some(kw => desc.includes(kw))
}

// ── P31 → work_type 매핑 ──

const P31_BOOK = new Set([
  'Q7725634', 'Q571', 'Q8261', 'Q47461344', 'Q49084',    // literary work, book, novel, written work, short story
  'Q5185279', 'Q35760', 'Q277759', 'Q23622',              // poem, essay, book series, treatise
  'Q131539', 'Q780605', 'Q386724', 'Q5292',               // autobiography, philosophical work, play, encyclopedia
  'Q860861', 'Q17518461', 'Q3331189', 'Q28869365',        // short story, creative work, edition
])
const P31_VIDEO = new Set([
  'Q11424', 'Q5398426', 'Q24856', 'Q93204', 'Q226730',   // film, TV series, TV film, documentary, short film
  'Q1261214',                                               // anime
])
const P31_MUSIC = new Set([
  'Q105543609', 'Q482994', 'Q7366', 'Q55850593',          // musical work, album, song, musical composition
  'Q9734', 'Q1344', 'Q34379',                              // symphony, opera, musical
])
const P31_ART = new Set([
  'Q3305213', 'Q219423', 'Q4989906', 'Q18573970',         // painting, sculpture, mural, fresco
  'Q11060274', 'Q17516',                                    // print, building/architecture
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

// 직군 기반 기본 타입
function defaultWorkType(profession) {
  if (['director'].includes(profession)) return 'VIDEO'
  if (['musician'].includes(profession)) return 'MUSIC'
  if (['visual_artist'].includes(profession)) return 'ART'
  return 'BOOK'
}

// 직군 기반 기본 role
function defaultRole(profession, workType) {
  if (workType === 'VIDEO') return 'director'
  if (workType === 'MUSIC') return 'composer'
  if (workType === 'ART') return 'artist'
  return 'author'
}

// ── Wikidata API ──

async function searchWikidataQID(nameEn, profession, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      const url = `https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&limit=5&language=en&search=${encodeURIComponent(nameEn)}`
      const res = await fetch(url, { headers: { 'User-Agent': 'FeelandnoteBot/1.0' } })
      if (res.status === 429) { await sleep(5000); continue }
      if (!res.ok) return null
      const data = await res.json()
      if (!data.search?.length) return null

      for (const s of data.search) {
        if (matchDescription(s.description, profession)) {
          return { qid: s.id, label: s.label, description: s.description }
        }
      }
      const first = data.search[0]
      if (first.description && /\d{3,4}/.test(first.description)) {
        return { qid: first.id, label: first.label, description: first.description }
      }
      return null
    } catch {
      if (i < retries) await sleep(2000)
    }
  }
  return null
}

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

async function getWorksP800(qid) {
  const sparql = `SELECT ?work ?workLabel ?workLabelKo ?date ?type WHERE {
    wd:${qid} wdt:P800 ?work .
    OPTIONAL { ?work wdt:P577 ?date }
    OPTIONAL { ?work wdt:P31 ?type }
    OPTIONAL { ?work rdfs:label ?workLabelKo . FILTER(LANG(?workLabelKo) = "ko") }
    SERVICE wikibase:label { bd:serviceParam wikibase:language "en" }
  }`
  return await sparqlQuery(sparql)
}

async function getWorksP50(qid) {
  const sparql = `SELECT ?work ?workLabel ?workLabelKo ?date ?type WHERE {
    ?work wdt:P50 wd:${qid} .
    OPTIONAL { ?work wdt:P577 ?date }
    OPTIONAL { ?work wdt:P31 ?type }
    OPTIONAL { ?work rdfs:label ?workLabelKo . FILTER(LANG(?workLabelKo) = "ko") }
    SERVICE wikibase:label { bd:serviceParam wikibase:language "en" }
  } LIMIT 20`
  return await sparqlQuery(sparql)
}

// P170 (creator) — 미술 작품용
async function getWorksP170(qid) {
  const sparql = `SELECT ?work ?workLabel ?workLabelKo ?date ?type WHERE {
    ?work wdt:P170 wd:${qid} .
    OPTIONAL { ?work wdt:P577 ?date }
    OPTIONAL { ?work wdt:P31 ?type }
    OPTIONAL { ?work rdfs:label ?workLabelKo . FILTER(LANG(?workLabelKo) = "ko") }
    SERVICE wikibase:label { bd:serviceParam wikibase:language "en" }
  } LIMIT 20`
  return await sparqlQuery(sparql)
}

// P57 (director) — 영화 감독용
async function getWorksP57(qid) {
  const sparql = `SELECT ?work ?workLabel ?workLabelKo ?date ?type WHERE {
    ?work wdt:P57 wd:${qid} .
    OPTIONAL { ?work wdt:P577 ?date }
    OPTIONAL { ?work wdt:P31 ?type }
    OPTIONAL { ?work rdfs:label ?workLabelKo . FILTER(LANG(?workLabelKo) = "ko") }
    SERVICE wikibase:label { bd:serviceParam wikibase:language "en" }
  } LIMIT 20`
  return await sparqlQuery(sparql)
}

// P86 (composer) — 작곡가용
async function getWorksP86(qid) {
  const sparql = `SELECT ?work ?workLabel ?workLabelKo ?date ?type WHERE {
    ?work wdt:P86 wd:${qid} .
    OPTIONAL { ?work wdt:P577 ?date }
    OPTIONAL { ?work wdt:P31 ?type }
    OPTIONAL { ?work rdfs:label ?workLabelKo . FILTER(LANG(?workLabelKo) = "ko") }
    SERVICE wikibase:label { bd:serviceParam wikibase:language "en" }
  } LIMIT 20`
  return await sparqlQuery(sparql)
}

function parseBindings(bindings) {
  const seen = new Set()
  const works = []
  // 동일 work에 대해 P31이 여러 개일 수 있으므로 그룹핑
  const workMap = new Map()

  for (const b of bindings) {
    const en = b.workLabel?.value || ''
    const qid = b.work?.value?.split('/').pop() || ''
    // QID만 있고 라벨 없는 항목 스킵
    if (!en || en.startsWith('Q') && /^\d+$/.test(en.slice(1))) continue

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

  for (const w of workMap.values()) {
    const key = w.en.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    works.push(w)
  }
  return works
}

async function getAllWorks(qid, profession) {
  // 1. P800 (notable work)
  let bindings = await getWorksP800(qid)
  let works = parseBindings(bindings)
  if (works.length >= 3) return works

  await sleep(1000)

  // 2. P50 fallback (author of) — 주로 BOOK
  const p50Bindings = await getWorksP50(qid)
  const p50Works = parseBindings(p50Bindings)
  // 기존 works에 없는 것만 추가
  const existingTitles = new Set(works.map(w => w.en.toLowerCase()))
  for (const w of p50Works) {
    if (!existingTitles.has(w.en.toLowerCase())) {
      works.push(w)
      existingTitles.add(w.en.toLowerCase())
    }
  }

  await sleep(1000)

  // 3. 직군별 추가 쿼리
  if (['visual_artist'].includes(profession)) {
    const p170 = parseBindings(await getWorksP170(qid))
    for (const w of p170) {
      if (!existingTitles.has(w.en.toLowerCase())) {
        works.push(w)
        existingTitles.add(w.en.toLowerCase())
      }
    }
    await sleep(1000)
  }

  if (['director'].includes(profession)) {
    const p57 = parseBindings(await getWorksP57(qid))
    for (const w of p57) {
      if (!existingTitles.has(w.en.toLowerCase())) {
        works.push(w)
        existingTitles.add(w.en.toLowerCase())
      }
    }
    await sleep(1000)
  }

  if (['musician'].includes(profession)) {
    const p86 = parseBindings(await getWorksP86(qid))
    for (const w of p86) {
      if (!existingTitles.has(w.en.toLowerCase())) {
        works.push(w)
        existingTitles.add(w.en.toLowerCase())
      }
    }
    await sleep(1000)
  }

  return works
}

// ── Naver Books 검색 ──

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

// ── DB 매칭 ──

async function findContentByTitle(titleEn, titleKo) {
  if (titleEn) {
    const { data } = await supabase
      .from('content_locales')
      .select('content_id')
      .eq('locale', 'en')
      .ilike('title', titleEn)
      .limit(1)
    if (data?.length) return data[0].content_id
  }
  if (titleKo) {
    const { data } = await supabase
      .from('content_locales')
      .select('content_id')
      .eq('locale', 'ko')
      .ilike('title', titleKo)
      .limit(1)
    if (data?.length) return data[0].content_id
  }
  return null
}

// ── contents + content_locales INSERT (BOOK only) ──

async function createBookContent(work, naverData) {
  const externalId = naverData?.isbn || `wikidata-${work.wikidata_id}`
  const externalSource = naverData?.isbn ? 'naver_book' : 'wikidata'

  const { data: existing } = await supabase
    .from('contents')
    .select('id')
    .eq('external_id', externalId)
    .maybeSingle()

  if (existing) return existing.id

  const { data: newContent, error } = await supabase
    .from('contents')
    .insert({
      type: 'BOOK',
      external_id: externalId,
      external_source: externalSource,
      release_date: work.year ? `${work.year}-01-01` : null,
    })
    .select('id')
    .single()

  if (error || !newContent) return null
  const contentId = newContent.id

  if (naverData) {
    await supabase.from('content_locales').insert({
      content_id: contentId,
      locale: 'ko',
      title: naverData.title,
      creator: naverData.author,
      thumbnail_url: naverData.thumbnail,
      isbn: naverData.isbn,
      publisher: naverData.publisher,
      description: naverData.description,
      sources: { primary: 'naver_book' },
      verified: true,
    })
  } else if (work.ko) {
    await supabase.from('content_locales').insert({
      content_id: contentId,
      locale: 'ko',
      title: work.ko,
      sources: { primary: 'wikidata' },
      verified: false,
    })
  }

  if (work.en) {
    await supabase.from('content_locales').insert({
      content_id: contentId,
      locale: 'en',
      title: work.en,
      sources: { primary: 'wikidata' },
      verified: false,
    })
  }

  return contentId
}

// ── 메인 ──

async function main() {
  console.log('셀럽 창작 서가 v2 — 전 셀럽 대상')
  console.log(`옵션: offset=${OFFSET}, limit=${LIMIT}, dry=${DRY_RUN}\n`)

  // 전체 셀럽 조회
  const { data: allCelebs, error } = await supabase
    .from('profiles')
    .select('id, nickname, nickname_en, profession')
    .not('celeb_tier', 'is', null)
    .not('profession', 'is', null)
    .not('nickname_en', 'is', null)
    .order('nickname')

  if (error) throw new Error(`DB 조회 실패: ${error.message}`)

  // 이미 celeb_works 있는 셀럽의 기존 작품 제목 조회
  const { data: existingWorks } = await supabase
    .from('celeb_works')
    .select('celeb_id, title_en')

  const existingMap = new Map() // celeb_id → Set of title_en (lowercase)
  for (const w of existingWorks || []) {
    if (!existingMap.has(w.celeb_id)) existingMap.set(w.celeb_id, new Set())
    if (w.title_en) existingMap.get(w.celeb_id).add(w.title_en.toLowerCase())
  }

  const celebsWithWorks = new Set(existingMap.keys())

  // 대상 필터링
  let targets
  if (SKIP_EXISTING) {
    // 이미 있는 셀럽도 포함 (비BOOK 추가 수집)
    targets = allCelebs
  } else {
    // 기본: celeb_works 없는 셀럽만
    targets = allCelebs.filter(c => !celebsWithWorks.has(c.id))
  }
  targets = targets.slice(OFFSET, OFFSET + LIMIT)

  console.log(`전체 ${allCelebs.length}명 중 대상 ${targets.length}명\n`)

  const stats = { success: 0, noQid: 0, noWorks: 0, worksInserted: 0, contentsCreated: 0, skipped: 0 }
  const logs = []
  const failures = []

  for (let i = 0; i < targets.length; i++) {
    const celeb = targets[i]
    const label = `[${i + OFFSET}] ${celeb.nickname}`

    // Wikidata QID
    const searchName = celeb.nickname_en || celeb.nickname
    const wd = await searchWikidataQID(searchName, celeb.profession)
    await sleep(400)

    if (!wd) {
      stats.noQid++
      logs.push(`${label} | QID 미매칭 (${searchName})`)
      failures.push({ ...celeb, reason: 'QID 미매칭' })
      continue
    }

    // 작품 수집 (P800 + P50 + 직군별)
    const works = await getAllWorks(wd.qid, celeb.profession)

    if (!works.length) {
      stats.noWorks++
      logs.push(`${label} | QID=${wd.qid} 작품 0건`)
      failures.push({ ...celeb, reason: '작품 없음', qid: wd.qid })
      continue
    }

    // 기존 작품 제목 세트
    const existingTitles = existingMap.get(celeb.id) || new Set()

    let celebWorksCount = 0
    for (const work of works) {
      // 이미 등록된 제목 스킵
      if (existingTitles.has(work.en.toLowerCase())) {
        stats.skipped++
        continue
      }

      // 타입 결정
      const workType = classifyWorkType(work.p31Ids) || defaultWorkType(celeb.profession)
      const role = defaultRole(celeb.profession, workType)

      // DB 매칭
      let contentId = await findContentByTitle(work.en, work.ko)

      // BOOK이고 DB에 없으면 Naver 검색 → 생성
      if (!contentId && workType === 'BOOK' && !DRY_RUN) {
        const searchTitle = work.ko || work.en
        const naver = await searchNaverBooks(searchTitle, celeb.nickname)
        await sleep(300)
        contentId = await createBookContent(work, naver)
        if (contentId) stats.contentsCreated++
      }

      // ART는 content_id = NULL
      if (workType === 'ART') contentId = null

      // celeb_works INSERT
      if (!DRY_RUN) {
        const { error: insertErr } = await supabase
          .from('celeb_works')
          .insert({
            celeb_id: celeb.id,
            content_id: contentId || null,
            title: work.ko || work.en,
            title_en: work.en,
            role,
            work_type: workType,
            release_year: work.year ? parseInt(work.year) : null,
            search_keyword: workType === 'ART' ? `${work.en} ${celeb.nickname_en || celeb.nickname}` : null,
          })

        if (insertErr) {
          if (insertErr.code === '23505') continue // 중복
          logs.push(`${label} | INSERT 실패: ${work.en} — ${insertErr.message}`)
          continue
        }
      }

      celebWorksCount++
      stats.worksInserted++
    }

    if (celebWorksCount > 0 || works.length > 0) {
      stats.success++
      const types = [...new Set(works.map(w => classifyWorkType(w.p31Ids) || defaultWorkType(celeb.profession)))]
      logs.push(`${label} | QID=${wd.qid} | ${celebWorksCount}작품 등록 (${types.join('/')})`)
    }

    // 진행 출력
    const done = i + 1
    if (done % 10 === 0 || done >= targets.length) {
      console.log(`[${done}/${targets.length}] ✓${stats.success} works=${stats.worksInserted} created=${stats.contentsCreated} skip=${stats.skipped} noQid=${stats.noQid} noWorks=${stats.noWorks}`)
    }
  }

  console.log('\n===== 완료 =====')
  console.log(`성공: ${stats.success} | 작품등록: ${stats.worksInserted} | 콘텐츠생성: ${stats.contentsCreated} | 스킵: ${stats.skipped}`)
  console.log(`QID미매칭: ${stats.noQid} | 작품없음: ${stats.noWorks}`)

  const logFile = resolve(`scripts/celeb-works-v2-${OFFSET}.log`)
  writeFileSync(logFile, logs.join('\n'), 'utf8')
  console.log(`로그 → ${logFile}`)

  if (failures.length) {
    const failFile = resolve(`scripts/celeb-works-v2-failures-${OFFSET}.json`)
    writeFileSync(failFile, JSON.stringify(failures, null, 2), 'utf8')
    console.log(`실패 → ${failFile} (${failures.length}건)`)
  }
}

main().catch(err => {
  console.error('치명적 오류:', err)
  process.exit(1)
})
